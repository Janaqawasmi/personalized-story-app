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

/**
 * Normalize age group from UI / URL to Firestore format
 * Examples:
 * "0-3"   -> "0_3"
 * "0–3"   -> "0_3"
 * "0_3"   -> "0_3"
 * 
 * This is used when age comes from URL params or UI (human-readable format)
 * and needs to be converted to the database format before querying.
 */
export function normalizeAgeGroupId(input: string): string | null {
  if (!input) return null;

  const normalized = input
    .trim()
    .replace(/[–-]/g, "_") // dash or en-dash → underscore
    .replace(/\s+/g, "");  // remove spaces

  const exists = AGE_GROUPS.some((ag) => ag.id === normalized);
  return exists ? normalized : null;
}
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
