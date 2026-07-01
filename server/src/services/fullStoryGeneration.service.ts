import { admin, db } from "../config/firebase";
import { COLLECTIONS, STORAGE_PATHS } from "../shared/firestore/paths";
import { PersonalizedStory, PersonalizedStoryPage } from "../shared/types/personalizedStory";
import { StoryPreview, PreviewPage } from "../shared/types/storyPreview";
import { StoryTemplate } from "../shared/types/storyTemplate";
import { Purchase } from "../shared/types/purchase";
import { ImageGenerationProvider, ImageGenerationResult } from "../shared/types/aiProvider";
import { CHILDRENS_BOOK_PAGE_ILLUSTRATION } from "../shared/seedreamImageSize";
import {
  personalizeText,
  selectTextVariant,
  ChildData,
} from "./personalization.service";
import { isValidIllustrationStyleId, IllustrationStyleId } from "../shared/types/visualStyles";
import { assemblePersonalizedPrompt } from "../illustration/stage3-final-prompt/assemblePersonalizedPrompt";
import {
  loadArtDirectionSnapshot,
  ArtDirectionSnapshotNotReadyError,
  PersonalizedArtDirectionNotReadyError,
} from "./loadArtDirectionSnapshot";

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
 * 1. Load purchase, preview, template
 * 2. Create personalizedStory document
 * 3. Copy preview pages 1-2 (including illustration files)
 * 4. Validate personalization config (protagonist slot, policy, style)
 * 5. Load art-direction snapshot once
 * 6. Generate remaining pages 3-N using the personalized assembler (concurrency 3)
 * 7. Retry failed pages once
 * 8. Update story, purchase, preview statuses
 * 9. Delete child photo
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

  // 4. Verify photo availability (supports re-upload scenarios)
  if (preview.photoStatus === "deleted" || preview.photoStatus === "expired") {
    throw new Error(
      "Preview photo is no longer available. Re-upload is required before checkout."
    );
  }
  if (!preview.photoPath) {
    throw new Error("Preview photoPath is missing. Re-upload is required before checkout.");
  }

  const previewRef = db.collection(COLLECTIONS.STORY_PREVIEWS).doc(previewId);

  // 5. Extend photo retention as safety margin
  const extendedRetainUntil = new Date(
    Date.now() + PHOTO_RETAIN_EXTENSION_HOURS * 60 * 60 * 1000
  ).toISOString();

  await previewRef.update({
    photoRetainUntil: extendedRetainUntil,
    updatedAt: admin.firestore.Timestamp.now(),
  });

  // 6. Create personalizedStory document
  const storyRef = db.collection(COLLECTIONS.PERSONALIZED_STORIES).doc();
  const storyId = storyRef.id;
  const now = new Date().toISOString();

  const storyData: PersonalizedStory = {
    storyId,
    caregiverUid: preview.caregiverUid,
    purchaseId,
    previewId,
    childFirstName: preview.childFirstName,
    childGender: preview.childGender,
    childAgeGroup: preview.childAgeGroup,
    templateId: preview.templateId,
    templateTitle: preview.templateTitle,
    templateVersion: preview.templateVersion,
    language: preview.language,
    dedicationName: preview.dedicationName ?? null,
    coverImageUrl: preview.coverImageUrl || template.coverImageUrl,
    // Use the type guard so TypeScript narrows string → IllustrationStyleId.
    // Full validation of the style happens in runFullStoryGeneration; invalid
    // styles cause generation to fail and the story to be marked "failed".
    ...(isValidIllustrationStyleId(preview.selectedIllustrationStyle)
      ? { selectedIllustrationStyle: preview.selectedIllustrationStyle }
      : {}),
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
  runFullStoryGeneration(storyId, storyRef, preview, template, purchaseRef).catch(
    (error) => {
      console.error(`Full story generation failed for ${storyId}:`, error);
    }
  );

  return storyId;
}

/**
 * Core generation logic: copy preview pages, generate remaining pages.
 *
 * Uses the Phase 5 personalized assembler for all remaining pages — never
 * falls back to `page.imagePromptTemplate`, which has the specialist protagonist
 * appearance baked in and must not be used for personalized images.
 */
