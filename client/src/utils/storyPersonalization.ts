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

export type TemplatePageTextSource = {
  textTemplate?: unknown;
  text?: unknown;
  textVariants?: unknown;
};

/**
 * Accepts Firestore page `textTemplate` (masculine/feminine object or legacy string).
 */
export function pickTextTemplateVariant(textTemplate: unknown, gender: StoryGender): string {
  if (!textTemplate) return "";
  if (typeof textTemplate === "string") return textTemplate;
  if (typeof textTemplate !== "object") return "";

  const o = textTemplate as Record<string, unknown>;
  const masculine =
    (typeof o.masculine === "string" ? o.masculine : "") ||
    (typeof o.male === "string" ? o.male : "");
  const feminine =
    (typeof o.feminine === "string" ? o.feminine : "") ||
    (typeof o.female === "string" ? o.female : "");

  if (masculine.trim() || feminine.trim()) {
    const chosen = gender === "female" ? feminine || masculine : masculine || feminine;
    return chosen.trim() ? chosen : masculine || feminine;
  }

  return "";
}

function pickTextVariantsLegacy(textVariants: unknown, gender: StoryGender): string {
  if (!textVariants || typeof textVariants !== "object") return "";
  const o = textVariants as { male?: string; female?: string };
  const chosen = gender === "female" ? o.female : o.male;
  if (typeof chosen === "string" && chosen.trim()) return chosen;
  if (typeof o.male === "string" && o.male.trim()) return o.male;
  if (typeof o.female === "string" && o.female.trim()) return o.female;
  return "";
}

/** Reads catalog `previewSpreads[n]` text regardless of field naming. */
export function extractPreviewSpreadText(spread: unknown): string {
  if (!spread || typeof spread !== "object") return "";
  const o = spread as Record<string, unknown>;
  for (const key of ["text", "body", "content"] as const) {
    const v = o[key];
    if (typeof v === "string" && v.trim()) return v;
  }
  return "";
}

export function extractPreviewSpreadImageUrl(spread: unknown): string | undefined {
  if (!spread || typeof spread !== "object") return undefined;
  const o = spread as Record<string, unknown>;
  for (const key of ["imageUrl", "image", "url"] as const) {
    const v = o[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

/**
 * Resolves manuscript text from a template page, with optional preview-spread fallback.
 */
export function resolveTemplatePageText(
  page: TemplatePageTextSource,
  gender: StoryGender,
  spreadTextFallback?: string,
): string {
  const fromTemplate = pickTextTemplateVariant(page.textTemplate, gender);
  if (fromTemplate.trim()) return fromTemplate;

  const fromVariants = pickTextVariantsLegacy(page.textVariants, gender);
  if (fromVariants.trim()) return fromVariants;

  if (typeof page.text === "string" && page.text.trim()) return page.text;

  if (typeof spreadTextFallback === "string" && spreadTextFallback.trim()) {
    return spreadTextFallback;
  }

  return "";
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

export type RawReaderPage = TemplatePageTextSource & {
  pageNumber: number;
  imagePromptTemplate?: string;
  emotionalTone?: string;
};

export type ReaderPageBuilt = RawReaderPage & { textTemplate: string; imageUrl: string };

export type PreviewReaderOverride = {
  pageNumber: number;
  personalizedText?: string;
  imageUrl?: string;
};

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
    /** `previewSpreads[i].text` aligned to sorted template page index (catalog fallback). */
    spreadTextFallbacks?: string[];
    /** Published catalog preview illustration URLs (fallback when no child photo / generated art). */
    spreadImageFallbacks?: Array<string | undefined>;
  }
): ReaderPageBuilt[] {
  const limit = opts.previewSpreadLimit ?? Number.POSITIVE_INFINITY;
  const lockedName = opts.lockedPlaceholderName ?? "…";

  return pages.map((page, index) => {
    const inPreview = index < limit;
    const spreadFallback = opts.spreadTextFallbacks?.[index];
    const raw = resolveTemplatePageText(page, opts.gender, spreadFallback);
    const displayName = inPreview ? opts.childDisplayName : lockedName;
    const text = personalizeStoryTemplateString(raw, displayName, opts.gender, opts.language);
    const spreadImage = inPreview ? opts.spreadImageFallbacks?.[index] : undefined;
    const personalImage = inPreview && opts.photoPreviewUrl ? opts.photoPreviewUrl : undefined;
    // Child photo first for personalized preview spreads; catalog art is fallback only.
    // Generated preview illustrations are applied later via applyPreviewOverridesToReaderPages.
    const imageUrl = inPreview
      ? personalImage || spreadImage?.trim() || opts.fallbackImageUrl(page.pageNumber)
      : spreadImage?.trim() || opts.fallbackImageUrl(page.pageNumber);
    return { ...page, textTemplate: text, imageUrl };
  });
}

/**
 * Merges server-generated preview pages (personalizedText + illustration URLs) into reader pages.
 */
export function applyPreviewOverridesToReaderPages(
  pages: ReaderPageBuilt[],
  overrides: PreviewReaderOverride[],
  previewSpreadLimit: number = PREVIEW_SPREAD_LIMIT,
): ReaderPageBuilt[] {
  if (!overrides.length) return pages;
  const byPage = new Map(overrides.map((o) => [o.pageNumber, o]));

  return pages.map((page, index) => {
    if (index >= previewSpreadLimit) return page;
    const o = byPage.get(page.pageNumber);
    if (!o) return page;

    const text =
      typeof o.personalizedText === "string" && o.personalizedText.trim()
        ? o.personalizedText
        : page.textTemplate;
    const generatedImage =
      typeof o.imageUrl === "string" && o.imageUrl.trim() ? o.imageUrl.trim() : undefined;
    const imageUrl = generatedImage ?? page.imageUrl;

    return { ...page, textTemplate: text, imageUrl };
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
