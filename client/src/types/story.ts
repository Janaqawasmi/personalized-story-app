/**
 * Shape of `story_templates` documents used by the personalize flow.
 * @see PersonalizeStoryPage
 */
export interface StoryTemplate {
  id: string;
  title: string;
  language?: string;
  ageGroup?: string;
  targetAgeGroup?: string;
  topic?: string | Record<string, string>;
  generationConfig?: {
    targetAgeGroup?: string;
  };
  /** e.g. "{{CHILD_NAME}} took a deep breath..." — live preview on Name step */
  previewSentence?: string;
}
