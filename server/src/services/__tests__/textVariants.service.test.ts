/** @jest-environment node */

/**
 * Unit tests for textVariants.service — focussed on the three invariants
 * that the user requires before Phase 3 is considered complete:
 *
 *  1. finalizeTextVariants() writes approved variants into
 *     pages[].textTemplate.masculine / .feminine on the template doc.
 *  2. textPersonalizationReady stays false until finalize() succeeds.
 *  3. generateTextVariants() / approveTextVariant() never touch
 *     textPersonalizationReady — only finalize() does.
 *
 * The caregiver preview path (preview.service.ts → selectTextVariant()) reads
 * from pages[].textTemplate, so once finalize() writes the approved text there
 * the caregiver flow automatically uses the reviewed variants.  That rendering
 * path is not re-tested here (it already has its own tests in personalization
 * tests) — the key assertion is that finalize() actually performs the write.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Firestore mock — intercepts every collection/doc/subcollection call
// ─────────────────────────────────────────────────────────────────────────────

type DocData = Record<string, unknown>;

/** Minimal Firestore doc snapshot. */
function snap(data: DocData | null): { exists: boolean; data: () => DocData } {
  return { exists: data !== null, data: () => data ?? {} };
}

// We capture every batch.update / batch.set call so we can assert on them.
const batchUpdates: Array<{ ref: string; data: DocData }> = [];
const batchSets: Array<{ ref: string; data: DocData }> = [];

const makeBatch = () => ({
  update: jest.fn((ref: { _path: string }, data: DocData) => {
    batchUpdates.push({ ref: ref._path, data });
  }),
  set: jest.fn((ref: { _path: string }, data: DocData) => {
    batchSets.push({ ref: ref._path, data });
  }),
  commit: jest.fn().mockResolvedValue(undefined),
});

// Variant docs stored per templateId/pageNumber.
const variantDocs: Record<string, DocData> = {};

// Template doc data (mutable so tests can set it up).
let templateDocData: DocData = {};
// Capture direct templateRef.update() calls (outside batch).
const directUpdates: Array<DocData> = [];

function makeDocRef(path: string) {
  return {
    _path: path,
    get: jest.fn().mockImplementation(() => {
      if (path.startsWith("story_templates/") && !path.includes("/textVariants/")) {
        return Promise.resolve(snap(templateDocData));
      }
      const varKey = path.replace("story_templates/", "").replace("/textVariants/", ":page:");
      return Promise.resolve(snap(variantDocs[varKey] ?? null));
    }),
    update: jest.fn().mockImplementation((data: DocData) => {
      directUpdates.push(data);
      // Merge into templateDocData so subsequent reads see the update.
      Object.assign(templateDocData, data);
      return Promise.resolve();
    }),
    collection: jest.fn().mockImplementation((sub: string) => makeCollRef(`${path}/${sub}`)),
  };
}

function makeCollRef(path: string) {
  return {
    _path: path,
    doc: jest.fn().mockImplementation((id: string) => makeDocRef(`${path}/${id}`)),
    get: jest.fn().mockImplementation(() => {
      // Subcollection get — return all variant docs whose key prefix matches.
      const prefix = path.replace("story_templates/", "").replace("/textVariants", "");
      const docs = Object.entries(variantDocs)
        .filter(([k]) => k.startsWith(prefix + ":page:"))
        .map(([, data]) => ({ data: () => data }));
      return Promise.resolve({ docs });
    }),
  };
}

jest.mock("@/config/firebase", () => ({
  firestore: {
    collection: jest.fn().mockImplementation((coll: string) => makeCollRef(coll)),
    batch: jest.fn().mockImplementation(makeBatch),
  },
}));

// ─────────────────────────────────────────────────────────────────────────────
// callLLM mock — returns a minimal valid JSON array
// ─────────────────────────────────────────────────────────────────────────────

jest.mock("@/agent1/shared/llm-client", () => ({
  callLLM: jest.fn(),
}));

import { callLLM } from "@/agent1/shared/llm-client";
const mockCallLLM = callLLM as jest.MockedFunction<typeof callLLM>;

