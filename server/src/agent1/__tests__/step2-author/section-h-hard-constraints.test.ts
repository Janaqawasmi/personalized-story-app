import { readFileSync } from 'fs';
import { resolve } from 'path';

import { Timestamp } from 'firebase-admin/firestore';

import { buildStep2SectionH } from '@/agent1/step2-author/prompt-sections/section-h-hard-constraints';
import type { StoryBrief } from '@/models/storyBrief.model';

function makeBrief(overrides: {
  mustNeverList?: string[];
  shameDimension?: StoryBrief['therapeuticArchitecture']['shameDimension'];
} = {}): StoryBrief {
  const now = Timestamp.now();
  return {
    createdAt: now,
    updatedAt: now,
    createdBy: 'test',
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
      therapeuticIntention: { feel: 'feel', because: 'because' },
      creativeVision: 'vision',
    },
    therapeuticArchitecture: {
      primaryApproach: 'graduated_exposure',
      shameDimension: overrides.shameDimension ?? 'not_significant',
      typeSpecificField: {
        fieldType: 'somatic_expression',
        selections: ['stomach_ache_feeling_sick'],
      },
      copingTool: 'deep_breathing',
      resolutionCompleteness: 'full',
      mustNeverList: overrides.mustNeverList ?? [],
    },
    storyWorld: {
      personalization: false,
      protagonistType: 'child',
      caregiverPresence: 'present_and_comforting',
      narrativeDistance: 'direct',
      protagonistGender: 'girl',
      protagonistAge: 'same_age',
    },
    personalizationConfig: {},
  };
}

describe('buildStep2SectionH', () => {
  it('empty mustNeverList → (none)', () => {
    expect(buildStep2SectionH(makeBrief({ mustNeverList: [] }))).toContain('(none)');
  });

  it('formats two must-never items as bullets', () => {
    const out = buildStep2SectionH(
      makeBrief({ mustNeverList: ['No graphic injury', 'No blame language'] }),
    );
    expect(out).toContain('- No graphic injury');
    expect(out).toContain('- No blame language');
  });

  it('shame present → observed in their shame', () => {
    const out = buildStep2SectionH(makeBrief({ shameDimension: 'present' }));
    expect(out).toContain('observed in their shame');
  });

  it('shame central → three numbered rules', () => {
    const out = buildStep2SectionH(makeBrief({ shameDimension: 'central' }));
    expect(out).toContain('(1) Story demonstrates child is not alone in this feeling.');
    expect(out).toContain('(2) Never implies child should have known/done/felt differently.');
    expect(out).toContain('(3) At least one character witnesses the protagonist');
  });

  it('shame not_significant → no present/central instructional shame rules', () => {
    const out = buildStep2SectionH(makeBrief({ shameDimension: 'not_significant' }));
    expect(out).not.toContain('observed in their shame');
    expect(out).not.toContain('(1) Story demonstrates child is not alone');
  });

  it('contains These constraints are absolute.', () => {
    expect(buildStep2SectionH(makeBrief())).toContain('These constraints are absolute.');
  });

  it('source file contains the CRITICAL comment (read from disk)', () => {
    const src = readFileSync(
      resolve(
        __dirname,
        '../../step2-author/prompt-sections/section-h-hard-constraints.ts',
      ),
      'utf8',
    );
    expect(src).toContain('NEVER read from');
    expect(src).toContain('reverses clinical judgment');
    expect(src).toContain('mustNeverList');
  });

  it('output never contains the literal undefined', () => {
    expect(buildStep2SectionH(makeBrief())).not.toContain('undefined');
  });
});
