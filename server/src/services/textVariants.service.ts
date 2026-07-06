/**
 * Text-variant generation and specialist review service (Phase 3).
 *
 * Flow:
 *   1. generateTextVariants()  — LLM rewrites each page into masculine+feminine
 *      variants with {{CHILD_NAME}}; stores in textVariants subcollection;
 *      sets textVariantStatus = "pending_review" on the template doc.
 *   2. getTextVariants()       — returns pending/approved variant docs for the
 *      specialist review UI.
 *   3. updateTextVariant()     — specialist edits + saves a per-page variant.
 *   4. approveTextVariant()    — marks one page's variant as approved.
 *   5. finalizeTextVariants()  — validates all pages approved + {{CHILD_NAME}}
 *      present; batch-writes approved text back into template pages[];
 *      flips textPersonalizationReady = true.
 *
 * Caregiver rendering is unchanged: preview.service.ts already calls
 * selectTextVariant() then personalizeText(), which substitute {{CHILD_NAME}}.
 * Once the variants are in pages[].textTemplate the caregiver flow just works.
 */

import { firestore } from "@/config/firebase";
import { COLLECTIONS } from "@/shared/firestore/paths";
import { callLLM } from "@/agent1/shared/llm-client";
import { findMissingPlaceholders } from "@/shared/utils/placeholderValidation";
import type { StoryLanguage } from "@/models/storyBrief.model";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TextVariantDoc {
  pageNumber: number;
  originalText: string;
  masculine: string;
  feminine: string;
  reviewStatus: "pending" | "approved";
  generatedAt: number;
  reviewedBy?: string;
  reviewedAt?: number;
}

export class TextVariantError extends Error {
  readonly code:
    | "TEMPLATE_NOT_FOUND"
    | "NOT_PERSONALIZABLE"
    | "GENERATION_FAILED"
    | "VALIDATION_FAILED"
    | "NOT_ALL_APPROVED";

