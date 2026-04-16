import { readdirSync, readFileSync, statSync } from "fs";
import * as path from "path";

import {
  AGE_RANGES,
  CAREGIVER_PRESENCES,
  COPING_TOOL_CATEGORIES,
  CROSS_FIELD_VALIDATIONS,
  FEAR_ANXIETY_APPROACHES,
  FEAR_ANXIETY_COPING_TOOLS,
  NARRATIVE_DISTANCES,
  PEAK_INTENSITIES,
  PROTAGONIST_AGES,
  PROTAGONIST_GENDERS,
  PROTAGONIST_TYPES,
  RESOLUTION_OPTIONS,
  SHAME_DIMENSIONS,
  SOMATIC_EXPRESSIONS,
  STORY_LENGTHS,
  STORY_TYPES,
  SUPPORTING_CHARACTER_TYPES,
} from "@/models/storyBrief.model";

const ALL_VALID_TOKENS: ReadonlySet<string> = new Set<string>([
  ...STORY_TYPES,
  ...AGE_RANGES,
  ...PEAK_INTENSITIES,
  ...STORY_LENGTHS,
  ...FEAR_ANXIETY_APPROACHES,
  ...SHAME_DIMENSIONS,
  ...SOMATIC_EXPRESSIONS,
  ...FEAR_ANXIETY_COPING_TOOLS,
  ...COPING_TOOL_CATEGORIES,
  ...RESOLUTION_OPTIONS,
  ...PROTAGONIST_GENDERS,
  ...PROTAGONIST_TYPES,
  ...PROTAGONIST_AGES,
  ...CAREGIVER_PRESENCES,
  ...NARRATIVE_DISTANCES,
  ...SUPPORTING_CHARACTER_TYPES,
  // Cross-field validation IDs are legitimate "token-like" strings used in Step 1 branches.
  ...CROSS_FIELD_VALIDATIONS.map((v) => v.id),
]);

const TOKEN_IGNORE_MARKER = "// token-ignore";

// A token candidate must be a double-quoted string literal with a "token-like" shape:
// - Lowercase start; lowercase letters/digits/underscores/hyphens thereafter
// - Length >= 4 (avoid tiny incidental strings)
// - Must contain an underscore OR be one of the hyphenated age-range tokens (so "3-5" is caught)
const TOKEN_LIKE_RE = /^[a-z][a-z0-9_-]*$/;
const HYPHENATED_AGE_RANGES = new Set(["3-5", "5-7", "7-9", "9-12"]);

function isCandidateToken(token: string): boolean {
  // Age ranges are special: they are valid tokens but do not match the "starts with a letter"
  // regex and are shorter than 4 chars (e.g., "3-5"). We still want to discipline them.
  if (HYPHENATED_AGE_RANGES.has(token)) return true;

  if (token.length < 4) return false;
  if (!TOKEN_LIKE_RE.test(token)) return false;

  const hasUnderscore = token.includes("_");
  return hasUnderscore;
}

function walkTsFiles(rootDir: string): string[] {
  const files: string[] = [];

  // Treat missing dirs as empty — required for Phase 0 empty scaffold.
  try {
    statSync(rootDir);
  } catch {
    return files;
  }

  const entries = readdirSync(rootDir);
  for (const entry of entries) {
    const full = path.join(rootDir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      files.push(...walkTsFiles(full));
    } else if (st.isFile() && entry.endsWith(".ts")) {
      files.push(full);
    }
  }

  return files;
}

type Violation = { file: string; line: number; token: string };

function scanFileForViolations(filePath: string): Violation[] {
  const violations: Violation[] = [];
  const lines = readFileSync(filePath, "utf8").split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";

    // Only double-quoted literals are candidates by convention.
    const matches = line.matchAll(/"([a-z][a-z0-9_-]*)"/g);
    for (const match of matches) {
      const token = match[1];
      if (!token) continue;
      if (!isCandidateToken(token)) continue;

      if (ALL_VALID_TOKENS.has(token)) continue;
      if (line.includes(TOKEN_IGNORE_MARKER)) continue;

      violations.push({ file: filePath, line: i + 1, token });
    }
  }

  return violations;
}

function formatViolationsMessage(serverRoot: string, violations: Violation[]): string {
  const lines = violations.map((v) => {
    const rel = path.relative(serverRoot, v.file).replace(/\\/g, "/");
    return `  - ${rel}:${v.line}  "${v.token}"`;
  });

  return [
    "Token discipline violations detected in Agent 1 prompt files.",
    "",
    "Each listed string literal looks like a token but is not present in storyBrief.model.ts enums.",
    "Fix by doing ONE of the following:",
    "  1) Add the token to the correct enum in server/src/models/storyBrief.model.ts (schema change), OR",
    "  2) Fix the typo to match an existing enum value, OR",
    `  3) If intentional non-token, add ${TOKEN_IGNORE_MARKER} on the same line as the literal.`,
    "",
    "Violations:",
    ...lines,
    "",
  ].join("\n");
}

describe("token discipline", () => {
  test("candidate detection + allowlist logic behaves as intended", () => {
    expect(isCandidateToken("fear_anxiety")).toBe(true);
    expect(ALL_VALID_TOKENS.has("fear_anxiety")).toBe(true);

    // Missing "the" — should be caught as a candidate and rejected by allowlist.
    expect(isCandidateToken("guides_from_side")).toBe(true);
    expect(ALL_VALID_TOKENS.has("guides_from_side")).toBe(false);

    // No underscore/hyphen-age-range form => not a candidate, never checked against allowlist.
    expect(isCandidateToken("hello")).toBe(false);

    // Hyphenated age-range tokens are candidates even without underscores.
    expect(isCandidateToken("3-5")).toBe(true);
    expect(ALL_VALID_TOKENS.has("3-5")).toBe(true);

    // Not lowercase token-like => not a candidate.
    expect(isCandidateToken("GraduatedExposure")).toBe(false);
  });

  test("no invalid token-like literals exist in prompt-section directories", () => {
    const serverRoot = path.resolve(__dirname, "../../../..");

    const promptRoots = [
      path.join(serverRoot, "src/agent1/step1-architect/prompt-sections"),
      path.join(serverRoot, "src/agent1/step2-author/prompt-sections"),
      path.join(serverRoot, "src/agent1/step3-post-validation"),
    ];

    const allFiles = promptRoots.flatMap((dir) => walkTsFiles(dir));
    const violations = allFiles.flatMap((file) => scanFileForViolations(file));

    if (violations.length > 0) {
      throw new Error(formatViolationsMessage(serverRoot, violations));
    }
  });
});

