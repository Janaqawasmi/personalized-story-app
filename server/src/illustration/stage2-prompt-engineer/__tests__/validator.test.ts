import { clampStructuredPromptToWordLimits, validateStructuredPrompt } from "../validator";

describe("validateStructuredPrompt", () => {
  const valid = {
    setting: "small kitchen table two plates visible",
    character: "young child seated both feet on floor hands on table",
    focalPoint: "open picture book center",
    composition: "medium shot straight on table foreground",
    lighting: "soft daylight window left warm gentle shadows right",
  };

  test("accepts valid prompt", () => {
    const v = validateStructuredPrompt(valid);
    expect(v.ok).toBe(true);
  });

  test("rejects empty fields", () => {
    const v = validateStructuredPrompt({ ...valid, focalPoint: "   " });
    expect(v.ok).toBe(false);
  });

  test("rejects metaphor phrase", () => {
    const v = validateStructuredPrompt({
      ...valid,
      character: "arms hanging like weights at sides",
    });
    expect(v.ok).toBe(false);
  });
});

describe("clampStructuredPromptToWordLimits", () => {
  test("truncates character field to 30 words", () => {
    const character50 = Array.from({ length: 50 }, (_, i) => `w${i}`).join(" ");
    const long = {
      setting: "s0 s1 s2",
      character: character50,
      focalPoint: "f0 f1",
      composition: "p0 p1",
      lighting: "l0 l1 l2",
    };
    const clamped = clampStructuredPromptToWordLimits(long);
    expect(clamped.character.split(/\s+/u).filter((w) => w.length > 0).length).toBe(30);
    expect(validateStructuredPrompt(clamped).ok).toBe(true);
  });

  test("truncates fields over word budgets then validates", () => {
    const long = {
      setting: Array.from({ length: 30 }, (_, i) => `s${i}`).join(" "),
      character: Array.from({ length: 40 }, (_, i) => `c${i}`).join(" "),
      focalPoint: Array.from({ length: 15 }, (_, i) => `f${i}`).join(" "),
      composition: Array.from({ length: 25 }, (_, i) => `p${i}`).join(" "),
      lighting: Array.from({ length: 35 }, (_, i) => `l${i}`).join(" "),
    };
    const clamped = clampStructuredPromptToWordLimits(long);
    const v = validateStructuredPrompt(clamped);
    expect(v.ok).toBe(true);
    expect(clamped.focalPoint.split(/\s+/).length).toBe(10);
    expect(clamped.composition.split(/\s+/).length).toBe(20);
    expect(clamped.setting.split(/\s+/).length).toBe(25);
    expect(clamped.character.split(/\s+/).length).toBe(30);
    expect(clamped.lighting.split(/\s+/).length).toBe(30);
  });
});
