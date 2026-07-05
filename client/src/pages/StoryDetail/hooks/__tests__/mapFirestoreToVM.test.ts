import { hasValidTextTemplates, mapFirestoreToStoryDetailVM } from "../mapFirestoreToVM";

const referenceData = {
  topics: [
    {
      id: "fear_anxiety",
      active: true,
      order: 1,
      label_en: "Fear & Anxiety",
      label_he: "פחד וחרדה",
      label_ar: "الخوف والقلق",
    },
  ],
  situations: [],
};

// ─── hasValidTextTemplates unit tests ────────────────────────────────────────

const VALID = (suffix = "") => ({
  textTemplate: {
    masculine: `{{CHILD_NAME}} felt afraid${suffix}.`,
    feminine: `{{CHILD_NAME}} felt scared${suffix}.`,
  },
});

describe("hasValidTextTemplates (client helper)", () => {
  it("returns false for undefined", () => {
    expect(hasValidTextTemplates(undefined)).toBe(false);
  });

  it("returns false for null", () => {
    expect(hasValidTextTemplates(null)).toBe(false);
  });

  it("returns false for empty array", () => {
    expect(hasValidTextTemplates([])).toBe(false);
  });

  it("returns true when all pages are valid", () => {
    expect(hasValidTextTemplates([VALID("1"), VALID("2")])).toBe(true);
  });

  it("returns false when one page is missing {{CHILD_NAME}} in masculine", () => {
    expect(
      hasValidTextTemplates([
        VALID(),
        { textTemplate: { masculine: "No placeholder.", feminine: "{{CHILD_NAME}} ok." } },
      ]),
    ).toBe(false);
  });

  it("returns false when one page is missing {{CHILD_NAME}} in feminine", () => {
    expect(
      hasValidTextTemplates([
        VALID(),
        { textTemplate: { masculine: "{{CHILD_NAME}} ok.", feminine: "No placeholder." } },
      ]),
    ).toBe(false);
  });

  it("returns false when masculine is empty string", () => {
    expect(hasValidTextTemplates([{ textTemplate: { masculine: "", feminine: "{{CHILD_NAME}} ok." } }])).toBe(false);
  });

  it("returns false when feminine is empty string", () => {
    expect(hasValidTextTemplates([{ textTemplate: { masculine: "{{CHILD_NAME}} ok.", feminine: "" } }])).toBe(false);
  });

  it("returns false when textTemplate is null on a page", () => {
    expect(hasValidTextTemplates([{ textTemplate: null }])).toBe(false);
  });

  it("returns false when textTemplate is absent on a page", () => {
    expect(hasValidTextTemplates([{}])).toBe(false);
  });
});

// ─── mapFirestoreToStoryDetailVM — canStartPersonalization derived logic ──────

function buildData(overrides: Record<string, unknown> = {}) {
  return {
    title: "Test Story",
    status: "approved",
    isActive: true,
    personalizationEnabled: true,
    // Note: textPersonalizationReady deliberately omitted / false by default
    textPersonalizationReady: false,
    visualPersonalizationEnabled: true,
    visualPersonalizationReady: true,
    pages: [VALID("1"), VALID("2")],
    ...overrides,
  };
}

