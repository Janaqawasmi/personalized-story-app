import { getAgeRangeRules } from '@/agent1/shared/age-range-rules';
import { AGE_RANGES } from '@/models/storyBrief.model';

describe('getAgeRangeRules', () => {
  it('returns a non-empty string for every age range', () => {
    for (const age of AGE_RANGES) {
      const result = getAgeRangeRules(age);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it('3-5 block contains expected vocabulary rule', () => {
    expect(getAgeRangeRules('3-5')).toContain('"Scared" not "anxious."');
  });

  it('5-7 block contains expected vocabulary rule', () => {
    expect(getAgeRangeRules('5-7')).toContain('"Worried" is acceptable');
  });

  it('7-9 block contains expected pacing rule', () => {
    expect(getAgeRangeRules('7-9')).toContain('Can sustain tension across multiple scenes');
  });

  it('9-12 block contains expected complexity rule', () => {
    expect(getAgeRangeRules('9-12')).toContain('Subplots');
  });

  it('each age range returns a different string', () => {
    for (let i = 0; i < AGE_RANGES.length; i += 1) {
      for (let j = i + 1; j < AGE_RANGES.length; j += 1) {
        expect(getAgeRangeRules(AGE_RANGES[i]!)).not.toBe(getAgeRangeRules(AGE_RANGES[j]!));
      }
    }
  });

  it('no block contains the literal word "undefined"', () => {
    for (const age of AGE_RANGES) {
      expect(getAgeRangeRules(age)).not.toContain('undefined');
    }
  });
});
