/**
 * Parses a Firestore Timestamp-like value into epoch milliseconds.
 *
 * Handles:
 *   - Date objects
 *   - Firestore Admin SDK Timestamp objects (with toMillis() or toDate())
 *   - Plain objects with { seconds } or { _seconds } (JSON-serialized Timestamps)
 *   - ISO date strings
 *   - Numbers (assumed to be epoch milliseconds, passed through)
 *
 * Returns `null` for null/undefined/unrecognized/invalid inputs.
 * This is the canonical parser for timestamp comparisons (e.g. expiry checks).
 */
export function parseTimestampToMs(ts: any): number | null {
  if (ts == null) return null;

  // Already a number (epoch ms)
  if (typeof ts === "number") {
    return Number.isFinite(ts) ? ts : null;
  }

  // Date object
  if (ts instanceof Date) {
    const ms = ts.getTime();
    return Number.isNaN(ms) ? null : ms;
  }

  // Firestore Admin SDK Timestamp (has toMillis)
  if (typeof ts === "object" && typeof ts.toMillis === "function") {
    try {
      return ts.toMillis();
    } catch {
      return null;
    }
  }

  // Firestore Admin SDK Timestamp (has toDate but not toMillis — unlikely but safe)
  if (typeof ts === "object" && typeof ts.toDate === "function") {
    try {
      const ms = ts.toDate().getTime();
      return Number.isNaN(ms) ? null : ms;
    } catch {
      return null;
    }
  }

  // Plain object with { seconds } or { _seconds } (JSON-serialized Firestore Timestamp)
  if (typeof ts === "object") {
    const secs = ts.seconds ?? ts._seconds;
    if (typeof secs === "number" && Number.isFinite(secs)) {
      return secs * 1000;
    }
    // Unrecognized object shape
    return null;
  }

  // ISO date string
  if (typeof ts === "string") {
    const ms = new Date(ts).getTime();
    return Number.isNaN(ms) ? null : ms;
  }

  return null;
}
