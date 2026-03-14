// client/src/utils/time.ts

export interface FirestoreTimestampJson {
  _seconds: number;
  _nanoseconds: number;
}

export function timestampToDate(ts?: FirestoreTimestampJson | null): Date | null {
  if (!ts || typeof ts._seconds !== "number") return null;
  return new Date(ts._seconds * 1000 + Math.floor((ts._nanoseconds || 0) / 1_000_000));
}

export function formatTimestamp(
  ts?: FirestoreTimestampJson | null,
  opts?: Intl.DateTimeFormatOptions,
  locale: string = "en-GB"
): string {
  const d = timestampToDate(ts);
  if (!d) return "—";
  return new Intl.DateTimeFormat(
    locale,
    opts ?? {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(d);
}
