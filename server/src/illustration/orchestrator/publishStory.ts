import { Timestamp } from "firebase-admin/firestore";
import type {
  ArtDirectionSnapshot,
  ProtagonistSlot,
  StoryTemplate,
  StoryTemplatePage,
  TemplatePageArtDirection,
} from "@/shared/types/storyTemplate";
import type { PersonalizedCharacterPolicy } from "@/shared/types/storyTemplate";
import { ILLUSTRATION_STYLE_IDS } from "@/shared/types/visualStyles";
import { admin, firestore } from "@/config/firebase";
import {
  readLatestImage,
  readLatestFinalPrompt,
  readScenePlan,
  readLatestVisualBible,
} from "@/illustration/shared/artefact-store";
import { fillIllustrationV2DocDefaults, STORIES_COLLECTION, type Story } from "@/models/story.model";
import type { AgeRange } from "@/models/storyBrief.model";
import { COLLECTIONS } from "@/shared/firestore/paths";

export class PublishStoryError extends Error {
  readonly code: "INVALID_STATE" | "NOT_READY";

  constructor(code: PublishStoryError["code"], message: string) {
    super(message);
    this.name = "PublishStoryError";
    this.code = code;
  }
}

function hydrateStory(storyId: string, data: Record<string, unknown> | undefined): Story {
  const story = { id: storyId, ...data } as Story;
  fillIllustrationV2DocDefaults(story);
  return story;
}

function slugifyTitle(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base.length > 0 ? base : "story";
}

