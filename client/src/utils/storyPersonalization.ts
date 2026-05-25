/**
 * Client-side story text personalization (preview + reader).
 * Mirrors server/src/services/personalization.service.ts placeholder rules so
 * preview and generation stay consistent.
 *
 * Gender fallback: when `gender` is missing from stored personalization, we
 * default to "male" for variant + pronoun selection — same rule as legacy
 * personalizeTemplate on the server (non-female ⇒ masculine).
 */

export type StoryGender = "male" | "female";

export type StoredPersonalizationSnapshot = {
  childName: string;
  /** Undefined until the user picks a step; see resolveGenderForPreview. */
  gender?: StoryGender;
  /** Age band for API (`0_3` … `9_12`); optional for older saved sessions. */
  childAgeGroup?: string;
  photoPreviewUrl?: string;
};

export type TemplatePageTextSource = {
  textTemplate?: unknown;
  text?: string;
  textVariants?: { male?: string; female?: string };
};

export type RawReaderPage = {
  pageNumber: number;
  textTemplate: unknown;
  /** Catalog / legacy template page image when present on `story_templates.pages[]`. */
  imageUrl?: string;
  imagePromptTemplate?: string;
  emotionalTone?: string;
};

export type ReaderPageBuilt = RawReaderPage & {
  textTemplate: string;
  imageUrl: string;
  /** Secondary URL tried if `imageUrl` fails to load (e.g. catalog spread after blob photo). */
  imageFallbackUrl?: string;
};

function normalizeImageCandidate(url: string | undefined): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  if (
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }
  return undefined;
}

/**
 * Preview spreads: child photo first, then catalog `previewSpreads`, then template page image, then placeholder.
 * Locked spreads: template page image, then catalog spread at index, then placeholder.
 */
export function resolveReaderPageImageUrl(opts: {
  inPreview: boolean;
  photoUrl?: string;
  spreadUrl?: string;
  templatePageUrl?: string;
  placeholderUrl: string;
}): { imageUrl: string; imageFallbackUrl?: string } {
  const placeholder = opts.placeholderUrl;
  const spread = normalizeImageCandidate(opts.spreadUrl);
  const template = normalizeImageCandidate(opts.templatePageUrl);
  const photo = opts.inPreview ? normalizeImageCandidate(opts.photoUrl) : undefined;

  if (photo) {
    const fallback = spread && spread !== photo ? spread : template && template !== photo ? template : undefined;
    return { imageUrl: photo, imageFallbackUrl: fallback };
  }
  if (spread) return { imageUrl: spread };
  if (template) return { imageUrl: template };
  return { imageUrl: placeholder };
}

export type PreviewReaderOverride = {
  pageNumber: number;
  personalizedText?: string;
  imageUrl?: string;
};

export function getStoryPersonalizationStorageKey(storyId: string): string {
  return `qosati_personalization_${storyId}`;
}

export function readPersonalizationFromStorage(storyId: string | undefined): StoredPersonalizationSnapshot | null {
  if (!storyId || typeof window === "undefined") return null;
  const raw = localStorage.getItem(getStoryPersonalizationStorageKey(storyId));
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as { data?: StoredPersonalizationSnapshot };
    if (!session?.data) return null;
    return {
      childName: session.data.childName ?? "",
      gender: session.data.gender,
      childAgeGroup: session.data.childAgeGroup,
      photoPreviewUrl: session.data.photoPreviewUrl?.trim() || undefined,
    };
  } catch {
    return null;
  }
}

export function normalizeStoryLanguage(lang: string | undefined): "ar" | "he" {
  const n = (lang || "he").toLowerCase();
  return n === "ar" ? "ar" : "he";
}

/** @see file header — missing gender ⇒ masculine variant + pronouns */
export function resolveGenderForPreview(gender: StoryGender | undefined): StoryGender {
  return gender === "female" ? "female" : "male";
}

