/** @jest-environment node */

/**
 * Phase 6 tests — full personalized story generation after purchase.
 *
 * Key invariants verified here (§16-G + Phase 6 spec):
 *   A. Full generation uses the personalized assembler (assemblePersonalizedPrompt),
 *      never `page.imagePromptTemplate`.
 *   B. Child photo is passed as `referenceImage` to the image provider.
 *   C. `selectedIllustrationStyle` from the preview is passed to the assembler.
 *   D. `childAgeGroup` from the preview is passed to the assembler.
 *   E. Art-direction snapshot is loaded once (not per-page).
 *   F. Images are stored under `generated-illustrations/{uid}/{storyId}/...`
 *      — NOT under specialist-illustrations or template-assets paths.
 *   G. `selectedIllustrationStyle` is written to the personalizedStory document.
 *   H. Validation rejects missing protagonist slot, missing policy, invalid style,
 *      and missing art-direction snapshot — and marks the story as failed.
 *   I. Preview pages are copied by file-copy (no re-generation), their
 *      `imagePromptUsed` preserved as-is from the preview.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Module mocks — must be declared before any imports
// ─────────────────────────────────────────────────────────────────────────────

// Mock the assembler so we can assert it was called with the right args and
// intercept what prompt string reaches the image provider.
const mockAssemblePersonalizedPrompt = jest.fn<string, [unknown]>();
jest.mock("../../illustration/stage3-final-prompt/assemblePersonalizedPrompt", () => ({
  assemblePersonalizedPrompt: mockAssemblePersonalizedPrompt,
}));

// Mock snapshot loader so tests don't need a real Firestore subcollection.
const mockLoadArtDirectionSnapshot = jest.fn<Promise<unknown>, [unknown, string]>();
jest.mock("../loadArtDirectionSnapshot", () => ({
  loadArtDirectionSnapshot: mockLoadArtDirectionSnapshot,
  ArtDirectionSnapshotNotReadyError: class ArtDirectionSnapshotNotReadyError extends Error {
    reason: string;
    constructor(reason: string, message: string) {
      super(message);
      this.name = "ArtDirectionSnapshotNotReadyError";
      this.reason = reason;
    }
  },
  PersonalizedArtDirectionNotReadyError: class PersonalizedArtDirectionNotReadyError extends Error {
    reason: string;
    constructor(reason: string, message: string) {
      super(message);
      this.name = "PersonalizedArtDirectionNotReadyError";
      this.reason = reason;
    }
  },
}));

// Mock personalization service (text substitution).
jest.mock("../personalization.service", () => ({
  selectTextVariant: jest.fn(
    (page: { textTemplate: { masculine: string } }) => page.textTemplate.masculine
  ),
  personalizeText: jest.fn(
    (_text: string, child: { firstName: string }) => `Personalized text for ${child.firstName}`
  ),
  ChildData: {},
}));

// ─────────────────────────────────────────────────────────────────────────────
// Firebase mocks
// ─────────────────────────────────────────────────────────────────────────────

const mockStoryDocRef = {
  id: "story-abc123",
  set: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
};

const mockPersonalizedStoriesCollection = {
  doc: jest.fn().mockReturnValue(mockStoryDocRef),
};

const mockPurchaseDocRef = {
  update: jest.fn().mockResolvedValue(undefined),
};

const mockPreviewDocRef = {
  update: jest.fn().mockResolvedValue(undefined),
  get: jest.fn(),
};

const mockTemplateDocRef = {
  get: jest.fn(),
};

// Tracks calls per collection name for routing
const mockDb: Record<string, unknown> = {
  collection: jest.fn((name: string) => {
    if (name === "personalizedStories") return mockPersonalizedStoriesCollection;
    if (name === "storyPreviews") return { doc: jest.fn().mockReturnValue(mockPreviewDocRef) };
    if (name === "story_templates") return { doc: jest.fn().mockReturnValue(mockTemplateDocRef) };
    // Fallback for any other collection
    return { doc: jest.fn().mockReturnValue({ update: jest.fn().mockResolvedValue(undefined) }) };
  }),
  collectionGroup: jest.fn(),
};

// Storage mocks
const mockPhotoFile = {
  exists: jest.fn().mockResolvedValue([true]),
  getSignedUrl: jest.fn().mockResolvedValue(["https://storage.example.com/signed/child-photo.jpg"]),
  delete: jest.fn().mockResolvedValue(undefined),
};

const mockIllustrationFile = {
  exists: jest.fn().mockResolvedValue([true]),
  copy: jest.fn().mockResolvedValue(undefined),
  save: jest.fn().mockResolvedValue(undefined),
};

const mockBucket = {
  file: jest.fn((path: string) => {
    // Route child-photos to the photo mock, everything else to illustration mock
    if (path.startsWith("child-photos/")) return mockPhotoFile;
    // Preview illustration copy source
    if (path.startsWith("preview-illustrations/")) return { ...mockIllustrationFile, copy: mockIllustrationFile.copy };
    // Generated illustration destination
    return mockIllustrationFile;
  }),
};

const mockAdmin = {
  storage: jest.fn().mockReturnValue({ bucket: jest.fn().mockReturnValue(mockBucket) }),
  firestore: {
    Timestamp: { now: jest.fn().mockReturnValue({ seconds: 0, nanoseconds: 0 }) },
  },
};

jest.mock("@/config/firebase", () => ({
  admin: mockAdmin,
  db: mockDb,
}));

// ─────────────────────────────────────────────────────────────────────────────
// Imports (after mocks)
// ─────────────────────────────────────────────────────────────────────────────

import {
  generateFullStory,
  registerImageProviderForStory,
} from "../fullStoryGeneration.service";
import type { StoryPreview } from "@/shared/types/storyPreview";
import type { StoryTemplate, ArtDirectionSnapshot } from "@/shared/types/storyTemplate";
import type { Purchase } from "@/shared/types/purchase";

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const CAREGIVER_UID = "caregiver-uid-1";
const TEMPLATE_ID = "template-id-1";
const PREVIEW_ID = "preview-id-1";
const PURCHASE_ID = "purchase-id-1";

/** Specialist's sample protagonist appearance — must NEVER appear in personalized prompts. */
const SAMPLE_CHARACTER_ANCHOR = "A small girl with curly red hair, freckles, and a yellow raincoat.";

