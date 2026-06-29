import { Timestamp } from "firebase-admin/firestore";
import type { StoryTemplate, StoryTemplatePage } from "@/shared/types/storyTemplate";
import { admin, firestore } from "@/config/firebase";
import {
  readLatestImage,
  readLatestFinalPrompt,
  readScenePlan,
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
  // Store the exact brief ageRange so the public catalog age filter matches the
  // Specialist Dashboard 1:1 (no lossy bucketing — 3-5 and 5-7 stay distinct).
  const ageRange = brief.ageAndScope.ageRange;
  const ageGroup = ageRange;
  const language: "ar" | "he" = "he";
  const isPersonalizable = brief.storyWorld.personalization === true;

  const sortedIll = [...illPages].sort((a, b) => a.pageNumber - b.pageNumber);
  const templatePages: StoryTemplatePage[] = [];

  for (const row of sortedIll) {
    const v = row.currentImageVersion!;
    const img = (await readLatestImage(storyId, row.pageNumber))!;
    const fp = await readLatestFinalPrompt(storyId, row.pageNumber);
    const sp = row.currentScenePlanVersion
      ? await readScenePlan(storyId, row.pageNumber, row.currentScenePlanVersion)
      : null;
    const imagePromptTemplate =
      fp?.finalPromptString?.trim() ?? `[page ${row.pageNumber} illustration prompt]`;
    const emotionalTone = sp?.emotionalIntent?.trim() ?? "";

    const pageText = row.text.trim();
    const masculine = pageText;
    const feminine = pageText;

    templatePages.push({
      pageNumber: row.pageNumber,
      textTemplate: isPersonalizable
        ? { masculine, feminine }
        : { masculine: pageText, feminine: pageText },
      imagePromptTemplate,
      emotionalTone,
    });
  }

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
  // Catalog taxonomy key = the therapeutic DOMAIN (brief.storyType, e.g.
  // "fear_anxiety"), which matches the public catalog's referenceData topic
  // ids. Previously this was wrongly set to the therapeutic *approach*
  // (e.g. "graduated_exposure"), which is not a catalog topic, so published
  // stories never matched category/mega-menu browse. See task investigation.
  const primaryApproach = brief.therapeuticArchitecture.primaryApproach;
  const primaryTopic = brief.storyType;
  const displayTopic = {
    he:
      body.displayTopicHe?.trim() ||
      primaryTopic ||
      story.title,
    ar:
      body.displayTopicAr?.trim() ||
      primaryTopic ||
      story.title,
  };

  const slugBase = slugifyTitle(story.title);
  const slug = await allocateUniqueSlug(slugBase);

  const templateRef = firestore.collection(COLLECTIONS.STORY_TEMPLATES).doc();
  const templateId = templateRef.id;
  const nowIso = new Date().toISOString();

  const template: StoryTemplate = {
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
  };

  // Validate the public fields the catalog UI depends on before writing.
  // A story that lands in `story_templates` without these will silently fail
  // to render / filter on the public site, so fail loudly here instead.
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
      `language=${language} pages=${template.pages.length}`,
  );

  const batch = firestore.batch();
  batch.set(templateRef, template as unknown as Record<string, unknown>);

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
