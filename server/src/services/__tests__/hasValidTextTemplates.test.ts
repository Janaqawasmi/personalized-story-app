import { hasValidTextTemplates } from "../preview.service";

// Shorthand builder for a page with both variants.
function page(pageNumber: number, masculine: string, feminine: string) {
  return { pageNumber, textTemplate: { masculine, feminine } };
}

/** Builds the pageNumber → originalText map hasValidTextTemplates uses to derive per-page requirements. */
function originalTextMap(entries: Array<[number, string]>): Map<number, string> {
  return new Map(entries);
}

/** No source-text data available for any page (legacy template / variants never generated). */
const NO_SOURCE_DATA = new Map<number, string>();

const VALID_MASC = "{{CHILD_NAME}} felt afraid.";
const VALID_FEM  = "{{CHILD_NAME}} felt scared.";

describe("hasValidTextTemplates", () => {
  it("returns false for an empty page array", () => {
    expect(hasValidTextTemplates([], NO_SOURCE_DATA)).toBe(false);
  });

  it("returns true when all pages have valid masculine + feminine with {{CHILD_NAME}}", () => {
    expect(
      hasValidTextTemplates(
        [
          page(1, VALID_MASC, VALID_FEM),
          page(2, "Once {{CHILD_NAME}} was brave.", "Once {{CHILD_NAME}} was brave too."),
        ],
        NO_SOURCE_DATA,
      ),
    ).toBe(true);
  });

  it("returns false when masculine is missing {{CHILD_NAME}} (no source data — conservative fallback)", () => {
    expect(hasValidTextTemplates([page(1, "He felt afraid.", VALID_FEM)], NO_SOURCE_DATA)).toBe(false);
  });

  it("returns false when feminine is missing {{CHILD_NAME}} (no source data — conservative fallback)", () => {
    expect(hasValidTextTemplates([page(1, VALID_MASC, "She felt scared.")], NO_SOURCE_DATA)).toBe(false);
  });

  it("returns false when masculine is an empty string", () => {
    expect(hasValidTextTemplates([page(1, "", VALID_FEM)], NO_SOURCE_DATA)).toBe(false);
  });

  it("returns false when feminine is an empty string", () => {
    expect(hasValidTextTemplates([page(1, VALID_MASC, "")], NO_SOURCE_DATA)).toBe(false);
  });

  it("returns false when masculine is whitespace only", () => {
    expect(hasValidTextTemplates([page(1, "   ", VALID_FEM)], NO_SOURCE_DATA)).toBe(false);
  });

  it("returns false when textTemplate is null", () => {
    expect(hasValidTextTemplates([{ pageNumber: 1, textTemplate: null }], NO_SOURCE_DATA)).toBe(false);
  });

  it("returns false when textTemplate is undefined (missing)", () => {
    expect(hasValidTextTemplates([{ pageNumber: 1 }], NO_SOURCE_DATA)).toBe(false);
  });

  it("returns false when one page out of many is invalid", () => {
    expect(
      hasValidTextTemplates(
        [
          page(1, VALID_MASC, VALID_FEM),
          page(2, VALID_MASC, VALID_FEM),
          page(3, "No placeholder here.", VALID_FEM), // third page is bad
        ],
        NO_SOURCE_DATA,
      ),
    ).toBe(false);
  });

  it("returns true even when textPersonalizationReady flag is false", () => {
    // This is the core regression test: a story whose flag was never flipped to
    // true must still pass the gate as long as the page data is complete.
    const pagesWithValidData = [
      page(1, VALID_MASC, VALID_FEM),
      page(2, "{{CHILD_NAME}} took a deep breath.", "{{CHILD_NAME}} breathed slowly."),
    ];
    // The flag value is irrelevant — hasValidTextTemplates only looks at pages.
    expect(hasValidTextTemplates(pagesWithValidData, NO_SOURCE_DATA)).toBe(true);
  });

  it("returns false when masculine exists but feminine is missing from the object", () => {
    expect(
      hasValidTextTemplates([{ pageNumber: 1, textTemplate: { masculine: VALID_MASC } }], NO_SOURCE_DATA),
    ).toBe(false);
  });

  it("returns false when both fields lack the placeholder even if non-empty (no source data — conservative fallback)", () => {
    expect(
      hasValidTextTemplates([page(1, "The child felt afraid.", "The child felt scared.")], NO_SOURCE_DATA),
    ).toBe(false);
  });

  // ── Source-text-derived placeholder requirements ──────────────────────────
  //
  // Once a page's original source text is known (from its textVariants doc),
  // {{CHILD_NAME}} (or any other placeholder) is only required if the source
  // text actually had it — not every page mentions the child.

  it("1) original has no {{CHILD_NAME}}; templates also have none → valid", () => {
    const pages = [
      page(1, "הגננת הניחה על השולחן צנצנות קטנות.", "הגננת הניחה על השולחן צנצנות קטנות."),
    ];
    const originals = originalTextMap([[1, "הגננת הניחה על השולחן צנצנות קטנות."]]);

    expect(hasValidTextTemplates(pages, originals)).toBe(true);
  });

  it("2) original has {{CHILD_NAME}}; a template drops it → invalid", () => {
    const pages = [page(1, "ילד בלי פלייסהולדר", VALID_FEM)];
    const originals = originalTextMap([[1, "{{CHILD_NAME}} felt afraid."]]);

    expect(hasValidTextTemplates(pages, originals)).toBe(false);
  });

  it("3) original has {{CHILD_NAME}}; all templates preserve it → valid", () => {
    const pages = [page(1, VALID_MASC, VALID_FEM)];
    const originals = originalTextMap([[1, "{{CHILD_NAME}} felt afraid."]]);

    expect(hasValidTextTemplates(pages, originals)).toBe(true);
  });

  it("4) original has {{PRONOUN_SUBJECT}}; a template drops it → invalid", () => {
    const pages = [
      page(1, "{{CHILD_NAME}} felt afraid.", "{{CHILD_NAME}} {{PRONOUN_SUBJECT}} felt scared."),
    ];
    const originals = originalTextMap([[1, "{{CHILD_NAME}} {{PRONOUN_SUBJECT}} felt afraid."]]);

    expect(hasValidTextTemplates(pages, originals)).toBe(false);
  });

  it("4b) a placeholder absent from the original is never required, even if unusual", () => {
    const pages = [page(1, VALID_MASC, VALID_FEM)];
    // No {{PRONOUN_SUBJECT}} in the original — templates are not required to add it.
    const originals = originalTextMap([[1, "{{CHILD_NAME}} felt afraid."]]);

    expect(hasValidTextTemplates(pages, originals)).toBe(true);
  });

  it("mixed template: one scene-setting page (no CHILD_NAME needed) + one protagonist page → valid", () => {
    const pages = [
      page(1, "הגננת הניחה על השולחן צנצנות קטנות.", "הגננת הניחה על השולחן צנצנות קטנות."),
      page(2, VALID_MASC, VALID_FEM),
    ];
    const originals = originalTextMap([
      [1, "הגננת הניחה על השולחן צנצנות קטנות."],
      [2, "{{CHILD_NAME}} felt afraid."],
    ]);

    expect(hasValidTextTemplates(pages, originals)).toBe(true);
  });

  it("first-generation source text using Agent 1's [CHILD_NAME] bracket format still requires {{CHILD_NAME}}", () => {
    const pages = [page(1, "ילד בלי פלייסהולדר", VALID_FEM)];
    const originals = originalTextMap([[1, "[CHILD_NAME] הרגיש פחד."]]);

    expect(hasValidTextTemplates(pages, originals)).toBe(false);
  });
});
