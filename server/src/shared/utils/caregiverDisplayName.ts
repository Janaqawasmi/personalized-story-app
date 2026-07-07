/**
 * Resolves a caregiver's display name from a Firestore caregivers/{uid} doc.
 * Prefers `fullName` (what signup has always written) then `displayName`.
 */
export function resolveCaregiverDisplayName(
  data: Record<string, unknown> | undefined | null,
): string | null {
  if (!data) return null;

  const fullName = typeof data.fullName === "string" ? data.fullName.trim() : "";
  if (fullName) return fullName;

  const displayName =
    typeof data.displayName === "string" ? data.displayName.trim() : "";
  return displayName || null;
}