const PRONOUN_MAPS: Record<"he" | "ar", Record<StoryGender, { subject: string; object: string; possessive: string }>> = {
  he: {
    male: { subject: "הוא", object: "אותו", possessive: "שלו" },
    female: { subject: "היא", object: "אותה", possessive: "שלה" },
  },
  ar: {
    male: { subject: "هو", object: "ه", possessive: "ه" },
    female: { subject: "هي", object: "ها", possessive: "ها" },
  },
};

function pickFromGenderedObject(obj: Record<string, unknown>, gender: StoryGender): string {
  const masc = (obj.masculine ?? obj.male) as string | undefined;
  const fem = (obj.feminine ?? obj.female) as string | undefined;
  const chosen = gender === "female" ? fem : masc;
  if (chosen?.trim()) return chosen.trim();
  const fallback = gender === "female" ? masc : fem;
  return fallback?.trim() ?? "";
}

/**
 * Accepts Firestore page `textTemplate` (masculine/feminine or male/female object, or legacy string).
 */
export function pickTextTemplateVariant(textTemplate: unknown, gender: StoryGender): string {
  if (textTemplate && typeof textTemplate === "object") {
    const o = textTemplate as Record<string, unknown>;
    if ("masculine" in o || "feminine" in o || "male" in o || "female" in o) {
      return pickFromGenderedObject(o, gender);
    }
  }
  if (typeof textTemplate === "string") return textTemplate.trim();
  return "";
}

export function extractPreviewSpreadText(spread: unknown): string {
  if (!spread || typeof spread !== "object") return "";
  const s = spread as Record<string, unknown>;
  for (const key of ["text", "body", "content"]) {
    const v = s[key];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (v && typeof v === "object") {
      const rec = v as Record<string, string>;
      const joined = Object.values(rec).find((x) => typeof x === "string" && x.trim());
      if (joined?.trim()) return joined.trim();
    }
  }
  return "";
}

