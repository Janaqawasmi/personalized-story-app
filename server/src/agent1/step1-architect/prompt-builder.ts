import type { StoryBrief } from '@/models/storyBrief.model';
import type { GenerateOptions, PreCheckResult } from '@/agent1/types';

import { buildSectionA } from './prompt-sections/section-a-identity';
import { buildSectionB } from './prompt-sections/section-b-creative-vision';
import { buildSectionCClinical } from './prompt-sections/section-c-clinical';
import { buildSectionCStoryWorld } from './prompt-sections/section-c-story-world';
import { buildSectionCWarningsPriorities } from './prompt-sections/section-c-warnings-priorities';
import { buildSectionD } from './prompt-sections/section-d-obligation-tiers';
import { buildSectionE } from './prompt-sections/section-e-output-format';
import { buildSectionF } from './prompt-sections/section-f-few-shot';
import { getBlueprintExamples } from './few-shot-retriever';
import { buildSectionRerun } from './prompt-sections/section-rerun';

type ExampleBankStatus =
  | 'examples_used'
  | 'cross_bucket_retrieval'
  | 'cold_start_no_examples';

export function buildStep1Prompt(
  brief: StoryBrief,
  preCheckResult: PreCheckResult,
  options?: GenerateOptions,
): { prompt: string; exampleBankStatus: ExampleBankStatus } {
  const sectionA = buildSectionA();
  const sectionB = buildSectionB(brief);
  const sectionCClinical = buildSectionCClinical(
    brief,
    preCheckResult.vagueIntention,
  );
  const sectionCStoryWorld = buildSectionCStoryWorld(
    brief,
    preCheckResult.complexityBudget,
  );
  const sectionCWarnings = buildSectionCWarningsPriorities(brief);
  const sectionD = buildSectionD(preCheckResult.complexityBudget);

  const fewShotResult = getBlueprintExamples(brief.ageAndScope.ageRange);

  const hasSupportingCharacterRoles = (
    brief.storyWorld.supportingCharacters ?? []
  ).some(
    (c) =>
      c.functionalRole !== undefined && c.functionalRole.trim().length > 0,
  );

  const hasComplexityStatus =
    preCheckResult.complexityBudget.state !== 'green';

  const sectionE = buildSectionE(
    brief,
    preCheckResult.vagueIntention,
    hasComplexityStatus,
    hasSupportingCharacterRoles,
  );
  const sectionF = buildSectionF(
    fewShotResult,
    brief.storyType,
    brief.ageAndScope.ageRange,
  );

  const rerunSection =
    options?.feedback !== undefined ? buildSectionRerun(options.feedback) : null;

  const prompt = [
    sectionA,
    sectionB,
    sectionCClinical,
    sectionCStoryWorld,
    sectionCWarnings,
    sectionD,
    sectionE,
    sectionF,
    ...(rerunSection ? [rerunSection] : []),
  ].join('\n\n');

  let exampleBankStatus: ExampleBankStatus;
  if (fewShotResult.examples.length > 0 && !fewShotResult.crossBucket) {
    exampleBankStatus = 'examples_used';
  } else if (fewShotResult.examples.length > 0 && fewShotResult.crossBucket) {
    exampleBankStatus = 'cross_bucket_retrieval';
  } else {
    exampleBankStatus = 'cold_start_no_examples';
  }

  return { prompt, exampleBankStatus };
}
