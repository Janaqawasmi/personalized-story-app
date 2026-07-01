import { hasValidTextTemplates, mapFirestoreToStoryDetailVM } from "../mapFirestoreToVM";

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

  it("carries textPersonalizationReady from Firestore as legacy field without gating on it", () => {
    const vmTrue = mapFirestoreToStoryDetailVM("id7a", buildData({ textPersonalizationReady: true }), "he");
    const vmFalse = mapFirestoreToStoryDetailVM("id7b", buildData({ textPersonalizationReady: false }), "he");
    // Both should have the same canStartPersonalization since pages are valid in both
    expect(vmTrue.canStartPersonalization).toBe(true);
    expect(vmFalse.canStartPersonalization).toBe(true);
    // But the legacy field is still mapped for reference
    expect(vmTrue.textPersonalizationReady).toBe(true);
    expect(vmFalse.textPersonalizationReady).toBe(false);
  });
});
