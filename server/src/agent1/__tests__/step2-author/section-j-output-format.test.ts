import { Timestamp } from 'firebase-admin/firestore';

import { buildStep2SectionJ } from '@/agent1/step2-author/prompt-sections/section-j-output-format';
import type { StoryBrief } from '@/models/storyBrief.model';

function makeBrief(personalization: boolean): StoryBrief {
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
      personalization,
      protagonistType: 'child',
      caregiverPresence: 'present_and_comforting',
      narrativeDistance: 'direct',
      protagonistGender: 'girl',
      protagonistAge: 'same_age',
    },
    personalizationConfig: {},
  };
}

describe('buildStep2SectionJ', () => {
  it('contains numbered TITLE and STORY headings', () => {
    const out = buildStep2SectionJ(makeBrief(false));
    expect(out).toContain('1. TITLE');
    expect(out).toContain('2. STORY');
  });

  it('contains the child-facing title guidance', () => {
    expect(buildStep2SectionJ(makeBrief(false))).toContain(
      'A title a child would be drawn to.',
    );
  });

  it('contains the 9–12 Extended chapter-break exception', () => {
    expect(buildStep2SectionJ(makeBrief(false))).toContain(
      'No chapter breaks (unless 9–12 Extended)',
    );
  });

  it('personalization true → placeholders note', () => {
    expect(buildStep2SectionJ(makeBrief(true))).toContain('placeholders throughout');
  });

  it('personalization false → no placeholders note', () => {
    expect(buildStep2SectionJ(makeBrief(false))).not.toContain('placeholders throughout');
  });

  it('never contains the literal undefined', () => {
    expect(buildStep2SectionJ(makeBrief(false))).not.toContain('undefined');
    expect(buildStep2SectionJ(makeBrief(true))).not.toContain('undefined');
  });
});