export function extractPreviewSpreadImageUrl(spread: unknown): string | undefined {
  if (!spread || typeof spread !== "object") return undefined;
  const s = spread as Record<string, unknown>;
  for (const key of ["imageUrl", "image", "url"]) {
    const v = s[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

/**
 * Resolves raw template text for a page: textTemplate → textVariants → page.text → spread fallback.
 */
export function resolveTemplatePageText(
  page: TemplatePageTextSource,
  gender: StoryGender,
  spreadTextFallback?: string
): string {
  let raw = pickTextTemplateVariant(page.textTemplate, gender);
  if (!raw && page.textVariants) {
    raw =
      gender === "female"
        ? (page.textVariants.female ?? page.textVariants.male ?? "")
        : (page.textVariants.male ?? page.textVariants.female ?? "");
    raw = raw.trim();
  }
  if (!raw && typeof page.text === "string") {
    raw = page.text.trim();
  }
  if (!raw && spreadTextFallback?.trim()) {
    raw = spreadTextFallback.trim();
  }
  return raw;
}

/**
 * Substitutes name + pronouns + optional dedication. `childDisplayName` may be a localized generic label.
 */
export function personalizeStoryTemplateString(
  template: string,
  childDisplayName: string,
  gender: StoryGender,
  language: "ar" | "he"
): string {
  if (!template) return "";
  const pronouns = PRONOUN_MAPS[language][gender];
  let result = template;
  result = result.replace(/\{\{CHILD_NAME\}\}/g, childDisplayName);
  result = result.replace(/\{\{\s*child_name\s*\}\}/gi, childDisplayName);
  result = result.replace(/\{\{PRONOUN_SUBJECT\}\}/g, pronouns.subject);
  result = result.replace(/\{\{PRONOUN_OBJECT\}\}/g, pronouns.object);
  result = result.replace(/\{\{PRONOUN_POSSESSIVE\}\}/g, pronouns.possessive);
  result = result.replace(/\{\{DEDICATION_NAME\}\}/g, "");
  return result;
}

/** First N spreads in reading order get full name/photo personalization; keep in sync with server preview generation. */
export const PREVIEW_SPREAD_LIMIT = 2;

export function buildPersonalizedReaderPages(
  pages: RawReaderPage[],
  opts: {
    gender: StoryGender;
    childDisplayName: string;
    language: "ar" | "he";
    photoPreviewUrl?: string;
    fallbackImageUrl: (pageNumber: number) => string;
    /** Only these spreads use the child's name and photo; later spreads use `lockedPlaceholderName` and template art only. */
    previewSpreadLimit?: number;
    lockedPlaceholderName?: string;
    spreadTextFallbacks?: string[];
    spreadImageFallbacks?: Array<string | undefined>;
  }
): ReaderPageBuilt[] {
  const limit = opts.previewSpreadLimit ?? Number.POSITIVE_INFINITY;
  const lockedName = opts.lockedPlaceholderName ?? "…";

  return pages.map((page, index) => {
    const inPreview = index < limit;
    const spreadText = opts.spreadTextFallbacks?.[index];
    const raw = resolveTemplatePageText(page, opts.gender, spreadText);
    const displayName = inPreview ? opts.childDisplayName : lockedName;
    const text = personalizeStoryTemplateString(raw, displayName, opts.gender, opts.language);

    const spreadImage = opts.spreadImageFallbacks?.[index];
    const templatePageUrl = typeof page.imageUrl === "string" ? page.imageUrl : undefined;
    const { imageUrl, imageFallbackUrl } = resolveReaderPageImageUrl({
      inPreview,
      photoUrl: opts.photoPreviewUrl,
      spreadUrl: spreadImage,
      templatePageUrl,
      placeholderUrl: opts.fallbackImageUrl(page.pageNumber),
    });

    return { ...page, textTemplate: text, imageUrl, imageFallbackUrl };
  });
}

/**
 * Merges Firestore `storyPreviews` page overrides into built reader pages (preview spreads only).
 */
export function applyPreviewOverridesToReaderPages(
  pages: ReaderPageBuilt[],
  overrides: PreviewReaderOverride[],
  previewSpreadLimit: number = PREVIEW_SPREAD_LIMIT
): ReaderPageBuilt[] {
  if (!overrides.length) return pages;
  const byPage = new Map(overrides.map((o) => [o.pageNumber, o]));
  return pages.map((page, index) => {
    if (index >= previewSpreadLimit) return page;
    const override = byPage.get(page.pageNumber);
    if (!override) return page;

    const nextText = override.personalizedText?.trim();
    const nextImage = normalizeImageCandidate(override.imageUrl);
    if (!nextText && !nextImage) return page;

    const updated: ReaderPageBuilt = {
      ...page,
      textTemplate: nextText || page.textTemplate,
    };

    if (nextImage) {
      updated.imageFallbackUrl = page.imageUrl;
      updated.imageUrl = nextImage;
    }

    return updated;
  });
}

const PREVIEW_FALLBACK_TEMPLATE =
  "{{CHILD_NAME}} looked up and smiled — this story had been waiting just for her.";
const PREVIEW_TOKEN = "{{CHILD_NAME}}";

/**
 * Live preview sentence for the Name step on PersonalizeStoryPage.
 * Replaces {{CHILD_NAME}} with the typed name, or returns the empty-state sentence if the name is too short.
 */
export function buildPreviewSentence(
  previewSentence: string | undefined,
  childName: string,
  emptyStateText?: string
): { filled: boolean; text: string; nameStart: number; nameEnd: number } {
  const EMPTY =
    emptyStateText ||
    "Once upon a time, there was a child who believed in the magic of stories…";

  const trimmed = childName.trim();
  if (trimmed.length < 2) {
    return { filled: false, text: EMPTY, nameStart: -1, nameEnd: -1 };
  }

  const template = previewSentence || PREVIEW_FALLBACK_TEMPLATE;
  const tokenIndex = template.indexOf(PREVIEW_TOKEN);

  if (tokenIndex === -1) {
    const text = `${trimmed} — ${template}`;
    return { filled: true, text, nameStart: 0, nameEnd: trimmed.length };
  }

  const before = template.slice(0, tokenIndex);
  const after = template.slice(tokenIndex + PREVIEW_TOKEN.length);
  const text = before + trimmed + after;

  return {
    filled: true,
    text,
    nameStart: tokenIndex,
    nameEnd: tokenIndex + trimmed.length,
  };
}
