/** @jest-environment node */

/**
 * Unit tests for textVariants.service — focussed on the invariants that
 * matter now that there is no specialist review/approval step between
 * variant generation and readiness:
 *
 *  1. generateTextVariants() writes the generated variants directly into
 *     pages[].textTemplate.masculine / .feminine on the template doc, in the
 *     same call that produces them — no separate approve/finalize call.
 *  2. textPersonalizationReady is only flipped to true once generation
 *     succeeds (including placeholder validation); it stays false while a
 *     generation is in flight or after one fails.
 *  3. A variant that drops a placeholder its page's source text required
 *     aborts the whole write — pages[]/textPersonalizationReady are left
 *     untouched and textVariantStatus resets to "none" so a retry is safe.
 *
 * The caregiver preview path (preview.service.ts → selectTextVariant()) reads
 * from pages[].textTemplate, so once generateTextVariants() writes the text
 * there the caregiver flow automatically uses it. That rendering path is not
 * re-tested here — the key assertion is that generation actually performs
 * the write, with no gate in between.
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

// Variant docs stored per templateId/pageNumber.
const variantDocs: Record<string, DocData> = {};

// Template doc data (mutable so tests can set it up).
let templateDocData: DocData = {};

// Mirrors real Firestore semantics: batch writes only take effect on commit().
const makeBatch = () => {
  const pendingUpdates: Array<{ ref: string; data: DocData }> = [];
  const pendingSets: Array<{ ref: string; data: DocData }> = [];
  return {
    update: jest.fn((ref: { _path: string }, data: DocData) => {
      pendingUpdates.push({ ref: ref._path, data });
    }),
    set: jest.fn((ref: { _path: string }, data: DocData) => {
      pendingSets.push({ ref: ref._path, data });
    }),
    commit: jest.fn().mockImplementation(async () => {
      for (const u of pendingUpdates) {
        batchUpdates.push(u);
        if (u.ref === "story_templates/" + TEMPLATE_ID) {
          Object.assign(templateDocData, u.data);
        }
      }
      for (const s of pendingSets) {
        batchSets.push(s);
        const varKey = s.ref.replace("story_templates/", "").replace("/textVariants/", ":page:");
        variantDocs[varKey] = s.data;
      }
    }),
  };
};
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

import { generateTextVariants, getTextVariants } from "../textVariants.service";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const TEMPLATE_ID = "tmpl-001";

function makeTemplatePage(pageNumber: number, text: string) {
  return {
    pageNumber,
    textTemplate: { masculine: text, feminine: text },
    imagePromptTemplate: "prompt",
  };
}

function mockLLMResponse(entries: Array<{ pageNumber: number; masculine: string; feminine: string }>) {
  mockCallLLM.mockResolvedValue({
    text: JSON.stringify(entries),
    inputTokens: 10,
    outputTokens: 10,
    latencyMs: 5,
  });
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
    textVariantStatus: "none",
    generationConfig: { language: "he" },
    pages: [
      makeTemplatePage(1, "היה פעם [CHILD_NAME]..."),
      makeTemplatePage(2, "[CHILD_NAME] הרגיש פחד."),
    ],
  };
});

// ── Invariant 1: generation writes variants straight into pages[].textTemplate ──

describe("generateTextVariants — writes variants into pages[].textTemplate on success", () => {
  test("merges masculine/feminine into pages[] and flips textPersonalizationReady, with no separate approval call", async () => {
    mockLLMResponse([
      { pageNumber: 1, masculine: "{{CHILD_NAME}} ילד הרגיש פחד.", feminine: "{{CHILD_NAME}} ילדה הרגישה פחד." },
      { pageNumber: 2, masculine: "{{CHILD_NAME}} מצא אומץ.", feminine: "{{CHILD_NAME}} מצאה אומץ." },
    ]);

    await generateTextVariants(TEMPLATE_ID);

    // The batch update to the template doc should include the updated pages
    // and the ready flag — written in the very call that generated them.
    const templateUpdate = batchUpdates.find((u) => u.ref === `story_templates/${TEMPLATE_ID}`)!;
    expect(templateUpdate.data.textPersonalizationReady).toBe(true);
    expect(templateUpdate.data.textVariantStatus).toBe("none");

    const pages = templateUpdate.data.pages as Array<{
      pageNumber: number;
      textTemplate: { masculine: string; feminine: string };
    }>;
    expect(pages).toHaveLength(2);

    const p1 = pages.find((p) => p.pageNumber === 1)!;
    expect(p1.textTemplate.masculine).toBe("{{CHILD_NAME}} ילד הרגיש פחד.");
    expect(p1.textTemplate.feminine).toBe("{{CHILD_NAME}} ילדה הרגישה פחד.");

    const p2 = pages.find((p) => p.pageNumber === 2)!;
    expect(p2.textTemplate.masculine).toBe("{{CHILD_NAME}} מצא אומץ.");
    expect(p2.textTemplate.feminine).toBe("{{CHILD_NAME}} מצאה אומץ.");
  });

  test("writes each page's variant doc already marked approved (no pending intermediate state)", async () => {
    mockLLMResponse([
      { pageNumber: 1, masculine: "{{CHILD_NAME}} ילד הרגיש פחד.", feminine: "{{CHILD_NAME}} ילדה הרגישה פחד." },
      { pageNumber: 2, masculine: "{{CHILD_NAME}} מצא אומץ.", feminine: "{{CHILD_NAME}} מצאה אומץ." },
    ]);

    await generateTextVariants(TEMPLATE_ID);

    expect(batchSets).toHaveLength(2);
    for (const s of batchSets) {
      expect((s.data as { reviewStatus: string }).reviewStatus).toBe("approved");
    }
  });
});

// ── Invariant 2: textPersonalizationReady only flips once generation fully succeeds ──

describe("textPersonalizationReady only flips on full generation success", () => {
  test("stays false while textVariantStatus is 'generating'", async () => {
    mockLLMResponse([
      { pageNumber: 1, masculine: "{{CHILD_NAME}} א", feminine: "{{CHILD_NAME}} ב" },
      { pageNumber: 2, masculine: "{{CHILD_NAME}} ג", feminine: "{{CHILD_NAME}} ד" },
    ]);

    await generateTextVariants(TEMPLATE_ID);

    // The very first direct update sets the optimistic "generating" state,
    // before anything about readiness is known.
    expect(directUpdates[0]).toEqual({ textVariantStatus: "generating" });
  });

  test("getTextVariants reflects textPersonalizationReady=false before generation and true after", async () => {
    const before = await getTextVariants(TEMPLATE_ID);
    expect(before.textPersonalizationReady).toBe(false);

    mockLLMResponse([
      { pageNumber: 1, masculine: "{{CHILD_NAME}} א", feminine: "{{CHILD_NAME}} ב" },
      { pageNumber: 2, masculine: "{{CHILD_NAME}} ג", feminine: "{{CHILD_NAME}} ד" },
    ]);
    await generateTextVariants(TEMPLATE_ID);

    const after = await getTextVariants(TEMPLATE_ID);
    expect(after.textPersonalizationReady).toBe(true);
  });
});

// ── Invariant 3: a bad variant aborts the whole write, no partial state ──

describe("generateTextVariants — aborts entirely when a variant fails validation", () => {
  test("throws VALIDATION_FAILED and never touches pages[]/textPersonalizationReady when a placeholder is dropped", async () => {
    mockLLMResponse([
      { pageNumber: 1, masculine: "ילד בלי פלייסהולדר", feminine: "{{CHILD_NAME}} ילדה" },
      { pageNumber: 2, masculine: "{{CHILD_NAME}} מצא אומץ.", feminine: "{{CHILD_NAME}} מצאה אומץ." },
    ]);

    await expect(generateTextVariants(TEMPLATE_ID)).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });

    // No batch was ever committed with page/readiness data.
    expect(batchUpdates).toHaveLength(0);
    expect(batchSets).toHaveLength(0);
    // Status was reset to "none" so a retry is safe.
    expect(directUpdates[directUpdates.length - 1]).toEqual({ textVariantStatus: "none" });
    expect(templateDocData.textPersonalizationReady).toBe(false);
  });

  test("throws VALIDATION_FAILED when a variant is empty", async () => {
    mockLLMResponse([
      { pageNumber: 1, masculine: "{{CHILD_NAME}} ילד הרגיש פחד.", feminine: "" },
      { pageNumber: 2, masculine: "{{CHILD_NAME}} מצא אומץ.", feminine: "{{CHILD_NAME}} מצאה אומץ." },
    ]);

    await expect(generateTextVariants(TEMPLATE_ID)).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
    expect(batchUpdates).toHaveLength(0);
  });
});

// ── generateTextVariants — language selection drives the LLM prompt ──────────
//
// generationConfig.language must select the matching language name/gender-rule
// in the prompt sent to the LLM. "en" must not silently fall back to "he".

describe("generateTextVariants — language selection", () => {
  function mockLLMValidResponse() {
    mockLLMResponse([
      { pageNumber: 1, masculine: "{{CHILD_NAME}} boy text", feminine: "{{CHILD_NAME}} girl text" },
      { pageNumber: 2, masculine: "{{CHILD_NAME}} boy text 2", feminine: "{{CHILD_NAME}} girl text 2" },
    ]);
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

  test("English generation still writes variant docs and readiness immediately, not a 'pending_review' state", async () => {
    templateDocData.generationConfig = { language: "en" };
    mockLLMValidResponse();

    await generateTextVariants(TEMPLATE_ID);

    expect(batchSets).toHaveLength(2);
    const page1 = batchSets.find((s) => s.ref.endsWith("/1"))!;
    expect((page1.data as { masculine: string }).masculine).toBe("{{CHILD_NAME}} boy text");

    const templateUpdate = batchUpdates.find((u) => u.ref === `story_templates/${TEMPLATE_ID}`)!;
    expect(templateUpdate.data.textVariantStatus).toBe("none");
    expect(templateUpdate.data.textPersonalizationReady).toBe(true);
  });
});

// ── Placeholder requirements are page-specific / source-text-specific ────────
//
// A placeholder is only required in a page's variants if it actually appears
// in that page's original text. A short descriptive page that never mentions
// the protagonist must not be blocked for lacking {{CHILD_NAME}}.

describe("placeholder validation is derived from each page's original text", () => {
  test("scene-setting page with no {{CHILD_NAME}} in source and none in the variant → succeeds", async () => {
    templateDocData.pages = [
      makeTemplatePage(1, "הגננת הניחה על השולחן צנצנות קטנות."),
      makeTemplatePage(2, "[CHILD_NAME] מצא אומץ."),
    ];
    mockLLMResponse([
      { pageNumber: 1, masculine: "הגננת הניחה על השולחן צנצנות קטנות.", feminine: "הגננת הניחה על השולחן צנצנות קטנות." },
      { pageNumber: 2, masculine: "{{CHILD_NAME}} מצא אומץ.", feminine: "{{CHILD_NAME}} מצאה אומץ." },
    ]);

    await expect(generateTextVariants(TEMPLATE_ID)).resolves.toBeUndefined();
    const templateUpdate = batchUpdates.find((u) => u.ref === `story_templates/${TEMPLATE_ID}`)!;
    expect(templateUpdate.data.textPersonalizationReady).toBe(true);
  });

  test("source has {{CHILD_NAME}}-equivalent [CHILD_NAME] bracket token; a variant drops it → aborts", async () => {
    mockLLMResponse([
      { pageNumber: 1, masculine: "ילד בלי פלייסהולדר", feminine: "{{CHILD_NAME}} ילדה" },
      { pageNumber: 2, masculine: "{{CHILD_NAME}} מצא אומץ.", feminine: "{{CHILD_NAME}} מצאה אומץ." },
    ]);

    await expect(generateTextVariants(TEMPLATE_ID)).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
  });

  test("mixed template: one scene-setting page + one protagonist page, both valid → succeeds", async () => {
    templateDocData.pages = [
      makeTemplatePage(1, "הגננת הניחה על השולחן צנצנות קטנות."),
      makeTemplatePage(2, "[CHILD_NAME] הרגיש פחד."),
    ];
    mockLLMResponse([
      { pageNumber: 1, masculine: "הגננת הניחה על השולחן צנצנות קטנות.", feminine: "הגננת הניחה על השולחן צנצנות קטנות." },
      { pageNumber: 2, masculine: "{{CHILD_NAME}} הרגיש פחד.", feminine: "{{CHILD_NAME}} הרגישה פחד." },
    ]);

    await expect(generateTextVariants(TEMPLATE_ID)).resolves.toBeUndefined();
  });
});

// ── Error cases unrelated to placeholder validation ──────────────────────────

describe("generateTextVariants — other error cases", () => {
  test("throws NOT_PERSONALIZABLE when personalizationEnabled is not true", async () => {
    templateDocData.personalizationEnabled = false;

    await expect(generateTextVariants(TEMPLATE_ID)).rejects.toMatchObject({
      code: "NOT_PERSONALIZABLE",
    });
  });

  test("throws TEMPLATE_NOT_FOUND when the template doesn't exist", async () => {
    templateDocData = null as unknown as DocData;

    await expect(generateTextVariants(TEMPLATE_ID)).rejects.toMatchObject({
      code: "TEMPLATE_NOT_FOUND",
    });
  });

  test("resets textVariantStatus to 'none' and rejects when the LLM call throws", async () => {
    mockCallLLM.mockRejectedValue(new Error("LLM unavailable"));

    await expect(generateTextVariants(TEMPLATE_ID)).rejects.toMatchObject({
      code: "GENERATION_FAILED",
    });
    expect(directUpdates[directUpdates.length - 1]).toEqual({ textVariantStatus: "none" });
  });
});
