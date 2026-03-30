/**
 * Child name helpers for personalization: sanitize, validate, and script detection.
 * Allows Hebrew, Arabic, and Latin letters, spaces, and ASCII hyphens only.
 */

export type NameScriptFamily = "hebrew" | "arabic" | "latin" | "mixed" | "unknown";

export type ChildNameValidationError = "required" | "tooShort" | "tooLong";

export type ChildNameValidationResult = {
  ok: boolean;
  error: ChildNameValidationError | null;
};

const MAX_CHILD_NAME_LENGTH = 30;
const MIN_CHILD_NAME_LENGTH = 2;

function isHebrewCodePoint(c: number): boolean {
  return (c >= 0x0590 && c <= 0x05ff) || (c >= 0xfb1d && c <= 0xfb4f);
}

function isArabicCodePoint(c: number): boolean {
  return (
    (c >= 0x0600 && c <= 0x06ff) ||
    (c >= 0x0750 && c <= 0x077f) ||
    (c >= 0x08a0 && c <= 0x08ff) ||
    (c >= 0xfb50 && c <= 0xfdff) ||
    (c >= 0xfe70 && c <= 0xfeff)
  );
}

/** Latin script used for English and common accented letters (no Hebrew/Greek/Cyrillic). */
function isLatinCodePoint(c: number): boolean {
  return (
    (c >= 0x41 && c <= 0x5a) ||
    (c >= 0x61 && c <= 0x7a) ||
    c === 0xaa ||
    c === 0xba ||
    (c >= 0xc0 && c <= 0xd6) ||
    (c >= 0xd8 && c <= 0xf6) ||
    (c >= 0xf8 && c <= 0x24f) ||
    (c >= 0x1e00 && c <= 0x1eff) ||
    (c >= 0x2c60 && c <= 0x2c7f) ||
    (c >= 0xa720 && c <= 0xa7ff) ||
    (c >= 0xab30 && c <= 0xab6a)
  );
}

function scriptOfCodePoint(c: number): NameScriptFamily | null {
  if (isHebrewCodePoint(c)) return "hebrew";
  if (isArabicCodePoint(c)) return "arabic";
  if (isLatinCodePoint(c)) return "latin";
  return null;
}

/** Single Unicode codepoint (handles surrogate pairs). */
function forEachCodePoint(s: string, fn: (codePoint: number) => void): void {
  for (let i = 0; i < s.length; ) {
    const c = s.codePointAt(i)!;
    fn(c);
    i += c > 0xffff ? 2 : 1;
  }
}

function countCodePoints(s: string): number {
  let n = 0;
  forEachCodePoint(s, () => {
    n += 1;
  });
  return n;
}

function isAllowedNameChar(ch: string): boolean {
  if (ch === " " || ch === "-") return true;
  const c = ch.codePointAt(0);
  if (c === undefined) return false;
  return scriptOfCodePoint(c) !== null;
}

/** Strip disallowed characters, trim ends, collapse internal spaces, enforce max length. */
export function sanitizeChildName(raw: string): string {
  let buf = "";
  for (const ch of raw) {
    if (isAllowedNameChar(ch)) buf += ch;
  }
  buf = buf.trim().replace(/\s+/g, " ");
  if (countCodePoints(buf) > MAX_CHILD_NAME_LENGTH) {
    let out = "";
    let n = 0;
    forEachCodePoint(buf, (cp) => {
      if (n >= MAX_CHILD_NAME_LENGTH) return;
      out += String.fromCodePoint(cp);
      n += 1;
    });
    return out;
  }
  return buf;
}

export function validateChildName(sanitized: string): ChildNameValidationResult {
  if (!sanitized) {
    return { ok: false, error: "required" };
  }
  if (sanitized.length < MIN_CHILD_NAME_LENGTH) {
    return { ok: false, error: "tooShort" };
  }
  if (sanitized.length > MAX_CHILD_NAME_LENGTH) {
    return { ok: false, error: "tooLong" };
  }
  return { ok: true, error: null };
}

/**
 * Classify the script of the name (ignores spaces and hyphens).
 * `mixed` if more than one of Hebrew / Arabic / Latin appears.
 */
export function detectNameScriptFamily(sanitizedName: string): NameScriptFamily {
  let seenHebrew = false;
  let seenArabic = false;
  let seenLatin = false;

  forEachCodePoint(sanitizedName, (cp) => {
    const ch = String.fromCodePoint(cp);
    if (ch === " " || ch === "-") return;
    const s = scriptOfCodePoint(cp);
    if (s === "hebrew") seenHebrew = true;
    else if (s === "arabic") seenArabic = true;
    else if (s === "latin") seenLatin = true;
  });

  const count = (seenHebrew ? 1 : 0) + (seenArabic ? 1 : 0) + (seenLatin ? 1 : 0);
  if (count === 0) return "unknown";
  if (count > 1) return "mixed";
  if (seenHebrew) return "hebrew";
  if (seenArabic) return "arabic";
  return "latin";
}

/** Map story template language (Firestore) to an expected name script for soft warnings. */
export function getExpectedNameScriptForStoryLanguage(
  storyLanguage: string | undefined
): "hebrew" | "arabic" | "latin" | null {
  const n = (storyLanguage || "").toLowerCase().trim();
  if (n === "he" || n === "iw") return "hebrew";
  if (n === "ar") return "arabic";
  if (n === "en" || n.startsWith("en-")) return "latin";
  return null;
}

/** Non-blocking warning when the name script does not match the story language script. */
export function shouldWarnNameScriptMismatch(
  expected: "hebrew" | "arabic" | "latin" | null,
  detected: NameScriptFamily
): boolean {
  if (expected === null) return false;
  if (detected === "unknown") return false;
  if (detected === "mixed") return true;
  return detected !== expected;
}
