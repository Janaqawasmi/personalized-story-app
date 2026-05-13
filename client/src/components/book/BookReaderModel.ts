/**
 * Minimal shape consumed by {@link BookReaderCore} — public catalog templates
 * and specialist approval previews both adapt into this model.
 */
export interface BookReaderPageModel {
  pageNumber: number;
  textTemplate: string;
  imagePromptTemplate?: string;
  imageUrl?: string;
  emotionalTone?: string;
}

export interface BookReaderModel {
  title: string;
  pages: BookReaderPageModel[];
  language: "ar" | "he";
  coverImageUrl: string | null;
  /** Shown on cover / preface when present (public reader); optional for specialist preview. */
  childDisplayName?: string | null;
}
