import { buildStep2SectionI } from '@/agent1/step2-author/prompt-sections/section-i-few-shot';
import {
  AGE_RANGE_LABELS,
  STORY_TYPE_LABELS,
} from '@/models/storyBrief.model';

describe('buildStep2SectionI', () => {
  it('example present, not cross-bucket → One approved story with display labels', () => {
    const out = buildStep2SectionI(
      {
        example: { content: { opening: 'Once there was a small fox.' }, filename: 'ex.json' },
        sourceAgeRange: '5-7',
        crossBucket: false,
      },
      'fear_anxiety',
      '5-7',
    );
    expect(out).toContain('One approved story');
    expect(out).toContain(STORY_TYPE_LABELS.fear_anxiety);
    expect(out).toContain(AGE_RANGE_LABELS['5-7']);
  });

  it('example present → JSON-stringified content appears', () => {
    const content = { beat: 'test' };
    const out = buildStep2SectionI(
      {
        example: { content, filename: 'x.json' },
        sourceAgeRange: '7-9',
        crossBucket: false,
      },
      'fear_anxiety',
      '7-9',
    );
    expect(out).toContain(JSON.stringify(content, null, 2));
  });

  it('cross-bucket → No approved story examples exist yet', () => {
    const out = buildStep2SectionI(
      {
        example: { content: {}, filename: 'y.json' },
        sourceAgeRange: '3-5',
        crossBucket: true,
      },
      'fear_anxiety',
      '7-9',
    );
    expect(out).toContain('No approved story examples exist yet');
    expect(out).toContain(AGE_RANGE_LABELS['7-9']);
    expect(out).toContain(AGE_RANGE_LABELS['3-5']);
  });

  it('no example → cold-start Standards line', () => {
    const out = buildStep2SectionI(
      { example: null, sourceAgeRange: '5-7', crossBucket: false },
      'fear_anxiety',
      '5-7',
    );
    expect(out).toContain('Standards: specificity, restraint');
  });

  it('does not leak the fear_anxiety story type token', () => {
    const out = buildStep2SectionI(
      {
        example: { content: { note: 'plain story text' }, filename: 'z.json' },
        sourceAgeRange: '5-7',
        crossBucket: false,
      },
      'fear_anxiety',
      '5-7',
    );
    expect(out).not.toContain('fear_anxiety');
  });

  it('never contains the literal undefined', () => {
    const out = buildStep2SectionI(
      {
        example: { content: {}, filename: 'z.json' },
        sourceAgeRange: '5-7',
        crossBucket: false,
      },
      'fear_anxiety',
      '5-7',
    );
    expect(out).not.toContain('undefined');
  });
});