  constructor(code: TextVariantError["code"], message: string) {
    super(message);
    this.name = "TextVariantError";
    this.code = code;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LLM prompt
// ─────────────────────────────────────────────────────────────────────────────

/** Human-readable language name for the LLM prompt header. */
const LANGUAGE_NAMES: Record<StoryLanguage, string> = {
  he: "Hebrew",
  ar: "Arabic",
  en: "English",
};

/**
 * Gender-grammar instruction, tailored per language. Hebrew and Arabic are
 * morphologically gendered (verbs/adjectives change form, not just pronouns);
 * English gender is carried almost entirely by pronouns/possessives, so the
 * instruction for English must not claim "full morphological changes" —
 * that would be inaccurate and could confuse the model into over-rewriting.
 */
const GENDER_GRAMMAR_RULES: Record<StoryLanguage, string> = {
  he: "Adjust ALL gendered grammar (verbs, adjectives, pronouns) for the target gender. In Hebrew this means full morphological changes — do NOT simply swap a single pronoun.",
  ar: "Adjust ALL gendered grammar (verbs, adjectives, pronouns) for the target gender. In Arabic this means full morphological changes — do NOT simply swap a single pronoun.",
  en: "Adjust gendered pronouns and possessives (he/him/his vs. she/her/hers) for the target gender. English carries almost no other grammatical gender, so verbs, adjectives, and the rest of the sentence structure should otherwise stay the same.",
};

/**
 * Build a batched prompt that rewrites all pages in one LLM call.
 * The model returns a JSON array; we parse it and validate each entry.
 */
function buildVariantPrompt(
  pages: Array<{ pageNumber: number; text: string }>,
  language: StoryLanguage,
): string {
  const langName = LANGUAGE_NAMES[language];
  const genderRule = GENDER_GRAMMAR_RULES[language];
  const pagesBlock = pages
    .map((p) => `Page ${p.pageNumber}:\n${p.text}`)
    .join("\n\n---\n\n");

  return `You are adapting a therapeutic children's story for child-name personalization.

Language: ${langName}
Story type: Fear & Anxiety (therapeutic, warm, age-appropriate)

## Task
For each page, produce TWO versions of the text:
  • masculine — rewritten for a boy, with the protagonist's name replaced by {{CHILD_NAME}}
  • feminine  — rewritten for a girl, with the protagonist's name replaced by {{CHILD_NAME}}

## Rules (strictly follow all of them)
1. Replace EVERY reference to the protagonist (name, pronoun, implied subject) with {{CHILD_NAME}}
2. ${genderRule}
3. Keep the meaning, emotional tone, therapeutic content, and narrative events IDENTICAL across both variants and the original.
4. Do NOT change settings, other characters, plot, or any non-protagonist language.
5. Both variants MUST contain the exact string {{CHILD_NAME}} at least once.
6. Respond with ONLY a valid JSON array — no prose, no markdown fences, no comments.

## Required JSON format
[
  { "pageNumber": <number>, "masculine": "<text>", "feminine": "<text>" },
  ...
]

## Pages to adapt
${pagesBlock}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parse LLM output
// ─────────────────────────────────────────────────────────────────────────────

interface RawVariantEntry {
  pageNumber: unknown;
  masculine: unknown;
  feminine: unknown;
}

function parseLLMVariants(
  raw: string,
  expectedPageNumbers: number[],
): Array<{ pageNumber: number; masculine: string; feminine: string }> {
  let parsed: unknown;
  try {
    // Strip markdown fences if the model added them despite instructions.
    const cleaned = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new TextVariantError(
      "GENERATION_FAILED",
      "LLM response was not valid JSON.",
    );
  }

  if (!Array.isArray(parsed)) {
    throw new TextVariantError(
      "GENERATION_FAILED",
      "LLM response was not a JSON array.",
    );
  }

  const entries = parsed as RawVariantEntry[];
  const result: Array<{ pageNumber: number; masculine: string; feminine: string }> = [];

  for (const entry of entries) {
    if (
      typeof entry.pageNumber !== "number" ||
      typeof entry.masculine !== "string" ||
      typeof entry.feminine !== "string"
    ) {
      throw new TextVariantError(
        "GENERATION_FAILED",
        "One or more LLM variant entries have missing or wrong-typed fields.",
      );
    }
    result.push({
      pageNumber: entry.pageNumber,
      masculine: entry.masculine.trim(),
      feminine: entry.feminine.trim(),
    });
  }

  // Check all expected pages are present.
  const returnedPages = new Set(result.map((e) => e.pageNumber));
  const missing = expectedPageNumbers.filter((n) => !returnedPages.has(n));
  if (missing.length > 0) {
    throw new TextVariantError(
      "GENERATION_FAILED",
      `LLM response missing pages: ${missing.join(", ")}.`,
    );
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Model selection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Model used for text variant generation.
 * Override with TEXT_VARIANT_MODEL env var (e.g. "claude-sonnet-4-6" for
 * higher-quality Hebrew/Arabic morphological adaptation).
 * Default: claude-haiku-4-5-20251001 (fast, cheap, adequate for structured
 * rewrite tasks with a strict JSON output contract).
 */
function getVariantModel(): string {
  return (
    process.env.TEXT_VARIANT_MODEL ?? "claude-haiku-4-5-20251001"
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation helpers
// ─────────────────────────────────────────────────────────────────────────────
//
// A placeholder is only "required" in a page's variants if it actually
// appears in that page's original source text. Not every page mentions the
// protagonist, so {{CHILD_NAME}} (or any other placeholder) must not be
// demanded on pages where the source text never had it in the first place.
// This logic (including Agent 1's [CHILD_NAME]-bracket authoring format) is
// shared with the caregiver-side readiness gate in preview.service.ts.

function assertVariantValid(originalText: string, text: string, label: string): void {
  if (!text || text.trim().length === 0) {
    throw new TextVariantError(
      "VALIDATION_FAILED",
      `${label} variant is empty.`,
    );
  }
  const missing = findMissingPlaceholders(originalText, text);
  if (missing.length > 0) {
    throw new TextVariantError(
      "VALIDATION_FAILED",
      `${label} variant is missing required placeholder(s): ${missing.join(", ")}.`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate masculine/feminine text variants for every page of the template
 * using an LLM call. Stores results in the textVariants subcollection and
 * sets textVariantStatus = "pending_review" on the template doc.
 *
 * Only allowed when the template has personalizationEnabled = true.
 * Idempotent: re-running overwrites existing pending variant docs.
 */
export async function generateTextVariants(templateId: string): Promise<void> {
  const templateRef = firestore
    .collection(COLLECTIONS.STORY_TEMPLATES)
    .doc(templateId);

  const snap = await templateRef.get();
  if (!snap.exists) {
    throw new TextVariantError("TEMPLATE_NOT_FOUND", "Template not found.");
  }

  const data = snap.data() as Record<string, unknown>;
  if (data.personalizationEnabled !== true) {
    throw new TextVariantError(
      "NOT_PERSONALIZABLE",
      "This template does not have personalization enabled.",
    );
  }

  const pages = (data.pages as Array<Record<string, unknown>> | undefined) ?? [];
  if (pages.length === 0) {
    throw new TextVariantError(
      "VALIDATION_FAILED",
      "Template has no pages to generate variants for.",
    );
  }

  // Extract plain page text (original, pre-variant).
  const pageInputs = pages.map((p) => {
    const pn = typeof p.pageNumber === "number" ? p.pageNumber : 0;
    const tt = p.textTemplate as { masculine?: string; feminine?: string } | string | undefined;
    const text =
      typeof tt === "object" && tt !== null
        ? (tt.masculine ?? "")
        : typeof tt === "string"
        ? tt
        : "";
    return { pageNumber: pn, text: text.trim() };
  });

  const rawLanguage =
    typeof data.generationConfig === "object" && data.generationConfig !== null
      ? (data.generationConfig as Record<string, unknown>).language
      : undefined;
  // "he" remains the default for missing/unrecognized values (this platform's
  // Hebrew-first default, unchanged from before). "ar" and "en" are now both
  // recognized explicitly — "en" must no longer silently fall through to "he".
  const language: StoryLanguage =
    rawLanguage === "ar" ? "ar" : rawLanguage === "en" ? "en" : "he";

  // Set optimistic status to "generating" so the UI can show a spinner.
  await templateRef.update({ textVariantStatus: "generating" });

  let variants: Array<{ pageNumber: number; masculine: string; feminine: string }>;
  try {
    const prompt = buildVariantPrompt(pageInputs, language);
    // Use Haiku for cost-efficient structured rewrite; not complex creative generation.
    const result = await callLLM({
      model: getVariantModel(),
      prompt,
      maxTokens: 8000,
      step: "text_variant_generation",
      attempt: 1,
    });
    variants = parseLLMVariants(result.text, pageInputs.map((p) => p.pageNumber));
  } catch (err) {
    // Reset status on failure so the specialist can retry.
    await templateRef.update({ textVariantStatus: "none" });
    if (err instanceof TextVariantError) throw err;
    throw new TextVariantError(
      "GENERATION_FAILED",
      err instanceof Error ? err.message : "Unknown LLM error.",
    );
  }

  // Write each page's variant doc to the subcollection.
  const now = Date.now();
  const batch = firestore.batch();

  const variantsRef = templateRef.collection(COLLECTIONS.TEMPLATE_TEXT_VARIANTS);

  for (const variant of variants) {
    const original =
      pageInputs.find((p) => p.pageNumber === variant.pageNumber)?.text ?? "";
    const docRef = variantsRef.doc(String(variant.pageNumber));
    const doc: TextVariantDoc = {
      pageNumber: variant.pageNumber,
      originalText: original,
      masculine: variant.masculine,
      feminine: variant.feminine,
      reviewStatus: "pending",
      generatedAt: now,
    };
    batch.set(docRef, doc);
  }

  batch.update(templateRef, { textVariantStatus: "pending_review" });
  await batch.commit();
}

/**
 * Returns all text variant docs for a template, sorted by page number.
 */
export async function getTextVariants(templateId: string): Promise<{
  templateExists: boolean;
  textVariantStatus: string;
  personalizationEnabled: boolean;
  /**
   * True once finalizeTextVariants() has run — display-only signal for "review
   * complete" UI (e.g. a workspace status chip). Not used for gating logic.
   */
  textPersonalizationReady: boolean;
  variants: TextVariantDoc[];
}> {
  const templateRef = firestore
    .collection(COLLECTIONS.STORY_TEMPLATES)
    .doc(templateId);
  const snap = await templateRef.get();
  if (!snap.exists) {
    return {
      templateExists: false,
      textVariantStatus: "none",
      personalizationEnabled: false,
      textPersonalizationReady: false,
      variants: [],
    };
  }

  const data = snap.data() as Record<string, unknown>;
  const textVariantStatus =
    typeof data.textVariantStatus === "string" ? data.textVariantStatus : "none";
  const personalizationEnabled = data.personalizationEnabled === true;
  const textPersonalizationReady = data.textPersonalizationReady === true;

  const variantsSnap = await templateRef
    .collection(COLLECTIONS.TEMPLATE_TEXT_VARIANTS)
    .get();

  const variants: TextVariantDoc[] = variantsSnap.docs
    .map((d) => d.data() as TextVariantDoc)
    .sort((a, b) => a.pageNumber - b.pageNumber);

  return {
    templateExists: true,
    textVariantStatus,
    personalizationEnabled,
    textPersonalizationReady,
    variants,
  };
}

/**
 * Specialist saves an edited variant for one page (does not approve yet).
 */
export async function updateTextVariant(
  templateId: string,
  pageNumber: number,
  patch: { masculine?: string; feminine?: string },
): Promise<void> {
  const docRef = firestore
    .collection(COLLECTIONS.STORY_TEMPLATES)
    .doc(templateId)
    .collection(COLLECTIONS.TEMPLATE_TEXT_VARIANTS)
    .doc(String(pageNumber));

  const snap = await docRef.get();
  if (!snap.exists) {
    throw new TextVariantError(
      "VALIDATION_FAILED",
      `No variant found for page ${pageNumber}.`,
    );
  }

  const update: Partial<TextVariantDoc> & Record<string, unknown> = {
    reviewStatus: "pending", // editing resets approval
  };
  if (typeof patch.masculine === "string") update.masculine = patch.masculine.trim();
  if (typeof patch.feminine === "string") update.feminine = patch.feminine.trim();

  await docRef.update(update);
}

/**
 * Specialist approves the current variant for one page.
 * Validates that both variants contain {{CHILD_NAME}}.
 */
export async function approveTextVariant(
  templateId: string,
  pageNumber: number,
  uid: string,
): Promise<void> {
  const docRef = firestore
    .collection(COLLECTIONS.STORY_TEMPLATES)
    .doc(templateId)
    .collection(COLLECTIONS.TEMPLATE_TEXT_VARIANTS)
    .doc(String(pageNumber));

  const snap = await docRef.get();
  if (!snap.exists) {
    throw new TextVariantError(
      "VALIDATION_FAILED",
      `No variant found for page ${pageNumber}.`,
    );
  }

  const doc = snap.data() as TextVariantDoc;

  assertVariantValid(doc.originalText, doc.masculine, `Page ${pageNumber} masculine`);
  assertVariantValid(doc.originalText, doc.feminine, `Page ${pageNumber} feminine`);

  await docRef.update({
    reviewStatus: "approved",
    reviewedBy: uid,
    reviewedAt: Date.now(),
  });
}

/**
 * Finalize: validate all pages are approved with valid variants, then
 * batch-update template pages[] with approved content and flip
 * textPersonalizationReady = true.
 */
export async function finalizeTextVariants(
  templateId: string,
  uid: string,
): Promise<void> {
  const templateRef = firestore
    .collection(COLLECTIONS.STORY_TEMPLATES)
    .doc(templateId);
  const templateSnap = await templateRef.get();
  if (!templateSnap.exists) {
    throw new TextVariantError("TEMPLATE_NOT_FOUND", "Template not found.");
  }

  const templateData = templateSnap.data() as Record<string, unknown>;
  const pages = (templateData.pages as Array<Record<string, unknown>>) ?? [];

  const variantsSnap = await templateRef
    .collection(COLLECTIONS.TEMPLATE_TEXT_VARIANTS)
    .get();

  const variantMap = new Map<number, TextVariantDoc>();
  for (const d of variantsSnap.docs) {
    const v = d.data() as TextVariantDoc;
    variantMap.set(v.pageNumber, v);
  }

  // Validate every page has an approved variant.
  const pageNumbers = pages.map((p) => {
    const pn = p.pageNumber;
    return typeof pn === "number" ? pn : 0;
  });

  const notApproved: number[] = [];
  const invalidVariants: string[] = [];

  for (const pn of pageNumbers) {
    const v = variantMap.get(pn);
    if (!v || v.reviewStatus !== "approved") {
      notApproved.push(pn);
      continue;
    }
    // Non-empty + placeholder-preservation checks (mirrors approveTextVariant validation).
    if (!v.masculine || v.masculine.trim().length === 0) {
      invalidVariants.push(`page ${pn} masculine (empty)`);
    } else {
      const missing = findMissingPlaceholders(v.originalText, v.masculine);
      if (missing.length > 0) {
        invalidVariants.push(`page ${pn} masculine (missing ${missing.join(", ")})`);
      }
    }
    if (!v.feminine || v.feminine.trim().length === 0) {
      invalidVariants.push(`page ${pn} feminine (empty)`);
    } else {
      const missing = findMissingPlaceholders(v.originalText, v.feminine);
      if (missing.length > 0) {
        invalidVariants.push(`page ${pn} feminine (missing ${missing.join(", ")})`);
      }
    }
  }

  if (notApproved.length > 0) {
    throw new TextVariantError(
      "NOT_ALL_APPROVED",
      `Pages not yet approved: ${notApproved.join(", ")}.`,
    );
  }
  if (invalidVariants.length > 0) {
    throw new TextVariantError(
      "VALIDATION_FAILED",
      `Invalid variants at finalize: ${invalidVariants.join(", ")}.`,
    );
  }

  // Merge approved variants into pages[].textTemplate.
  const updatedPages = pages.map((page) => {
    const pn = typeof page.pageNumber === "number" ? page.pageNumber : 0;
    const v = variantMap.get(pn);
    if (!v) return page;
    return {
      ...page,
      textTemplate: {
        masculine: v.masculine,
        feminine: v.feminine,
      },
    };
  });

  await templateRef.update({
    pages: updatedPages,
    textPersonalizationReady: true,
    textVariantStatus: "none", // clear — terminal state is signalled by textPersonalizationReady
    updatedAt: Date.now(),
    textVariantsApprovedBy: uid,
    textVariantsApprovedAt: Date.now(),
  });
}
