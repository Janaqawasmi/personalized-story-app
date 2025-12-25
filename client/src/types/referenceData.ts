export type Language = "he" | "en" | "ar";

export interface TopicRef {
  id: string;
  label_he: string;
  label_en: string;
  label_ar: string;
  order: number;
  active: boolean;
}

export interface SituationRef {
  id: string;
  topicKey: string;
  label_he: string;
  label_en: string;
  label_ar: string;
  active: boolean;
}

export interface ReferenceData {
  topics: TopicRef[];
  situations: SituationRef[];
}
