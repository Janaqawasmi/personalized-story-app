import { admin, db } from "../config/firebase";
import { COLLECTIONS, STORAGE_PATHS } from "../shared/firestore/paths";
import { storyTemplateConverter } from "../shared/firestore/converters";
import { StoryPreview, PreviewPage } from "../shared/types/storyPreview";
import { StoryTemplate } from "../shared/types/storyTemplate";
import { ImageGenerationProvider, ImageGenerationResult } from "../shared/types/aiProvider";
import {
  ChildData,
  personalizeText,
  selectTextVariant,
  buildImagePrompt,
} from "./personalization.service";
import { AgeGroup, Gender } from "../shared/types/common";

const MAX_ACTIVE_PREVIEWS = 5;
const PHOTO_RETAIN_HOURS = 48;
/** Max spreads (template pages) generated for storyPreviews — matches client reader preview gate. */
const PREVIEW_SPREAD_LIMIT = 2;
/** Enforce exactly one free preview per uid unless explicitly bypassed. */
const FREE_PREVIEW_LIMIT_PER_USER = 1;

/**
 * Read-only gate before creating a preview doc.
 * Quota is consumed later in consumeFreePreviewQuota() when status becomes "ready".
 */
async function assertFreePreviewQuotaAvailable(uid: string): Promise<void> {
  const userRef = db.collection(COLLECTIONS.CAREGIVERS).doc(uid);
  const snap = await userRef.get();
  const data = snap.exists ? (snap.data() as Record<string, unknown>) : {};

  if (data?.unlimitedPreviews === true) {
    return;
  }

  if (data?.freePreviewUsed === true) {
    const err: any = new Error(
      "You have already used your free preview. Please purchase a story to continue."
    );
    err.code = "FREE_PREVIEW_ALREADY_USED";
    throw err;
  }

  if (FREE_PREVIEW_LIMIT_PER_USER <= 0) {
    const err: any = new Error("Previews are currently disabled.");
    err.code = "FREE_PREVIEW_DISABLED";
    throw err;
  }
}

/**
 * Atomically records free-preview consumption when generation succeeds.
 * Idempotent for the same previewId; does not overwrite audit if another preview already consumed quota.
 */
async function consumeFreePreviewQuota(uid: string, previewId: string): Promise<void> {
  const userRef = db.collection(COLLECTIONS.CAREGIVERS).doc(uid);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const data = snap.exists ? (snap.data() as Record<string, unknown>) : {};

    if (data?.unlimitedPreviews === true) {
      return;
    }

    if (data?.freePreviewUsed === true) {
      const existingId = data?.freePreviewPreviewId as string | undefined;
      if (existingId === previewId) {
        return;
      }
      // Another preview already consumed the one free slot — do not clobber audit fields.
      console.warn(
        `[consumeFreePreviewQuota] uid=${uid} preview=${previewId}: quota already used by preview ${existingId ?? "(unknown)"}`
      );
      return;
    }

    tx.set(
      userRef,
      {
        freePreviewUsed: true,
        freePreviewUsedAt: admin.firestore.FieldValue.serverTimestamp(),
        freePreviewPreviewId: previewId,
        updatedAt: admin.firestore.Timestamp.now(),
      },
      { merge: true }
    );
  });
}

/**
 * Factory function to get the image generation provider.
 * Provider selection is driven by environment variable.
 */
function getImageProvider(): ImageGenerationProvider {
  const providerModule = process.env.IMAGE_PROVIDER ?? "default";
  // Provider implementations are injected via a factory pattern.
  // This throws if no provider is configured — intentional.
  throw new Error(
    `Image generation provider "${providerModule}" is not configured. ` +
    `Set IMAGE_PROVIDER env var and register the provider implementation.`
  );
}

let _imageProvider: ImageGenerationProvider | null = null;

/**
 * Register an image generation provider at startup.
 * Called by the application bootstrap / DI container.
 */
export function registerImageProvider(provider: ImageGenerationProvider): void {
  _imageProvider = provider;
}

function requireImageProvider(): ImageGenerationProvider {
  if (!_imageProvider) {
    return getImageProvider(); // Will throw with helpful message
  }
  return _imageProvider;
}

/**
 * Generates a short personalized preview (up to two spreads / template pages)
 * for a caregiver's child using a story template.
 *
 * Idempotency: If a non-expired, non-converted preview already exists
 * for the same child + template combination, returns the existing previewId.
 *
 * @returns previewId
 */
