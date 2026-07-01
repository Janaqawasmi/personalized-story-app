import { hasValidTextTemplates } from "../preview.service";

// Shorthand builder for a page with both variants.
function page(masculine: string, feminine: string) {
  return { textTemplate: { masculine, feminine } };
}

const VALID_MASC = "{{CHILD_NAME}} felt afraid.";
const VALID_FEM  = "{{CHILD_NAME}} felt scared.";

describe("hasValidTextTemplates", () => {
  it("returns false for an empty page array", () => {
    expect(hasValidTextTemplates([])).toBe(false);
  });

  it("returns true when all pages have valid masculine + feminine with {{CHILD_NAME}}", () => {
    expect(
      hasValidTextTemplates([
        page(VALID_MASC, VALID_FEM),
        page("Once {{CHILD_NAME}} was brave.", "Once {{CHILD_NAME}} was brave too."),
      ]),
    ).toBe(true);
  });

  it("returns false when masculine is missing {{CHILD_NAME}}", () => {
    expect(hasValidTextTemplates([page("He felt afraid.", VALID_FEM)])).toBe(false);
  });

  it("returns false when feminine is missing {{CHILD_NAME}}", () => {
    expect(hasValidTextTemplates([page(VALID_MASC, "She felt scared.")])).toBe(false);
  });

  it("returns false when masculine is an empty string", () => {
    expect(hasValidTextTemplates([page("", VALID_FEM)])).toBe(false);
  });

  it("returns false when feminine is an empty string", () => {
    expect(hasValidTextTemplates([page(VALID_MASC, "")])).toBe(false);
  });

  it("returns false when masculine is whitespace only", () => {
    expect(hasValidTextTemplates([page("   ", VALID_FEM)])).toBe(false);
  });

  it("returns false when textTemplate is null", () => {
    expect(hasValidTextTemplates([{ textTemplate: null }])).toBe(false);
  });

  it("returns false when textTemplate is undefined (missing)", () => {
    expect(hasValidTextTemplates([{}])).toBe(false);
  });

  it("returns false when one page out of many is invalid", () => {
    expect(
      hasValidTextTemplates([
        page(VALID_MASC, VALID_FEM),
        page(VALID_MASC, VALID_FEM),
        page("No placeholder here.", VALID_FEM), // third page is bad
      ]),
    ).toBe(false);
  });

  it("returns true even when textPersonalizationReady flag is false", () => {
    // This is the core regression test: a story whose flag was never flipped to
    // true must still pass the gate as long as the page data is complete.
    const pagesWithValidData = [
      page(VALID_MASC, VALID_FEM),
      page("{{CHILD_NAME}} took a deep breath.", "{{CHILD_NAME}} breathed slowly."),
    ];
    // The flag value is irrelevant — hasValidTextTemplates only looks at pages.
    expect(hasValidTextTemplates(pagesWithValidData)).toBe(true);
  });

  it("returns false when masculine exists but feminine is missing from the object", () => {
    expect(
      hasValidTextTemplates([{ textTemplate: { masculine: VALID_MASC } }]),
    ).toBe(false);
  });

  it("returns false when both fields lack the placeholder even if non-empty", () => {
    expect(
      hasValidTextTemplates([page("The child felt afraid.", "The child felt scared.")]),
    ).toBe(false);
  });
});
