import { parseScenePlanOutput, ScenePlanParseError } from "../output-parser";

describe("parseScenePlanOutput", () => {
  it("parses valid JSON", () => {
    const raw = JSON.stringify({
      title: "t",
      prose: "One. Two.",
      emotionalIntent: "Feel calm.",
      keyVisibleDetail: "Hands clasped.",
      director: {
        moment: "m",
        cameraSpec: "c",
        lightingChoice: "l",
        visualHook: "v",
        keyPhysicalDetail: "shoulders low",
      },
    });
    const p = parseScenePlanOutput(raw);
    expect(p.title).toBe("t");
    expect(p.director.cameraSpec).toBe("c");
  });

  it("returns empty director on missing block", () => {
    const raw = JSON.stringify({
      title: "t",
      prose: "A. B.",
      emotionalIntent: "e",
      keyVisibleDetail: "k",
    });
    const p = parseScenePlanOutput(raw);
    expect(p.director.moment).toBe("");
  });

  it("throws on non-JSON", () => {
    expect(() => parseScenePlanOutput("hello")).toThrow(ScenePlanParseError);
  });
});
