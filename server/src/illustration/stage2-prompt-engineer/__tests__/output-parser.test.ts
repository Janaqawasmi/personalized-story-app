import { parsePromptEngineerOutput, PromptEngineerParseError } from "../output-parser";

describe("parsePromptEngineerOutput", () => {
  test("parses valid JSON", () => {
    const json = JSON.stringify({
      setting: "kitchen table with two plates",
      character: "child sits chair both feet floor",
      focalPoint: "open book center",
      composition: "mid shot eye level",
      lighting: "window left soft fill warm",
    });
    const out = parsePromptEngineerOutput(json);
    expect(out.focalPoint).toBe("open book center");
  });

  test("throws on missing fields", () => {
    expect(() =>
      parsePromptEngineerOutput(JSON.stringify({ setting: "a", character: "b" })),
    ).toThrow(PromptEngineerParseError);
  });

  test("throws on metaphor flags", () => {
    const json = JSON.stringify({
      setting: "room",
      character: "child like a butterfly near door",
      focalPoint: "door",
      composition: "wide",
      lighting: "soft",
    });
    expect(() => parsePromptEngineerOutput(json)).toThrow(PromptEngineerParseError);
  });
});
