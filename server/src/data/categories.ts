// MUST match the Specialist Dashboard story brief age ranges
// (AGE_RANGES in server/src/models/storyBrief.model.ts).
export const AGE_GROUPS = [
  { id: "3-5", label: "3 – 5 YEARS" },
  { id: "5-7", label: "5 – 7 YEARS" },
  { id: "7-9", label: "7 – 9 YEARS" },
  { id: "9-12", label: "9 – 12 YEARS" },
];

/**
 * Parse age group ID from user query.
 * Handles formats like: "3-5", "3_5", "3 – 5", "3–5 years", etc.
 * Canonical id form is hyphen-separated ("3-5").
 */
export function parseAgeGroupIdFromQuery(q: string): string | null {
  if (!q) return null;

  const normalized = q
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")                 // remove spaces
    .replace(/years|year|yrs|yr/g, "")   // remove english "years"
    .replace(/[–_]/g, "-");              // en-dash/underscore -> hyphen

  // examples:
  // "3_5" -> "3-5"
  // "3–5years" -> "3-5"
  // "3-5" -> "3-5"

  return AGE_GROUPS.some((ag) => ag.id === normalized) ? normalized : null;
}

/**
 * Normalize age group from UI / URL to the canonical id format.
 * Examples:
 * "3-5"   -> "3-5"
 * "3–5"   -> "3-5"
 * "3_5"   -> "3-5"
 *
 * This is used when age comes from URL params or UI (human-readable format)
 * and needs to be converted to the canonical id before querying.
 */
export function normalizeAgeGroupId(input: string): string | null {
  if (!input) return null;

  const normalized = input
    .trim()
    .replace(/[–_]/g, "-") // en-dash or underscore → hyphen
    .replace(/\s+/g, "");  // remove spaces

  const exists = AGE_GROUPS.some((ag) => ag.id === normalized);
  return exists ? normalized : null;
}
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
