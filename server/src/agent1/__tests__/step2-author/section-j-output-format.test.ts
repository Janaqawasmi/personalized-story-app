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
  it('contains OUTPUT FORMAT header', () => {
    const out = buildStep2SectionJ(makeBrief(false));
    expect(out).toContain('OUTPUT FORMAT');
  });

  it('contains JSON schema with title and pages fields', () => {
    const out = buildStep2SectionJ(makeBrief(false));
    expect(out).toContain('"title"');
    expect(out).toContain('"pages"');
    expect(out).toContain('"pageNumber"');
    expect(out).toContain('"text"');
  });

  it('instructs the model to output only valid JSON with no markdown fences', () => {
    const out = buildStep2SectionJ(makeBrief(false));
    expect(out).toContain('Output ONLY valid JSON');
    expect(out).toContain('no markdown fences');
  });

  it('contains PAGE RULES header', () => {
    const out = buildStep2SectionJ(makeBrief(false));
    expect(out).toContain('PAGE RULES');
  });

  it('defines a page as a single visual moment', () => {
    const out = buildStep2SectionJ(makeBrief(false));
    expect(out).toContain('ONE visual moment');
  });

  it('references the target page count range from Section E', () => {
    const out = buildStep2SectionJ(makeBrief(false));
    expect(out).toContain('Target page count range');
  });

  it('contains the child-facing title guidance', () => {
    const out = buildStep2SectionJ(makeBrief(false));
    expect(out).toContain('a title a child would be drawn to');
    expect(out).toContain('Not clinical, not cute');
  });

  it('personalization true → placeholders note included', () => {
    expect(buildStep2SectionJ(makeBrief(true))).toContain('placeholders');
  });

  it('personalization false → no placeholders note', () => {
    expect(buildStep2SectionJ(makeBrief(false))).not.toContain('placeholders');
  });

  it('never contains the literal string "undefined"', () => {
    expect(buildStep2SectionJ(makeBrief(false))).not.toContain('undefined');
    expect(buildStep2SectionJ(makeBrief(true))).not.toContain('undefined');
  });
});
