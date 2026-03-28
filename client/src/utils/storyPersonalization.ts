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

/**
 * Accepts Firestore page `textTemplate` (masculine/feminine object or legacy string).
 */
export function pickTextTemplateVariant(textTemplate: unknown, gender: StoryGender): string {
  if (textTemplate && typeof textTemplate === "object" && "masculine" in textTemplate && "feminine" in textTemplate) {
    const o = textTemplate as { masculine: string; feminine: string };
    return gender === "female" ? o.feminine : o.masculine;
  }
  if (typeof textTemplate === "string") return textTemplate;
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

export type RawReaderPage = {
  pageNumber: number;
  textTemplate: unknown;
  imagePromptTemplate?: string;
  emotionalTone?: string;
};

export function buildPersonalizedReaderPages(
  pages: RawReaderPage[],
  opts: {
    gender: StoryGender;
    childDisplayName: string;
    language: "ar" | "he";
    photoPreviewUrl?: string;
    fallbackImageUrl: (pageNumber: number) => string;
  }
): Array<RawReaderPage & { textTemplate: string; imageUrl: string }> {
  return pages.map((page) => {
    const raw = pickTextTemplateVariant(page.textTemplate, opts.gender);
    const text = personalizeStoryTemplateString(raw, opts.childDisplayName, opts.gender, opts.language);
    const personalImage =
      typeof page.pageNumber === "number" && page.pageNumber <= 2 && opts.photoPreviewUrl
        ? opts.photoPreviewUrl
        : undefined;
    const imageUrl = personalImage ?? opts.fallbackImageUrl(page.pageNumber);
    return { ...page, textTemplate: text, imageUrl };
  });
}
