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
) {
  const key = `${TEMPLATE_ID}:page:${pageNumber}`;
  variantDocs[key] = {
    pageNumber,
    masculine,
    feminine,
    reviewStatus,
    originalText: "original",
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
