import { Timestamp } from 'firebase-admin/firestore';

import { buildSectionE } from '@/agent1/step1-architect/prompt-sections/section-e-output-format';
import {
  FEAR_ANXIETY_COPING_TOOL_LABELS,
  type StoryBrief,
} from '@/models/storyBrief.model';
import type { VagueIntentionResult } from '@/agent1/types';

const defaultVagueIntention: VagueIntentionResult = {
  isVague: false,
};

function makeMinimalBrief(overrides: {
  copingTool?: StoryBrief['therapeuticArchitecture']['copingTool'];
  primaryApproach?: StoryBrief['therapeuticArchitecture']['primaryApproach'];
  supportingApproach?: StoryBrief['therapeuticArchitecture']['supportingApproach'];
  resolutionCompleteness?: StoryBrief['therapeuticArchitecture']['resolutionCompleteness'];
} = {}): StoryBrief {
  const now = Timestamp.now();
  return {
    createdAt: now,
    updatedAt: now,
    createdBy: 'test-user-id',
    status: 'submitted',
    version: 1,
    storyType: 'fear_anxiety',
    ageAndScope: {
      ageRange: '5-7',
      peakIntensity: 'moderate',
      storyLength: 'standard',
    },
    clinicalFoundation: {
      population: 'p'.repeat(100),
      trigger: 't'.repeat(100),
      therapeuticIntention: {
        feel: 'feel',
        because: 'because',
      },
      creativeVision: 'vision',
    },
    therapeuticArchitecture: {
      primaryApproach: overrides.primaryApproach ?? 'graduated_exposure',
      ...(overrides.supportingApproach !== undefined
        ? { supportingApproach: overrides.supportingApproach }
        : {}),
      shameDimension: 'not_significant',
      typeSpecificField: {
        fieldType: 'somatic_expression',
        selections: ['stomach_ache_feeling_sick'],
      },
      copingTool: overrides.copingTool ?? 'deep_breathing',
      resolutionCompleteness: overrides.resolutionCompleteness ?? 'full',
      mustNeverList: [],
    },
    storyWorld: {
      personalization: false,
      protagonistType: 'child',
      caregiverPresence: 'present_and_comforting',
      narrativeDistance: 'direct',
    },
    personalizationConfig: {},
  };
}

describe('buildSectionE — core output sections', () => {
  it('test 1: default brief → contains all four required headers, no conditional outputs', () => {
    const output = buildSectionE(
      makeMinimalBrief(),
      defaultVagueIntention,
      false,
      false,
    );
    expect(output).toContain('EMOTIONAL TRUTH');
    expect(output).toContain('NARRATIVE BLUEPRINT');
    expect(output).toContain('COPING TOOL PLACEMENT NOTE');
    expect(output).toContain('APPROACH INSTRUCTION');
    expect(output).not.toContain('INFERRED INTENTION FLAG');
    expect(output).not.toContain('COMPRESSION METADATA');
  });

  it('test 2: output contains the coping tool display label', () => {
    const output = buildSectionE(
      makeMinimalBrief({ copingTool: 'deep_breathing' }),
      defaultVagueIntention,
      false,
      false,
    );
    expect(output).toContain(FEAR_ANXIETY_COPING_TOOL_LABELS.deep_breathing);
  });

  it('test 3: vague intention → output contains INFERRED INTENTION FLAG and "too general"', () => {
    const vague: VagueIntentionResult = { isVague: true, matchedPattern: 'feel better' };
    const output = buildSectionE(makeMinimalBrief(), vague, false, false);
    expect(output).toContain('INFERRED INTENTION FLAG');
    expect(output).toContain('too general');
  });

  it('test 4: not vague → output does NOT contain INFERRED INTENTION FLAG', () => {
    const output = buildSectionE(
      makeMinimalBrief(),
      defaultVagueIntention,
      false,
      false,
    );
    expect(output).not.toContain('INFERRED INTENTION FLAG');
  });

  it('test 5: hasComplexityStatus true → output contains COMPRESSION METADATA and "what was fully included"', () => {
    const output = buildSectionE(
      makeMinimalBrief(),
      defaultVagueIntention,
      true,
      false,
    );
    expect(output).toContain('COMPRESSION METADATA');
    expect(output).toContain('what was fully included');
  });

  it('test 6: hasComplexityStatus false → output does NOT contain COMPRESSION METADATA', () => {
    const output = buildSectionE(
      makeMinimalBrief(),
      defaultVagueIntention,
      false,
      false,
    );
    expect(output).not.toContain('COMPRESSION METADATA');
  });

  it('test 7: hasSupportingCharacterRoles true → output contains supporting characters note', () => {
    const output = buildSectionE(
      makeMinimalBrief(),
      defaultVagueIntention,
      false,
      true,
    );
    expect(output).toContain(
      'Supporting characters and their roles must be reflected in the blueprint.',
    );
  });

  it('test 8: hasSupportingCharacterRoles false → output does NOT contain supporting characters note', () => {
    const output = buildSectionE(
      makeMinimalBrief(),
      defaultVagueIntention,
      false,
      false,
    );
    expect(output).not.toContain('Supporting characters and their roles');
  });

  it('test 9: supporting approach defined → output contains "supporting approach flavors the story"', () => {
    const output = buildSectionE(
      makeMinimalBrief({ supportingApproach: 'normalization' }),
      defaultVagueIntention,
      false,
      false,
    );
    expect(output).toContain('supporting approach flavors the story');
  });

  it('test 10: no supporting approach → output does NOT contain "supporting approach flavors"', () => {
    const output = buildSectionE(
      makeMinimalBrief(),
      defaultVagueIntention,
      false,
      false,
    );
    expect(output).not.toContain('supporting approach flavors');
  });

  it('test 11: normalization + open → output contains "Company changes the experience, not the problem"', () => {
    const output = buildSectionE(
      makeMinimalBrief({
        primaryApproach: 'normalization',
        resolutionCompleteness: 'open',
      }),
      defaultVagueIntention,
      false,
      false,
    );
    expect(output).toContain('Company changes the experience, not the problem');
  });

  it('test 12: normalization + full → output does NOT contain "Company changes"', () => {
    const output = buildSectionE(
      makeMinimalBrief({
        primaryApproach: 'normalization',
        resolutionCompleteness: 'full',
      }),
      defaultVagueIntention,
      false,
      false,
    );
    expect(output).not.toContain('Company changes');
  });

  it('test 13: graduated_exposure + open → output does NOT contain "Company changes"', () => {
    const output = buildSectionE(
      makeMinimalBrief({
        primaryApproach: 'graduated_exposure',
        resolutionCompleteness: 'open',
      }),
      defaultVagueIntention,
      false,
      false,
    );
    expect(output).not.toContain('Company changes');
  });

  it('test 14: output contains "BEFORE FINALIZING" and "Anti-generic check"', () => {
    const output = buildSectionE(
      makeMinimalBrief(),
      defaultVagueIntention,
      false,
      false,
    );
    expect(output).toContain('BEFORE FINALIZING');
    expect(output).toContain('Anti-generic check');
  });

  it('test 15: output contains "Must end with" and "By the end, this child needs to feel"', () => {
    const output = buildSectionE(
      makeMinimalBrief(),
      defaultVagueIntention,
      false,
      false,
    );
    expect(output).toContain('Must end with');
    expect(output).toContain('By the end, this child needs to feel');
  });

  it('test 16: output does not contain "undefined"', () => {
    const output = buildSectionE(
      makeMinimalBrief(),
      defaultVagueIntention,
      false,
      false,
    );
    expect(output).not.toContain('undefined');
  });
});
