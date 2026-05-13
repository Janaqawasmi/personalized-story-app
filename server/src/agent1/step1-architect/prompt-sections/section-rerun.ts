import type { RerunFeedback } from "@/agent1/types";

/** Appends specialist rerun context so Step 1 can revise while honoring approvals. */
export function buildSectionRerun(feedback: RerunFeedback): string {
  const prev = feedback.previousOutput;
  const storyCap = 2800;
  const storyExcerpt =
    prev.story.length > storyCap
      ? `${prev.story.slice(0, storyCap)}\n\n[...story truncated for prompt size...]`
      : prev.story;

  const blueprintLines = prev.blueprint
    .map((p) => `${p.index}. ${p.text}`)
    .join("\n");

  const approved =
    feedback.approvedParts.length > 0
      ? feedback.approvedParts.join(", ")
      : "(none - you may revise any prior structural choice if it serves the brief and the feedback below)";

  return [
    "### RERUN — REVISE THE PRIOR GENERATION",
    `Prior generation id: \`${feedback.rerunOf}\` (prior rerunCount: ${prev.rerunCount}).`,
    `**Parts the specialist asked to preserve when consistent with the revision:** ${approved}`,
    "",
    "**Specialist feedback (must address):**",
    feedback.feedbackText,
    "",
    "**Previous title:**",
    prev.title,
    "",
    "**Previous emotional truth:**",
    prev.emotionalTruth,
    "",
    "**Previous blueprint:**",
    blueprintLines,
    "",
    "**Previous story (reference manuscript):**",
    storyExcerpt,
  ].join("\n\n");
}
