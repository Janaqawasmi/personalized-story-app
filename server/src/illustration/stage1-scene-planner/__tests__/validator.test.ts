import { validateScenePlan } from "../validator";
import type { ParsedScenePlan } from "../output-parser";

const base: ParsedScenePlan = {
  title: "t",
  prose: "One. Two.",
  emotionalIntent: "e",
  keyVisibleDetail: "k",
  director: {
    moment: "m",
    cameraSpec: "c",
    lightingChoice: "l",
    visualHook: "v",
    keyPhysicalDetail: "fingers still",
  },
};

describe("validateScenePlan", () => {
  it("accepts valid plan", () => {
    expect(validateScenePlan(base)).toEqual({ ok: true });
  });

  it("rejects empty title", () => {
    expect(validateScenePlan({ ...base, title: "" }).ok).toBe(false);
  });

  it("rejects emotion word in keyPhysicalDetail", () => {
    expect(
      validateScenePlan({
        ...base,
        director: { ...base.director, keyPhysicalDetail: "she looks scared" },
      }).ok,
    ).toBe(false);
  });
});
