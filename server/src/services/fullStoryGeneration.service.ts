import { admin, db } from "../config/firebase";
import { COLLECTIONS, STORAGE_PATHS } from "../shared/firestore/paths";
import { childProfileConverter } from "../shared/firestore/converters";
import { PersonalizedStory, PersonalizedStoryPage } from "../shared/types/personalizedStory";
import { StoryPreview, PreviewPage } from "../shared/types/storyPreview";
import { StoryTemplate } from "../shared/types/storyTemplate";
import { ChildProfile } from "../shared/types/childProfile";
import { Purchase } from "../shared/types/purchase";
import { ImageGenerationProvider, ImageGenerationResult } from "../shared/types/aiProvider";
import {
  personalizeText,
  selectTextVariant,
  buildImagePrompt,
} from "./personalization.service";

const CONCURRENCY_LIMIT = 3;
const PHOTO_RETAIN_EXTENSION_HOURS = 24;

let _imageProvider: ImageGenerationProvider | null = null;

export function registerImageProviderForStory(provider: ImageGenerationProvider): void {
  _imageProvider = provider;
}

function requireImageProvider(): ImageGenerationProvider {
  if (!_imageProvider) {
    throw new Error(
      "Image generation provider is not configured. " +
      "Call registerImageProviderForStory() at application startup."
    );
  }
  return _imageProvider;
}

/**
 * Generates the full personalized story after payment is confirmed.
 *
 * Idempotency: If the purchase already has a personalizedStoryId, returns it.
 *
 * Flow:
 * 1. Load purchase, preview, template, child
 * 2. Create personalizedStory document
 * 3. Copy preview pages 1-2 (including illustration files)
 * 4. Generate remaining pages 3-N with concurrency limit
 * 5. Retry failed pages once
 * 6. Update story, purchase, preview statuses
 * 7. Delete child photo
 *
 * @returns storyId
 */
export async function generateFullStory(
  purchaseId: string,
  previewId: string
): Promise<string> {
  // 1. Load purchase
  const purchaseSnapshot = await findPurchaseByPurchaseId(purchaseId);
  if (!purchaseSnapshot) {
    throw new Error(`Purchase not found: ${purchaseId}`);
  }
  const purchase = purchaseSnapshot.data as Purchase;
  const purchaseRef = purchaseSnapshot.ref;

  // Idempotency: if already has a story, return it
  if (purchase.personalizedStoryId) {
    return purchase.personalizedStoryId;
  }

  // 2. Load preview
  const previewDoc = await db
    .collection(COLLECTIONS.STORY_PREVIEWS)
    .doc(previewId)
    .get();

  if (!previewDoc.exists) {
    throw new Error(`Preview not found: ${previewId}`);
  }
  const preview = previewDoc.data() as StoryPreview;

  // 3. Load template
  const templateDoc = await db
    .collection(COLLECTIONS.STORY_TEMPLATES)
    .doc(preview.templateId)
    .get();

  if (!templateDoc.exists) {
    throw new Error(`Template not found: ${preview.templateId}`);
  }
  const template = templateDoc.data() as StoryTemplate;

  // 4. Load child profile
  const childDoc = await db
    .collection(COLLECTIONS.children(preview.caregiverUid))
    .withConverter(childProfileConverter)
    .doc(preview.childId)
    .get();

  if (!childDoc.exists) {
    throw new Error(`Child profile not found: ${preview.childId}`);
  }
  const child = childDoc.data()!;

  // 5. Extend photo retention as safety margin
  const extendedRetainUntil = new Date(
    Date.now() + PHOTO_RETAIN_EXTENSION_HOURS * 60 * 60 * 1000
  ).toISOString();

  if (child.photoPath && child.photoStatus !== "deleted" && child.photoStatus !== "expired") {
    await db
      .collection(COLLECTIONS.children(preview.caregiverUid))
      .doc(preview.childId)
      .update({
        photoRetainUntil: extendedRetainUntil,
        updatedAt: admin.firestore.Timestamp.now(),
      });
  }

  // 6. Create personalizedStory document
  const storyRef = db.collection(COLLECTIONS.PERSONALIZED_STORIES).doc();
  const storyId = storyRef.id;
  const now = new Date().toISOString();

  const storyData: PersonalizedStory = {
    storyId,
    caregiverUid: preview.caregiverUid,
    childId: preview.childId,
    purchaseId,
    previewId,
    childFirstName: preview.childFirstName,
    childGender: preview.childGender,
    templateId: preview.templateId,
    templateTitle: preview.templateTitle,
    templateVersion: preview.templateVersion,
    language: preview.language,
    dedicationName: null,
    coverImageUrl: preview.coverImageUrl || template.coverImageUrl,
    generationStatus: "in_progress",
    totalPages: template.pages.length,
    pagesCompleted: 0,
    pagesFromPreview: preview.pages.length,
    pagesFailedIndexes: [],
    generationStartedAt: now,
    generationCompletedAt: null,
    pages: [],
    isAccessible: false,
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
  };

  await storyRef.set(storyData);

  // Link purchase to story
  await purchaseRef.update({
    personalizedStoryId: storyId,
    status: "generation_in_progress",
    updatedAt: admin.firestore.Timestamp.now(),
  });

  // 7. Run generation asynchronously
  runFullStoryGeneration(storyId, storyRef, preview, template, child, purchaseRef).catch(
    (error) => {
      console.error(`Full story generation failed for ${storyId}:`, error);
    }
  );

  return storyId;
}