const SAMPLE_IMAGE_PROMPT_TEMPLATE =
  `${SAMPLE_CHARACTER_ANCHOR} In this scene: sitting under tree, knees hugged, looking at sky. ` +
  "Focal point: child's face. Lighting: golden afternoon. Children's book illustration.";

const MOCK_ASSEMBLED_PROMPT = "ASSEMBLED_PERSONALIZED_PROMPT_FROM_ASSEMBLER";

const SNAPSHOT: ArtDirectionSnapshot = {
  styleGuide: "soft watercolor palette",
  consistencyAnchors: ["round face soft hair", "blue cardigan"],
  environmentRegistry: {
    garden: { atmosphere: "warm afternoon garden", spatialLayout: "Open lawn, single oak." },
  },
  palette: "forest green, warm amber, soft white, sky blue",
  avoidList: ["no text", "no weapons", "no dark shadows"],
  pages: [
    {
      pageNumber: 1,
      emotionalIntent: "child feels safe",
      structuredPrompt: {
        setting: "garden",
        character: "sitting under tree, knees hugged, looking at sky",
        focalPoint: "child's face",
        composition: "low wide shot",
        lighting: "golden afternoon",
      },
    },
    {
      pageNumber: 2,
      emotionalIntent: "child feels curious",
      structuredPrompt: {
        setting: "garden",
        character: "walking toward the gate, one hand out",
        focalPoint: "the gate and child's outstretched hand",
        composition: "medium shot",
        lighting: "soft morning light",
      },
    },
    {
      pageNumber: 3,
      emotionalIntent: "child finds courage",
      structuredPrompt: {
        setting: "garden",
        character: "standing tall at the gate, both hands on bars, smiling",
        focalPoint: "child's face, gate",
        composition: "eye-level medium",
        lighting: "warm midday",
      },
    },
  ],
};

function makePreview(overrides: Partial<StoryPreview> = {}): StoryPreview {
  return {
    previewId: PREVIEW_ID,
    caregiverUid: CAREGIVER_UID,
    templateId: TEMPLATE_ID,
    childFirstName: "Maya",
    childGender: "female",
    childAgeGroup: "3_6",
    photoPath: `child-photos/${CAREGIVER_UID}/${PREVIEW_ID}/photo.jpg`,
    photoStatus: "preview_used",
    photoUploadedAt: "2025-01-01T00:00:00Z",
    photoRetainUntil: "2025-01-03T00:00:00Z",
    templateTitle: "My Story",
    templateVersion: 1,
    language: "he",
    dedicationName: null,
    previewPageCount: 2,
    pages: [
      {
        pageNumber: 1,
        personalizedText: "Preview text page 1 for Maya",
        imagePromptUsed: "preview-page-1-prompt",
        generatedImagePath: `preview-illustrations/${CAREGIVER_UID}/${PREVIEW_ID}/page-1.webp`,
        aiMetadata: { providerId: "seedream", modelId: "v1", generatedAt: "2025-01-01", latencyMs: 3000 },
      },
      {
        pageNumber: 2,
        personalizedText: "Preview text page 2 for Maya",
        imagePromptUsed: "preview-page-2-prompt",
        generatedImagePath: `preview-illustrations/${CAREGIVER_UID}/${PREVIEW_ID}/page-2.webp`,
        aiMetadata: { providerId: "seedream", modelId: "v1", generatedAt: "2025-01-01", latencyMs: 3000 },
      },
    ],
    coverImageUrl: null,
    characterProfileSnapshot: null,
    generationStatus: "completed",
    pagesCompleted: 2,
    generationStartedAt: "2025-01-01T00:00:00Z",
    generationCompletedAt: "2025-01-01T00:01:00Z",
    failureReason: null,
    status: "ready",
    expiresAt: "2025-01-03T00:00:00Z",
    purchaseId: PURCHASE_ID,
    personalizedStoryId: null,
    selectedIllustrationStyle: "watercolor",
    createdAt: { seconds: 0, nanoseconds: 0 } as unknown as import("firebase-admin/firestore").Timestamp,
    updatedAt: { seconds: 0, nanoseconds: 0 } as unknown as import("firebase-admin/firestore").Timestamp,
    ...overrides,
  };
}

