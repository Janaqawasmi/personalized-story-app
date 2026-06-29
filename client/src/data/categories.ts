// MUST match the Specialist Dashboard story brief age ranges
// (AGE_RANGES in server/src/models/storyBrief.model.ts).
export const AGE_GROUPS = [
  { id: "3-5", label: "3 – 5 YEARS" },
  { id: "5-7", label: "5 – 7 YEARS" },
  { id: "7-9", label: "7 – 9 YEARS" },
  { id: "9-12", label: "9 – 12 YEARS" },
];

/**
 * Format age group ID for display
 * Converts "3-5" to "3–5 years" (lowercase, readable)
 */
export function formatAgeGroupLabel(ageGroupId: string): string {
  const ageGroup = AGE_GROUPS.find((ag) => ag.id === ageGroupId);
  return ageGroup
    ? ageGroup.label.replace(/\s*–\s*/g, "–").toLowerCase()
    : ageGroupId;
}
  
  export const TOPIC_CATEGORIES = [
    { id: "social", title: "Social Topics", description: "Friendship, bullying, confidence..." },
    { id: "family", title: "Family Topics", description: "New baby, jealousy, divorce..." },
    { id: "psychological", title: "Psychological Topics", description: "Anxiety, fears, emotions..." },
    { id: "therapeutic", title: "Therapeutic Topics", description: "Autism, phobia, ADHD..." },
  ];
  