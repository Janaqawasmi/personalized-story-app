import fs from "fs";
import path from "path";

/**
 * Load JSON from `server/src/agent1/<relativePath>` (or `dist/agent1/` when compiled).
 */
export function readAgentJson<T>(relativePathFromAgent1: string): T {
  const abs = path.join(__dirname, relativePathFromAgent1);
  return JSON.parse(fs.readFileSync(abs, "utf8")) as T;
}
