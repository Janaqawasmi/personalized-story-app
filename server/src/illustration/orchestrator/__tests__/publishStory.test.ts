/** @jest-environment node */

import { PublishStoryError, publishStory } from "../publishStory";
import * as artefactStore from "@/illustration/shared/artefact-store";
import * as referenceDataService from "@/services/referenceData.service";
import { firestore } from "@/config/firebase";

jest.mock("@/config/firebase", () => ({
  admin: { firestore: { FieldValue: { arrayUnion: jest.fn((...a: unknown[]) => ({ _arrayUnion: a })) } } },
  firestore: {
    collection: jest.fn(),
    batch: jest.fn(),
  },
}));

jest.mock("@/illustration/shared/artefact-store", () => ({
  readLatestImage: jest.fn(),
  readLatestFinalPrompt: jest.fn(),
  readScenePlan: jest.fn(),
  readLatestVisualBible: jest.fn(),
}));

jest.mock("@/services/referenceData.service", () => ({
  checkReferenceItem: jest.fn(),
}));

const readLatestImageMock = artefactStore.readLatestImage as jest.MockedFunction<
  typeof artefactStore.readLatestImage
>;

describe("publishStory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("rejects when story is not illustration_ready", async () => {
    const storyRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          ownerUid: "u1",
          status: "illustration_workspace",
          title: "T",
          brief: {
            ageAndScope: { ageRange: "5-7", storyLength: "short", peakIntensity: "moderate" },
            clinicalFoundation: { trigger: "x", creativeVision: "cv" },
            therapeuticArchitecture: {
              primaryApproach: "normalization",
              shameDimension: "not_significant",
            },
            storyWorld: { personalization: false },
          },
          agent1Versions: [],
          illustrationPages: [],
        }),
      }),
    };
    (firestore.collection as jest.Mock).mockReturnValue({ doc: () => storyRef });

    await expect(publishStory({ storyId: "s1", uid: "u1" })).rejects.toMatchObject({
      code: "INVALID_STATE",
    });
    expect(readLatestImageMock).not.toHaveBeenCalled();
  });

  describe("shortDescription / displayTopic localization (English support)", () => {
    const HEBREW_CREATIVE_VISION = "שועל אמיץ לומד להתמודד עם החושך";

    function setUpReadyStory() {
      const storyData = {
        ownerUid: "u1",
        status: "illustration_ready",
        title: "The Brave Fox",
        brief: {
          storyType: "fear_anxiety",
          outputLanguage: "he",
          ageAndScope: { ageRange: "5-7", storyLength: "short", peakIntensity: "moderate" },
          clinicalFoundation: { trigger: "x", creativeVision: HEBREW_CREATIVE_VISION },
          therapeuticArchitecture: {
            primaryApproach: "normalization",
            shameDimension: "not_significant",
          },
          storyWorld: { personalization: false },
        },
        agent1Versions: [],
        illustrationPages: [
          {
            pageNumber: 1,
            text: "Page one text.",
            currentScenePlanVersion: null,
            currentImageVersion: 1,
            status: "approved",
            pendingJobId: null,
            lastError: null,
          },
        ],
      };

      const storyRef = {
        get: jest.fn().mockResolvedValue({ exists: true, data: () => storyData }),
      };
      const templateRef = { id: "tmpl1" };
      let capturedTemplate: Record<string, unknown> | undefined;
      const batchMock = {
        set: jest.fn((_ref: unknown, data: Record<string, unknown>) => {
          capturedTemplate = data;
        }),
        update: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
      };

      (firestore.collection as jest.Mock).mockImplementation((name: string) => {
        if (name === "stories") {
          return { doc: () => storyRef };
        }
        return {
          doc: () => templateRef,
          where: () => ({ limit: () => ({ get: async () => ({ empty: true }) }) }),
        };
      });
      (firestore.batch as jest.Mock).mockReturnValue(batchMock);

      const imageArtefact = {
        pageNumber: 1,
        version: 1,
        reviewStatus: "approved",
        publicUrl: "https://example.com/p1.png",
      };
      (artefactStore.readLatestImage as jest.Mock).mockResolvedValue(imageArtefact);
      (artefactStore.readLatestFinalPrompt as jest.Mock).mockResolvedValue(null);
      (artefactStore.readScenePlan as jest.Mock).mockResolvedValue(null);
      (artefactStore.readLatestVisualBible as jest.Mock).mockResolvedValue(null);
      (referenceDataService.checkReferenceItem as jest.Mock).mockResolvedValue({
        exists: true,
        active: true,
      });

      return { getCapturedTemplate: () => capturedTemplate };
    }

    test("writes the English short description and display topic from the request body", async () => {
      const { getCapturedTemplate } = setUpReadyStory();

      await publishStory({
        storyId: "s1",
        uid: "u1",
        body: {
          shortDescriptionEn: "  A brave fox learns to face the dark.  ",
          displayTopicEn: "  Fear of the dark  ",
          situationId: "sit1",
        },
      });

      const template = getCapturedTemplate();
      // Brief has no explicit `briefLanguage`, so it defaults to Hebrew — only
      // `he` may fall back to the brief's creative vision; `ar` must stay
      // blank rather than being mislabeled as an Arabic translation.
      expect(template?.["shortDescription"]).toEqual({
        he: HEBREW_CREATIVE_VISION,
        ar: "",
        en: "A brave fox learns to face the dark.",
      });
      expect(template?.["displayTopic"]).toEqual({
        he: "",
        ar: "",
        en: "Fear of the dark",
      });
    });

    test("leaves Arabic and English short description blank instead of falling back to Hebrew brief text", async () => {
      const { getCapturedTemplate } = setUpReadyStory();

      await publishStory({
        storyId: "s1",
        uid: "u1",
        body: { situationId: "sit1" },
      });

      const template = getCapturedTemplate();
      const shortDescription = template?.["shortDescription"] as { he: string; ar: string; en: string };
      expect(shortDescription.he).toBe(HEBREW_CREATIVE_VISION);
      expect(shortDescription.ar).toBe("");
      expect(shortDescription.en).toBe("");
      const displayTopic = template?.["displayTopic"] as { he: string; ar: string; en: string };
      expect(displayTopic.en).toBe("");
    });

    test("falls back to the brief's creative vision only for the story's actual briefLanguage (Arabic)", async () => {
      const { getCapturedTemplate } = setUpReadyStory();
      const ARABIC_CREATIVE_VISION = "ثعلب شجاع يتعلم مواجهة الظلام";
      (firestore.collection as jest.Mock).mockImplementation((name: string) => {
        if (name === "stories") {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  ownerUid: "u1",
                  status: "illustration_ready",
                  title: "The Brave Fox",
                  brief: {
                    storyType: "fear_anxiety",
                    briefLanguage: "ar",
                    outputLanguage: "ar",
                    ageAndScope: { ageRange: "5-7", storyLength: "short", peakIntensity: "moderate" },
                    clinicalFoundation: { trigger: "x", creativeVision: ARABIC_CREATIVE_VISION },
                    therapeuticArchitecture: {
                      primaryApproach: "normalization",
                      shameDimension: "not_significant",
                    },
                    storyWorld: { personalization: false },
                  },
                  agent1Versions: [],
                  illustrationPages: [
                    {
                      pageNumber: 1,
                      text: "Page one text.",
                      currentScenePlanVersion: null,
                      currentImageVersion: 1,
                      status: "approved",
                      pendingJobId: null,
                      lastError: null,
                    },
                  ],
                }),
              }),
            }),
          };
        }
        return {
          doc: () => ({ id: "tmpl1" }),
          where: () => ({ limit: () => ({ get: async () => ({ empty: true }) }) }),
        };
      });
      const batchMock = {
        set: jest.fn(),
        update: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
      };
      (firestore.batch as jest.Mock).mockReturnValue(batchMock);

      await publishStory({ storyId: "s1", uid: "u1", body: { situationId: "sit1" } });

      const captured = batchMock.set.mock.calls[0]?.[1] as Record<string, unknown> | undefined;
      const shortDescription = captured?.["shortDescription"] as { he: string; ar: string; en: string };
      expect(shortDescription.ar).toBe(ARABIC_CREATIVE_VISION);
      expect(shortDescription.he).toBe("");
      expect(shortDescription.en).toBe("");
    });
  });
});
