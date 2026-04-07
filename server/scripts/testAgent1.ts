/**
 * Smoke script: validates a fixture brief and runs Agent 1 (requires ANTHROPIC_API_KEY).
 * Usage from server/: `npm run test:agent1`
 */
import fs from "fs";
import path from "path";

import { runAgent1 } from "../src/agent1";
import { Agent1StoryBriefPayloadSchema } from "../src/models/storyBrief.schema";

async function main(): Promise<void> {
  const briefPath = path.join(__dirname, "../tests/agent1/briefs/minimal-fear-anxiety.json");
  const raw = JSON.parse(fs.readFileSync(briefPath, "utf8")) as unknown;
  const brief = Agent1StoryBriefPayloadSchema.parse(raw);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Skip live run: set ANTHROPIC_API_KEY to call Anthropic.");
    console.log("Brief validates OK:", brief.storyType, brief.ageAndScope.ageRange);
    process.exit(0);
  }

  const result = await runAgent1(brief);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
