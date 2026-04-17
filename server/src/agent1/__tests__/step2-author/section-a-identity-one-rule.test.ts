import { FEAR_ANXIETY_APPROACHES } from '@/models/storyBrief.model';
import { buildStep2SectionA } from '@/agent1/step2-author/prompt-sections/section-a-identity-one-rule';

describe('buildStep2SectionA', () => {
  it('returns a non-empty string', () => {
    expect(buildStep2SectionA().length).toBeGreaterThan(0);
  });

  it('contains "author of a therapeutic children\'s story"', () => {
    expect(buildStep2SectionA()).toContain(
      "author of a therapeutic children's story",
    );
  });

  it('contains "THE ONE RULE"', () => {
    expect(buildStep2SectionA()).toContain('THE ONE RULE');
  });

  it('contains the core rule statement verbatim', () => {
    expect(buildStep2SectionA()).toContain(
      'The therapeutic message must be felt, never stated.',
    );
  });

  it('contains "Trust the child. They know."', () => {
    expect(buildStep2SectionA()).toContain('Trust the child. They know.');
  });

  it('returns identical output on consecutive calls (idempotent)', () => {
    expect(buildStep2SectionA()).toBe(buildStep2SectionA());
  });

  it('does not contain any therapeutic approach token (Decision D4)', () => {
    const output = buildStep2SectionA();
    for (const approach of FEAR_ANXIETY_APPROACHES) {
      expect(output).not.toContain(approach);
    }
  });
});
