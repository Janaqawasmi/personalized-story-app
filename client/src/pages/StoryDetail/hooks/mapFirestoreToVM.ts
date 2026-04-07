import type { FaqItemVM, PreviewSpreadVM, StoryDetailStatus, StoryDetailVM } from "../types/story";

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

export function mapFirestoreToStoryDetailVM(id: string, data: Record<string, any>): StoryDetailVM {
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

  const title = toLangRecord(data.title);
  const shortDesc = toLangRecord(data.shortDescription);
  const subtitle = toLangRecord(data.subtitle);
  const mergedSubtitle =
    subtitle.en || subtitle.he || subtitle.ar
      ? subtitle
      : shortDesc;

  return {
    id,
    title,
    subtitle: mergedSubtitle,
    description: shortDesc,
    coverUrl: (typeof data.coverImage === "string" && data.coverImage) || (typeof data.coverImageUrl === "string" && data.coverImageUrl) || "",
    ageRange: formatAgeGroup(data.ageGroup || data.targetAgeGroup || data.generationConfig?.targetAgeGroup),
    ageGroupRaw:
      (typeof data.ageGroup === "string" && data.ageGroup) ||
      (typeof data.targetAgeGroup === "string" && data.targetAgeGroup) ||
      (typeof data.generationConfig?.targetAgeGroup === "string" && data.generationConfig.targetAgeGroup) ||
      "",
    primaryTopic: typeof data.primaryTopic === "string" ? data.primaryTopic : "",
    topicKey: typeof data.topicKey === "string" ? data.topicKey : "",
    topicLabel: toLangRecord(data.displayTopic || data.specificSituation || data.primaryTopic || data.topicKey),
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
  };
}