export async function generatePreview(
  params: {
    caregiverUid: string;
    templateId: string;
    childFirstName: string;
    childGender: Gender;
    childAgeGroup: AgeGroup;
    dedicationName?: string;
    photoBuffer: Buffer;
    photoMimeType: string;
  }
): Promise<string> {
  const {
    caregiverUid,
    templateId,
    childFirstName,
    childGender,
    childAgeGroup,
    dedicationName,
    photoBuffer,
    photoMimeType,
  } = params;

  const normalizedChildFirstName = childFirstName.trim();

  // 1. Check for existing duplicate preview (idempotency)
  const existingPreview = await findExistingPreview(
    caregiverUid,
    normalizedChildFirstName,
    childGender,
    templateId
  );
  if (existingPreview) {
    return existingPreview;
  }

  // 2. Free-preview quota (read-only — consumed only when preview reaches "ready")
  await assertFreePreviewQuotaAvailable(caregiverUid);

  // 3. Verify active preview limit (anti-abuse / cost governance)
  const activeCount = await countActivePreviews(caregiverUid);
  if (activeCount >= MAX_ACTIVE_PREVIEWS) {
    throw new Error(
      `Active preview limit reached (${MAX_ACTIVE_PREVIEWS}). ` +
      `Please wait for existing previews to expire or purchase them.`
    );
  }

  // 4. Allocate previewId before template load (no Firestore write until we know template exists)
  const previewRef = db.collection(COLLECTIONS.STORY_PREVIEWS).doc();
  const previewId = previewRef.id;

  // 5. Load story template
  const templateDoc = await db
    .collection(COLLECTIONS.STORY_TEMPLATES)
    .withConverter(storyTemplateConverter)
    .doc(templateId)
    .get();

  if (!templateDoc.exists) {
    throw new Error(`Story template not found: ${templateId}`);
  }
  const template = templateDoc.data()!;

  if (!template.isActive || !template.isPublished) {
    throw new Error(`Story template is not available: ${templateId}`);
  }

  // 6. Create preview document (photo lifecycle is owned by this preview)
  const now = new Date().toISOString();

  const previewData: Omit<StoryPreview, "previewId"> & { previewId: string } = {
    previewId,
    caregiverUid,
    templateId,
    childFirstName: normalizedChildFirstName,
    childGender,
    childAgeGroup,
    photoPath: null,
    photoStatus: "none",
    photoUploadedAt: null,
    photoRetainUntil: null,
    templateTitle: template.title,
    templateVersion: template.revisionCount,
    language: template.generationConfig.language,
    dedicationName: dedicationName ?? null,
    previewPageCount: Math.min(PREVIEW_SPREAD_LIMIT, template.pages.length),
    pages: [],
    coverImageUrl: template.coverImageUrl || null,
    generationStatus: "pending",
    pagesCompleted: 0,
    generationStartedAt: null,
    generationCompletedAt: null,
    failureReason: null,
    status: "created",
    expiresAt: null,
    purchaseId: null,
    personalizedStoryId: null,
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
  };

  await previewRef.set(previewData);

  // 7. Upload photo and mark preview as generating
  const extMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const ext = extMap[photoMimeType.toLowerCase()] ?? "jpg";
  const filename = `${Date.now()}.${ext}`;
  const storagePath = STORAGE_PATHS.childPhoto(caregiverUid, previewId, filename);

  const bucket = admin.storage().bucket();
  const file = bucket.file(storagePath);
  await file.save(photoBuffer, {
    metadata: { contentType: photoMimeType },
  });

  await previewRef.update({
    photoPath: storagePath,
    photoStatus: "uploaded",
    photoUploadedAt: now,
    status: "generating",
    generationStatus: "in_progress",
    generationStartedAt: now,
    updatedAt: admin.firestore.Timestamp.now(),
  });

  // 8. Generate preview pages asynchronously (fire-and-forget)
  const childData: ChildData = {
    firstName: normalizedChildFirstName,
    gender: childGender,
  };

  generatePreviewPages(previewId, caregiverUid, childData, template, photoBuffer).catch(
    (error) => {
      console.error(`Preview generation failed for ${previewId}:`, error);
    }
  );

  return previewId;
}

/**
 * Generates the actual preview pages (text personalization + image generation).
 * Updates Firestore in real-time as each page completes.
 */
