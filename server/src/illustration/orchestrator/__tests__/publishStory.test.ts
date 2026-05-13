/** @jest-environment node */

import { PublishStoryError, publishStory } from "../publishStory";
import * as artefactStore from "@/illustration/shared/artefact-store";
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
});
