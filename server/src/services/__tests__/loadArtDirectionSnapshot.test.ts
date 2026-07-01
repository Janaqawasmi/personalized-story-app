/** @jest-environment node */

/**
 * Tests for loadArtDirectionSnapshot — the function that resolves whether the
 * art-direction snapshot is inline (artDirectionStoredInline=true) or in the
 * personalizationArtefacts subcollection (artDirectionStoredInline=false).
 *
 * Coverage requirements (Phase 5 fix #2):
 *   - artDirectionStoredInline=true  → returns template.artDirectionSnapshot
 *   - artDirectionStoredInline=false → loads from subcollection
 *   - artDirectionStoredInline=false + doc absent → throws SNAPSHOT_SUBCOLLECTION_MISSING
 *   - artDirectionStoredInline=true  + snapshot null → throws SNAPSHOT_INLINE_NULL
 *   - artDirectionStoredInline=undefined (pre-Phase-1) → throws SNAPSHOT_NOT_CAPTURED
 */

jest.mock("@/config/firebase", () => ({
  db: { collection: jest.fn() },
}));

import { db } from "@/config/firebase";
import {
  loadArtDirectionSnapshot,
  ArtDirectionSnapshotNotReadyError,
} from "../loadArtDirectionSnapshot";
import type { ArtDirectionSnapshot, StoryTemplate } from "@/shared/types/storyTemplate";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const SAMPLE_SNAPSHOT: ArtDirectionSnapshot = {
  styleGuide: "soft watercolor palette",
  consistencyAnchors: ["round face", "blue cardigan"],
  environmentRegistry: {},
  palette: "navy, cream, warm gold",
  avoidList: ["no text", "no violence"],
  pages: [
    {
      pageNumber: 1,
      emotionalIntent: "child feels safe",
      structuredPrompt: {
        setting: "forest_path",
        character: "standing at fork, right hand on tree",
        focalPoint: "child face",
        composition: "low wide",
        lighting: "dappled morning light",
      },
    },
  ],
};

/**
 * Builds a minimal template fixture; spread in the specific artDirectionStoredInline
 * value you want to test.
 */
function makeTemplate(overrides: Partial<StoryTemplate>): StoryTemplate {
  return {
    draftId: "d1",
    briefId: "b1",
    title: "Test Story",
    status: "approved",
    primaryTopic: "fear_anxiety",
    specificSituation: "first day of school",
    ageGroup: "5-7",
    generationConfig: { language: "he", targetAgeGroup: "5-7", length: "short", tone: "warm", emphasis: "coping" },
    approvedBy: "u1",
    approvedAt: "2025-01-01",
    revisionCount: 1,
    isActive: true,
    isPublished: true,
    pages: [],
    slug: "test-story",
    shortDescription: { he: "תיאור" },
    coverImageUrl: "",
    displayTopic: { he: "חרדה" },
    purchaseCount: 0,
    previewPageCount: 2,
    totalPageCount: 8,
    publishedAt: null,
    personalizationEnabled: true,
    visualPersonalizationReady: true,
    ...overrides,
  } as StoryTemplate;
}

/**
 * Wires up the Firestore mock chain:
 *   db.collection(X).doc(Y).collection(Z).doc(W).get() → resolves with `result`
 */
function mockSubcollectionGet(result: { exists: boolean; data?: () => unknown }) {
  const mockGet = jest.fn().mockResolvedValue(result);
  const mockInnerDoc = jest.fn().mockReturnValue({ get: mockGet });
  const mockInnerCollection = jest.fn().mockReturnValue({ doc: mockInnerDoc });
  const mockOuterDoc = jest.fn().mockReturnValue({ collection: mockInnerCollection });
  (db.collection as jest.Mock).mockReturnValue({ doc: mockOuterDoc });
  return { mockGet, mockInnerDoc, mockInnerCollection, mockOuterDoc };
}

// ─────────────────────────────────────────────────────────────────────────────
// artDirectionStoredInline = true  (inline path)
// ─────────────────────────────────────────────────────────────────────────────

