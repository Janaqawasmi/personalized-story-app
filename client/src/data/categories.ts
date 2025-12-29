export const AGE_GROUPS = [
  { id: "0_3", label: "0 – 3 YEARS" },
  { id: "3_6", label: "3 – 6 YEARS" },
  { id: "6_9", label: "6 – 9 YEARS" },
  { id: "9_12", label: "9 – 12 YEARS" },
];

/**
 * Format age group ID for display
 * Converts "0_3" to "0–3 years" (lowercase, readable)
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
  