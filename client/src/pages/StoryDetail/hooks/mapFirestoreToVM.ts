import type { FaqItemVM, PreviewSpreadVM, StoryDetailStatus, StoryDetailVM } from "../types/story";

/** Single locale string from Firestore map `{ en, he, ar }` or legacy flat string. */
export function pickLocalized(field: unknown, lang: string): string {
  if (field == null || field === "") return "";
  if (typeof field === "object" && !Array.isArray(field)) {
    const o = field as Record<string, string>;
    const fromLang = o[lang];
    if (typeof fromLang === "string" && fromLang.trim()) return fromLang;
    const en = o.en ?? "";
    const he = o.he ?? "";
    const ar = o.ar ?? "";
    if (en.trim()) return en;
    if (he.trim()) return he;
    if (ar.trim()) return ar;
    const first = Object.values(o).find((v) => typeof v === "string" && v.trim());
    return typeof first === "string" ? first : "";
  }
  if (typeof field === "string") return field;
  return "";
}

function pickTopicLabel(data: Record<string, any>, lang: string): string {
  const sources = [data.displayTopic, data.specificSituation, data.primaryTopic, data.topicKey];
  for (const src of sources) {
    const s = pickLocalized(src, lang);
    if (s.trim()) return s;
  }
  return "";
}

function formatAgeGroup(ageGroup?: string): string {
  if (!ageGroup) return "";
  return ageGroup.replace(/_/g, "–").replace(/-/g, "–");
}

function readAmount(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (
    value &&
    typeof value === "object" &&
    typeof (value as { current?: unknown }).current === "number" &&
    Number.isFinite((value as { current?: number }).current)
  ) {
    return (value as { current: number }).current;
  }
  return undefined;
}

/** Normalize Firestore localized string / plain string to { en, he, ar }. */
export function toLangRecord(val: unknown): Record<string, string> {
  if (val && typeof val === "object" && !Array.isArray(val)) {
    const o = val as Record<string, string>;
    const en = o.en ?? "";
    const he = o.he ?? "";
    const ar = o.ar ?? "";
    const fallback = en || he || ar || Object.values(o).find((v) => typeof v === "string" && v) || "";
    return {
      en: en || fallback,
      he: he || fallback,
      ar: ar || fallback,
    };
  }
  const s = typeof val === "string" ? val : "";
  return { en: s, he: s, ar: s };
}

function mapPreviewSpreads(raw: unknown): PreviewSpreadVM[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((s: any) => ({
    imageUrl: typeof s?.imageUrl === "string" ? s.imageUrl : undefined,
    text: toLangRecord(s?.text),
  }));
}

function mapFaq(raw: unknown): FaqItemVM[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === "object")
    .map((x: any) => ({
      question: toLangRecord(x.question),
      answer: toLangRecord(x.answer),
    }))
    .filter((x) => x.question.en || x.question.he || x.answer.en || x.answer.he);
}

/**
 * Returns true when every page has a non-empty masculine and feminine text
 * template each containing `{{CHILD_NAME}}`.
 *
 * This is the client-side equivalent of `hasValidTextTemplates` in preview.service.ts.
 * It replaces the deprecated `textPersonalizationReady` flag so that stories with
 * valid page data are never blocked by a stale Firestore flag.
 */
export function hasValidTextTemplates(pages: unknown): boolean {
  if (!Array.isArray(pages) || pages.length === 0) return false;
  return (pages as Record<string, unknown>[]).every((page) => {
    const tt = page.textTemplate as { masculine?: string; feminine?: string } | null | undefined;
    const masc = tt?.masculine;
    const fem  = tt?.feminine;
    return (
      typeof masc === "string" && masc.trim().length > 0 && masc.includes("{{CHILD_NAME}}") &&
      typeof fem  === "string" && fem.trim().length  > 0 && fem.includes("{{CHILD_NAME}}")
    );
  });
}

export function mapFirestoreToStoryDetailVM(id: string, data: Record<string, any>, lang: string): StoryDetailVM {
  const digital = readAmount(data?.pricing?.digital) ?? readAmount(data?.pricing?.digitalPrice);
  const print = readAmount(data?.pricing?.print);

  let status: StoryDetailStatus = "published";
  if (data.comingSoon === true || data.status === "coming_soon") {
    status = "coming_soon";
  } else if (data.status !== "approved" || data.isActive === false) {
    status = "draft";
  }

  const hasPrintPrice = typeof print === "number" && Number.isFinite(print);
  const printAvailable = data.printAvailable !== false && hasPrintPrice;

  return {
    id,
    title: pickLocalized(data.title, lang),
    subtitle: pickLocalized(data.subtitle, lang),
    description: pickLocalized(data.shortDescription, lang),
    coverUrl: (typeof data.coverImage === "string" && data.coverImage) || (typeof data.coverImageUrl === "string" && data.coverImageUrl) || "",
    ageRange: formatAgeGroup(data.ageGroup || data.targetAgeGroup || data.generationConfig?.targetAgeGroup),
    ageGroupRaw:
      (typeof data.ageGroup === "string" && data.ageGroup) ||
      (typeof data.targetAgeGroup === "string" && data.targetAgeGroup) ||
      (typeof data.generationConfig?.targetAgeGroup === "string" && data.generationConfig.targetAgeGroup) ||
      "",
    primaryTopic: typeof data.primaryTopic === "string" ? data.primaryTopic : "",
    topicKey: typeof data.topicKey === "string" ? data.topicKey : "",
    topicLabel: pickTopicLabel(data, lang),
    priceDigital: digital,
    pricePrint: print,
    currency: typeof data.currency === "string" ? data.currency : "ILS",
    printAvailable,
    previewSpreads: mapPreviewSpreads(data.previewSpreads),
    faq: mapFaq(data.faq),
    status,
    templatePages: Array.isArray(data.pages)
      ? data.pages.map((p: any) => ({ textTemplate: p?.textTemplate }))
      : undefined,
    storyLanguage: data.language || data.generationConfig?.language,
    // Default false for pre-Phase-1 templates that don't have this field.
    personalizationEnabled: data.personalizationEnabled === true,
    // @deprecated — kept in the VM for legacy compatibility; not used for gating.
    textPersonalizationReady: data.textPersonalizationReady === true,
    // Derived from actual page data — never relies on the stale Firestore flag.
    hasValidTextTemplates: hasValidTextTemplates(data.pages),
    visualPersonalizationEnabled: data.visualPersonalizationEnabled === true,
    visualPersonalizationReady: data.visualPersonalizationReady === true,
    // Derived: all four gates must pass before the wizard can run end-to-end.
    canStartPersonalization:
      data.personalizationEnabled === true &&
      hasValidTextTemplates(data.pages) &&
      data.visualPersonalizationEnabled === true &&
      data.visualPersonalizationReady === true,
  };
}