async function generatePreviewPages(
  previewId: string,
  caregiverUid: string,
  child: ChildData,
  template: StoryTemplate,
  photoBuffer: Buffer
): Promise<void> {
  const previewRef = db.collection(COLLECTIONS.STORY_PREVIEWS).doc(previewId);
  const previewPageCount = Math.min(PREVIEW_SPREAD_LIMIT, template.pages.length);
  const language = template.generationConfig.language;
  const completedPages: PreviewPage[] = [];

  try {
    // If image provider isn't wired yet, we still generate text-only previews
    // (and set images to null). This prevents runtime hard-failures.
    let imageProvider: ImageGenerationProvider | null = null;
    try {
      imageProvider = requireImageProvider();
    } catch (e) {
      console.warn(
        `Image provider unavailable; generating text-only preview for ${previewId}.`,
        e
      );
      imageProvider = null;
    }

    for (let i = 0; i < previewPageCount && i < template.pages.length; i++) {
      const page = template.pages[i]!;

      // Text personalization
      const rawText = selectTextVariant(page, child.gender);
      const personalizedText = personalizeText(rawText, child, language);

      // Image prompt
      const imagePrompt = buildImagePrompt(page.imagePromptTemplate, child);

      // Generate image
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

        // Upload to Storage
        const ext = imageResult.mimeType.split("/")[1] ?? "webp";
        const storagePath = STORAGE_PATHS.previewIllustration(
          caregiverUid, previewId, page.pageNumber, ext
        );
        const bucket = admin.storage().bucket();
        const file = bucket.file(storagePath);
        await file.save(imageResult.imageBuffer, {
          metadata: { contentType: imageResult.mimeType },
        });
        generatedImagePath = storagePath;
      } catch (imgError) {
        console.error(`Image generation failed for preview ${previewId}, page ${page.pageNumber}:`, imgError);
        // Continue with null image — text is still valuable
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
        aiMetadata: generatedImagePath ? {
          providerId: imageResult.providerId,
          modelId: imageResult.modelId,
          generatedAt: new Date().toISOString(),
          latencyMs: imageResult.latencyMs,
        } : null,
      };

      completedPages.push(previewPage);

      // Update Firestore in real-time
      await previewRef.update({
        pages: completedPages,
        pagesCompleted: completedPages.length,
        updatedAt: admin.firestore.Timestamp.now(),
      });
    }

    // Update photo retention (photo is deleted later, but preview/illustrations stay)
    const retainUntil = new Date(
      Date.now() + PHOTO_RETAIN_HOURS * 60 * 60 * 1000
    ).toISOString();
    const completedAt = new Date().toISOString();
    await previewRef.update({
      photoStatus: "preview_used",
      photoRetainUntil: retainUntil,

      generationStatus: "completed",
      generationCompletedAt: completedAt,
      status: "ready",
      expiresAt: retainUntil,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    try {
      await consumeFreePreviewQuota(caregiverUid, previewId);
    } catch (quotaErr) {
      console.error(
        `[consumeFreePreviewQuota] failed for preview ${previewId} (preview doc is still ready):`,
        quotaErr
      );
    }
  } catch (error) {
    console.error(`Preview generation failed for ${previewId}:`, error);
    const message = error instanceof Error ? error.message : "Unknown error";
    await previewRef.update({
      generationStatus: "failed",
      failureReason: message,
      status: "created",
      updatedAt: admin.firestore.Timestamp.now(),
    });
  }
}

/**
 * Finds an existing non-expired, non-converted preview for the same
 * child + template combination (idempotency check).
 */
async function findExistingPreview(
  caregiverUid: string,
  childFirstName: string,
  childGender: Gender,
  templateId: string
): Promise<string | null> {
  const excludedStatuses = ["expired", "converted"];

  const snapshot = await db
    .collection(COLLECTIONS.STORY_PREVIEWS)
    .where("caregiverUid", "==", caregiverUid)
    .where("childFirstName", "==", childFirstName)
    .where("childGender", "==", childGender)
    .where("templateId", "==", templateId)
    .limit(10)
    .get();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!excludedStatuses.includes(data.status as string)) {
      return doc.id;
    }
  }

  return null;
}

/**
 * Counts active (non-expired, non-converted) previews for a caregiver.
 */
async function countActivePreviews(caregiverUid: string): Promise<number> {
  const excludedStatuses = ["expired", "converted"];

  const snapshot = await db
    .collection(COLLECTIONS.STORY_PREVIEWS)
    .where("caregiverUid", "==", caregiverUid)
    .get();

  let count = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!excludedStatuses.includes(data.status as string)) {
      count++;
    }
  }

  return count;
}