// ─────────────────────────────────────────────────────────────────────────────
// Subject under test
// ─────────────────────────────────────────────────────────────────────────────

import {
  finalizeTextVariants,
  approveTextVariant,
  generateTextVariants,
  TextVariantError,
} from "../textVariants.service";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const TEMPLATE_ID = "tmpl-001";
const UID = "specialist-uid-1";

function makeTemplatePage(pageNumber: number, text: string) {
  return {
    pageNumber,
    textTemplate: { masculine: text, feminine: text },
    imagePromptTemplate: "prompt",
  };
}

function setVariantDoc(
  pageNumber: number,
  masculine: string,
  feminine: string,
  reviewStatus: "pending" | "approved" = "pending",
  // Defaults to a source text that mentions the child, matching the existing
  // tests below (which use masculine/feminine that also contain {{CHILD_NAME}}).
  originalText = "{{CHILD_NAME}} original",
) {
  const key = `${TEMPLATE_ID}:page:${pageNumber}`;
  variantDocs[key] = {
    pageNumber,
    masculine,
    feminine,
    reviewStatus,
    originalText,
    generatedAt: Date.now(),
    ...(reviewStatus === "approved"
      ? { reviewedBy: UID, reviewedAt: Date.now() }
      : {}),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  batchUpdates.length = 0;
  batchSets.length = 0;
  directUpdates.length = 0;
  Object.keys(variantDocs).forEach((k) => delete variantDocs[k]);
  templateDocData = {
    personalizationEnabled: true,
    textPersonalizationReady: false,
    textVariantStatus: "pending_review",
    specialistId: UID,
    pages: [
      makeTemplatePage(1, "היה פעם {{PROTAGONIST}}..."),
      makeTemplatePage(2, "{{PROTAGONIST}} הרגיש פחד."),
    ],
  };
});

// ── Invariant 1: finalize writes approved text into pages[].textTemplate ──────

describe("finalizeTextVariants — writes approved text into pages[].textTemplate", () => {
  test("updates pages with masculine/feminine variants on success", async () => {
    setVariantDoc(1, "{{CHILD_NAME}} ילד הרגיש פחד.", "{{CHILD_NAME}} ילדה הרגישה פחד.", "approved");
    setVariantDoc(2, "{{CHILD_NAME}} מצא אומץ.", "{{CHILD_NAME}} מצאה אומץ.", "approved");

    await finalizeTextVariants(TEMPLATE_ID, UID);

    // The direct templateRef.update() call should include the updated pages.
    expect(directUpdates).toHaveLength(1);
    const written = directUpdates[0]!;

    expect(written.textPersonalizationReady).toBe(true);

    const pages = written.pages as Array<{ pageNumber: number; textTemplate: { masculine: string; feminine: string } }>;
    expect(pages).toHaveLength(2);

    const p1 = pages.find((p) => p.pageNumber === 1)!;
    expect(p1.textTemplate.masculine).toBe("{{CHILD_NAME}} ילד הרגיש פחד.");
    expect(p1.textTemplate.feminine).toBe("{{CHILD_NAME}} ילדה הרגישה פחד.");

    const p2 = pages.find((p) => p.pageNumber === 2)!;
    expect(p2.textTemplate.masculine).toBe("{{CHILD_NAME}} מצא אומץ.");
    expect(p2.textTemplate.feminine).toBe("{{CHILD_NAME}} מצאה אומץ.");
  });
});

// ── Invariant 2: textPersonalizationReady stays false until finalize ──────────

