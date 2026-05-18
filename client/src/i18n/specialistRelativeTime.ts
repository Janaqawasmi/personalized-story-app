import type { SpecialistDeskUi } from "./specialistDeskUi.types";

export function dateLocaleForLang(lang: string): string {
  if (lang === "ar") return "ar-SA";
  if (lang === "he") return "he-IL";
  return "en-US";
}

/** Relative time for specialist UI (saved / timeline). */
export function formatRelativeTimeMs(
  ms: number,
  desk: SpecialistDeskUi,
  dateLocale: string,
): string {
  const now = Date.now();
  const diffMs = now - ms;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return desk.timeJustNow;
  if (diffMin < 60) return desk.formatMinutesAgo(diffMin);
  if (diffHr < 24) return desk.formatHoursAgo(diffHr);
  if (diffDay === 1) return desk.timeYesterday;

  const date = new Date(ms);
  const nowDate = new Date(now);
  const month = date.toLocaleString(dateLocale, { month: "short" });
  const day = date.getDate();

  if (date.getFullYear() === nowDate.getFullYear()) {
    return `${month} ${day}`;
  }
  return `${month} ${day}, ${date.getFullYear()}`;
}

/** List row “last event” time — compact relative or short date. */
export function formatListEventTimeMs(
  at: number,
  desk: SpecialistDeskUi,
  dateLocale: string,
): string {
  const now = Date.now();
  const diffMs = Math.max(0, now - at);
  const dayMs = 24 * 60 * 60 * 1000;
  if (diffMs >= 7 * dayMs) {
    const d = new Date(at);
    const yNow = new Date(now).getFullYear();
    const month = d.toLocaleString(dateLocale, { month: "short" });
    const day = d.getDate();
    if (d.getFullYear() !== yNow) return `${month} ${day}, ${d.getFullYear()}`;
    return `${month} ${day}`;
  }
  const diffMin = Math.floor(diffMs / (60 * 1000));
  const diffHr = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDay = Math.floor(diffMs / dayMs);
  if (diffDay >= 1) return desk.formatDaysAgo(diffDay);
  if (diffHr >= 1) return desk.formatHoursAgo(diffHr);
  if (diffMin >= 1) return desk.formatMinutesAgo(diffMin);
  return desk.timeJustNow;
}
