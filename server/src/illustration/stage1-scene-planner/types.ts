import type { ScenePlanArtefact, VisualBibleArtefact } from "@/illustration/types";
import type { Story } from "@/models/story.model";

export interface ScenePlannerInput {
  story: Story;
  manuscriptPages: { pageNumber: number; text: string }[];
  visualBible: VisualBibleArtefact;
  /** Phase 4 regen — required by type, unused in Phase 2 bulk run. */
  feedbackNote?: string;
  previousScenePlan?: ScenePlanArtefact;
}