describe("textPersonalizationReady stays false until finalize()", () => {
  test("approveTextVariant does not touch textPersonalizationReady", async () => {
    setVariantDoc(1, "{{CHILD_NAME}} ילד הרגיש פחד.", "{{CHILD_NAME}} ילדה הרגישה פחד.", "pending");

    await approveTextVariant(TEMPLATE_ID, 1, UID);

    // The approval docRef.update() should NOT set textPersonalizationReady.
    const allWrittenKeys = directUpdates.flatMap((u) => Object.keys(u));
    expect(allWrittenKeys).not.toContain("textPersonalizationReady");
  });

  test("finalize sets textPersonalizationReady = true only when all pages are approved", async () => {
    setVariantDoc(1, "{{CHILD_NAME}} ילד הרגיש פחד.", "{{CHILD_NAME}} ילדה הרגישה פחד.", "approved");
    setVariantDoc(2, "{{CHILD_NAME}} מצא אומץ.", "{{CHILD_NAME}} מצאה אומץ.", "approved");

    await finalizeTextVariants(TEMPLATE_ID, UID);

    const written = directUpdates[0]!;
    expect(written.textPersonalizationReady).toBe(true);
    expect(written.textVariantStatus).toBe("none");
  });
});

// ── Invariant 3: finalize blocks unless every page is fully valid ─────────────

describe("finalizeTextVariants — blocked when validation fails", () => {
  test("throws NOT_ALL_APPROVED when a page is still pending", async () => {
    setVariantDoc(1, "{{CHILD_NAME}} ילד הרגיש פחד.", "{{CHILD_NAME}} ילדה הרגישה פחד.", "approved");
    setVariantDoc(2, "{{CHILD_NAME}} מצא אומץ.", "{{CHILD_NAME}} מצאה אומץ.", "pending");

    await expect(finalizeTextVariants(TEMPLATE_ID, UID)).rejects.toMatchObject({
      code: "NOT_ALL_APPROVED",
    });
    expect(directUpdates).toHaveLength(0);
  });

  test("throws VALIDATION_FAILED when masculine variant missing {{CHILD_NAME}}", async () => {
    setVariantDoc(1, "ילד בלי פלייסהולדר", "{{CHILD_NAME}} ילדה", "approved");
    setVariantDoc(2, "{{CHILD_NAME}} ילד", "{{CHILD_NAME}} ילדה", "approved");

    await expect(finalizeTextVariants(TEMPLATE_ID, UID)).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
    expect(directUpdates).toHaveLength(0);
  });

  test("throws VALIDATION_FAILED when feminine variant is empty", async () => {
    setVariantDoc(1, "{{CHILD_NAME}} ילד הרגיש פחד.", "", "approved");
    setVariantDoc(2, "{{CHILD_NAME}} מצא אומץ.", "{{CHILD_NAME}} מצאה אומץ.", "approved");

    await expect(finalizeTextVariants(TEMPLATE_ID, UID)).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
    expect(directUpdates).toHaveLength(0);
  });
});

// ── generateTextVariants — language selection drives the LLM prompt ──────────
//
// generationConfig.language must select the matching language name/gender-rule
// in the prompt sent to the LLM. "en" must not silently fall back to "he".