async function allocateUniqueSlug(base: string): Promise<string> {
  let candidate = base;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await firestore
      .collection(COLLECTIONS.STORY_TEMPLATES)
      .where("slug", "==", candidate)
      .limit(1)
      .get();
    if (snap.empty) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

/**
 * Approximate document size guard.
 * Firestore caps a document at 1 MiB. We reserve half for the existing
 * template fields and allow the snapshot up to 700 KB inline; if larger,
 * the snapshot goes to the personalizationArtefacts subcollection instead.
 */
const INLINE_SIZE_LIMIT_BYTES = 700_000;

function estimateJsonBytes(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

export interface PublishStoryBody {
  shortDescriptionHe?: string;
  shortDescriptionAr?: string;
  displayTopicHe?: string;
  displayTopicAr?: string;
}

export async function publishStory(params: {
  storyId: string;
  uid: string;
  body?: PublishStoryBody;
}): Promise<{ templateId: string }> {
  const { storyId, uid, body = {} } = params;
  const storyRef = firestore.collection(STORIES_COLLECTION).doc(storyId);
  const snap = await storyRef.get();
  if (!snap.exists) {
    throw new PublishStoryError("INVALID_STATE", "Story not found");
  }
  const story = hydrateStory(storyId, snap.data() as Record<string, unknown>);

  if (story.status !== "illustration_ready") {
    throw new PublishStoryError(
      "INVALID_STATE",
      `Story must be illustration_ready to publish (got ${story.status})`,
    );
  }

  const illPages = story.illustrationPages ?? [];
  if (illPages.length === 0) {
    throw new PublishStoryError("NOT_READY", "No illustration pages on story");
  }

  for (const row of illPages) {
    if (row.currentImageVersion === null) {
      throw new PublishStoryError("NOT_READY", `Page ${row.pageNumber} has no image version`);
    }
    const img = await readLatestImage(storyId, row.pageNumber);
    if (!img || img.version !== row.currentImageVersion) {
      throw new PublishStoryError("NOT_READY", `Missing image artefact for page ${row.pageNumber}`);
    }
    if (img.reviewStatus !== "approved") {
      throw new PublishStoryError(
        "NOT_READY",
        `Page ${row.pageNumber} image is not approved`,
      );
    }
  }

  const brief = story.brief;
  const ageRange = brief.ageAndScope.ageRange;
  const ageGroup = ageRange;
  const language: "ar" | "he" = "he";
  const isPersonalizable = brief.storyWorld.personalization === true;

  // ── Load Visual Bible (once) ──────────────────────────────────────────────
  const visualBible = await readLatestVisualBible(storyId);

  const sortedIll = [...illPages].sort((a, b) => a.pageNumber - b.pageNumber);
  const templatePages: StoryTemplatePage[] = [];
  const artDirectionPages: TemplatePageArtDirection[] = [];

  for (const row of sortedIll) {
    const img = (await readLatestImage(storyId, row.pageNumber))!;
    const fp = await readLatestFinalPrompt(storyId, row.pageNumber);
    const sp = row.currentScenePlanVersion
      ? await readScenePlan(storyId, row.pageNumber, row.currentScenePlanVersion)
      : null;
    const imagePromptTemplate =
      fp?.finalPromptString?.trim() ?? `[page ${row.pageNumber} illustration prompt]`;
    const emotionalTone = sp?.emotionalIntent?.trim() ?? "";

    const pageText = row.text.trim();

    templatePages.push({
      pageNumber: row.pageNumber,
      textTemplate: { masculine: pageText, feminine: pageText },
      imagePromptTemplate,
      emotionalTone,
      sampleImageUrl: img.publicUrl,
    });

    artDirectionPages.push({
      pageNumber: row.pageNumber,
      emotionalIntent: emotionalTone,
      structuredPrompt: sp?.structuredPrompt ?? null,
    });
  }

  // ── Art-direction snapshot ─────────────────────────────────────────────────
  //
  // Contains everything Phase 5 needs to assemble personalized prompts:
  //   - Visual Bible style/palette/avoid/env (NOT characterAnchor — that's in protagonistSlot)
  //   - Per-page structured prompts (scene, pose, focal point, composition, lighting)
  //
  // The sample protagonist appearance (characterAnchor/characterSheet) lives
  // ONLY in protagonistSlot so personalized mode can exclude it by construction.

  let artDirectionSnapshot: ArtDirectionSnapshot | null = null;
  if (visualBible) {
    artDirectionSnapshot = {
      styleGuide: visualBible.styleGuide,
      consistencyAnchors: visualBible.consistencyAnchors,
      environmentRegistry: visualBible.environmentRegistry,
      palette: visualBible.palette,
      avoidList: visualBible.avoidList,
      pages: artDirectionPages,
    };
  }

  const allPagesHaveStructuredPrompt =
    artDirectionPages.length > 0 &&
    artDirectionPages.every((p) => p.structuredPrompt !== null);

  const visualPersonalizationReady =
    isPersonalizable && visualBible !== null && allPagesHaveStructuredPrompt;

  // ── Inline vs subcollection decision ─────────────────────────────────────
  const snapshotBytes = artDirectionSnapshot ? estimateJsonBytes(artDirectionSnapshot) : 0;
  const artDirectionStoredInline = snapshotBytes < INLINE_SIZE_LIMIT_BYTES;

  if (artDirectionSnapshot && snapshotBytes >= INLINE_SIZE_LIMIT_BYTES) {
    console.warn(
      `[publishStory] art-direction snapshot too large for inline storage ` +
        `(${snapshotBytes} bytes); will write to subcollection. storyId=${storyId}`,
    );
  }

  // ── Protagonist slot ──────────────────────────────────────────────────────
  const protagonistSlot: ProtagonistSlot | undefined =
    isPersonalizable && visualBible
      ? {
          role: "main_child_character",
          replaceable: true,
          sampleCharacterDescription: visualBible.characterAnchor,
          sampleCharacterSheet: visualBible.characterSheet,
        }
      : undefined;

  const personalizedCharacterPolicy: PersonalizedCharacterPolicy = isPersonalizable
    ? "replace_with_child_photo"
    : "keep_sample";

  // ── Cover and preview spreads ─────────────────────────────────────────────
  const page1Image = (await readLatestImage(storyId, 1))!;
  const coverUrl = page1Image.publicUrl;

  const previewSpreads: [
    { imageUrl: string; text: string },
    { imageUrl: string; text: string },
  ] = [
    {
      imageUrl: page1Image.publicUrl,
      text: sortedIll[0]?.text.trim() ?? "",
    },
    {
      imageUrl:
        sortedIll.length > 1
          ? (await readLatestImage(storyId, sortedIll[1]!.pageNumber))!.publicUrl
          : page1Image.publicUrl,
      text: sortedIll.length > 1 ? sortedIll[1]!.text.trim() : sortedIll[0]?.text.trim() ?? "",
    },
  ];

  const creative = brief.clinicalFoundation.creativeVision?.trim() ?? "";
  const shortDescription = {
    he: body.shortDescriptionHe?.trim() || creative || story.title,
    ar: body.shortDescriptionAr?.trim() || creative || story.title,
  };

  const primaryApproach = brief.therapeuticArchitecture.primaryApproach;
  const primaryTopic = brief.storyType;
  const displayTopic = {
    he: body.displayTopicHe?.trim() || primaryTopic || story.title,
    ar: body.displayTopicAr?.trim() || primaryTopic || story.title,
  };

  const slugBase = slugifyTitle(story.title);
  const slug = await allocateUniqueSlug(slugBase);

  const templateRef = firestore.collection(COLLECTIONS.STORY_TEMPLATES).doc();
  const templateId = templateRef.id;
  const nowIso = new Date().toISOString();

  // Build the base template (all required + always-present optional fields).
  // Optional personalization fields are spread in conditionally below to satisfy
  // exactOptionalPropertyTypes (undefined must not be explicitly assigned).
  const templateBase: StoryTemplate = {
    // ── Catalog / public fields (unchanged) ──────────────────────────────────
    draftId: storyId,
    briefId: storyId,
    title: story.title,
    status: "approved",
    primaryTopic,
    topicKey: primaryTopic,
    specificSituation: brief.clinicalFoundation.trigger,
    ageGroup,
    generationConfig: {
      language,
      targetAgeGroup: ageRange,
      length: brief.ageAndScope.storyLength,
      tone: brief.therapeuticArchitecture.shameDimension,
      emphasis: primaryApproach,
    },
    approvedBy: uid,
    approvedAt: nowIso,
    revisionCount: story.agent1Versions.length,
    isActive: true,
    pages: templatePages,
    slug,
    shortDescription,
    coverImageUrl: coverUrl,
    coverImage: coverUrl,
    previewSpreads,
    displayTopic,
    isPublished: true,
    publishedAt: Timestamp.now(),
    purchaseCount: 0,
    previewPageCount: 2,
    totalPageCount: templatePages.length,

    // ── Personalization metadata (Phase 1) ────────────────────────────────
    //
    // Flag semantics (keep separate — never merge):
    //   personalizationEnabled       = author intent: story supports personalization in general
    //   visualPersonalizationEnabled = author intent: story supports photo-based visual personalization
    //   visualPersonalizationReady   = technical gate: VB + structured prompts + protagonistSlot captured
    //   textPersonalizationReady     = technical gate: reviewed gendered variants exist
    //
    // Runtime permission is a DERIVED condition, not stored:
    //   canUseVisualPersonalization =
    //     personalizationEnabled && visualPersonalizationEnabled && visualPersonalizationReady
    personalizationEnabled: isPersonalizable,
    textPersonalizationReady: false,  // Phase 3: specialist reviews gendered variants
    visualPersonalizationReady,
    // Intent only — do not combine with visualPersonalizationReady here.
    visualPersonalizationEnabled: isPersonalizable,
    allowedIllustrationStyles: isPersonalizable ? [...ILLUSTRATION_STYLE_IDS] : [],
    sourceStoryId: storyId,
    specialistId: uid,
    personalizedCharacterPolicy,
    artDirectionSnapshot: artDirectionStoredInline ? (artDirectionSnapshot ?? null) : null,
    artDirectionStoredInline,
  };

  // Conditionally add optional fields to avoid assigning `undefined` with exactOptionalPropertyTypes.
  const template: StoryTemplate = {
    ...templateBase,
    ...(isPersonalizable ? { defaultIllustrationStyle: "watercolor" as const } : {}),
    ...(protagonistSlot ? { protagonistSlot } : {}),
  };

  // Validate required public catalog fields before writing.
  const missingPublicFields: string[] = [];
  if (!template.title?.trim()) missingPublicFields.push("title");
  if (!template.coverImageUrl?.trim()) missingPublicFields.push("coverImageUrl");
  if (!template.primaryTopic?.trim()) missingPublicFields.push("primaryTopic (storyType)");
  if (!template.ageGroup?.trim()) missingPublicFields.push("ageGroup");
  if (template.pages.length === 0) missingPublicFields.push("pages");
  if (missingPublicFields.length > 0) {
    throw new PublishStoryError(
      "NOT_READY",
      `Cannot publish: missing required public fields: ${missingPublicFields.join(", ")}`,
    );
  }

  console.info(
    `[publishStory] writing template collection=${COLLECTIONS.STORY_TEMPLATES} ` +
      `templateId=${templateId} storyId=${storyId} status=${template.status} ` +
      `isActive=${template.isActive} primaryTopic=${template.primaryTopic} ` +
      `topicKey=${template.topicKey} ageGroup=${template.ageGroup} ` +
      `language=${language} pages=${template.pages.length} ` +
      `personalizationEnabled=${isPersonalizable} ` +
      `visualPersonalizationReady=${visualPersonalizationReady} ` +
      `artDirectionStoredInline=${artDirectionStoredInline} ` +
      `snapshotBytes=${snapshotBytes}`,
  );

  const batch = firestore.batch();
  batch.set(templateRef, template as unknown as Record<string, unknown>);

  // When the snapshot is too large to go inline, store it in a subcollection doc.
  if (artDirectionSnapshot && !artDirectionStoredInline) {
    const artefactsRef = templateRef
      .collection(COLLECTIONS.TEMPLATE_PERSONALIZATION_ARTEFACTS)
      .doc("snapshot");
    batch.set(artefactsRef, {
      templateId,
      storyId,
      createdAt: Date.now(),
      ...artDirectionSnapshot,
    });
  }

  const publishedAt = Date.now();
  const entryPublished = {
    id: crypto.randomUUID(),
    at: publishedAt,
    byUid: uid,
    event: { kind: "published" as const, templateId },
  };
  const entryStatus = {
    id: crypto.randomUUID(),
    at: publishedAt,
    byUid: uid,
    event: {
      kind: "status_changed" as const,
      from: "illustration_ready" as const,
      to: "published" as const,
    },
  };

  batch.update(storyRef, {
    status: "published",
    publishedAt,
    publishedTemplateId: templateId,
    updatedAt: publishedAt,
    editHistory: admin.firestore.FieldValue.arrayUnion(entryPublished, entryStatus),
  });

  await batch.commit();

  return { templateId };
}
