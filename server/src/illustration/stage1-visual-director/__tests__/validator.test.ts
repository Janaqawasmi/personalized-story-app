import { MANDATED_VISUAL_BIBLE_NO_TEXT_AVOID } from "@/illustration/constants";
import { validateVisualBible } from "../validator";
import type { ParsedVisualBible } from "../output-parser";

function baseParsed(overrides: Partial<ParsedVisualBible> = {}): ParsedVisualBible {
  return {
    characterSheet: "x".repeat(50),
    characterAnchor: "One sentence.",
    styleGuide: "Style.",
    consistencyAnchors: ["a b c d e", "f g h i j", "k l m n o"],
    environmentRegistry: {
      room: { atmosphere: "Calm light.", spatialLayout: "Chair left wall." },
    },
    palette: "a, b, c, d, e",
    avoidList: [MANDATED_VISUAL_BIBLE_NO_TEXT_AVOID, "x", "y"],
    ...overrides,
  };
}

describe("validateVisualBible", () => {
  it("accepts valid bible", () => {
    expect(validateVisualBible(baseParsed())).toEqual({ ok: true });
  });

  it("rejects wrong avoidList[0]", () => {
    const v = validateVisualBible(
      baseParsed({ avoidList: ["wrong", "a"] }),
    );
    expect(v.ok).toBe(false);
  });

  it("rejects short consistencyAnchors", () => {
    const v = validateVisualBible(
      baseParsed({ consistencyAnchors: ["a", "b"] }),
    );
    expect(v.ok).toBe(false);
  });

  it("rejects empty environmentRegistry", () => {
    const v = validateVisualBible(baseParsed({ environmentRegistry: {} }));
    expect(v.ok).toBe(false);
  });

  it("rejects character anchor with too many sentences", () => {
    const v = validateVisualBible(
      baseParsed({ characterAnchor: "One. Two. Three." }),
    );
    expect(v.ok).toBe(false);
  });
});