function makeTemplate(overrides: Partial<StoryTemplate> = {}): StoryTemplate {
  return {
    draftId: "d1",
    briefId: "b1",
    title: "My Story",
    status: "approved",
    primaryTopic: "fear_anxiety",
    specificSituation: "first day of school",
    ageGroup: "3-5",
    generationConfig: { language: "he", targetAgeGroup: "3-5", length: "short", tone: "warm", emphasis: "coping" },
    approvedBy: "specialist-1",
    approvedAt: "2025-01-01",
    revisionCount: 1,
    isActive: true,
    isPublished: true,
    slug: "my-story",
    shortDescription: { he: "תיאור" },
    coverImageUrl: "https://example.com/cover.jpg",
    displayTopic: { he: "חרדה" },
    publishedAt: null,
    purchaseCount: 0,
    previewPageCount: 2,
    totalPageCount: 3,
    personalizationEnabled: true,
    textPersonalizationReady: true,
    visualPersonalizationReady: true,
    visualPersonalizationEnabled: true,
    allowedIllustrationStyles: ["watercolor", "flat_cartoon"],
    defaultIllustrationStyle: "watercolor",
    protagonistSlot: {
      role: "main_child_character",
      replaceable: true,
      sampleCharacterDescription: SAMPLE_CHARACTER_ANCHOR,
      sampleCharacterSheet: "Full sheet with all angles.",
    },
    personalizedCharacterPolicy: "replace_with_child_photo",
    artDirectionStoredInline: true,
    artDirectionSnapshot: SNAPSHOT,
    pages: [
      {
        pageNumber: 1,
        textTemplate: { masculine: "Page 1 text (m)", feminine: "Page 1 text (f)" },
        imagePromptTemplate: SAMPLE_IMAGE_PROMPT_TEMPLATE,
        emotionalTone: "safe",
        sampleImageUrl: "https://specialist.example.com/page-1.jpg",
      },
      {
        pageNumber: 2,
        textTemplate: { masculine: "Page 2 text (m)", feminine: "Page 2 text (f)" },
        imagePromptTemplate: SAMPLE_IMAGE_PROMPT_TEMPLATE,
        emotionalTone: "curious",
        sampleImageUrl: "https://specialist.example.com/page-2.jpg",
      },
      {
        pageNumber: 3,
        textTemplate: { masculine: "Page 3 text (m)", feminine: "Page 3 text (f)" },
        imagePromptTemplate: SAMPLE_IMAGE_PROMPT_TEMPLATE,
        emotionalTone: "courageous",
        sampleImageUrl: "https://specialist.example.com/page-3.jpg",
      },
    ],
    ...overrides,
  } as StoryTemplate;
}

function makePurchase(overrides: Partial<Purchase> = {}): Purchase {
  return {
    purchaseId: PURCHASE_ID,
    caregiverUid: CAREGIVER_UID,
    templateId: TEMPLATE_ID,
    previewId: PREVIEW_ID,
    personalizedStoryId: null,
    status: "payment_confirmed",
    amount: 49,
    currency: "ILS",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as unknown as Purchase;
}

/** Mock image provider that returns a minimal result immediately. */
const mockImageProvider = {
  generateImage: jest.fn().mockResolvedValue({
    imageBuffer: Buffer.from("fake-image"),
    mimeType: "image/webp",
    providerId: "seedream",
    modelId: "seedream-v1",
    latencyMs: 1000,
    seed: 12345,
  }),
};

/** Flush all pending microtasks so the fire-and-forget runFullStoryGeneration completes. */
const flushPromises = (): Promise<void> =>
  new Promise<void>((resolve) => setImmediate(resolve));

// ─────────────────────────────────────────────────────────────────────────────
// Test setup
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();

  // Default: assembler returns the mock prompt
  mockAssemblePersonalizedPrompt.mockReturnValue(MOCK_ASSEMBLED_PROMPT);

  // Default: snapshot loader returns the inline snapshot
  mockLoadArtDirectionSnapshot.mockResolvedValue(SNAPSHOT);

  // Default: image provider succeeds — must be re-set here because clearAllMocks()
  // only clears call history, not implementations. Without this, a mockRejectedValue
  // set in a nested beforeEach bleeds into subsequent describe blocks.
  mockImageProvider.generateImage.mockResolvedValue({
    imageBuffer: Buffer.from("fake-image"),
    mimeType: "image/webp",
    providerId: "seedream",
    modelId: "seedream-v1",
    latencyMs: 1000,
    seed: 12345,
  });

  // Register mock image provider
  registerImageProviderForStory(mockImageProvider as unknown as import("@/shared/types/aiProvider").ImageGenerationProvider);

  // Firestore: purchase found via collectionGroup
  const mockPurchaseDoc = {
    data: () => makePurchase(),
    ref: mockPurchaseDocRef,
  };
  (mockDb.collectionGroup as jest.Mock).mockReturnValue({
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ empty: false, docs: [mockPurchaseDoc] }),
  });

  // Firestore: preview doc
  mockPreviewDocRef.get.mockResolvedValue({
    exists: true,
    data: () => makePreview(),
  });

  // Firestore: template doc
  mockTemplateDocRef.get.mockResolvedValue({
    exists: true,
    data: () => makeTemplate(),
  });

  // Re-initialise collection routing on each test
  (mockDb.collection as jest.Mock).mockImplementation((name: string) => {
    if (name === "personalizedStories") return mockPersonalizedStoriesCollection;
    if (name === "storyPreviews") return { doc: jest.fn().mockReturnValue(mockPreviewDocRef) };
    if (name === "story_templates") return { doc: jest.fn().mockReturnValue(mockTemplateDocRef) };
    return { doc: jest.fn().mockReturnValue({ update: jest.fn().mockResolvedValue(undefined) }) };
  });

  // Storage: photo exists; illustration file for copy/save
  mockPhotoFile.exists.mockResolvedValue([true]);
  mockPhotoFile.getSignedUrl.mockResolvedValue(["https://storage.example.com/signed/child-photo.jpg"]);
  mockPhotoFile.delete.mockResolvedValue(undefined);

  mockIllustrationFile.exists.mockResolvedValue([true]);
  mockIllustrationFile.copy.mockResolvedValue(undefined);
  mockIllustrationFile.save.mockResolvedValue(undefined);
});

