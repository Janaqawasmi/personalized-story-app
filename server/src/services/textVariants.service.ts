/**
 * Text-variant generation service.
 *
 * Flow:
 *   1. generateTextVariants() — LLM rewrites each page into masculine+feminine
 *      variants with {{CHILD_NAME}}, validates every variant preserves the
 *      placeholders its page's source text requires, then in one batch:
 *      writes the variant docs (audit trail), merges the variants directly
 *      into template pages[].textTemplate, and flips
 *      textPersonalizationReady = true. There is no separate specialist
 *      review/approval step — the manuscript text was already approved by
 *      the specialist before publish, and that approval covers the
 *      gender-aware wording these variants carry.
 *   2. getTextVariants() — returns the current status + variant docs, for the
 *      read-only workspace status indicator.
 *
 * Caregiver rendering is unchanged: preview.service.ts calls
 * selectTextVariant() then personalizeText(), which substitute {{CHILD_NAME}}
 * from pages[].textTemplate — populated here as soon as generation succeeds.
 */

import { firestore } from "@/config/firebase";
import { COLLECTIONS } from "@/shared/firestore/paths";
import { callLLM } from "@/agent1/shared/llm-client";
import { findMissingPlaceholders } from "@/shared/utils/placeholderValidation";
import type { StoryLanguage } from "@/models/storyBrief.model";
import {
  classifyTextVariantFailure,
  type ClassifiedFailure,
} from "@/services/textVariantFailure";
import type {
  TextVariantFailureInfo,
  TextVariantFailureReason,
} from "@/shared/types/textVariant";

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
    | "VALIDATION_FAILED";

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
  correction?: string,
): string {
  const langName = LANGUAGE_NAMES[language];
  const genderRule = GENDER_GRAMMAR_RULES[language];
  const pagesBlock = pages
    .map((p) => `Page ${p.pageNumber}:\n${p.text}`)
    .join("\n\n---\n\n");

  // When a previous attempt dropped {{CHILD_NAME}} on specific pages, feed the
  // exact failures back so the model fixes those pages instead of blindly
  // re-sampling the same mistake.
  const correctionBlock = correction
    ? `

## Correction required — your previous attempt FAILED validation
${correction}

Regenerate ALL pages, and you MUST fix the issues above: every page listed must
contain the exact string {{CHILD_NAME}} at least once in the named variant. Do
NOT replace the protagonist with a bare "he"/"she" — the first reference to the
protagonist on each such page must be {{CHILD_NAME}}.`
    : "";

  return `You are adapting a therapeutic children's story for child-name personalization.

Language: ${langName}
Story type: Fear & Anxiety (therapeutic, warm, age-appropriate)

## Task
For each page, produce TWO versions of the text:
  • masculine — rewritten for a boy
  • feminine  — rewritten for a girl

## Rules (strictly follow all of them)
1. On every page whose text refers to the protagonist, the FIRST reference to the protagonist on that page MUST be the exact string {{CHILD_NAME}} — never drop the protagonist's name to a bare "he"/"she". Later references on the same page may then use gendered pronouns.
2. ${genderRule}
3. Keep the meaning, emotional tone, therapeutic content, and narrative events IDENTICAL across both variants and the original.
4. Do NOT change settings, other characters, plot, or any non-protagonist language.
5. Every page that refers to the protagonist MUST contain the exact string {{CHILD_NAME}} at least once in BOTH the masculine and feminine version. A page that never refers to the protagonist must be left unchanged — do not add {{CHILD_NAME}} to it.
6. Respond with ONLY a valid JSON array — no prose, no markdown fences, no comments.

## Required JSON format
[
  { "pageNumber": <number>, "masculine": "<text>", "feminine": "<text>" },
  ...
]

## Pages to adapt
${pagesBlock}${correctionBlock}`;
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

/**
 * Validate every variant and return a human-readable list of problems (an
 * empty variant, or a placeholder the page's source text required but the
 * variant dropped). Returns [] when all variants are valid.
 *
 * Collecting ALL problems — rather than throwing on the first — lets a retry
 * feed every offending page back to the model in one corrective prompt.
 */
function collectVariantProblems(
  pageInputs: Array<{ pageNumber: number; text: string }>,
  variants: Array<{ pageNumber: number; masculine: string; feminine: string }>,
): string[] {
  const problems: string[] = [];
  for (const variant of variants) {
    const original =
      pageInputs.find((p) => p.pageNumber === variant.pageNumber)?.text ?? "";
    const checks: Array<["masculine" | "feminine", string]> = [
      ["masculine", variant.masculine],
      ["feminine", variant.feminine],
    ];
    for (const [label, text] of checks) {
      if (!text || text.trim().length === 0) {
        problems.push(`Page ${variant.pageNumber} ${label} variant is empty.`);
        continue;
      }
      const missing = findMissingPlaceholders(original, text);
      if (missing.length > 0) {
        problems.push(
          `Page ${variant.pageNumber} ${label} variant is missing required placeholder(s): ${missing.join(", ")}.`,
        );
      }
    }
  }
  return problems;
}

// ─────────────────────────────────────────────────────────────────────────────
// Retry orchestration
// ─────────────────────────────────────────────────────────────────────────────
//
// Text-variant generation can fail for transient reasons (timeout, rate limit,
// a provider blip, or a single bad model sample that drops a placeholder or
// isn't valid JSON). Those must NOT leave a story silently un-personalizable —
// they are retried automatically with exponential backoff. Only genuinely
// non-recoverable reasons (missing API config, an unexpected internal error)
// stop immediately. See classifyTextVariantFailure() for the reason mapping.

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

interface RetryConfig {
  maxAttempts: number;
  baseMs: number;
}

/**
 * Read retry tuning from the environment at call time (so tests can override
 * without reimporting). Defaults: 3 attempts, 1.5s base backoff.
 */
function getRetryConfig(): RetryConfig {
  const maxAttempts = Math.max(1, Number(process.env.TEXT_VARIANT_MAX_ATTEMPTS ?? 3) || 3);
  const rawBase = Number(process.env.TEXT_VARIANT_RETRY_BASE_MS ?? 1500);
  const baseMs = Number.isFinite(rawBase) && rawBase >= 0 ? rawBase : 1500;
  return { maxAttempts, baseMs };
}

/** Exponential backoff with jitter; rate-limits back off harder. Capped at 20s. */
function backoffMs(attempt: number, reason: TextVariantFailureReason, baseMs: number): number {
  const factor = reason === "rate_limited" ? 4 : 2;
  const capped = Math.min(baseMs * Math.pow(factor, attempt - 1), 20_000);
  const jitter = Math.random() * baseMs;
  return capped + jitter;
}

/**
 * One full generation attempt: build the prompt, call the LLM, parse the JSON,
 * and validate every variant. Throws on any failure (the caller classifies it
 * and decides whether to retry). Performs no Firestore writes.
 */
async function attemptGenerateVariants(
  pageInputs: Array<{ pageNumber: number; text: string }>,
  language: StoryLanguage,
  correction?: string,
): Promise<Array<{ pageNumber: number; masculine: string; feminine: string }>> {
  const prompt = buildVariantPrompt(pageInputs, language, correction);
  // Haiku by default — cost-efficient structured rewrite with a strict JSON contract.
  const result = await callLLM({
    model: getVariantModel(),
    prompt,
    maxTokens: 8000,
    step: "text_variant_generation",
    attempt: 1,
  });

  const variants = parseLLMVariants(
    result.text,
    pageInputs.map((p) => p.pageNumber),
  );

  // Validate every variant before the caller writes anything — a page that
  // drops a required placeholder must abort this attempt (retryable: the next
  // attempt is fed the exact failures as a correction) rather than publish
  // half-good personalization data.
  const problems = collectVariantProblems(pageInputs, variants);
  if (problems.length > 0) {
    throw new TextVariantError(
      "VALIDATION_FAILED",
      `Some variants dropped required placeholders or were empty:\n- ${problems.join("\n- ")}`,
    );
  }

  return variants;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate masculine/feminine text variants for every page of the template
 * using an LLM call, validate that each variant preserves the placeholders
 * its page's source text requires, then immediately merge the results into
 * template pages[].textTemplate and flip textPersonalizationReady = true —
 * no separate specialist review/approval step. The manuscript text this is
 * derived from was already approved by the specialist before publish.
 *
 * Only allowed when the template has personalizationEnabled = true.
 * Idempotent: re-running overwrites existing variant docs and pages[].
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

  const { maxAttempts, baseMs } = getRetryConfig();

  let variants: Array<{ pageNumber: number; masculine: string; feminine: string }> | undefined;
  let lastError: unknown;
  let lastFailure: ClassifiedFailure | undefined;
  let attemptsMade = 0;
  // Corrective feedback carried into the next attempt after a placeholder
  // failure — turns a deterministic "dropped {{CHILD_NAME}} on page N" miss
  // into a self-correcting retry instead of an identical re-sample.
  let correction: string | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    attemptsMade = attempt;
    try {
      variants = await attemptGenerateVariants(pageInputs, language, correction);
      break; // success
    } catch (err) {
      lastError = err;
      const classified = classifyTextVariantFailure(err);
      lastFailure = classified;
      // The technical detail stays server-side (logs only) — it is never
      // surfaced to the specialist or caregiver.
      console.warn(
        `[textVariants] generation attempt ${attempt}/${maxAttempts} failed for ` +
          `templateId=${templateId}: reason=${classified.reason} ` +
          `retryable=${classified.retryable} detail="${classified.detail}"`,
      );
      if (!classified.retryable || attempt === maxAttempts) break;
      // Feed placeholder failures back so the next attempt fixes the exact
      // pages that dropped {{CHILD_NAME}} rather than re-sampling blindly.
      correction =
        classified.reason === "placeholder_validation" && err instanceof TextVariantError
          ? err.message
          : undefined;
      await delay(backoffMs(attempt, classified.reason, baseMs));
    }
  }

  if (!variants) {
    // Every attempt failed. Persist a durable, queryable failure record —
    // status "failed" (NOT reset to "none", which is indistinguishable from
    // "never started") plus the classified reason — so the flow is
    // self-recovering: the repair job / manual retry endpoint can find and
    // re-run exactly these templates. Never surfaces the raw detail to a user.
    const failure: TextVariantFailureInfo = {
      reason: lastFailure?.reason ?? "internal_error",
      retryable: lastFailure?.retryable ?? false,
      attempts: attemptsMade,
      detail: lastFailure?.detail ?? "Unknown error.",
      failedAt: Date.now(),
    };
    await templateRef.update({
      textVariantStatus: "failed",
      textVariantFailure: failure,
    });
    // Preserve the underlying TextVariantError code (VALIDATION_FAILED /
    // GENERATION_FAILED) so callers keep the same contract; wrap anything else.
    throw lastError instanceof TextVariantError
      ? lastError
      : new TextVariantError(
          "GENERATION_FAILED",
          `Text-variant generation failed after ${attemptsMade} attempt(s): ${failure.reason}.`,
        );
  }

  const resolvedVariants = variants;

  // Write each page's variant doc (audit trail) and merge the same variants
  // directly into pages[].textTemplate in one batch — generation itself is
  // the readiness signal, there is no intermediate pending-review state.
  const now = Date.now();
  const batch = firestore.batch();

  const variantsRef = templateRef.collection(COLLECTIONS.TEMPLATE_TEXT_VARIANTS);

  for (const variant of resolvedVariants) {
    const original =
      pageInputs.find((p) => p.pageNumber === variant.pageNumber)?.text ?? "";
    const docRef = variantsRef.doc(String(variant.pageNumber));
    const doc: TextVariantDoc = {
      pageNumber: variant.pageNumber,
      originalText: original,
      masculine: variant.masculine,
      feminine: variant.feminine,
      reviewStatus: "approved",
      generatedAt: now,
    };
    batch.set(docRef, doc);
  }

  const updatedPages = pages.map((page) => {
    const pn = typeof page.pageNumber === "number" ? page.pageNumber : 0;
    const variant = resolvedVariants.find((v) => v.pageNumber === pn);
    if (!variant) return page;
    return {
      ...page,
      textTemplate: { masculine: variant.masculine, feminine: variant.feminine },
    };
  });

  batch.update(templateRef, {
    pages: updatedPages,
    textPersonalizationReady: true,
    textVariantStatus: "none", // terminal, ready — signalled by textPersonalizationReady
    textVariantFailure: null, // clear any previously-recorded failure
    updatedAt: now,
  });
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
   * True once generateTextVariants() has completed successfully —
   * display-only signal for the workspace status chip. Not used for gating
   * logic (the caregiver-facing gate reads pages[].textTemplate directly;
   * see preview.service.ts's hasValidTextTemplates()).
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