async function runFullStoryGeneration(
  storyId: string,
  storyRef: FirebaseFirestore.DocumentReference,
  preview: StoryPreview,
  template: StoryTemplate,
  purchaseRef: FirebaseFirestore.DocumentReference
): Promise<void> {
  const language = preview.language;
  const allPages: PersonalizedStoryPage[] = [];
  const failedIndexes: number[] = [];
  const bucket = admin.storage().bucket();
  const childData: ChildData = {
    firstName: preview.childFirstName,
    gender: preview.childGender,
  };

  try {
    const imageProvider = requireImageProvider();

    // ── Validate personalization config ────────────────────────────────────────

    const styleId = preview.selectedIllustrationStyle;
    if (!styleId || !isValidIllustrationStyleId(styleId)) {
      throw new PersonalizedArtDirectionNotReadyError(
        "INVALID_STYLE",
        `Story ${storyId}: preview ${preview.previewId} has no valid selectedIllustrationStyle` +
          ` (got: "${styleId}"). Cannot generate personalized images.`,
      );
    }

    if (!template.protagonistSlot) {
      throw new PersonalizedArtDirectionNotReadyError(
        "MISSING_PROTAGONIST_SLOT",
        `Story ${storyId}: template ${preview.templateId} is missing protagonistSlot.` +
          " Cannot generate personalized images.",
      );
    }

    if (template.personalizedCharacterPolicy !== "replace_with_child_photo") {
      throw new PersonalizedArtDirectionNotReadyError(
        "MISSING_CHARACTER_POLICY",
        `Story ${storyId}: template ${preview.templateId} personalizedCharacterPolicy is` +
          ` "${template.personalizedCharacterPolicy}", expected "replace_with_child_photo".`,
      );
    }

    // ── Load art-direction snapshot once ──────────────────────────────────────
    // All per-page prompt assembly reads from this snapshot — the specialist's
    // approved scene plan and Visual Bible fields. It is loaded once here rather
    // than per-page to avoid redundant Firestore reads across a large page batch.
    const artSnap = await loadArtDirectionSnapshot(template, preview.templateId);

    // ── Step 1: Copy preview pages into the full story ────────────────────────
    for (const previewPage of preview.pages) {
      let copiedImagePath: string | null = null;

      if (previewPage.generatedImagePath) {
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

    // ── Step 2: Generate remaining pages ──────────────────────────────────────

    const previewPageNumbers = new Set(preview.pages.map((p) => p.pageNumber));
    const remainingTemplatePages = template.pages.filter(
      (p) => !previewPageNumbers.has(p.pageNumber)
    );

    // Generate a short-lived signed URL so the image provider can fetch the child's photo.
    // 1 hour — covers the full page batch plus retry.
    let photoSignedUrl: string | null = null;
    if (
      preview.photoPath &&
      preview.photoStatus !== "deleted" &&
      preview.photoStatus !== "expired"
    ) {
      try {
        const photoFile = bucket.file(preview.photoPath);
        const [exists] = await photoFile.exists();
        if (exists) {
          const [url] = await photoFile.getSignedUrl({
            action: "read",
            expires: Date.now() + 60 * 60 * 1000,
          });
          photoSignedUrl = url;
        }
      } catch {
        console.warn(`Could not generate signed URL for preview photo of story ${storyId}`);
      }
    }

    // Hard-fail if the child photo is inaccessible and there are pages to generate.
    // Silently generating image-less pages would produce a "completed" story with no
    // illustrations, which is incorrect and would surface to the buyer as broken content.
    if (!photoSignedUrl && remainingTemplatePages.length > 0) {
      throw new Error(
        `Story ${storyId}: child photo is not accessible in storage` +
          ` (preview ${preview.previewId}, photoPath: ${preview.photoPath ?? "none"}).` +
          " Cannot generate personalized images.",
      );
    }

    // Process remaining pages in batches of CONCURRENCY_LIMIT.
    // Each page is assembled from the approved art-direction snapshot — never from
    // `page.imagePromptTemplate`, which contains the specialist's protagonist.
    for (let i = 0; i < remainingTemplatePages.length; i += CONCURRENCY_LIMIT) {
      const batch = remainingTemplatePages.slice(i, i + CONCURRENCY_LIMIT);

      const results = await Promise.allSettled(
        batch.map(async (templatePage) => {
          const rawText = selectTextVariant(templatePage, childData.gender);
          const personalizedText = personalizeText(rawText, childData, language);

          // Build the personalized image prompt from the approved scene plan +
          // Visual Bible snapshot. The specialist protagonist appearance is excluded
          // by construction — only the child identity anchor and selected style change.
          const pageAD = artSnap.pages.find((p) => p.pageNumber === templatePage.pageNumber);
          if (!pageAD || pageAD.structuredPrompt == null) {
            throw new PersonalizedArtDirectionNotReadyError(
              "MISSING_PAGE_STRUCTURED_PROMPT",
              `Story ${storyId}, page ${templatePage.pageNumber}: no structuredPrompt in` +
                ` art-direction snapshot for template ${preview.templateId}.`,
            );
          }

          const imagePrompt = assemblePersonalizedPrompt({
            pageArtDirection: pageAD,
            snapshot: artSnap,
            child: {
              firstName: preview.childFirstName,
              gender: preview.childGender,
              ageGroup: preview.childAgeGroup,
            },
            selectedIllustrationStyle: styleId as IllustrationStyleId,
          });

          let generatedImagePath: string | null = null;
          let aiMetadata: PersonalizedStoryPage["aiMetadata"] = null;

          if (photoSignedUrl) {
            const imageResult: ImageGenerationResult = await imageProvider.generateImage({
              textPrompt: imagePrompt,
              seed: Math.floor(Math.random() * 2 ** 31),
              referenceImage: photoSignedUrl,
              outputWidth: CHILDRENS_BOOK_PAGE_ILLUSTRATION.width,
              outputHeight: CHILDRENS_BOOK_PAGE_ILLUSTRATION.height,
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

    // ── Step 3: Retry failed pages once ───────────────────────────────────────
    if (failedIndexes.length > 0 && photoSignedUrl) {
      const retryPages = template.pages.filter((p) =>
        failedIndexes.includes(p.pageNumber)
      );
      const retriedIndexes: number[] = [];

      for (const templatePage of retryPages) {
        try {
          const rawText = selectTextVariant(templatePage, childData.gender);
          const personalizedText = personalizeText(rawText, childData, language);

          const pageAD = artSnap.pages.find((p) => p.pageNumber === templatePage.pageNumber);
          if (!pageAD || pageAD.structuredPrompt == null) {
            throw new PersonalizedArtDirectionNotReadyError(
              "MISSING_PAGE_STRUCTURED_PROMPT",
              `Retry — story ${storyId}, page ${templatePage.pageNumber}: no structuredPrompt.`,
            );
          }

          const imagePrompt = assemblePersonalizedPrompt({
            pageArtDirection: pageAD,
            snapshot: artSnap,
            child: {
              firstName: preview.childFirstName,
              gender: preview.childGender,
              ageGroup: preview.childAgeGroup,
            },
            selectedIllustrationStyle: styleId as IllustrationStyleId,
          });

          const imageResult = await imageProvider.generateImage({
            textPrompt: imagePrompt,
            seed: Math.floor(Math.random() * 2 ** 31),
            referenceImage: photoSignedUrl,
            outputWidth: CHILDRENS_BOOK_PAGE_ILLUSTRATION.width,
            outputHeight: CHILDRENS_BOOK_PAGE_ILLUSTRATION.height,
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

    // ── Step 4: Finalize ──────────────────────────────────────────────────────
    const finalStatus = failedIndexes.length > 0
      ? (allPages.length > 0 ? "partially_failed" : "failed")
      : "completed";

    const now = new Date().toISOString();
    const previewRef = db.collection(COLLECTIONS.STORY_PREVIEWS).doc(preview.previewId);

    await storyRef.update({
      pages: allPages,
      pagesCompleted: allPages.length,
      pagesFailedIndexes: failedIndexes,
      generationStatus: finalStatus,
      generationCompletedAt: now,
      // isAccessible is true ONLY when every page generated successfully.
      // `partially_failed` stays inaccessible: the reader has no fallback for
      // null generatedImagePath pages, and a future retry requires the photo.
      isAccessible: finalStatus === "completed",
      updatedAt: admin.firestore.Timestamp.now(),
    });

    if (finalStatus === "completed") {
      // All pages generated — purchase is complete. Delete the raw photo now.
      await purchaseRef.update({
        status: "completed",
        completedAt: now,
        failedAt: null,
        failureReason: null,
        updatedAt: admin.firestore.Timestamp.now(),
      });

      await previewRef.update({
        status: "converted",
        personalizedStoryId: storyId,
        updatedAt: admin.firestore.Timestamp.now(),
      });

      // Delete raw photo (biometric-sensitive; final illustrations already saved).
      if (preview.photoPath) {
        try {
          const photoFile = bucket.file(preview.photoPath);
          const [exists] = await photoFile.exists();
          if (exists) {
            await photoFile.delete();
          }
          await previewRef.update({
            photoPath: null,
            photoStatus: "deleted",
            updatedAt: admin.firestore.Timestamp.now(),
          });
        } catch (deleteError) {
          console.error(`Failed to delete preview photo for ${preview.previewId}:`, deleteError);
          // Non-fatal: previewCleanup.service.ts removes it via photoRetainUntil.
        }
      }
    } else if (finalStatus === "partially_failed") {
      // Some pages failed after retry. Story is not usable yet.
      //
      // Do NOT mark the purchase as "completed" — the caregiver did not receive a
      // usable story. Use "generation_partially_failed" so support/retry tooling
      // can identify these purchases for resolution.
      //
      // Do NOT delete the raw child photo. It is retained until photoRetainUntil
      // (extended at generation start) so a future retry can regenerate missing
      // pages. previewCleanup.service.ts will remove it after that window if no
      // retry has occurred.
      await purchaseRef.update({
        status: "generation_partially_failed",
        completedAt: null,
        failedAt: null,
        failureReason: `Pages ${failedIndexes.join(", ")} failed after retry. Story pending support resolution or retry.`,
        updatedAt: admin.firestore.Timestamp.now(),
      });

      // Mark the preview as partially converted — NOT "converted" — so that
      // previewCleanup Job 3 (which deletes converted previews after 48h) does
      // NOT delete this document prematurely. Support/retry tooling needs the
      // preview to look up the personalizedStoryId ↔ purchaseId relationship.
      // previewCleanup Job 6 removes generation_partially_failed previews after
      // a 30-day support window.
      await previewRef.update({
        status: "generation_partially_failed",
        personalizedStoryId: storyId,
        updatedAt: admin.firestore.Timestamp.now(),
      });
      // Photo intentionally NOT deleted — photoStatus remains "preview_used" so the
      // cleanup service Job 1 uses photoRetainUntil as the deadline.
    } else {
      // finalStatus === "failed": all pages failed (allPages.length === 0).
      // No usable content was produced; no retry is expected in the current flow.
      await purchaseRef.update({
        status: "failed",
        completedAt: null,
        failedAt: now,
        failureReason: "All page generations failed after retry.",
        updatedAt: admin.firestore.Timestamp.now(),
      });

      await previewRef.update({
        status: "converted",
        personalizedStoryId: storyId,
        updatedAt: admin.firestore.Timestamp.now(),
      });

      // Delete raw photo — no usable story, no retry planned.
      if (preview.photoPath) {
        try {
          const photoFile = bucket.file(preview.photoPath);
          const [exists] = await photoFile.exists();
          if (exists) {
            await photoFile.delete();
          }
          await previewRef.update({
            photoPath: null,
            photoStatus: "deleted",
            updatedAt: admin.firestore.Timestamp.now(),
          });
        } catch (deleteError) {
          console.error(`Failed to delete preview photo for ${preview.previewId}:`, deleteError);
          // Non-fatal: previewCleanup.service.ts removes it via photoRetainUntil.
        }
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

    // Delete the raw child photo even on full failure — there is no retry path
    // in the current purchase flow, so retaining the photo serves no purpose and
    // keeping biometric data longer than necessary is a privacy risk.
    // If deletion itself fails, the cleanup service will handle it via photoRetainUntil.
    if (preview.photoPath) {
      try {
        const failBucket = admin.storage().bucket();
        const photoFile = failBucket.file(preview.photoPath);
        const [exists] = await photoFile.exists();
        if (exists) {
          await photoFile.delete();
        }
        const failPreviewRef = db
          .collection(COLLECTIONS.STORY_PREVIEWS)
          .doc(preview.previewId);
        await failPreviewRef.update({
          photoPath: null,
          photoStatus: "deleted",
          updatedAt: admin.firestore.Timestamp.now(),
        });
      } catch (deleteError) {
        console.error(
          `Failed to delete preview photo after story ${storyId} failed:`,
          deleteError,
        );
        // Non-fatal: previewCleanup.service.ts will remove it via photoRetainUntil.
      }
    }
  }
}

/**
 * Finds a purchase document by purchaseId across all caregivers' purchases subcollections.
 * Uses a collection group query.
 */
async function findPurchaseByPurchaseId(
  purchaseId: string
): Promise<{ data: Purchase; ref: FirebaseFirestore.DocumentReference } | null> {
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
