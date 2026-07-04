import type {
  Language,
  ReferenceData,
  ReferenceLabelFields,
} from "../types/referenceData";

export interface LocalizableReferenceItem extends ReferenceLabelFields {
  id?: string;
}

type ReferenceLookupData = Pick<ReferenceData, "topics" | "situations"> | null | undefined;

interface ReferenceLookupItem extends LocalizableReferenceItem {
  id: string;
  active?: boolean;
}

/**
 * Single source of truth for resolving a referenceData item's display label
 * to the current UI language. Fallback order: current language -> English ->
 * whichever of Hebrew/Arabic is available -> item.id -> "".
 *
 * Every place that reads `label_en`/`label_he`/`label_ar` off a
 * `referenceData/topics` or `referenceData/situations` item must go through
 * this helper — do not re-derive the language ternary locally, that's how
 * "not English" previously got treated as "always Hebrew" in half a dozen
 * places (SearchOverlay, TopicResultsPage, CategoryResultsPage,
 * AgeResultsPage, MegaMenu columns), silently hiding label_ar everywhere.
 *
 * Accepts both `label_en`/`label_he`/`label_ar` (referenceData Firestore
 * items) and `labelEn`/`labelHe`/`labelAr` (e.g. `situationProposal`) so
 * callers never need to know or normalize which naming a given item uses.
 */
export function getLocalizedReferenceLabel(
  item: LocalizableReferenceItem | null | undefined,
  language: Language,
): string {
  if (!item) return "";

  const byLang: Record<Language, string | null | undefined> = {
    en: item.label_en ?? item.labelEn,
    he: item.label_he ?? item.labelHe,
    ar: item.label_ar ?? item.labelAr,
  };

  const order: Language[] = [language, "en", "he", "ar"];
  for (const lang of order) {
    const value = byLang[lang];
    if (typeof value === "string" && value.trim()) return value;
  }

  return item.id ?? "";
}

function findReferenceItemById(
  items: ReferenceLookupItem[] | undefined,
  id: string,
): ReferenceLookupItem | undefined {
  return items?.find((item) => item.id === id && item.active !== false);
}

export function getLocalizedSituationLabel(
  situationId: string | null | undefined,
  language: Language,
  referenceData: ReferenceLookupData,
): string {
  if (!situationId) return "";
  const item = findReferenceItemById(referenceData?.situations, situationId);
  return getLocalizedReferenceLabel(item ?? { id: situationId }, language);
}

export function getLocalizedTopicLabel(
  topicKey: string | null | undefined,
  language: Language,
  referenceData: ReferenceLookupData,
): string {
  if (!topicKey) return "";
  const item = findReferenceItemById(referenceData?.topics, topicKey);
  return getLocalizedReferenceLabel(item ?? { id: topicKey }, language);
}
