import { MANDATED_VISUAL_BIBLE_NO_TEXT_AVOID } from "@/illustration/constants";
import { parseVisualDirectorOutput, VisualBibleParseError } from "../output-parser";

describe("parseVisualDirectorOutput", () => {
  it("parses well-formed JSON", () => {
    const raw = JSON.stringify({
      characterSheet: "A".repeat(40),
      characterAnchor: "Short anchor.",
      styleGuide: "Watercolour.",
      consistencyAnchors: ["a b c d", "e f g h", "i j k l"],
      environmentRegistry: {
        bedroom: { atmosphere: "Calm.", spatialLayout: "Bed at back wall." },
      },
      palette: "blue, white",
      avoidList: [MANDATED_VISUAL_BIBLE_NO_TEXT_AVOID, "extra"],
    });
    const p = parseVisualDirectorOutput(raw);
    expect(p.characterAnchor).toBe("Short anchor.");
    expect(p.avoidList[0]).toBe(MANDATED_VISUAL_BIBLE_NO_TEXT_AVOID);
  });

  it("throws when JSON missing field structure", () => {
    const raw = JSON.stringify({ characterSheet: "only one field" });
    expect(() => parseVisualDirectorOutput(raw)).not.toThrow();
    const p = parseVisualDirectorOutput(raw);
    expect(p.characterAnchor).toBe("");
  });

  it("throws on plain prose", () => {
    expect(() => parseVisualDirectorOutput("not json")).toThrow(VisualBibleParseError);
  });
});
