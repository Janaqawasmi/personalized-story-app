// src/components/MegaMenu/data.ts
import { AgeGroup, Category, CategoryTopics } from "./types";

export const AGE_GROUPS: AgeGroup[] = [
  { id: "0-3", label: "0–3" },
  { id: "3-6", label: "3–6" },
  { id: "6-9", label: "6–9" },
  { id: "9-12", label: "9–12" },
];

export const CATEGORIES: Category[] = [
  { id: "emotional", label: "רגשי" },
  { id: "family", label: "משפחתי" },
  { id: "social", label: "חברתי" },
  { id: "therapeutic", label: "טיפולי" },
];

export const TOPICS: CategoryTopics = {
  emotional: [
    { id: "fears", label: "פחדים" },
    { id: "anxiety", label: "חרדה" },
    { id: "emotions", label: "רגשות" },
    { id: "self-confidence", label: "ביטחון עצמי" },
  ],
  family: [
    { id: "new-baby", label: "תינוק חדש" },
    { id: "divorce", label: "גירושין" },
    { id: "siblings-jealousy", label: "קנאה בין אחים" },
    { id: "home-change", label: "שינוי בבית" },
  ],
  social: [
    { id: "friendship", label: "חברות" },
    { id: "bullying", label: "חרם" },
    { id: "shyness", label: "ביישנות" },
    { id: "boundaries", label: "גבולות" },
  ],
  therapeutic: [
    { id: "adhd", label: "ADHD" },
    { id: "autism", label: "אוטיזם" },
    { id: "phobias", label: "פוביות" },
    { id: "emotion-regulation", label: "ויסות רגשי" },
  ],
};
