import type { DocumentReference } from "firebase-admin/firestore";
import { admin, db } from "../config/firebase";
import { COLLECTIONS, STORAGE_PATHS } from "../shared/firestore/paths";
import { storyTemplateConverter } from "../shared/firestore/converters";
import { StoryPreview, PreviewPage, PreviewStatus, PreviewKind } from "../shared/types/storyPreview";
import { StoryTemplate } from "../shared/types/storyTemplate";
import { ImageGenerationProvider, ImageGenerationResult } from "../shared/types/aiProvider";
import { CHILDRENS_BOOK_PAGE_ILLUSTRATION } from "../shared/seedreamImageSize";
import {
  ChildData,
  personalizeText,
  selectTextVariant,
} from "./personalization.service";
import { AgeGroup, Gender } from "../shared/types/common";
import { IllustrationStyleId, isValidIllustrationStyleId } from "../shared/types/visualStyles";
import {
  assemblePersonalizedPrompt,
} from "../illustration/stage3-final-prompt/assemblePersonalizedPrompt";
import {
  loadArtDirectionSnapshot,
  ArtDirectionSnapshotNotReadyError,
  PersonalizedArtDirectionNotReadyError,
} from "./loadArtDirectionSnapshot";

export { PersonalizedArtDirectionNotReadyError };

const PHOTO_RETAIN_HOURS = 48;

/** Max previews per caregiver (free tier), enforced only when `isPreviewQuotaEnabled()` is true. */
export const MAX_PREVIEWS_PER_USER = 1;
/** Max template pages generated per preview — matches client reader preview gate. */
export const PREVIEW_SPREAD_LIMIT = 2;

/**
 * Pre-launch feature flag: the one-free-preview quota is off by default so
 * testers/parents can generate as many previews as they like. Set
 * `PREVIEW_QUOTA_ENABLED=true` to restore the one-free-preview limit for launch.
 */
export function isPreviewQuotaEnabled(): boolean {
  return process.env.PREVIEW_QUOTA_ENABLED === "true";
}

export class PreviewQuotaError extends Error {
  constructor(
    public code:
      | "FREE_PREVIEW_ALREADY_USED"
      | "TEMPLATE_NOT_FOUND"
      | "TEMPLATE_INACTIVE"
      | "PERSONALIZATION_DISABLED"
      | "TEXT_PERSONALIZATION_NOT_READY"
      | "VISUAL_PERSONALIZATION_NOT_READY"
      | "INVALID_ILLUSTRATION_STYLE",
    message: string,
    public existingPreviewId?: string
  ) {
    super(message);
    this.name = "PreviewQuotaError";
  }
}

/**
 * Returns true when every page in `pages` has non-empty masculine and feminine
 * text templates each containing the `{{CHILD_NAME}}` placeholder.
 *
 * This is the canonical text-readiness check for the preview API.
 * It replaces the deprecated `textPersonalizationReady` flag so that stories
 * with valid page data are never blocked by a stale flag.
 */
export function hasValidTextTemplates(
  pages: Array<{ textTemplate?: { masculine?: string; feminine?: string } | null }>,
): boolean {
  if (pages.length === 0) return false;
  return pages.every((page) => {
    const tt = page.textTemplate;
    const masc = tt?.masculine;
    const fem = tt?.feminine;
    return (
      typeof masc === "string" && masc.trim().length > 0 && masc.includes("{{CHILD_NAME}}") &&
      typeof fem  === "string" && fem.trim().length  > 0 && fem.includes("{{CHILD_NAME}}")
    );
  });
}

/**
 * Derived eligibility conditions (Phase 2+/Phase 4).
 * Checks: personalizationEnabled, valid text templates on all pages, and
 * (when requireVisual) visualPersonalizationEnabled + visualPersonalizationReady.
 *
 * Text readiness is derived from actual page data rather than the deprecated
 * `textPersonalizationReady` flag, so stories with valid text are never
 * blocked by a stale flag.
 */
