import { Timestamp } from 'firebase-admin/firestore';

import { buildSectionCWarningsPriorities } from '@/agent1/step1-architect/prompt-sections/section-c-warnings-priorities';
import {
  CROSS_FIELD_VALIDATIONS,
  type StoryBrief,
} from '@/models/storyBrief.model';

function makeMinimalBrief(
  acknowledgedWarnings?: string[],
): StoryBrief {
  const now = Timestamp.now();

  const brief: StoryBrief = {
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
      primaryApproach: 'graduated_exposure',
      shameDimension: 'not_significant',
      typeSpecificField: {
        fieldType: 'somatic_expression',
        selections: ['stomach_ache_feeling_sick'],
      },
      copingTool: 'deep_breathing',
      resolutionCompleteness: 'full',
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

  if (acknowledgedWarnings !== undefined) {
    brief.acknowledgedWarnings = acknowledgedWarnings;
  }

  return brief;
}

describe('buildSectionCWarningsPriorities — acknowledged warnings', () => {
  it('test 1: acknowledgedWarnings undefined → no ACKNOWLEDGED RISK COMBINATIONS header', () => {
    const output = buildSectionCWarningsPriorities(makeMinimalBrief(undefined));
    expect(output).not.toContain('ACKNOWLEDGED RISK COMBINATIONS');
  });

  it('test 2: acknowledgedWarnings empty array → no ACKNOWLEDGED RISK COMBINATIONS header', () => {
    const output = buildSectionCWarningsPriorities(makeMinimalBrief([]));
    expect(output).not.toContain('ACKNOWLEDGED RISK COMBINATIONS');
  });

  it('test 3: one valid ID → header present and description included', () => {
    const output = buildSectionCWarningsPriorities(
      makeMinimalBrief(['significant_intensity_young_age']),
    );
    expect(output).toContain('ACKNOWLEDGED RISK COMBINATIONS');
    const expected = CROSS_FIELD_VALIDATIONS.find(
      (v) => v.id === 'significant_intensity_young_age',
    )!.description;
    expect(output).toContain(expected);
  });

  it('test 4: two valid IDs → both descriptions present', () => {
    const output = buildSectionCWarningsPriorities(
      makeMinimalBrief([
        'significant_intensity_young_age',
        'graduated_exposure_comforting_caregiver',
      ]),
    );
    const desc1 = CROSS_FIELD_VALIDATIONS.find(
      (v) => v.id === 'significant_intensity_young_age',
    )!.description;
    const desc2 = CROSS_FIELD_VALIDATIONS.find(
      (v) => v.id === 'graduated_exposure_comforting_caregiver',
    )!.description;
    expect(output).toContain(desc1);
    expect(output).toContain(desc2);
  });

  it('test 5: unknown ID → fallback string present, does not throw', () => {
    const output = buildSectionCWarningsPriorities(
      makeMinimalBrief(['nonexistent_validation_id']),
    );
    expect(output).toContain('(unknown validation: nonexistent_validation_id)');
  });

  it('test 6: warnings present → output contains "Treat them as design choices, not errors"', () => {
    const output = buildSectionCWarningsPriorities(
      makeMinimalBrief(['significant_intensity_young_age']),
    );
    expect(output).toContain('Treat them as design choices, not errors');
  });

  it('test 7: warnings present → output contains "post-validation alignment note may comment"', () => {
    const output = buildSectionCWarningsPriorities(
      makeMinimalBrief(['significant_intensity_young_age']),
    );
    expect(output).toContain('post-validation alignment note may comment');
  });
});

describe('buildSectionCWarningsPriorities — priority rules', () => {
  it('test 8: default brief → output contains PRIORITY RULES header', () => {
    const output = buildSectionCWarningsPriorities(makeMinimalBrief());
    expect(output).toContain('PRIORITY RULES');
  });

  it('test 9: output contains all 7 priority rule phrases', () => {
    const output = buildSectionCWarningsPriorities(makeMinimalBrief());
    expect(output).toContain('passed combinations are intentional');
    expect(output).toContain('defines the arc, overrides creative vision');
    expect(output).toContain('defines the destination');
    expect(output).toContain('defines therapeutic delivery');
    expect(output).toContain('define architecture');
    expect(output).toContain('enriches, does not override');
    expect(output).toContain('add texture within the architecture');
  });

  it('test 10: priority rules present even when acknowledged warnings are present', () => {
    const output = buildSectionCWarningsPriorities(
      makeMinimalBrief(['significant_intensity_young_age']),
    );
    expect(output).toContain('PRIORITY RULES');
    expect(output).toContain('passed combinations are intentional');
  });
});

describe('buildSectionCWarningsPriorities — no undefined leaks', () => {
  it('test 11: default brief → output does not contain "undefined"', () => {
    const output = buildSectionCWarningsPriorities(makeMinimalBrief());
    expect(output).not.toContain('undefined');
  });

  it('test 12: brief with valid acknowledgedWarnings → output does not contain "undefined"', () => {
    const output = buildSectionCWarningsPriorities(
      makeMinimalBrief(['significant_intensity_young_age']),
    );
    expect(output).not.toContain('undefined');
  });
});
