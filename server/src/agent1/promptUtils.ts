import { readFileSync } from "fs";
import path from "path";

/**
 * Load a prompt template from `server/src/agent1/prompts/<name>.md`.
 */
export function loadPromptTemplate(name: string): string {
  const filePath = path.join(__dirname, "prompts", `${name}.md`);
  return readFileSync(filePath, "utf8");
}

/** Replace `{{key}}` placeholders with values (non-iterative, order-independent). */
export function substitutePlaceholders(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(v);
  }
  return out;
}
