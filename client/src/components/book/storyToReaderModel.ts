import type { ImageArtefact } from "../../types/illustration";
import type { Story } from "../../types/story";
import type { BookReaderModel, BookReaderPageModel } from "./BookReaderModel";

export type BookPreviewImagePolicy = "none" | "latest" | "approved";

export interface BuildBookPreviewOptions {
  /** How to attach illustration URLs. Default `approved` for publish-style previews. */
  imagePolicy?: BookPreviewImagePolicy;
}

function splitBodyIntoPages(body: string): { pageNumber: number; text: string }[] {
  return body
    .split(/\n\s*\n/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .map((text, i) => ({
      pageNumber: i + 1,
      text,
    }));
}

function storyLanguage(story: Story): "ar" | "he" {
  return story.brief?.outputLanguage === "ar" ? "ar" : "he";
}

/** Manuscript pages for preview: illustration rows, structured pages, or draft body. */
export function resolveManuscriptPages(
  story: Story,
): { pageNumber: number; text: string; currentImageVersion: number | null }[] {
  const ill = story.illustrationPages;
  if (ill?.length) {
    return [...ill]
      .sort((a, b) => a.pageNumber - b.pageNumber)
      .map((row) => ({
        pageNumber: row.pageNumber,
        text: row.text,
        currentImageVersion: row.currentImageVersion,
      }));
  }

  const pages = story.pages;
  if (pages?.length) {
    return [...pages]
      .sort((a, b) => a.pageNumber - b.pageNumber)
      .map((p) => ({
        pageNumber: p.pageNumber,
        text: p.text,
        currentImageVersion: null,
      }));
  }

  const body =
    story.currentDraft?.body?.trim() ??
    story.agent1Result?.story?.trim() ??
    "";
  if (!body) return [];

  return splitBodyIntoPages(body).map((p) => ({
    ...p,
    currentImageVersion: null,
  }));
}

function imageUrlForPage(
  pageNumber: number,
  currentImageVersion: number | null,
  images: ImageArtefact[],
  policy: BookPreviewImagePolicy,
): string | undefined {
  if (policy === "none" || images.length === 0) return undefined;

  const pageImages = images.filter((i) => i.pageNumber === pageNumber);
  if (pageImages.length === 0) return undefined;

  if (policy === "approved") {
    if (currentImageVersion === null) return undefined;
    const approved = pageImages.find(
      (i) =>
        i.version === currentImageVersion && i.reviewStatus === "approved",
    );
    return approved?.publicUrl;
  }

  if (currentImageVersion !== null) {
    const current = pageImages.find((i) => i.version === currentImageVersion);
    if (current?.publicUrl) return current.publicUrl;
  }

  const sorted = [...pageImages].sort((a, b) => b.version - a.version);
  return sorted.find((i) => i.publicUrl)?.publicUrl;
}

/**
 * Builds a read-only book model for specialist preview (draft manuscript and/or
 * in-progress illustrations). Returns null when there is no manuscript text.
 */
export function buildSpecialistBookPreviewModel(
  story: Story,
  images: ImageArtefact[] = [],
  options: BuildBookPreviewOptions = {},
): BookReaderModel | null {
  const imagePolicy = options.imagePolicy ?? "approved";
  const manuscript = resolveManuscriptPages(story);
  if (manuscript.length === 0) return null;

  const pages: BookReaderPageModel[] = manuscript.map((row) => ({
    pageNumber: row.pageNumber,
    textTemplate: row.text,
    imageUrl: imageUrlForPage(
      row.pageNumber,
      row.currentImageVersion,
      images,
      imagePolicy,
    ),
  }));

  const coverImageUrl =
    pages.find((p) => p.pageNumber === 1)?.imageUrl ??
    pages.find((p) => p.imageUrl)?.imageUrl ??
    null;

  return {
    title: story.title,
    pages,
    language: storyLanguage(story),
    coverImageUrl,
    childDisplayName: null,
  };
}

/**
 * Builds a read-only book model from the specialist Story plus loaded image artefacts
 * (Firestore `images` subcollection snapshot). By default uses approved images only.
 */
export function storyToReaderModel(
  story: Story,
  images: ImageArtefact[],
  options: BuildBookPreviewOptions = { imagePolicy: "approved" },
): BookReaderModel | null {
  const rows = story.illustrationPages;
  if (!rows?.length) {
    return buildSpecialistBookPreviewModel(story, images, options);
  }
  return buildSpecialistBookPreviewModel(story, images, options);
}