describe("loadArtDirectionSnapshot — inline (artDirectionStoredInline=true)", () => {
  test("returns template.artDirectionSnapshot when present", async () => {
    const template = makeTemplate({
      artDirectionStoredInline: true,
      artDirectionSnapshot: SAMPLE_SNAPSHOT,
    });
    const result = await loadArtDirectionSnapshot(template, "tmpl-1");
    expect(result).toBe(SAMPLE_SNAPSHOT);
  });

  test("does NOT call Firestore when snapshot is inline", async () => {
    const template = makeTemplate({
      artDirectionStoredInline: true,
      artDirectionSnapshot: SAMPLE_SNAPSHOT,
    });
    await loadArtDirectionSnapshot(template, "tmpl-1");
    expect(db.collection).not.toHaveBeenCalled();
  });

  test("throws SNAPSHOT_INLINE_NULL when artDirectionSnapshot is null", async () => {
    const template = makeTemplate({
      artDirectionStoredInline: true,
      artDirectionSnapshot: null,
    });
    await expect(loadArtDirectionSnapshot(template, "tmpl-null")).rejects.toMatchObject({
      name: "ArtDirectionSnapshotNotReadyError",
      reason: "SNAPSHOT_INLINE_NULL",
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// artDirectionStoredInline = false  (subcollection path)
// ─────────────────────────────────────────────────────────────────────────────

describe("loadArtDirectionSnapshot — subcollection (artDirectionStoredInline=false)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("loads and returns snapshot from personalizationArtefacts/snapshot", async () => {
    mockSubcollectionGet({ exists: true, data: () => SAMPLE_SNAPSHOT });

    const template = makeTemplate({ artDirectionStoredInline: false });
    const result = await loadArtDirectionSnapshot(template, "tmpl-sub");
    expect(result).toEqual(SAMPLE_SNAPSHOT);
  });

  test("reads from story_templates/{templateId}/personalizationArtefacts/snapshot", async () => {
    const { mockOuterDoc, mockInnerCollection, mockInnerDoc } = mockSubcollectionGet({
      exists: true,
      data: () => SAMPLE_SNAPSHOT,
    });

    const template = makeTemplate({ artDirectionStoredInline: false });
    await loadArtDirectionSnapshot(template, "tmpl-sub-42");

    expect(db.collection).toHaveBeenCalledWith("story_templates");
    expect(mockOuterDoc).toHaveBeenCalledWith("tmpl-sub-42");
    expect(mockInnerCollection).toHaveBeenCalledWith("personalizationArtefacts");
    expect(mockInnerDoc).toHaveBeenCalledWith("snapshot");
  });

  test("throws SNAPSHOT_SUBCOLLECTION_MISSING when the subcollection doc does not exist", async () => {
    mockSubcollectionGet({ exists: false });

    const template = makeTemplate({ artDirectionStoredInline: false });
    await expect(loadArtDirectionSnapshot(template, "tmpl-missing")).rejects.toMatchObject({
      name: "ArtDirectionSnapshotNotReadyError",
      reason: "SNAPSHOT_SUBCOLLECTION_MISSING",
    });
  });

  test("error message includes templateId", async () => {
    mockSubcollectionGet({ exists: false });

    const template = makeTemplate({ artDirectionStoredInline: false });
    await expect(loadArtDirectionSnapshot(template, "tmpl-id-xyz")).rejects.toThrow("tmpl-id-xyz");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// artDirectionStoredInline = undefined  (pre-Phase-1 template)
// ─────────────────────────────────────────────────────────────────────────────

describe("loadArtDirectionSnapshot — pre-Phase-1 template (artDirectionStoredInline=undefined)", () => {
  test("throws SNAPSHOT_NOT_CAPTURED", async () => {
    const template = makeTemplate({}); // artDirectionStoredInline not set
    delete (template as Partial<StoryTemplate>).artDirectionStoredInline;

    await expect(loadArtDirectionSnapshot(template, "tmpl-old")).rejects.toMatchObject({
      name: "ArtDirectionSnapshotNotReadyError",
      reason: "SNAPSHOT_NOT_CAPTURED",
    });
  });

  test("does NOT call Firestore for pre-Phase-1 templates", async () => {
    const template = makeTemplate({});
    delete (template as Partial<StoryTemplate>).artDirectionStoredInline;

    await expect(loadArtDirectionSnapshot(template, "tmpl-old")).rejects.toThrow();
    expect(db.collection).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ArtDirectionSnapshotNotReadyError shape
// ─────────────────────────────────────────────────────────────────────────────

describe("ArtDirectionSnapshotNotReadyError", () => {
  test("is an instance of Error", () => {
    const err = new ArtDirectionSnapshotNotReadyError("SNAPSHOT_NOT_CAPTURED", "msg");
    expect(err).toBeInstanceOf(Error);
  });

  test("has name ArtDirectionSnapshotNotReadyError", () => {
    const err = new ArtDirectionSnapshotNotReadyError("SNAPSHOT_INLINE_NULL", "msg");
    expect(err.name).toBe("ArtDirectionSnapshotNotReadyError");
  });

  test("exposes reason field", () => {
    const err = new ArtDirectionSnapshotNotReadyError("SNAPSHOT_SUBCOLLECTION_MISSING", "msg");
    expect(err.reason).toBe("SNAPSHOT_SUBCOLLECTION_MISSING");
  });
});
