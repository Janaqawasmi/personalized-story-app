// server/src/data/categories.ts

export const AGE_GROUPS = [
  { id: "0_3", label: "0 – 3 YEARS" },
  { id: "3_6", label: "3 – 6 YEARS" },
  { id: "6_9", label: "6 – 9 YEARS" },
  { id: "9_12", label: "9 – 12 YEARS" },
];

/**
 * Format age group ID to display label (readable format)
 * e.g., "0_3" -> "0–3 years"
 */
export function formatAgeGroupLabel(ageGroupId: string): string {
  const ageGroup = AGE_GROUPS.find((ag) => ag.id === ageGroupId);
  if (ageGroup) {
    // Convert "0 – 3 YEARS" to "0–3 years" for display
    // Remove spaces around the dash and convert to lowercase
    return ageGroup.label.replace(/\s*–\s*/g, "–").toLowerCase();
  }
  return ageGroupId;
}

