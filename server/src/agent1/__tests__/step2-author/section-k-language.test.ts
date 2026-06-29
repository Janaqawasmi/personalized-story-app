import { Timestamp } from 'firebase-admin/firestore';

import { buildStep2SectionK } from '@/agent1/step2-author/prompt-sections/section-k-language';
import type { StoryBrief, StoryLanguage } from '@/models/storyBrief.model';

function makeBrief(outputLanguage?: StoryLanguage): StoryBrief {
  const now = Timestamp.now();
  return {
    createdAt: now,
    updatedAt: now,
    createdBy: 'test',
    status: 'submitted',
    version: 1,
    storyType: 'fear_anxiety',
    ...(outputLanguage ? { outputLanguage } : {}),
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
      personalization: true,
      protagonistType: 'child',
      caregiverPresence: 'present_and_comforting',
      narrativeDistance: 'direct',
      protagonistGender: 'girl',
      protagonistAge: 'same_age',
    },
    personalizationConfig: {},
  };
}

describe('buildStep2SectionK', () => {
  it('returns empty string when output language is English', () => {
    expect(buildStep2SectionK(makeBrief('en'))).toBe('');
  });

  it('returns empty string when output language is absent (legacy brief)', () => {
    expect(buildStep2SectionK(makeBrief())).toBe('');
  });

  it('Arabic output → contains the OUTPUT LANGUAGE directive', () => {
    const out = buildStep2SectionK(makeBrief('ar'));
    expect(out).toContain('OUTPUT LANGUAGE');
    expect(out).toContain('Arabic');
  });

  it('Hebrew output → contains the OUTPUT LANGUAGE directive', () => {
    const out = buildStep2SectionK(makeBrief('he'));
    expect(out).toContain('OUTPUT LANGUAGE');
    expect(out).toContain('Hebrew');
  });

  it('Hebrew output → instructs original prose, not translation', () => {
    const out = buildStep2SectionK(makeBrief('he'));
    expect(out).toContain('NOT a translation');
    expect(out).toContain('never translate word-by-word');
  });

  it('Arabic output → instructs original prose, not translation', () => {
    const out = buildStep2SectionK(makeBrief('ar'));
    expect(out).toContain('NOT a translation');
    expect(out).toContain('never translate word-by-word');
  });

  it('Arabic output → preserves placeholder tokens in Latin script', () => {
    const out = buildStep2SectionK(makeBrief('ar'));
    expect(out).toContain('[CHILD_NAME]');
    expect(out).toContain('[HE/SHE/THEY]');
  });

  it('Arabic output → keeps JSON keys in English', () => {
    const out = buildStep2SectionK(makeBrief('ar'));
    expect(out).toContain('JSON keys');
    expect(out).toContain('"title"');
    expect(out).toContain('"text"');
  });

  it('never contains the literal string "undefined"', () => {
    expect(buildStep2SectionK(makeBrief('ar'))).not.toContain('undefined');
    expect(buildStep2SectionK(makeBrief('en'))).not.toContain('undefined');
  });
});
