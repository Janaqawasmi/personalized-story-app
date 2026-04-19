import type { DocumentReference } from "firebase-admin/firestore";
import { admin, db } from "../config/firebase";
import { COLLECTIONS, STORAGE_PATHS } from "../shared/firestore/paths";
import { storyTemplateConverter } from "../shared/firestore/converters";
import { StoryPreview, PreviewPage, PreviewStatus } from "../shared/types/storyPreview";
import { StoryTemplate } from "../shared/types/storyTemplate";
import { ImageGenerationProvider, ImageGenerationResult } from "../shared/types/aiProvider";
import {
  ChildData,
  personalizeText,
  selectTextVariant,
  buildImagePrompt,
} from "./personalization.service";
import { AgeGroup, Gender } from "../shared/types/common";

const PHOTO_RETAIN_HOURS = 48;

/** Max previews per caregiver (free tier). */
export const MAX_PREVIEWS_PER_USER = 1;
/** Max template pages generated per preview — matches client reader preview gate. */
export const PREVIEW_SPREAD_LIMIT = 2;

export class PreviewQuotaError extends Error {
  constructor(
    public code: "FREE_PREVIEW_ALREADY_USED" | "TEMPLATE_NOT_FOUND" | "TEMPLATE_INACTIVE",
    message: string,
    public existingPreviewId?: string
  ) {
    super(message);
    this.name = "PreviewQuotaError";
  }
}

export interface GeneratePreviewInput {
  caregiverUid: string;
  templateId: string;
  childFirstName: string;
  childGender: Gender;
  childAgeGroup: AgeGroup;
  dedicationName?: string;
  photoBuffer: Buffer;
  photoMimeType: string;
}

function getImageProvider(): ImageGenerationProvider {
  const providerModule = process.env.IMAGE_PROVIDER ?? "default";
  throw new Error(
    `Image generation provider "${providerModule}" is not configured. ` +
      `Set IMAGE_PROVIDER env var and register the provider implementation.`
  );
}

let _imageProvider: ImageGenerationProvider | null = null;

export function registerImageProvider(provider: ImageGenerationProvider): void {
  _imageProvider = provider;
}

function requireImageProvider(): ImageGenerationProvider {
  if (!_imageProvider) {
    return getImageProvider();
  }
  return _imageProvider;
}

async function uploadChildPhoto(params: {
  caregiverUid: string;
  previewId: string;
  buffer: Buffer;
  mimeType: string;
}): Promise<string> {
  const extMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const ext = extMap[params.mimeType.toLowerCase()] ?? "jpg";
  const filename = `${Date.now()}.${ext}`;
  const storagePath = STORAGE_PATHS.childPhoto(params.caregiverUid, params.previewId, filename);

  const bucket = admin.storage().bucket();
  const file = bucket.file(storagePath);
  await file.save(params.buffer, {
    metadata: { contentType: params.mimeType },
  });
  return storagePath;
}

