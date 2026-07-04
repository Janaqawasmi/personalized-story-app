export type Language = "he" | "en" | "ar";

export interface ReferenceLabelFields {
  label_he?: string;
  label_en?: string;
  label_ar?: string;
  labelHe?: string;
  labelEn?: string;
  labelAr?: string;
}

export interface TopicRef extends ReferenceLabelFields {
  id: string;
  order: number;
  active: boolean;
  /** Optional Firestore grouping label for mega-menu / filters */
  parentCategory?: string;
}

export interface SituationRef extends ReferenceLabelFields {
  id: string;
  topicKey: string;
  active: boolean;
}

export interface ReferenceData {
  topics: TopicRef[];
  situations: SituationRef[];
}
