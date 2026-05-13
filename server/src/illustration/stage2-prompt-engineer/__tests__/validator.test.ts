import { validateStructuredPrompt } from "../validator";

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