/**
 * Core generation logic: copy preview pages, generate remaining pages.
 */
async function runFullStoryGeneration(
  storyId: string,
  storyRef: FirebaseFirestore.DocumentReference,
  preview: StoryPreview,
  template: StoryTemplate,
  child: ChildProfile,
  purchaseRef: FirebaseFirestore.DocumentReference
): Promise<void> {
  const language = preview.language;
  const allPages: PersonalizedStoryPage[] = [];
  const failedIndexes: number[] = [];
  const bucket = admin.storage().bucket();

  try {
    const imageProvider = requireImageProvider();

    // Step 1: Copy preview pages into the full story
    for (const previewPage of preview.pages) {
      let copiedImagePath: string | null = null;

      if (previewPage.generatedImagePath) {
        // Copy illustration file from preview path to generated path
        const sourceFile = bucket.file(previewPage.generatedImagePath);
        const [exists] = await sourceFile.exists();

        if (exists) {
          const ext = previewPage.generatedImagePath.split(".").pop() ?? "webp";
          const destPath = STORAGE_PATHS.generatedIllustration(
            preview.caregiverUid, storyId, previewPage.pageNumber, ext
          );
          await sourceFile.copy(bucket.file(destPath));
          copiedImagePath = destPath;
        }
      }

      const storyPage: PersonalizedStoryPage = {
        pageNumber: previewPage.pageNumber,
        personalizedText: previewPage.personalizedText,
        imagePromptUsed: previewPage.imagePromptUsed,
        generatedImagePath: copiedImagePath,
        fromPreview: true,
        aiMetadata: previewPage.aiMetadata,
      };

      allPages.push(storyPage);
    }

    // Update progress after copying preview pages
    await storyRef.update({
      pages: allPages,
      pagesCompleted: allPages.length,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    // Step 2: Generate remaining pages with concurrency limit
    const previewPageNumbers = new Set(preview.pages.map((p) => p.pageNumber));
    const remainingTemplatePages = template.pages.filter(
      (p) => !previewPageNumbers.has(p.pageNumber)
    );

    // Load photo for remaining page generation
    let photoBuffer: Buffer | null = null;
    if (child.photoPath && child.photoStatus !== "deleted" && child.photoStatus !== "expired") {
      try {
        const photoFile = bucket.file(child.photoPath);
        const [exists] = await photoFile.exists();
        if (exists) {
          const [buffer] = await photoFile.download();
          photoBuffer = buffer;
        }
      } catch {
        console.warn(`Could not load child photo for story ${storyId}`);
      }
    }

    // Process remaining pages in batches of CONCURRENCY_LIMIT
    for (let i = 0; i < remainingTemplatePages.length; i += CONCURRENCY_LIMIT) {
      const batch = remainingTemplatePages.slice(i, i + CONCURRENCY_LIMIT);

      const results = await Promise.allSettled(
        batch.map(async (templatePage) => {
          const rawText = selectTextVariant(templatePage, child.gender);
          const personalizedText = personalizeText(rawText, child, language);
          const imagePrompt = buildImagePrompt(templatePage.imagePromptTemplate, child);

          let generatedImagePath: string | null = null;
          let aiMetadata: PersonalizedStoryPage["aiMetadata"] = null;

          if (photoBuffer) {
            const imageResult: ImageGenerationResult = await imageProvider.generateImage({
              textPrompt: imagePrompt,
              referenceImage: photoBuffer,
              style: templatePage.emotionalTone,
              outputFormat: "webp",
              outputWidth: 1024,
              outputHeight: 1024,
            });

            const ext = imageResult.mimeType.split("/")[1] ?? "webp";
            const storagePath = STORAGE_PATHS.generatedIllustration(
              preview.caregiverUid, storyId, templatePage.pageNumber, ext
            );
            const file = bucket.file(storagePath);
            await file.save(imageResult.imageBuffer, {
              metadata: { contentType: imageResult.mimeType },
            });
            generatedImagePath = storagePath;
            aiMetadata = {
              providerId: imageResult.providerId,
              modelId: imageResult.modelId,
              generatedAt: new Date().toISOString(),
              latencyMs: imageResult.latencyMs,
            };
          }

          const storyPage: PersonalizedStoryPage = {
            pageNumber: templatePage.pageNumber,
            personalizedText,
            imagePromptUsed: imagePrompt,
            generatedImagePath,
            fromPreview: false,
            aiMetadata,
          };

          return storyPage;
        })
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j]!;
        const templatePage = batch[j]!;
        if (result.status === "fulfilled") {
          allPages.push(result.value);
        } else {
          console.error(
            `Page ${templatePage.pageNumber} generation failed:`,
            result.reason
          );
          failedIndexes.push(templatePage.pageNumber);
        }
      }

      // Update progress
      await storyRef.update({
        pages: allPages,
        pagesCompleted: allPages.length,
        pagesFailedIndexes: failedIndexes,
        updatedAt: admin.firestore.Timestamp.now(),
      });
    }

    // Step 3: Retry failed pages once
    if (failedIndexes.length > 0 && photoBuffer) {
      const retryPages = template.pages.filter((p) =>
        failedIndexes.includes(p.pageNumber)
      );
      const retriedIndexes: number[] = [];

      for (const templatePage of retryPages) {
        try {
          const rawText = selectTextVariant(templatePage, child.gender);
          const personalizedText = personalizeText(rawText, child, language);
          const imagePrompt = buildImagePrompt(templatePage.imagePromptTemplate, child);

          const imageResult = await imageProvider.generateImage({
            textPrompt: imagePrompt,
            referenceImage: photoBuffer,
            style: templatePage.emotionalTone,
            outputFormat: "webp",
            outputWidth: 1024,
            outputHeight: 1024,
          });

          const ext = imageResult.mimeType.split("/")[1] ?? "webp";
          const storagePath = STORAGE_PATHS.generatedIllustration(
            preview.caregiverUid, storyId, templatePage.pageNumber, ext
          );
          const file = bucket.file(storagePath);
          await file.save(imageResult.imageBuffer, {
            metadata: { contentType: imageResult.mimeType },
          });

          allPages.push({
            pageNumber: templatePage.pageNumber,
            personalizedText,
            imagePromptUsed: imagePrompt,
            generatedImagePath: storagePath,
            fromPreview: false,
            aiMetadata: {
              providerId: imageResult.providerId,
              modelId: imageResult.modelId,
              generatedAt: new Date().toISOString(),
              latencyMs: imageResult.latencyMs,
            },
          });

          retriedIndexes.push(templatePage.pageNumber);
        } catch (retryError) {
          console.error(
            `Retry failed for page ${templatePage.pageNumber}:`,
            retryError
          );
        }
      }

      // Remove retried indexes from failed list
      const stillFailed = failedIndexes.filter((idx) => !retriedIndexes.includes(idx));

      await storyRef.update({
        pages: allPages,
        pagesCompleted: allPages.length,
        pagesFailedIndexes: stillFailed,
        updatedAt: admin.firestore.Timestamp.now(),
      });

      failedIndexes.length = 0;
      failedIndexes.push(...stillFailed);
    }

    // Sort pages by pageNumber
    allPages.sort((a, b) => a.pageNumber - b.pageNumber);

    // Step 4: Finalize
    const finalStatus = failedIndexes.length > 0
      ? (allPages.length > 0 ? "partially_failed" : "failed")
      : "completed";
    const isAccessible = finalStatus === "completed" || finalStatus === "partially_failed";

    await storyRef.update({
      pages: allPages,
      pagesCompleted: allPages.length,
      pagesFailedIndexes: failedIndexes,
      generationStatus: finalStatus,
      generationCompletedAt: new Date().toISOString(),
      isAccessible,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    // Update purchase status
    await purchaseRef.update({
      status: finalStatus === "failed" ? "failed" : "completed",
      completedAt: finalStatus !== "failed" ? new Date().toISOString() : null,
      failedAt: finalStatus === "failed" ? new Date().toISOString() : null,
      failureReason: finalStatus === "failed" ? "All page generations failed" : null,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    // Update preview status
    await db.collection(COLLECTIONS.STORY_PREVIEWS).doc(preview.previewId).update({
      status: "converted",
      personalizedStoryId: storyId,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    // Delete child photo (privacy)
    if (child.photoPath) {
      try {
        const photoFile = bucket.file(child.photoPath);
        const [exists] = await photoFile.exists();
        if (exists) {
          await photoFile.delete();
        }
        await db
          .collection(COLLECTIONS.children(preview.caregiverUid))
          .doc(child.childId)
          .update({
            photoStatus: "deleted",
            photoPath: null,
            updatedAt: admin.firestore.Timestamp.now(),
          });
      } catch (deleteError) {
        console.error(`Failed to delete child photo for ${child.childId}:`, deleteError);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Full story generation error for ${storyId}:`, message);

    await storyRef.update({
      generationStatus: "failed",
      generationCompletedAt: new Date().toISOString(),
      pagesFailedIndexes: failedIndexes,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    await purchaseRef.update({
      status: "failed",
      failedAt: new Date().toISOString(),
      failureReason: message,
      updatedAt: admin.firestore.Timestamp.now(),
    });
  }
}

/**
 * Finds a purchase document by purchaseId across all caregivers' purchases subcollections.
 * Uses a collection group query.
 */
async function findPurchaseByPurchaseId(
  purchaseId: string
): Promise<{ data: Purchase; ref: FirebaseFirestore.DocumentReference } | null> {
  // Try collection group query
  const snapshot = await db
    .collectionGroup("purchases")
    .where("purchaseId", "==", purchaseId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0]!;
  return {
    data: doc.data() as Purchase,
    ref: doc.ref,
  };
}
