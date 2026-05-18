// Shared helpers for variants: persist images, write metadata + report.

import * as fs from "fs";
import * as path from "path";
import type { RunResult } from "./types";

export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

export function saveImage(
  outDir: string,
  pageNumber: number,
  imageBuffer: Buffer,
  mimeType: string,
): string {
  const ext = (mimeType.split("/")[1] ?? "jpeg").replace("jpeg", "jpg");
  const filename = `page-${pageNumber}.${ext}`;
  fs.writeFileSync(path.join(outDir, filename), imageBuffer);
  return filename;
}

export function savePromptText(
  outDir: string,
  pageNumber: number,
  finalPrompt: string,
): void {
  fs.writeFileSync(
    path.join(outDir, `page-${pageNumber}.prompt.txt`),
    finalPrompt,
    "utf8",
  );
}

export function writeMetadata(outDir: string, result: RunResult): void {
  fs.writeFileSync(
    path.join(outDir, "metadata.json"),
    JSON.stringify(result, null, 2),
    "utf8",
  );
}

/** Renders the report-template.md skeleton with the run's results filled in. */
export function writeReport(outDir: string, result: RunResult, expId: string): void {
  const today = new Date().toISOString().slice(0, 10);

  const pageSections = result.pages
    .map((p) => {
      const errLine = p.error ? `\n> ⚠️ Error: ${p.error}\n` : "";
      const refLine = p.referenceImage
        ? `\n_Reference image: \`${p.referenceImage}\`_\n`
        : "";
      return `### Page ${p.pageNumber}

**Page text:**
> ${p.pageText.replace(/\n/g, "\n> ")}

**Scene prompt (from prompt model):**
\`\`\`
${p.imagePrompt}
\`\`\`

**Final prompt sent to image model:**
\`\`\`
${p.finalPromptToImageModel}
\`\`\`
${refLine}
${errLine}
${p.error ? "" : `![page ${p.pageNumber}](${p.imageFilename})`}

| Dimension | Score (1–5) | Note |
|---|---|---|
| Character consistency |  |  |
| Scene clarity |  |  |
| Emotional expression |  |  |
| Age-appropriateness |  |  |
| Art quality |  |  |
| **Total** | **/25** |  |

_Latency: ${(p.latencyMs / 1000).toFixed(1)}s_
`;
    })
    .join("\n---\n\n");

  const visualBibleSection = result.visualBible
    ? `## Visual Bible

\`\`\`json
${JSON.stringify(result.visualBible, null, 2)}
\`\`\`
`
    : "";

  const report = `# Experiment ${expId} — ${result.variantDescription}

**Date:** ${today}
**Branch:** image-gen-experiments
**Variant:** \`${result.variantId}\`

## Setup

| Field | Value |
|---|---|
| Story ID | \`${result.storyId}\` |
| Pages tested | ${result.pages.map((p) => p.pageNumber).join(", ")} |
| Prompt model | \`${result.promptModel}\` |
| Image model | \`${result.imageModel}\` |
| Reference strategy | \`${result.referenceStrategy}\` |
| Seed | ${result.seed ?? "n/a"} |
| Total wall-time | ${(result.totalLatencyMs / 1000).toFixed(1)}s |

${visualBibleSection}
## Hypothesis

_What single variable did this experiment change? What did you expect?_

## Results

${pageSections}

## Aggregate

| Metric | Value |
|---|---|
| Average per-page total (out of 25) |  |
| Δ vs baseline |  |

## Observations

-

## Decision

- [ ] ✅ Adopt — fold into next baseline
- [ ] 🔁 Iterate — note follow-up
- [ ] ❌ Reject

## Next experiment

_What's the next single variable to change?_
`;

  fs.writeFileSync(path.join(outDir, "report.md"), report, "utf8");
}
