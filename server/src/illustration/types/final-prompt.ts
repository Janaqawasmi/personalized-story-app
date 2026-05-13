export interface FinalPromptArtefact {
  id: string;
  storyId: string;
  pageNumber: number;
  version: number;
  createdAt: number;
  parentScenePlanVersion: number;
  parentVisualBibleVersion: number;
  finalPromptString: string;
  promptOrder: string[];
  charCount: number;
  warnings: string[];
}