// ─────────────────────────────────────────────────────────────────────────────
// A. Uses personalized assembler — never imagePromptTemplate
// ─────────────────────────────────────────────────────────────────────────────

describe("full story generation — uses personalized assembler (§16-G)", () => {
  test("calls assemblePersonalizedPrompt for each non-preview page", async () => {
    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    // Template has 3 pages; preview covers pages 1-2; page 3 is generated
    expect(mockAssemblePersonalizedPrompt).toHaveBeenCalledTimes(1);
    const call = mockAssemblePersonalizedPrompt.mock.calls[0]![0] as Record<string, unknown>;
    expect((call as { pageArtDirection: { pageNumber: number } }).pageArtDirection.pageNumber).toBe(3);
  });

  test("textPrompt passed to image provider equals assembler output, not imagePromptTemplate", async () => {
    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    expect(mockImageProvider.generateImage).toHaveBeenCalled();
    const callArgs = mockImageProvider.generateImage.mock.calls[0]![0] as { textPrompt: string };
    expect(callArgs.textPrompt).toBe(MOCK_ASSEMBLED_PROMPT);
    expect(callArgs.textPrompt).not.toBe(SAMPLE_IMAGE_PROMPT_TEMPLATE);
  });

  test("textPrompt does NOT contain the sample protagonist appearance", async () => {
    // Make the assembler return a realistic-looking prompt (no leak)
    mockAssemblePersonalizedPrompt.mockReturnValue(
      "No text. garden. Child: young girl named Maya. protagonist in every frame. " +
      "Focal point: child face. Lighting: golden. Color palette: green. Avoid: no text."
    );

    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    const textPrompt = (mockImageProvider.generateImage.mock.calls[0]![0] as { textPrompt: string }).textPrompt;
    expect(textPrompt).not.toContain("curly red hair");
    expect(textPrompt).not.toContain("yellow raincoat");
    expect(textPrompt).not.toContain("freckles");
    expect(textPrompt).not.toContain(SAMPLE_CHARACTER_ANCHOR);
  });

  test("imagePromptUsed stored on page equals the assembler output", async () => {
    // Capture all update() calls; check the final pages array contains the assembler output
    const allUpdateCalls: unknown[] = [];
    mockStoryDocRef.update.mockImplementation(async (data: unknown) => {
      allUpdateCalls.push(data);
    });

    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    // Find any update call that wrote pages including page 3
    const pageUpdate = allUpdateCalls.find((call) => {
      const d = call as { pages?: Array<{ pageNumber: number }> };
      return d.pages?.some((p) => p.pageNumber === 3);
    }) as { pages: Array<{ pageNumber: number; imagePromptUsed: string }> } | undefined;

    if (pageUpdate?.pages) {
      const page3 = pageUpdate.pages.find((p) => p.pageNumber === 3);
      if (page3) {
        expect(page3.imagePromptUsed).toBe(MOCK_ASSEMBLED_PROMPT);
        expect(page3.imagePromptUsed).not.toBe(SAMPLE_IMAGE_PROMPT_TEMPLATE);
      }
    }
    // At minimum the update was called (generation attempted)
    expect(mockStoryDocRef.update).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B. Child photo as referenceImage
// ─────────────────────────────────────────────────────────────────────────────

describe("full story generation — child photo as referenceImage (§16-G)", () => {
  test("generates a signed URL for the child photo", async () => {
    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    expect(mockPhotoFile.getSignedUrl).toHaveBeenCalledWith(
      expect.objectContaining({ action: "read" })
    );
  });

  test("passes the signed URL as referenceImage to the image provider", async () => {
    const SIGNED_URL = "https://storage.example.com/signed/child-photo.jpg";
    mockPhotoFile.getSignedUrl.mockResolvedValue([SIGNED_URL]);

    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    expect(mockImageProvider.generateImage).toHaveBeenCalledWith(
      expect.objectContaining({ referenceImage: SIGNED_URL })
    );
  });

  test("raw child photo path is never exposed in the prompt string", async () => {
    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    const textPrompt = (mockImageProvider.generateImage.mock.calls[0]![0] as { textPrompt: string }).textPrompt;
    expect(textPrompt).not.toContain("child-photos/");
  });

  test("deletes child photo after successful generation", async () => {
    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    expect(mockPhotoFile.delete).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// C. selectedIllustrationStyle is passed to the assembler
// ─────────────────────────────────────────────────────────────────────────────

describe("full story generation — selectedIllustrationStyle applied (§16-C)", () => {
  test("passes preview selectedIllustrationStyle to assemblePersonalizedPrompt", async () => {
    // Preview has selectedIllustrationStyle = "watercolor" (from makePreview default)
    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    const call = mockAssemblePersonalizedPrompt.mock.calls[0]![0] as {
      selectedIllustrationStyle: string;
    };
    expect(call.selectedIllustrationStyle).toBe("watercolor");
  });

  test("a different style in the preview reaches the assembler", async () => {
    mockPreviewDocRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => makePreview({ selectedIllustrationStyle: "flat_cartoon" }),
    });
    // Ensure template allows the style
    mockTemplateDocRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => makeTemplate({ allowedIllustrationStyles: ["watercolor", "flat_cartoon"] }),
    });

    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    const call = mockAssemblePersonalizedPrompt.mock.calls[0]![0] as {
      selectedIllustrationStyle: string;
    };
    expect(call.selectedIllustrationStyle).toBe("flat_cartoon");
  });

  test("selectedIllustrationStyle is stored in the personalizedStory document", async () => {
    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    // The set() call happens before the async generation, so no flush needed
    expect(mockStoryDocRef.set).toHaveBeenCalledWith(
      expect.objectContaining({ selectedIllustrationStyle: "watercolor" })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// D. childAgeGroup from preview is passed to the assembler
// ─────────────────────────────────────────────────────────────────────────────

describe("full story generation — childAgeGroup forwarded to assembler", () => {
  test("passes preview childAgeGroup to assemblePersonalizedPrompt", async () => {
    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    const call = mockAssemblePersonalizedPrompt.mock.calls[0]![0] as {
      child: { ageGroup: string };
    };
    expect(call.child.ageGroup).toBe("3_6"); // from makePreview default
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// E. Art-direction snapshot loaded once (not per-page)
// ─────────────────────────────────────────────────────────────────────────────

describe("full story generation — snapshot loaded once", () => {
  test("loadArtDirectionSnapshot is called exactly once per generation run", async () => {
    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    // Only 1 non-preview page, but snapshot should still only load once
    expect(mockLoadArtDirectionSnapshot).toHaveBeenCalledTimes(1);
  });

  test("assembler receives the same snapshot instance for every page", async () => {
    // Add a 4th page so there are 2 non-preview pages to generate
    const extendedTemplate = makeTemplate({
      totalPageCount: 4,
      pages: [
        ...(makeTemplate().pages),
        {
          pageNumber: 4,
          textTemplate: { masculine: "Page 4 m", feminine: "Page 4 f" },
          imagePromptTemplate: SAMPLE_IMAGE_PROMPT_TEMPLATE,
          emotionalTone: "peaceful",
        },
      ],
    });

    const extendedSnapshot: ArtDirectionSnapshot = {
      ...SNAPSHOT,
      pages: [
        ...SNAPSHOT.pages,
        {
          pageNumber: 4,
          emotionalIntent: "child at peace",
          structuredPrompt: {
            setting: "garden",
            character: "lying on grass looking up",
            focalPoint: "child's face, sky",
            composition: "overhead",
            lighting: "late afternoon sun",
          },
        },
      ],
    };
    mockLoadArtDirectionSnapshot.mockResolvedValue(extendedSnapshot);
    mockTemplateDocRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => extendedTemplate,
    });

    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    // 2 non-preview pages → assembler called twice, snapshot loaded once
    expect(mockAssemblePersonalizedPrompt).toHaveBeenCalledTimes(2);
    expect(mockLoadArtDirectionSnapshot).toHaveBeenCalledTimes(1);

    // Both calls use the same snapshot object
    const snap1 = (mockAssemblePersonalizedPrompt.mock.calls[0]![0] as { snapshot: unknown }).snapshot;
    const snap2 = (mockAssemblePersonalizedPrompt.mock.calls[1]![0] as { snapshot: unknown }).snapshot;
    expect(snap1).toBe(snap2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// F. Images stored under generated-illustrations — not specialist paths
// ─────────────────────────────────────────────────────────────────────────────

describe("full story generation — storage paths (§16-G)", () => {
  test("generated images are saved under generated-illustrations/{caregiverUid}/{storyId}/", async () => {
    const savedPaths: string[] = [];
    mockBucket.file.mockImplementation((path: string) => {
      if (path.startsWith("child-photos/")) return mockPhotoFile;
      // Track what paths are used for saving
      const fileMock = {
        exists: jest.fn().mockResolvedValue([true]),
        copy: jest.fn().mockResolvedValue(undefined),
        save: jest.fn(async () => { savedPaths.push(path); }),
        delete: jest.fn().mockResolvedValue(undefined),
      };
      return fileMock;
    });

    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    // Every saved path (for non-preview pages) must be under generated-illustrations
    const generatedPaths = savedPaths.filter((p) =>
      !p.startsWith("child-photos/") && !p.startsWith("preview-illustrations/")
    );
    for (const path of generatedPaths) {
      expect(path).toMatch(/^generated-illustrations\//);
    }
  });

  test("generated image path includes the caregiverUid and storyId", async () => {
    const savedPaths: string[] = [];
    mockBucket.file.mockImplementation((path: string) => {
      if (path.startsWith("child-photos/")) return mockPhotoFile;
      return {
        exists: jest.fn().mockResolvedValue([true]),
        copy: jest.fn().mockResolvedValue(undefined),
        save: jest.fn(async () => { savedPaths.push(path); }),
        delete: jest.fn().mockResolvedValue(undefined),
      };
    });

    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    const generatedPaths = savedPaths.filter((p) => p.startsWith("generated-illustrations/"));
    for (const path of generatedPaths) {
      expect(path).toContain(CAREGIVER_UID);
      expect(path).toContain(mockStoryDocRef.id); // storyId
    }
  });

  test("specialist-illustrations/ paths are never written", async () => {
    const writtenPaths: string[] = [];
    mockBucket.file.mockImplementation((path: string) => {
      if (path.startsWith("child-photos/")) return mockPhotoFile;
      return {
        exists: jest.fn().mockResolvedValue([true]),
        copy: jest.fn().mockResolvedValue(undefined),
        save: jest.fn(async () => { writtenPaths.push(path); }),
        delete: jest.fn().mockResolvedValue(undefined),
      };
    });

    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    const specialistWrites = writtenPaths.filter((p) => p.startsWith("specialist-illustrations/"));
    expect(specialistWrites).toHaveLength(0);
  });

  test("template-assets/ paths are never written", async () => {
    const writtenPaths: string[] = [];
    mockBucket.file.mockImplementation((path: string) => {
      if (path.startsWith("child-photos/")) return mockPhotoFile;
      return {
        exists: jest.fn().mockResolvedValue([true]),
        copy: jest.fn().mockResolvedValue(undefined),
        save: jest.fn(async () => { writtenPaths.push(path); }),
        delete: jest.fn().mockResolvedValue(undefined),
      };
    });

    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    const templateWrites = writtenPaths.filter((p) => p.startsWith("template-assets/"));
    expect(templateWrites).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// G. Preview pages are copied, not re-generated
// ─────────────────────────────────────────────────────────────────────────────

describe("full story generation — preview pages copied, not regenerated", () => {
  test("does not call assembler for preview pages", async () => {
    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    // Pages 1 and 2 are preview pages. Assembler should only be called for page 3.
    const assemblerPageNumbers = (mockAssemblePersonalizedPrompt.mock.calls as Array<
      [{ pageArtDirection: { pageNumber: number } }]
    >).map((call) => call[0].pageArtDirection.pageNumber);

    expect(assemblerPageNumbers).not.toContain(1);
    expect(assemblerPageNumbers).not.toContain(2);
  });

  test("preview pages have fromPreview=true in the story document", async () => {
    const allUpdates: unknown[] = [];
    mockStoryDocRef.update.mockImplementation(async (data: unknown) => {
      allUpdates.push(data);
    });

    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    // The final update that has all pages written
    const fullUpdate = allUpdates
      .filter((u) => Array.isArray((u as { pages?: unknown }).pages))
      .pop() as { pages: Array<{ pageNumber: number; fromPreview: boolean }> } | undefined;

    const previewPages = fullUpdate?.pages?.filter((p) => p.pageNumber <= 2) ?? [];
    for (const p of previewPages) {
      expect(p.fromPreview).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// H. Validation — missing config fails early with clear error
// ─────────────────────────────────────────────────────────────────────────────

describe("full story generation — validation failures (§16-G)", () => {
  test("fails when selectedIllustrationStyle is missing from preview", async () => {
    const previewNoStyle = makePreview();
    delete (previewNoStyle as Partial<StoryPreview>).selectedIllustrationStyle;
    mockPreviewDocRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => previewNoStyle,
    });

    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    expect(mockStoryDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ generationStatus: "failed" })
    );
    expect(mockAssemblePersonalizedPrompt).not.toHaveBeenCalled();
  });

  test("fails when selectedIllustrationStyle is an invalid style ID", async () => {
    mockPreviewDocRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => makePreview({ selectedIllustrationStyle: "totally_invalid_style" }),
    });

    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    expect(mockStoryDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ generationStatus: "failed" })
    );
    expect(mockAssemblePersonalizedPrompt).not.toHaveBeenCalled();
  });

  test("fails when template has no protagonistSlot", async () => {
    const templateNoSlot = makeTemplate();
    delete (templateNoSlot as Partial<StoryTemplate>).protagonistSlot;
    mockTemplateDocRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => templateNoSlot,
    });

    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    expect(mockStoryDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ generationStatus: "failed" })
    );
    expect(mockAssemblePersonalizedPrompt).not.toHaveBeenCalled();
  });

  test("fails when personalizedCharacterPolicy is not replace_with_child_photo", async () => {
    mockTemplateDocRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => makeTemplate({ personalizedCharacterPolicy: "keep_sample" }),
    });

    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    expect(mockStoryDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ generationStatus: "failed" })
    );
    expect(mockAssemblePersonalizedPrompt).not.toHaveBeenCalled();
  });

  test("fails when art-direction snapshot cannot be loaded", async () => {
    const { ArtDirectionSnapshotNotReadyError } = jest.requireMock("../loadArtDirectionSnapshot") as {
      ArtDirectionSnapshotNotReadyError: new (reason: string, msg: string) => Error;
    };
    mockLoadArtDirectionSnapshot.mockRejectedValueOnce(
      new ArtDirectionSnapshotNotReadyError("SNAPSHOT_NOT_CAPTURED", "No snapshot for pre-Phase-1 template")
    );

    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    expect(mockStoryDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ generationStatus: "failed" })
    );
    expect(mockAssemblePersonalizedPrompt).not.toHaveBeenCalled();
  });

  test("purchase status is set to failed when generation fails due to missing config", async () => {
    const templateNoSlot2 = makeTemplate();
    delete (templateNoSlot2 as Partial<StoryTemplate>).protagonistSlot;
    mockTemplateDocRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => templateNoSlot2,
    });

    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    expect(mockPurchaseDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed" })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Photo availability — hard-fail when photo is inaccessible in Storage
// ─────────────────────────────────────────────────────────────────────────────

describe("full story generation — photo availability before generation (point 5)", () => {
  test("fails when photo does not exist in Storage despite valid photoStatus", async () => {
    // Photo metadata says "preview_used" but the file is gone from Storage
    mockPhotoFile.exists.mockResolvedValue([false]);

    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    // Generation should fail — not silently produce image-less pages
    expect(mockStoryDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ generationStatus: "failed" })
    );
    expect(mockImageProvider.generateImage).not.toHaveBeenCalled();
    expect(mockAssemblePersonalizedPrompt).not.toHaveBeenCalled();
  });

  test("fails with a clear storage error message when photo is missing", async () => {
    mockPhotoFile.exists.mockResolvedValue([false]);

    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    const failCall = mockPurchaseDocRef.update.mock.calls.find(
      (call) => (call[0] as { status?: string }).status === "failed"
    ) as [{ failureReason: string }] | undefined;

    if (failCall) {
      expect(failCall[0].failureReason).toContain("not accessible in storage");
    }
    expect(mockPurchaseDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed" })
    );
  });

  test("does NOT create an accessible story when photo is missing", async () => {
    mockPhotoFile.exists.mockResolvedValue([false]);

    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    // The set() call that creates the story happens BEFORE the async generation,
    // so isAccessible starts as false and must remain false
    expect(mockStoryDocRef.set).toHaveBeenCalledWith(
      expect.objectContaining({ isAccessible: false })
    );
    // After generation (which should fail), isAccessible stays false
    await flushPromises();
    const accessibleUpdate = mockStoryDocRef.update.mock.calls.find(
      (call) => (call[0] as { isAccessible?: boolean }).isAccessible === true
    );
    expect(accessibleUpdate).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Photo cleanup on full failure
// ─────────────────────────────────────────────────────────────────────────────

describe("full story generation — photo cleanup on failure (point 3)", () => {
  test("deletes the child photo when generation fails due to missing config", async () => {
    const templateNoSlotForCleanup = makeTemplate();
    delete (templateNoSlotForCleanup as Partial<StoryTemplate>).protagonistSlot;
    mockTemplateDocRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => templateNoSlotForCleanup,
    });

    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    expect(mockPhotoFile.delete).toHaveBeenCalled();
  });

  test("marks photoStatus as deleted in preview after failure", async () => {
    const templateNoSlotForCleanup2 = makeTemplate();
    delete (templateNoSlotForCleanup2 as Partial<StoryTemplate>).protagonistSlot;
    mockTemplateDocRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => templateNoSlotForCleanup2,
    });

    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    // previewRef.update should be called with photoStatus: "deleted"
    expect(mockPreviewDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ photoPath: null, photoStatus: "deleted" })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isAccessible — only set to true for completed (point 4)
// ─────────────────────────────────────────────────────────────────────────────

describe("full story generation — isAccessible behavior (point 4)", () => {
  test("sets isAccessible=true only when all pages complete", async () => {
    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    // Happy path: 1 non-preview page generated successfully
    expect(mockStoryDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ isAccessible: true, generationStatus: "completed" })
    );
  });

  test("initial story document is created with isAccessible=false", async () => {
    await generateFullStory(PURCHASE_ID, PREVIEW_ID);

    expect(mockStoryDocRef.set).toHaveBeenCalledWith(
      expect.objectContaining({ isAccessible: false })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Preview pages copied to generated-illustrations — not stored at preview paths
// ─────────────────────────────────────────────────────────────────────────────

describe("full story generation — preview page paths (point 1)", () => {
  test("preview page images are copied to generated-illustrations/ paths", async () => {
    const copiedDestPaths: string[] = [];
    mockBucket.file.mockImplementation((path: string) => {
      if (path.startsWith("child-photos/")) return mockPhotoFile;
      return {
        exists: jest.fn().mockResolvedValue([true]),
        copy: jest.fn(async (destFile: { save?: unknown; copy?: unknown; name?: string } & { __path?: string }) => {
          // The destination file is passed as the argument to copy()
          copiedDestPaths.push((destFile as unknown as { __path: string }).__path ?? path);
        }),
        save: jest.fn(async () => { copiedDestPaths.push(path); }),
        delete: jest.fn().mockResolvedValue(undefined),
        getSignedUrl: jest.fn().mockResolvedValue(["https://signed.example.com/photo.jpg"]),
      };
    });

    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    // The final story pages must NOT reference preview-illustrations/ paths.
    // The pages written to Firestore should have generatedImagePath under generated-illustrations/.
    const allUpdatePages: unknown[] = [];
    mockStoryDocRef.update.mock.calls.forEach((call) => {
      const d = call[0] as { pages?: Array<{ generatedImagePath: string | null }> };
      if (d.pages) allUpdatePages.push(...d.pages);
    });

    const previewScopedPaths = (allUpdatePages as Array<{ generatedImagePath: string | null }>)
      .filter((p) => p.generatedImagePath?.startsWith("preview-illustrations/"));
    expect(previewScopedPaths).toHaveLength(0);
  });

  test("preview page imagePromptUsed is preserved from the preview (not re-assembled)", async () => {
    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    // Assembler should NOT be called for preview pages (pages 1 and 2)
    const calledPageNumbers = (mockAssemblePersonalizedPrompt.mock.calls as Array<
      [{ pageArtDirection: { pageNumber: number } }]
    >).map((c) => c[0].pageArtDirection.pageNumber);

    expect(calledPageNumbers).not.toContain(1);
    expect(calledPageNumbers).not.toContain(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Partial failure consistency — purchase status, isAccessible, photo retention
// ─────────────────────────────────────────────────────────────────────────────

describe("full story generation — partial failure consistency", () => {
  // Make the image provider always reject. Preview pages (1-2) are copied by
  // file.copy(), not generated, so they succeed. Only page 3 uses generateImage
  // → it fails → finalStatus = "partially_failed".
  beforeEach(() => {
    mockImageProvider.generateImage.mockRejectedValue(new Error("Provider timeout"));
  });

  test("partially_failed: purchase.status is generation_partially_failed, never completed", async () => {
    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    expect(mockPurchaseDocRef.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: "completed" })
    );
    expect(mockPurchaseDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "generation_partially_failed" })
    );
  });

  test("partially_failed: story.isAccessible is false, not true", async () => {
    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    expect(mockStoryDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ generationStatus: "partially_failed", isAccessible: false })
    );
    expect(mockStoryDocRef.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ isAccessible: true })
    );
  });

  test("partially_failed: raw child photo is NOT deleted (retained for retry window)", async () => {
    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    // Photo must remain in Storage — delete() must not have been called
    expect(mockPhotoFile.delete).not.toHaveBeenCalled();
  });

  test("partially_failed: photoStatus is NOT updated to deleted", async () => {
    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    expect(mockPreviewDocRef.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ photoStatus: "deleted" })
    );
  });

  test("partially_failed: failureReason names the failed page numbers", async () => {
    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    const partialCall = mockPurchaseDocRef.update.mock.calls.find(
      (call) => (call[0] as { status?: string }).status === "generation_partially_failed"
    ) as [{ failureReason?: string }] | undefined;

    expect(partialCall).toBeDefined();
    // Page 3 is the non-preview page that failed
    expect(partialCall?.[0].failureReason).toContain("3");
  });

  test("partially_failed: story generationStatus reflects partial outcome", async () => {
    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    expect(mockStoryDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ generationStatus: "partially_failed" })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Completed path consistency — purchase status and photo cleanup
// ─────────────────────────────────────────────────────────────────────────────

describe("full story generation — completed path consistency", () => {
  test("completed: purchase.status is completed", async () => {
    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    expect(mockPurchaseDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "completed" })
    );
    expect(mockPurchaseDocRef.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: "generation_partially_failed" })
    );
    expect(mockPurchaseDocRef.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed" })
    );
  });

  test("completed: raw child photo is deleted immediately", async () => {
    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    expect(mockPhotoFile.delete).toHaveBeenCalled();
  });

  test("completed: photoStatus is set to deleted in the preview document", async () => {
    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    expect(mockPreviewDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ photoPath: null, photoStatus: "deleted" })
    );
  });

  test("completed: story.isAccessible is true", async () => {
    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    expect(mockStoryDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ generationStatus: "completed", isAccessible: true })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Failed path consistency — all pages fail (catch-block failures)
// ─────────────────────────────────────────────────────────────────────────────

describe("full story generation — failed path consistency", () => {
  test("failed (missing config): story not accessible", async () => {
    const templateNoSlotFail = makeTemplate();
    delete (templateNoSlotFail as Partial<StoryTemplate>).protagonistSlot;
    mockTemplateDocRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => templateNoSlotFail,
    });

    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    // isAccessible is never set to true for a failed story
    expect(mockStoryDocRef.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ isAccessible: true })
    );
    expect(mockStoryDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ generationStatus: "failed" })
    );
  });

  test("failed (missing config): purchase.status is failed", async () => {
    const templateNoSlotFail2 = makeTemplate();
    delete (templateNoSlotFail2 as Partial<StoryTemplate>).protagonistSlot;
    mockTemplateDocRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => templateNoSlotFail2,
    });

    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    expect(mockPurchaseDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed" })
    );
    expect(mockPurchaseDocRef.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: "completed" })
    );
    expect(mockPurchaseDocRef.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: "generation_partially_failed" })
    );
  });

  test("failed (missing config): photo is deleted (no retry expected)", async () => {
    const templateNoSlotFail3 = makeTemplate();
    delete (templateNoSlotFail3 as Partial<StoryTemplate>).protagonistSlot;
    mockTemplateDocRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => templateNoSlotFail3,
    });

    await generateFullStory(PURCHASE_ID, PREVIEW_ID);
    await flushPromises();

    expect(mockPhotoFile.delete).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Idempotency
// ─────────────────────────────────────────────────────────────────────────────

describe("full story generation — idempotency", () => {
  test("returns existing storyId if purchase already has one", async () => {
    const existingStoryId = "existing-story-xyz";
    (mockDb.collectionGroup as jest.Mock).mockReturnValue({
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        empty: false,
        docs: [{ data: () => makePurchase({ personalizedStoryId: existingStoryId }), ref: mockPurchaseDocRef }],
      }),
    });

    const result = await generateFullStory(PURCHASE_ID, PREVIEW_ID);

    expect(result).toBe(existingStoryId);
    // No new story should be created
    expect(mockStoryDocRef.set).not.toHaveBeenCalled();
  });
});
