import type { StoryBrief } from '@/models/storyBrief.model';
import type { Step1Output } from '@/agent1/types';

import { buildStep2SectionA } from './prompt-sections/section-a-identity-one-rule';
import { buildStep2SectionB } from './prompt-sections/section-b-source-details';
import { buildStep2SectionC } from './prompt-sections/section-c-blueprint';
import { buildStep2SectionD } from './prompt-sections/section-d-bodys-language';
import { buildStep2SectionE } from './prompt-sections/section-e-structural-params';
import { buildStep2SectionF } from './prompt-sections/section-f-pacing';
import { buildStep2SectionG } from './prompt-sections/section-g-obligation-tiers';
import { buildStep2SectionH } from './prompt-sections/section-h-hard-constraints';
import { buildStep2SectionI } from './prompt-sections/section-i-few-shot';
import { buildStep2SectionJ } from './prompt-sections/section-j-output-format';
import { getStoryExample } from './few-shot-retriever';

type ExampleBankStatus =
  | 'examples_used'
  | 'cross_bucket_retrieval'
  | 'cold_start_no_examples';

export function buildStep2Prompt(
  brief: StoryBrief,
  step1Output: Step1Output,
): { prompt: string; exampleBankStatus: ExampleBankStatus } {
  const sectionA = buildStep2SectionA();
  const sectionB = buildStep2SectionB(brief);
  const sectionC = buildStep2SectionC(brief, step1Output);
  const sectionD = buildStep2SectionD(brief);
  const sectionE = buildStep2SectionE(brief);
  const sectionF = buildStep2SectionF();
  const sectionG = buildStep2SectionG(step1Output.compressionMetadata);
  const sectionH = buildStep2SectionH(brief);

  const fewShotResult = getStoryExample(brief.ageAndScope.ageRange);
  const sectionI = buildStep2SectionI(
    fewShotResult,
    brief.storyType,
    brief.ageAndScope.ageRange,
  );

  const sectionJ = buildStep2SectionJ(brief);

  const prompt = [
    sectionA,
    sectionB,
    sectionC,
    sectionD,
    sectionE,
    sectionF,
    sectionG,
    sectionH,
    sectionI,
    sectionJ,
  ].join('\n\n');

  let exampleBankStatus: ExampleBankStatus;
  if (fewShotResult.example !== null && !fewShotResult.crossBucket) {
    exampleBankStatus = 'examples_used';
  } else if (fewShotResult.example !== null && fewShotResult.crossBucket) {
    exampleBankStatus = 'cross_bucket_retrieval';
  } else {
    exampleBankStatus = 'cold_start_no_examples';
  }

  return { prompt, exampleBankStatus };
}