describe("generateTextVariants — language selection", () => {
  function mockLLMValidResponse() {
    mockCallLLM.mockResolvedValue({
      text: JSON.stringify([
        { pageNumber: 1, masculine: "{{CHILD_NAME}} boy text", feminine: "{{CHILD_NAME}} girl text" },
        { pageNumber: 2, masculine: "{{CHILD_NAME}} boy text 2", feminine: "{{CHILD_NAME}} girl text 2" },
      ]),
      inputTokens: 10,
      outputTokens: 10,
      latencyMs: 5,
    });
  }

  function promptSentToLLM(): string {
    expect(mockCallLLM).toHaveBeenCalledTimes(1);
    return mockCallLLM.mock.calls[0]![0].prompt;
  }

  test("Hebrew: generationConfig.language === 'he' uses Hebrew instructions", async () => {
    templateDocData.generationConfig = { language: "he" };
    mockLLMValidResponse();

    await generateTextVariants(TEMPLATE_ID);

    const prompt = promptSentToLLM();
    expect(prompt).toContain("Language: Hebrew");
    expect(prompt).toContain("In Hebrew this means full morphological changes");
  });

  test("Hebrew is still the default when generationConfig.language is missing (backward compatible)", async () => {
    delete templateDocData.generationConfig;
    mockLLMValidResponse();

    await generateTextVariants(TEMPLATE_ID);

    const prompt = promptSentToLLM();
    expect(prompt).toContain("Language: Hebrew");
  });

  test("Arabic: generationConfig.language === 'ar' uses Arabic instructions", async () => {
    templateDocData.generationConfig = { language: "ar" };
    mockLLMValidResponse();

    await generateTextVariants(TEMPLATE_ID);

    const prompt = promptSentToLLM();
    expect(prompt).toContain("Language: Arabic");
    expect(prompt).toContain("In Arabic this means full morphological changes");
    expect(prompt).not.toContain("Language: Hebrew");
  });

  test("English: generationConfig.language === 'en' uses English instructions and does not fall back to Hebrew", async () => {
    templateDocData.generationConfig = { language: "en" };
    mockLLMValidResponse();

    await generateTextVariants(TEMPLATE_ID);

    const prompt = promptSentToLLM();
    expect(prompt).toContain("Language: English");
    expect(prompt).toContain("Adjust gendered pronouns and possessives");
    // The core regression assertion: English must not silently become Hebrew.
    expect(prompt).not.toContain("Language: Hebrew");
    expect(prompt).not.toContain("In Hebrew this means full morphological changes");
  });

  test("English generation still writes variant docs and sets textVariantStatus = 'pending_review'", async () => {
    templateDocData.generationConfig = { language: "en" };
    mockLLMValidResponse();

    await generateTextVariants(TEMPLATE_ID);

    expect(batchSets).toHaveLength(2);
    const page1 = batchSets.find((s) => s.ref.endsWith("/1"))!;
    expect((page1.data as { masculine: string }).masculine).toBe("{{CHILD_NAME}} boy text");

    const statusUpdate = batchUpdates.find((u) => "textVariantStatus" in u.data);
    expect(statusUpdate?.data.textVariantStatus).toBe("pending_review");
  });
});

// ── approveTextVariant blocks bad variants ────────────────────────────────────

describe("approveTextVariant — validates before marking approved", () => {
  test("rejects when masculine variant is missing {{CHILD_NAME}}", async () => {
    setVariantDoc(1, "אין פלייסהולדר כאן", "{{CHILD_NAME}} ילדה", "pending");

    await expect(approveTextVariant(TEMPLATE_ID, 1, UID)).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
  });

  test("rejects when feminine variant is empty", async () => {
    setVariantDoc(1, "{{CHILD_NAME}} ילד", "", "pending");

    await expect(approveTextVariant(TEMPLATE_ID, 1, UID)).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
  });

  test("succeeds when both variants are non-empty and contain {{CHILD_NAME}}", async () => {
    setVariantDoc(1, "{{CHILD_NAME}} ילד הרגיש פחד.", "{{CHILD_NAME}} ילדה הרגישה פחד.", "pending");

    await expect(approveTextVariant(TEMPLATE_ID, 1, UID)).resolves.toBeUndefined();
  });
});

// ── Placeholder requirements are page-specific / source-text-specific ────────
//
// A placeholder is only required in a page's variants if it actually appears
// in that page's original text. A short descriptive page that never mentions
// the protagonist must not be blocked for lacking {{CHILD_NAME}}.

