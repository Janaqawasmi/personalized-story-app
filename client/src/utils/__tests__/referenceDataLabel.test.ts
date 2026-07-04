import { getLocalizedReferenceLabel } from "../referenceDataLabel";

const fullItem = {
  id: "fear_of_dark",
  label_en: "Fear of the dark",
  label_he: "פחד מחושך",
  label_ar: "الخوف من الظلام",
};

describe("getLocalizedReferenceLabel", () => {
  test("English UI shows the English label", () => {
    expect(getLocalizedReferenceLabel(fullItem, "en")).toBe("Fear of the dark");
  });

  test("Hebrew UI shows the Hebrew label", () => {
    expect(getLocalizedReferenceLabel(fullItem, "he")).toBe("פחד מחושך");
  });

  test("Arabic UI shows the Arabic label", () => {
    expect(getLocalizedReferenceLabel(fullItem, "ar")).toBe(fullItem.label_ar);
  });

  test("does not silently fall back to Hebrew when English UI has an English label", () => {
    // Regression guard: the old code always returned label_he unless language === "ar".
    const label = getLocalizedReferenceLabel(fullItem, "en");
    expect(label).not.toBe(fullItem.label_he);
    expect(label).toBe(fullItem.label_en);
  });

  test("falls back to English when the current language label is missing", () => {
    const item = { id: "x", label_en: "English only" };
    expect(getLocalizedReferenceLabel(item, "he")).toBe("English only");
    expect(getLocalizedReferenceLabel(item, "ar")).toBe("English only");
  });

  test("falls back to Hebrew or Arabic when English is also missing", () => {
    const hebrewOnly = { id: "x", label_he: "עברית בלבד" };
    expect(getLocalizedReferenceLabel(hebrewOnly, "en")).toBe("עברית בלבד");
    expect(getLocalizedReferenceLabel(hebrewOnly, "ar")).toBe("עברית בלבד");

    const arabicOnly = { id: "x", label_ar: "بالعربية فقط" };
    expect(getLocalizedReferenceLabel(arabicOnly, "en")).toBe("بالعربية فقط");
  });

  test("falls back to the item id when no label is present", () => {
    expect(getLocalizedReferenceLabel({ id: "fear_of_swimming" }, "en")).toBe("fear_of_swimming");
  });

  test("returns empty string for a null/undefined item", () => {
    expect(getLocalizedReferenceLabel(null, "en")).toBe("");
    expect(getLocalizedReferenceLabel(undefined, "he")).toBe("");
  });

  test("treats an empty-string label as missing and continues the fallback chain", () => {
    const item = { id: "x", label_en: "", label_he: "עברית" };
    expect(getLocalizedReferenceLabel(item, "en")).toBe("עברית");
  });

  test("supports camelCase labelEn/labelHe/labelAr naming (e.g. situationProposal)", () => {
    const proposal = {
      id: "y",
      labelEn: "Fear of swimming",
      labelHe: "פחד משחייה",
      labelAr: "الخوف من السباحة",
    };
    expect(getLocalizedReferenceLabel(proposal, "en")).toBe("Fear of swimming");
    expect(getLocalizedReferenceLabel(proposal, "he")).toBe("פחד משחייה");
    expect(getLocalizedReferenceLabel(proposal, "ar")).toBe(proposal.labelAr);
  });

  test("prefers snake_case over camelCase when both are present on the same item", () => {
    const mixed = { id: "z", label_en: "Snake case wins", labelEn: "camelCase loses" };
    expect(getLocalizedReferenceLabel(mixed, "en")).toBe("Snake case wins");
  });
});
