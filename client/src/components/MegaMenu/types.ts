// Age ranges are the single source of truth shared with the Specialist
// Dashboard story brief (AGE_RANGES in storyBrief.model.ts).
export type AgeId = "3-5" | "5-7" | "7-9" | "9-12" | null;

// 🔑 Firestore → מזהים דינמיים
export type CategoryId = string;

export type MegaSelection = {
  age: AgeId | null;
  category: CategoryId | null;
  topic: string | null;
};

export type AgeGroup = {
  id: AgeId;
  label: string;
};

export type Category = {
  id: string;
  label: string;
};

export type Topic = {
  id: string;
  label: string;
};

export type CategoryTopics = Record<string, Topic[]>;

export type AgeColumnProps = {
  selectedAge: AgeId | null;
  onSelectAge: (age: AgeId) => void;
};