describe("placeholder validation is derived from each page's original text", () => {
  test("1) original has no {{CHILD_NAME}}; variants also have none → approve succeeds", async () => {
    setVariantDoc(
      1,
      "הגננת הניחה על השולחן צנצנות קטנות.",
      "הגננת הניחה על השולחן צנצנות קטנות.",
      "pending",
      "הגננת הניחה על השולחן צנצנות קטנות.", // originalText — no placeholder
    );

    await expect(approveTextVariant(TEMPLATE_ID, 1, UID)).resolves.toBeUndefined();
  });

  test("1b) same case also passes at finalize time (not just approve)", async () => {
    setVariantDoc(
      1,
      "הגננת הניחה על השולחן צנצנות קטנות.",
      "הגננת הניחה על השולחן צנצנות קטנות.",
      "approved",
      "הגננת הניחה על השולחן צנצנות קטנות.",
    );
    setVariantDoc(2, "{{CHILD_NAME}} מצא אומץ.", "{{CHILD_NAME}} מצאה אומץ.", "approved");

    await expect(finalizeTextVariants(TEMPLATE_ID, UID)).resolves.toBeUndefined();
    expect(directUpdates[0]?.textPersonalizationReady).toBe(true);
  });

  test("2) original has {{CHILD_NAME}}; a variant drops it → approve rejects", async () => {
    setVariantDoc(
      1,
      "ילד בלי פלייסהולדר",
      "{{CHILD_NAME}} ילדה",
      "pending",
      "{{CHILD_NAME}} הרגיש פחד.",
    );

    await expect(approveTextVariant(TEMPLATE_ID, 1, UID)).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
  });

  test("3) original has {{CHILD_NAME}}; all variants preserve it → approve succeeds", async () => {
    setVariantDoc(
      1,
      "{{CHILD_NAME}} הרגיש פחד.",
      "{{CHILD_NAME}} הרגישה פחד.",
      "pending",
      "{{CHILD_NAME}} הרגיש פחד.",
    );

    await expect(approveTextVariant(TEMPLATE_ID, 1, UID)).resolves.toBeUndefined();
  });

  test("4) a non-CHILD_NAME placeholder in the original is also enforced when present", async () => {
    setVariantDoc(
      1,
      "{{CHILD_NAME}} הרגיש פחד.", // drops {{PRONOUN_SUBJECT}} from the original
      "{{CHILD_NAME}} {{PRONOUN_SUBJECT}} הרגישה פחד.",
      "pending",
      "{{CHILD_NAME}} {{PRONOUN_SUBJECT}} הרגיש פחד.",
    );

    await expect(approveTextVariant(TEMPLATE_ID, 1, UID)).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
  });

  test("4b) a placeholder absent from the original is never required, even if unusual", async () => {
    setVariantDoc(
      1,
      "{{CHILD_NAME}} הרגיש פחד.",
      "{{CHILD_NAME}} הרגישה פחד.",
      "pending",
      "{{CHILD_NAME}} הרגיש פחד.", // no {{PRONOUN_SUBJECT}} in the original
    );

    await expect(approveTextVariant(TEMPLATE_ID, 1, UID)).resolves.toBeUndefined();
  });

  test("finalize still blocks when {{CHILD_NAME}} required by the original is missing from a variant", async () => {
    setVariantDoc(
      1,
      "ילד בלי פלייסהולדר",
      "{{CHILD_NAME}} ילדה",
      "approved",
      "{{CHILD_NAME}} הרגיש פחד.",
    );
    setVariantDoc(2, "{{CHILD_NAME}} מצא אומץ.", "{{CHILD_NAME}} מצאה אומץ.", "approved");

    await expect(finalizeTextVariants(TEMPLATE_ID, UID)).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
    expect(directUpdates).toHaveLength(0);
  });

  test("first-generation source text uses Agent 1's [CHILD_NAME] bracket format, not {{CHILD_NAME}} — still enforced", async () => {
    // On a page's very first variant generation, `originalText` is the raw
    // manuscript, which uses Agent 1's [CHILD_NAME]/[HE/SHE/THEY] bracket
    // authoring tokens (see section-j-output-format.ts), not the caregiver-
    // facing {{CHILD_NAME}} format. A page referencing the protagonist this
    // way must still require {{CHILD_NAME}} in the rewritten variant.
    setVariantDoc(
      1,
      "ילד בלי פלייסהולדר",
      "{{CHILD_NAME}} ילדה",
      "pending",
      "[CHILD_NAME] הרגיש פחד.",
    );

    await expect(approveTextVariant(TEMPLATE_ID, 1, UID)).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
  });

  test("bracket-only pronoun reference ([HE/SHE/THEY]) also requires {{CHILD_NAME}} in the variant", async () => {
    setVariantDoc(
      1,
      "הרגיש פחד ללא שם.", // no {{CHILD_NAME}} at all
      "{{CHILD_NAME}} הרגישה פחד.",
      "pending",
      "[HE/SHE/THEY] הרגיש פחד.",
    );

    await expect(approveTextVariant(TEMPLATE_ID, 1, UID)).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
  });
});
