import type { ImageArtefact } from "../../types/illustration";
import type { Story } from "../../types/story";
import type { BookReaderModel } from "./BookReaderModel";

/**
 * Builds a read-only book model from the specialist Story plus loaded image artefacts
 * (Firestore `images` subcollection snapshot). Uses approved images matching each row's
 * `currentImageVersion`.
 */
export function storyToReaderModel(
  story: Story,
  images: ImageArtefact[],
): BookReaderModel | null {
  const rows = story.illustrationPages;
  if (!rows?.length) return null;

  const language: "ar" | "he" = "he";

  const sorted = [...rows].sort((a, b) => a.pageNumber - b.pageNumber);
  const pages = sorted.map((row) => {
    const img = images.find(
      (i) =>
        i.pageNumber === row.pageNumber &&
        i.version === row.currentImageVersion &&
        i.reviewStatus === "approved",
    );
    return {
      pageNumber: row.pageNumber,
      textTemplate: row.text,
      imageUrl: img?.publicUrl,
    };
  });

  const coverImageUrl =
    pages.find((p) => p.pageNumber === 1)?.imageUrl ??
    pages[0]?.imageUrl ??
    null;

  return {
    title: story.title,
    pages,
    language,
    coverImageUrl,
    childDisplayName: null,
  };
}
