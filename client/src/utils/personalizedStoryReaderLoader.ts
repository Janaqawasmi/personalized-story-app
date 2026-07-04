import { getPersonalizedStory } from "../api/caregiverApi";
import { resolveStorageDownloadUrl } from "./readerPreviewLoader";
import type { ReaderPageBuilt } from "./storyPersonalization";

export interface PersonalizedStoryForReader {
  id: string;
  title: string;
  language: "ar" | "he";
  coverImage?: string;
  childName?: string;
  pages: ReaderPageBuilt[];
}

/** Thrown when the caregiver requests a personalized story that isn't accessible yet (still generating, failed, or not theirs). */
export class PersonalizedStoryNotAccessibleError extends Error {
  constructor(message = "This story is not accessible yet.") {
    super(message);
    this.name = "PersonalizedStoryNotAccessibleError";
  }
}

/**
 * Loads a fully purchased, fully generated personalized story for the
 * reader — used by the "Read Story" CTA in the Purchased tab (cart/payment
 * flow Bug 4 fix).
 *
 * Unlike the free-preview reader path, every page here was already fully
 * personalized server-side by fullStoryGeneration.service.ts (final text +
 * final illustration for every page, not just the first two), so no
 * gender/pronoun substitution or preview-spread locking is applied here —
 * the whole book is unlocked.
 */
export async function loadPersonalizedStoryForReader(
  personalizedStoryId: string,
  fallbackImageUrl: (pageNumber: number) => string,
): Promise<PersonalizedStoryForReader> {
  const data = await getPersonalizedStory(personalizedStoryId);

  if (!data.isAccessible) {
    throw new PersonalizedStoryNotAccessibleError();
  }

  const sortedPages = [...data.pages].sort((a, b) => a.pageNumber - b.pageNumber);

  const pages: ReaderPageBuilt[] = await Promise.all(
    sortedPages.map(async (page) => {
      const resolvedUrl = await resolveStorageDownloadUrl(page.generatedImagePath ?? undefined);
      return {
        pageNumber: page.pageNumber,
        textTemplate: page.personalizedText,
        imageUrl: resolvedUrl || fallbackImageUrl(page.pageNumber),
      };
    }),
  );

  return {
    id: data.storyId,
    title: data.templateTitle,
    language: data.language,
    coverImage: data.coverImageUrl || undefined,
    childName: data.childFirstName || undefined,
    pages,
  };
}