function assertPersonalizationEligible(
  template: {
    personalizationEnabled?: boolean;
    visualPersonalizationEnabled?: boolean;
    visualPersonalizationReady?: boolean;
    pages?: Array<{ textTemplate?: { masculine?: string; feminine?: string } | null }>;
  },
  requireVisual: boolean,
): void {
  if (template.personalizationEnabled !== true) {
    throw new PreviewQuotaError(
      "PERSONALIZATION_DISABLED",
      "This story does not support personalization.",
    );
  }
  if (!hasValidTextTemplates(template.pages ?? [])) {
    throw new PreviewQuotaError(
      "TEXT_PERSONALIZATION_NOT_READY",
      "Text personalization variants are missing or incomplete for this story.",
    );
  }
  if (requireVisual) {
    const canUseVisual =
      template.visualPersonalizationEnabled === true &&
      template.visualPersonalizationReady === true;
    if (!canUseVisual) {
      throw new PreviewQuotaError(
        "VISUAL_PERSONALIZATION_NOT_READY",
        "Visual (photo-based) personalization is not available for this story yet.",
      );
    }
  }
}

/**
 * Validates that the chosen illustration style is one allowed by this template.
 *
 * `allowedIllustrationStyles` is populated by the publish bridge for every
 * personalizable story. A missing or empty list means the template data is
 * inconsistent — we reject rather than silently accepting all styles, because
 * silently accepting would bypass the specialist's per-story curation.
 *
 * Old templates without this list also lack `visualPersonalizationReady: true`,
 * so they never reach this check (assertPersonalizationEligible blocks first).
 */
