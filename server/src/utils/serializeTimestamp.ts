/**
 * Shared helper to serialize Firestore Timestamp-like values to ISO strings.
 *
 * Handles:
 *   - ISO strings (pass-through)
 *   - Date objects
 *   - Firestore Admin SDK Timestamp objects (with toDate())
 *   - Plain objects with { seconds } or { _seconds } (serialized Timestamps)
 *   - FieldValue sentinels (returns undefined with a warning)
 *
 * Returns `undefined` for null/undefined/unrecognized inputs.
 */
export function serializeTimestamp(ts: any): string | undefined {
  if (!ts) return undefined;

  // Already a string (ISO format)
  if (typeof ts === "string") return ts;

  // Date object
  if (ts instanceof Date) return ts.toISOString();

  // Firestore Admin SDK Timestamp object (has toDate method)
  if (ts && typeof ts === "object" && typeof ts.toDate === "function") {
    try {
      return ts.toDate().toISOString();
    } catch (e) {
      console.warn("Error converting Firestore Timestamp to Date:", e);
      return undefined;
    }
  }

  // Object with seconds property (Firestore Timestamp format: { seconds: number, nanoseconds?: number })
  if (ts && typeof ts === "object" && typeof ts.seconds === "number") {
    return new Date(ts.seconds * 1000).toISOString();
  }

  // JSON serialized format with underscore prefix: { _seconds: number, _nanoseconds?: number }
  if (ts && typeof ts === "object" && typeof ts._seconds === "number") {
    return new Date(ts._seconds * 1000).toISOString();
  }

  // FieldValue.serverTimestamp() - this shouldn't be in the response, but handle gracefully
  if (ts && typeof ts === "object" && ts.constructor?.name === "FieldValue") {
    console.warn("Warning: FieldValue.serverTimestamp() found in response - timestamp not resolved yet");
    return undefined;
  }

  return undefined;
}
