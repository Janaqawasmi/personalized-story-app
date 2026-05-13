import type { ScenePlanArtefact, VisualBibleArtefact } from "@/illustration/types";
import type { Story } from "@/models/story.model";

export interface ScenePlannerInput {
  story: Story;
  manuscriptPages: { pageNumber: number; text: string }[];
  visualBible: VisualBibleArtefact;
}

/** Phase 4 — regeneration of a single page’s scene plan (Stage 1b′). */
export interface ScenePlannerRegenInput {
  story: Story;
  manuscriptPages: { pageNumber: number; text: string }[];
  visualBible: VisualBibleArtefact;
  pageNumber: number;
  previousScenePlan: ScenePlanArtefact;
  feedbackNote: string | null;
}