function assertIllustrationStyle(
  template: { allowedIllustrationStyles?: IllustrationStyleId[] },
  styleId: string | undefined,
): void {
  if (!styleId) {
    throw new PreviewQuotaError(
      "INVALID_ILLUSTRATION_STYLE",
      "Illustration style is required.",
    );
  }
  if (!template.allowedIllustrationStyles?.length) {
    throw new PreviewQuotaError(
      "INVALID_ILLUSTRATION_STYLE",
      "Story configuration error: allowed illustration styles not set.",
    );
  }
  if (!(template.allowedIllustrationStyles as string[]).includes(styleId)) {
    throw new PreviewQuotaError(
      "INVALID_ILLUSTRATION_STYLE",
      `Invalid illustration style: "${styleId}".`,
    );
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
  /** Internal illustration style ID chosen by the caregiver (Phase 4+). */
  selectedIllustrationStyle?: string;
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

export function requireImageProvider(): ImageGenerationProvider {
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

export interface CreateDirectPurchasePreviewInput {
  caregiverUid: string;
  templateId: string;
  childFirstName: string;
  childGender: Gender;
  childAgeGroup: AgeGroup;
  dedicationName?: string | null;
  photoBuffer: Buffer;
  photoMimeType: string;
  /** Internal illustration style ID chosen by the caregiver (Phase 4+). */
  selectedIllustrationStyle?: string;
}

/**
 * Creates a storyPreview for users who already used their free AI preview and want to purchase
 * without generating another preview. Does not touch caregiver quota.
 */
export async function createDirectPurchasePreview(
  input: CreateDirectPurchasePreviewInput
): Promise<{ previewId: string }> {
  const {
    caregiverUid,
    templateId,
    childFirstName,
    childGender,
    childAgeGroup,
    dedicationName,
    photoBuffer,
    photoMimeType,
    selectedIllustrationStyle,
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

  assertPersonalizationEligible(template, /* requireVisual= */ true);
  assertIllustrationStyle(template, selectedIllustrationStyle);

  const previewRef = db.collection(COLLECTIONS.STORY_PREVIEWS).doc();
  const now = admin.firestore.Timestamp.now();

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
    previewPageCount: 0,
    pages: [],
    coverImageUrl: template.coverImageUrl ?? null,
    characterProfileSnapshot: null,
    generationStatus: "skipped",
    pagesCompleted: 0,
    generationStartedAt: null,
    generationCompletedAt: null,
    failureReason: null,
    status: "ready",
    expiresAt: null,
    purchaseId: null,
    personalizedStoryId: null,
    kind: "direct_purchase",
    ...(selectedIllustrationStyle !== undefined ? { selectedIllustrationStyle } : {}),
    createdAt: now,
    updatedAt: now,
  };

  await previewRef.set(initialPreview);

  const photoPath = await uploadChildPhoto({
    caregiverUid,
    previewId: previewRef.id,
    buffer: photoBuffer,
    mimeType: photoMimeType,
  });

  const photoExpiresAt = Date.now() + PHOTO_RETAIN_HOURS * 60 * 60 * 1000;
  await previewRef.update({
    photoPath,
    photoStatus: "uploaded",
    photoUploadedAt: new Date().toISOString(),
    photoRetainUntil: new Date(photoExpiresAt).toISOString(),
    childPhotoExpiresAt: photoExpiresAt,
    updatedAt: admin.firestore.Timestamp.now(),
  });

  return { previewId: previewRef.id };
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
    selectedIllustrationStyle,
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

  assertPersonalizationEligible(template, /* requireVisual= */ true);
  assertIllustrationStyle(template, selectedIllustrationStyle);

  const caregiverRef = db.collection(COLLECTIONS.CAREGIVERS).doc(caregiverUid);
  const previewRef = db.collection(COLLECTIONS.STORY_PREVIEWS).doc();

  const quotaEnabled = isPreviewQuotaEnabled();

  const { claimedPreviewId, trackCaregiverQuota } = await db.runTransaction(async (tx) => {
    const caregiverSnap = await tx.get(caregiverRef);
    const caregiver = caregiverSnap.exists ? caregiverSnap.data()! : ({} as Record<string, unknown>);
    const isUnlimited = caregiver.unlimitedPreviews === true;
    const g = caregiver as Record<string, unknown>;

    if (quotaEnabled && caregiver.freePreviewUsed === true && !isUnlimited) {
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
      kind: "preview" satisfies PreviewKind,
      ...(selectedIllustrationStyle !== undefined ? { selectedIllustrationStyle } : {}),
      createdAt: now,
      updatedAt: now,
    };

    tx.set(previewRef, initialPreview);

    if (quotaEnabled && !isUnlimited) {
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

    return { claimedPreviewId: previewRef.id, trackCaregiverQuota: quotaEnabled && !isUnlimited };
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
    const photoExpiresAt = Date.now() + PHOTO_RETAIN_HOURS * 60 * 60 * 1000;
    await previewRef.update({
      photoPath,
      photoStatus: "uploaded",
      photoUploadedAt: nowIso,
      photoRetainUntil: new Date(photoExpiresAt).toISOString(),
      childPhotoExpiresAt: photoExpiresAt,
      status: "generating",
      generationStatus: "in_progress",
      generationStartedAt: nowIso,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    generatePreviewPages(
      claimedPreviewId,
      caregiverUid,
      childData,
      childAgeGroup,
      templateId,
      template,
      photoPath,
      selectedIllustrationStyle,
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

/**
 * Builds the personalized image prompt for a single preview page.
 *
 * Always uses the personalized assembler — it never falls back to
 * `page.imagePromptTemplate`, which contains the sample protagonist appearance
 * baked in and must not be used for personalized images.
 *
 * Throws `PersonalizedArtDirectionNotReadyError` or
 * `ArtDirectionSnapshotNotReadyError` if any required configuration is missing.
 * The caller (`generatePreviewPages`) lets these propagate to mark the preview
 * as failed rather than silently generating an image with the wrong identity.
 *
 * NOTE on `sp.character` field: Stage 2 instructs the LLM to write only
 * "body position, limb positions, gaze" (≤30 words, no emotion words). This
 * field is intended to be pose/action only and should not contain the sample
 * protagonist's appearance. However, the LLM receives `characterAnchor` as
 * context and could non-compliantly include clothing or hair details. If that
 * is observed in practice, the fix belongs in Stage 2's structured-prompt
 * validation — the personalized assembler preserves this field as-is because
 * it represents the approved scene action (pose, gaze, limb position) that must
 * be kept for therapeutic scene fidelity.
 */
async function buildPersonalizedImagePrompt(params: {
  previewId: string;
  page: { pageNumber: number; imagePromptTemplate: string };
  child: ChildData;
  childAgeGroup: AgeGroup;
  template: StoryTemplate;
  templateId: string;
  selectedIllustrationStyle: string | undefined;
}): Promise<string> {
  const { previewId, page, child, childAgeGroup, template, templateId, selectedIllustrationStyle } = params;

  if (!template.protagonistSlot) {
    throw new PersonalizedArtDirectionNotReadyError(
      "MISSING_PROTAGONIST_SLOT",
      `[preview ${previewId}] Template ${templateId} is visualPersonalizationReady but has no protagonistSlot.`,
    );
  }

  if (template.personalizedCharacterPolicy !== "replace_with_child_photo") {
    throw new PersonalizedArtDirectionNotReadyError(
      "MISSING_CHARACTER_POLICY",
      `[preview ${previewId}] Template ${templateId}: personalizedCharacterPolicy is "${template.personalizedCharacterPolicy}", expected "replace_with_child_photo".`,
    );
  }

  if (!selectedIllustrationStyle || !isValidIllustrationStyleId(selectedIllustrationStyle)) {
    throw new PersonalizedArtDirectionNotReadyError(
      "INVALID_STYLE",
      `[preview ${previewId}] Invalid or missing selectedIllustrationStyle: "${selectedIllustrationStyle}".`,
    );
  }

  // Loads from inline artDirectionSnapshot or the personalizationArtefacts subcollection,
  // depending on artDirectionStoredInline. Throws ArtDirectionSnapshotNotReadyError if absent.
  const artSnap = await loadArtDirectionSnapshot(template, templateId);

  const pageAD = artSnap.pages.find((p) => p.pageNumber === page.pageNumber);
  if (!pageAD || pageAD.structuredPrompt == null) {
    throw new PersonalizedArtDirectionNotReadyError(
      "MISSING_PAGE_STRUCTURED_PROMPT",
      `[preview ${previewId}] Page ${page.pageNumber}: no structuredPrompt in art-direction snapshot for template ${templateId}.`,
    );
  }

  return assemblePersonalizedPrompt({
    pageArtDirection: pageAD,
    snapshot: artSnap,
    child: { firstName: child.firstName, gender: child.gender, ageGroup: childAgeGroup },
    selectedIllustrationStyle,
  });
}

async function generatePreviewPages(
  previewId: string,
  caregiverUid: string,
  child: ChildData,
  childAgeGroup: AgeGroup,
  templateId: string,
  template: StoryTemplate,
  photoPath: string,
  selectedIllustrationStyle: string | undefined,
  trackCaregiverQuota: boolean
): Promise<void> {
  const previewRef = db.collection(COLLECTIONS.STORY_PREVIEWS).doc(previewId);
  const caregiverRef = db.collection(COLLECTIONS.CAREGIVERS).doc(caregiverUid);
  const previewPageCount = Math.min(PREVIEW_SPREAD_LIMIT, template.pages.length);
  const language = template.generationConfig.language;
  const completedPages: PreviewPage[] = [];

  // Generate a short-lived signed URL so Seedream can fetch the child's photo.
  // Requires the service account to have iam.serviceAccounts.signBlob permission.
  const bucket = admin.storage().bucket();
  let photoSignedUrl: string | undefined;
  try {
    const [url] = await bucket.file(photoPath).getSignedUrl({
      action: "read",
      expires: Date.now() + 30 * 60 * 1000, // 30 minutes
    });
    photoSignedUrl = url;
  } catch (signErr) {
    console.warn(`[preview ${previewId}] Could not generate signed URL for photo — generating without reference image.`, signErr);
  }

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

      // Throws PersonalizedArtDirectionNotReadyError / ArtDirectionSnapshotNotReadyError
      // if any required template data is absent — these propagate to the outer
      // try/catch and mark the entire preview as failed. They must NOT be caught
      // by the inner image-generation try/catch below.
      const imagePrompt = await buildPersonalizedImagePrompt({
        previewId,
        page,
        child,
        childAgeGroup,
        template,
        templateId,
        selectedIllustrationStyle,
      });

      const startTime = Date.now();
      let imageResult: ImageGenerationResult;
      let generatedImagePath: string | null = null;

      try {
        if (!imageProvider) {
          throw new Error("Image provider not configured");
        }
        imageResult = await imageProvider.generateImage({
          textPrompt: imagePrompt,
          seed: Math.floor(Math.random() * 2 ** 31),
          ...(photoSignedUrl ? { referenceImage: photoSignedUrl } : {}),
          outputWidth: CHILDRENS_BOOK_PAGE_ILLUSTRATION.width,
          outputHeight: CHILDRENS_BOOK_PAGE_ILLUSTRATION.height,
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
          seed: 0,
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