async function markPreviewFailed(
  previewRef: DocumentReference,
  caregiverRef: DocumentReference,
  reason: string,
  updateCaregiverQuota: boolean
): Promise<void> {
  const batch = db.batch();
  batch.update(previewRef, {
    status: "failed" as PreviewStatus,
    generationStatus: "failed",
    failureReason: reason,
    updatedAt: admin.firestore.Timestamp.now(),
  });
  if (updateCaregiverQuota) {
    batch.set(
      caregiverRef,
      {
        freePreviewStatus: "failed",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }
  await batch.commit();
}

/**
 * Atomically claims the one free preview slot and creates the preview document.
 * Async generation runs after the transaction commits.
 */
export async function generatePreview(
  input: GeneratePreviewInput
): Promise<{ previewId: string; status: PreviewStatus }> {
  const {
    caregiverUid,
    templateId,
    childFirstName,
    childGender,
    childAgeGroup,
    dedicationName,
    photoBuffer,
    photoMimeType,
  } = input;

  const templateDoc = await db
    .collection(COLLECTIONS.STORY_TEMPLATES)
    .withConverter(storyTemplateConverter)
    .doc(templateId)
    .get();

  if (!templateDoc.exists) {
    throw new PreviewQuotaError("TEMPLATE_NOT_FOUND", "Story template not found.");
  }
  const template = templateDoc.data()!;

  if (!template.isActive || !template.isPublished) {
    throw new PreviewQuotaError("TEMPLATE_INACTIVE", "Story template is not available.");
  }

  const caregiverRef = db.collection(COLLECTIONS.CAREGIVERS).doc(caregiverUid);
  const previewRef = db.collection(COLLECTIONS.STORY_PREVIEWS).doc();

  const { claimedPreviewId, trackCaregiverQuota } = await db.runTransaction(async (tx) => {
    const caregiverSnap = await tx.get(caregiverRef);
    const caregiver = caregiverSnap.exists ? caregiverSnap.data()! : ({} as Record<string, unknown>);
    const isUnlimited = caregiver.unlimitedPreviews === true;
    const g = caregiver as Record<string, unknown>;

    if (caregiver.freePreviewUsed === true && !isUnlimited) {
      const existingId = (g.freePreviewId ?? g.freePreviewPreviewId) as string | undefined;
      throw new PreviewQuotaError(
        "FREE_PREVIEW_ALREADY_USED",
        "You have already used your free preview.",
        existingId
      );
    }

    const now = admin.firestore.Timestamp.now();
    const pagesLen = template.pages?.length ?? 0;
    const initialPreview: Omit<StoryPreview, "previewId"> & { previewId: string } = {
      previewId: previewRef.id,
      caregiverUid,
      templateId,
      childFirstName: childFirstName.trim(),
      childGender,
      childAgeGroup,
      photoPath: null,
      photoStatus: "pending",
      photoUploadedAt: null,
      photoRetainUntil: null,
      templateTitle: template.title,
      templateVersion: template.revisionCount ?? 1,
      language: template.generationConfig.language,
      dedicationName: dedicationName ?? null,
      previewPageCount: Math.min(PREVIEW_SPREAD_LIMIT, pagesLen),
      pages: [],
      coverImageUrl: template.coverImageUrl ?? null,
      characterProfileSnapshot: null,
      generationStatus: "pending",
      pagesCompleted: 0,
      generationStartedAt: null,
      generationCompletedAt: null,
      failureReason: null,
      status: "created",
      expiresAt: null,
      purchaseId: null,
      personalizedStoryId: null,
      createdAt: now,
      updatedAt: now,
    };

    tx.set(previewRef, initialPreview);

    if (!isUnlimited) {
      tx.set(
        caregiverRef,
        {
          freePreviewUsed: true,
          freePreviewUsedAt: admin.firestore.FieldValue.serverTimestamp(),
          freePreviewId: previewRef.id,
          freePreviewStatus: "claimed",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    return { claimedPreviewId: previewRef.id, trackCaregiverQuota: !isUnlimited };
  });

  const childData: ChildData = {
    firstName: childFirstName.trim(),
    gender: childGender,
  };

  try {
    const photoPath = await uploadChildPhoto({
      caregiverUid,
      previewId: claimedPreviewId,
      buffer: photoBuffer,
      mimeType: photoMimeType,
    });

    const nowIso = new Date().toISOString();
    await previewRef.update({
      photoPath,
      photoStatus: "uploaded",
      photoUploadedAt: nowIso,
      status: "generating",
      generationStatus: "in_progress",
      generationStartedAt: nowIso,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    generatePreviewPages(
      claimedPreviewId,
      caregiverUid,
      childData,
      template,
      photoBuffer,
      trackCaregiverQuota
    ).catch(async (err) => {
      console.error(`[preview ${claimedPreviewId}] generation failed`, err);
      await markPreviewFailed(
        previewRef,
        caregiverRef,
        err instanceof Error ? err.message : "Generation failed",
        trackCaregiverQuota
      );
    });
  } catch (err) {
    await markPreviewFailed(previewRef, caregiverRef, "Initial setup failed", trackCaregiverQuota);
    throw err;
  }

  return { previewId: claimedPreviewId, status: "generating" };
}

async function generatePreviewPages(
  previewId: string,
  caregiverUid: string,
  child: ChildData,
  template: StoryTemplate,
  photoBuffer: Buffer,
  trackCaregiverQuota: boolean
): Promise<void> {
  const previewRef = db.collection(COLLECTIONS.STORY_PREVIEWS).doc(previewId);
  const caregiverRef = db.collection(COLLECTIONS.CAREGIVERS).doc(caregiverUid);
  const previewPageCount = Math.min(PREVIEW_SPREAD_LIMIT, template.pages.length);
  const language = template.generationConfig.language;
  const completedPages: PreviewPage[] = [];

  try {
    let imageProvider: ImageGenerationProvider | null = null;
    try {
      imageProvider = requireImageProvider();
    } catch (e) {
      console.warn(`Image provider unavailable; generating text-only preview for ${previewId}.`, e);
      imageProvider = null;
    }

    for (let i = 0; i < previewPageCount && i < template.pages.length; i++) {
      const page = template.pages[i]!;

      const rawText = selectTextVariant(page, child.gender);
      const personalizedText = personalizeText(rawText, child, language);

      const imagePrompt = buildImagePrompt(page.imagePromptTemplate, child);

      const startTime = Date.now();
      let imageResult: ImageGenerationResult;
      let generatedImagePath: string | null = null;

      try {
        if (!imageProvider) {
          throw new Error("Image provider not configured");
        }
        imageResult = await imageProvider.generateImage({
          textPrompt: imagePrompt,
          referenceImage: photoBuffer,
          style: page.emotionalTone,
          outputFormat: "webp",
          outputWidth: 1024,
          outputHeight: 1024,
        });

        const ext = imageResult.mimeType.split("/")[1] ?? "webp";
        const storagePath = STORAGE_PATHS.previewIllustration(
          caregiverUid,
          previewId,
          page.pageNumber,
          ext
        );
        const bucket = admin.storage().bucket();
        const file = bucket.file(storagePath);
        await file.save(imageResult.imageBuffer, {
          metadata: { contentType: imageResult.mimeType },
        });
        generatedImagePath = storagePath;
      } catch (imgError) {
        console.error(`Image generation failed for preview ${previewId}, page ${page.pageNumber}:`, imgError);
        imageResult = {
          imageBuffer: Buffer.alloc(0),
          mimeType: "image/webp",
          providerId: "failed",
          modelId: "failed",
          latencyMs: Date.now() - startTime,
        };
      }

      const previewPage: PreviewPage = {
        pageNumber: page.pageNumber,
        personalizedText,
        imagePromptUsed: imagePrompt,
        generatedImagePath,
        aiMetadata: generatedImagePath
          ? {
              providerId: imageResult.providerId,
              modelId: imageResult.modelId,
              generatedAt: new Date().toISOString(),
              latencyMs: imageResult.latencyMs,
            }
          : null,
      };

      completedPages.push(previewPage);

      await previewRef.update({
        pages: completedPages,
        pagesCompleted: completedPages.length,
        updatedAt: admin.firestore.Timestamp.now(),
      });
    }

    const retainUntil = new Date(Date.now() + PHOTO_RETAIN_HOURS * 60 * 60 * 1000).toISOString();
    const completedAt = new Date().toISOString();

    const batch = db.batch();
    batch.update(previewRef, {
      photoStatus: "preview_used",
      photoRetainUntil: retainUntil,
      generationStatus: "completed",
      generationCompletedAt: completedAt,
      status: "ready",
      expiresAt: retainUntil,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    if (trackCaregiverQuota) {
      batch.set(
        caregiverRef,
        {
          freePreviewStatus: "ready",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    await batch.commit();
  } catch (error) {
    console.error(`Preview generation failed for ${previewId}:`, error);
    const message = error instanceof Error ? error.message : "Unknown error";
    await markPreviewFailed(previewRef, caregiverRef, message, trackCaregiverQuota);
  }
}
