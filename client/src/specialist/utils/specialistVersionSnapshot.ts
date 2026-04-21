// client/src/specialist/utils/specialistVersionSnapshot.ts
//
// When requesting regeneration, specialist prose edits must be preserved as a
// distinct version in agent1Versions (mirrors server handleTransition behavior).

import type { Agent1Result } from "../../types/agent1Result";
import type { Story } from "../../types/story";

export function buildSpecialistSnapshotFields(
  story: Story,
): Pick<Story, "agent1Versions" | "agent1Result"> | null {
  const draft = story.currentDraft;
  const base: Agent1Result | null =
    story.agent1Versions.length > 0
      ? story.agent1Versions[story.agent1Versions.length - 1]
      : story.agent1Result;
  if (!draft || !base) return null;

  if (
    draft.body.trim() === base.story.trim() &&
    draft.title.trim() === base.title.trim()
  ) {
    return null;
  }

  const wc = draft.wordCount;
  const [minW, maxW] = base.targetWordRange;
  const wordCountDrift: Agent1Result["wordCountDrift"] =
    wc < minW ? "under" : wc > maxW ? "over" : "within_range";

  const snapshot: Agent1Result = {
    ...base,
    generationId: crypto.randomUUID(),
    title: draft.title,
    story: draft.body,
    wordCount: wc,
    wordCountDrift,
    generatedAt: new Date().toISOString(),
    rerunOf: base.generationId,
  };

  return {
    agent1Versions: [...story.agent1Versions, snapshot],
    agent1Result: snapshot,
  };
}
