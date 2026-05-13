/** @jest-environment node */

import { MANDATED_VISUAL_BIBLE_NO_TEXT_AVOID } from "@/illustration/constants";
import { applyAvoidListNoTextRule } from "../patchVisualBible";

describe("applyAvoidListNoTextRule", () => {
  test("prepends mandated entry when first line lacks constraint", () => {
    const out = applyAvoidListNoTextRule(["scary shadows"]);
    expect(out[0]).toBe(MANDATED_VISUAL_BIBLE_NO_TEXT_AVOID);
    expect(out[1]).toBe("scary shadows");
  });

  test("keeps list when first line signals no text", () => {
    const first = "no text, no letters, wordless scene";
    const out = applyAvoidListNoTextRule([first, "other"]);
    expect(out[0]).toBe(first);
    expect(out).toHaveLength(2);
  });
});
