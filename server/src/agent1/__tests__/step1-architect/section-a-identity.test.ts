import { buildSectionA } from '@/agent1/step1-architect/prompt-sections/section-a-identity';

describe('buildSectionA', () => {
  it('returns a non-empty string', () => {
    expect(buildSectionA().length).toBeGreaterThan(0);
  });

  it('contains the distinctive opening phrase', () => {
    expect(buildSectionA()).toContain(
      "story architect for therapeutic children's stories",
    );
  });

  it('includes Section A2 via THE 7-PHASE ARC heading', () => {
    expect(buildSectionA()).toContain('THE 7-PHASE ARC');
  });

  it('includes the arc mapping row for the difficult peak', () => {
    expect(buildSectionA()).toContain('Point 4 (peak — REQUIRED somatic)');
  });

  it('includes the separation / relational fear note', () => {
    expect(buildSectionA()).toContain('separation or relational fear stories');
  });

  it('returns identical output on consecutive calls', () => {
    expect(buildSectionA()).toBe(buildSectionA());
  });
});