describe("mapFirestoreToStoryDetailVM — hasValidTextTemplates + canStartPersonalization", () => {
  it("returns canStartPersonalization=true when pages are valid even if textPersonalizationReady=false", () => {
    const vm = mapFirestoreToStoryDetailVM("id1", buildData({ textPersonalizationReady: false }), "he");
    expect(vm.hasValidTextTemplates).toBe(true);
    expect(vm.canStartPersonalization).toBe(true);
  });

  it("returns canStartPersonalization=false when pages are empty", () => {
    const vm = mapFirestoreToStoryDetailVM("id2", buildData({ pages: [] }), "he");
    expect(vm.hasValidTextTemplates).toBe(false);
    expect(vm.canStartPersonalization).toBe(false);
  });

  it("returns canStartPersonalization=false when one page has no placeholder", () => {
    const vm = mapFirestoreToStoryDetailVM(
      "id3",
      buildData({
        pages: [
          VALID(),
          { textTemplate: { masculine: "No placeholder.", feminine: "{{CHILD_NAME}} ok." } },
        ],
      }),
      "he",
    );
    expect(vm.hasValidTextTemplates).toBe(false);
    expect(vm.canStartPersonalization).toBe(false);
  });

  it("returns canStartPersonalization=false when personalizationEnabled=false even with valid pages", () => {
    const vm = mapFirestoreToStoryDetailVM(
      "id4",
      buildData({ personalizationEnabled: false }),
      "he",
    );
    expect(vm.canStartPersonalization).toBe(false);
  });

  it("returns canStartPersonalization=false when visualPersonalizationReady=false", () => {
    const vm = mapFirestoreToStoryDetailVM(
      "id5",
      buildData({ visualPersonalizationReady: false }),
      "he",
    );
    expect(vm.canStartPersonalization).toBe(false);
  });

  it("returns canStartPersonalization=false when pages is absent (pre-Phase-1 template)", () => {
    const { pages: _p, ...noPages } = buildData();
    const vm = mapFirestoreToStoryDetailVM("id6", noPages, "he");
    expect(vm.hasValidTextTemplates).toBe(false);
    expect(vm.canStartPersonalization).toBe(false);
  });

  it("returns canStartPersonalization=true when pages are raw-valid even if textPersonalizationReady=false (legacy-patched fallback)", () => {
    const vmTrue = mapFirestoreToStoryDetailVM("id7a", buildData({ textPersonalizationReady: true }), "he");
    const vmFalse = mapFirestoreToStoryDetailVM("id7b", buildData({ textPersonalizationReady: false }), "he");
    // Both should have the same canStartPersonalization since pages are valid in both
    expect(vmTrue.canStartPersonalization).toBe(true);
    expect(vmFalse.canStartPersonalization).toBe(true);
    expect(vmTrue.textPersonalizationReady).toBe(true);
    expect(vmFalse.textPersonalizationReady).toBe(false);
  });

  // ── Regression: scene-setting pages that never mention the child ─────────
  //
  // A page whose original text never referenced the protagonist (e.g. a
  // short scene-setting page) legitimately has no {{CHILD_NAME}} in its
  // masculine/feminine templates. The blanket per-page `hasValidTextTemplates`
  // check would incorrectly flag that as invalid; the public CTA must instead
  // trust `textPersonalizationReady` (set by finalizeTextVariants(), which
  // already applies the correct per-page/source-text-derived rule).

  const SCENE_SETTING_PAGE = {
    textTemplate: {
      masculine: "The kindergarten teacher set small jars on the table.",
      feminine: "The kindergarten teacher set small jars on the table.",
    },
  };

  it("Published story with ready personalization (incl. a child-name-free page) → CTA enabled", () => {
    const vm = mapFirestoreToStoryDetailVM(
      "id-ready",
      buildData({
        textPersonalizationReady: true,
        pages: [VALID("1"), SCENE_SETTING_PAGE, VALID("2")],
      }),
      "he",
    );
    // The blanket raw check would fail (scene-setting page has no {{CHILD_NAME}})...
    expect(vm.hasValidTextTemplates).toBe(false);
    // ...but the authoritative flag makes the CTA usable anyway.
    expect(vm.canStartPersonalization).toBe(true);
    expect(vm.personalizationBlockedReason).toBeNull();
  });

  it("Published story without ready personalization (same child-name-free page, not finalized) → CTA disabled", () => {
    const vm = mapFirestoreToStoryDetailVM(
      "id-not-ready",
      buildData({
        textPersonalizationReady: false,
        pages: [VALID("1"), SCENE_SETTING_PAGE, VALID("2")],
      }),
      "he",
    );
    expect(vm.hasValidTextTemplates).toBe(false);
    expect(vm.canStartPersonalization).toBe(false);
    expect(vm.personalizationBlockedReason).toContain("textPersonalizationReady=false");
  });

  it("surfaces a blocked reason mentioning the visual gate when text is ready but visual isn't", () => {
    const vm = mapFirestoreToStoryDetailVM(
      "id-visual-blocked",
      buildData({
        textPersonalizationReady: true,
        visualPersonalizationReady: false,
      }),
      "he",
    );
    expect(vm.canStartPersonalization).toBe(false);
    expect(vm.personalizationBlockedReason).toContain("visualPersonalizationReady=false");
    expect(vm.personalizationBlockedReason).not.toContain("textPersonalizationReady=false");
  });

  it("returns a null blocked reason when personalization isn't enabled at all", () => {
    const vm = mapFirestoreToStoryDetailVM(
      "id-not-personalizable",
      buildData({ personalizationEnabled: false }),
      "he",
    );
    expect(vm.personalizationBlockedReason).toBeNull();
  });

  it("ignores raw displayTopic ids and falls back to the localized topic label", () => {
    const vmHe = mapFirestoreToStoryDetailVM(
      "id8",
      buildData({
        displayTopic: { he: "fear_anxiety", ar: "fear_anxiety" },
        primaryTopic: "fear_anxiety",
        topicKey: "fear_anxiety",
      }),
      "he",
      referenceData,
    );
    const vmAr = mapFirestoreToStoryDetailVM(
      "id9",
      buildData({
        displayTopic: { he: "fear_anxiety", ar: "fear_anxiety" },
        primaryTopic: "fear_anxiety",
        topicKey: "fear_anxiety",
      }),
      "ar",
      referenceData,
    );

    expect(vmHe.topicLabel).toBe("פחד וחרדה");
    expect(vmAr.topicLabel).toBe("الخوف والقلق");
  });

  it("never exposes the raw topic key when reference data is unavailable", () => {
    const vm = mapFirestoreToStoryDetailVM(
      "id10",
      buildData({
        displayTopic: { he: "fear_anxiety", ar: "fear_anxiety" },
        primaryTopic: "fear_anxiety",
        topicKey: "fear_anxiety",
      }),
      "he",
      null,
    );

    expect(vm.topicLabel).toBe("");
  });

  it("defaults published stories to a digital price and hides print until print pricing exists", () => {
    const vm = mapFirestoreToStoryDetailVM("id11", buildData(), "he");

    expect(vm.priceDigital).toBe(29.99);
    expect(vm.pricePrint).toBeUndefined();
    expect(vm.printAvailable).toBe(false);
    expect(vm.currency).toBe("ILS");
  });

  it("hides the print tab when the template explicitly disables print", () => {
    const vm = mapFirestoreToStoryDetailVM("id12", buildData({ printAvailable: false }), "he");

    expect(vm.priceDigital).toBe(29.99);
    expect(vm.pricePrint).toBeUndefined();
    expect(vm.printAvailable).toBe(false);
  });
});
