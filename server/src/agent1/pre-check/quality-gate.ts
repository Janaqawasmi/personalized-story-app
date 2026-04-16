import type { StoryBrief } from "@/models/storyBrief.model";
import type { QualityGateResult } from "@/agent1/types";

export function checkQualityGate(brief: StoryBrief): QualityGateResult {
  const trigger = brief.clinicalFoundation.trigger;
  const triggerThin = trigger.length < 80;

  const { feel, because } = brief.clinicalFoundation.therapeuticIntention;
  const combined = feel + " because " + because;
  const intentionThin = combined.length < 60;

  return { triggerThin, intentionThin };
}
