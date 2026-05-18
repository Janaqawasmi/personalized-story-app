import * as fs from "fs";
import * as path from "path";

/**
 * Phase 2 plan §7.2 references `experiments/test-set.json` as the canonical
 * evaluation story list. This test only pins that the file remains present —
 * full pipeline e2e against live Firestore belongs in manual / CI smoke.
 */
describe("openWorkspace canonical fixtures", () => {
  it("reads experiments/test-set.json with at least one story id", () => {
    const file = path.resolve(__dirname, "../../../experiments/test-set.json");
    const raw = fs.readFileSync(file, "utf8");
    const json = JSON.parse(raw) as { stories: { storyId: string }[] };
    expect(Array.isArray(json.stories)).toBe(true);
    expect(json.stories[0]?.storyId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });
});
