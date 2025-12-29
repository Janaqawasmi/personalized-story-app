export const AGE_GROUPS = [
  { id: "0_3", label: "0 – 3 YEARS" },
  { id: "3_6", label: "3 – 6 YEARS" },
  { id: "6_9", label: "6 – 9 YEARS" },
  { id: "9_12", label: "9 – 12 YEARS" },
];

/**
 * Parse age group ID from user query
 * Handles formats like: "0-3", "0_3", "0 – 3", "0–3 years", etc.
 */
export function parseAgeGroupIdFromQuery(q: string): string | null {
  if (!q) return null;

  const normalized = q
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")                 // remove spaces
    .replace(/years|year|yrs|yr/g, "")   // remove english "years"
    .replace(/[–-]/g, "_");              // dash/en-dash -> underscore

  // examples:
  // "0-3" -> "0_3"
  // "0–3years" -> "0_3"
  // "0_3" -> "0_3"

  return AGE_GROUPS.some((ag) => ag.id === normalized) ? normalized : null;
}

