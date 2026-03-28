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
 * Generates a 2-page personalized preview for a caregiver's child
 * using a story template.
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

  // 2. Verify active preview limit
  const activeCount = await countActivePreviews(caregiverUid);
  if (activeCount >= MAX_ACTIVE_PREVIEWS) {
    throw new Error(
      `Active preview limit reached (${MAX_ACTIVE_PREVIEWS}). ` +
      `Please wait for existing previews to expire or purchase them.`
    );
  }

  // 3. Load story template
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

  // 4. Create preview document (photo lifecycle is owned by this preview)
  const now = new Date().toISOString();
  const previewRef = db.collection(COLLECTIONS.STORY_PREVIEWS).doc();
  const previewId = previewRef.id;

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
    previewPageCount: template.previewPageCount || 2,
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

  // 5. Upload photo and mark preview as generating
  const extMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const ext = extMap[photoMimeType] ?? "jpg";
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

  // 6. Generate preview pages asynchronously (fire-and-forget)
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
  const previewPageCount = template.previewPageCount || 2;
  const language = template.generationConfig.language;
  const completedPages: PreviewPage[] = [];

  try {
    const imageProvider = requireImageProvider();

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
