import { buildSectionD } from '@/agent1/step1-architect/prompt-sections/section-d-obligation-tiers';
import type { ComplexityBudgetResult } from '@/agent1/types';

const defaultComplexity: ComplexityBudgetResult = {
  totalPageCost: 4.4,
  availablePageRange: [10, 14] as const,
  state: 'green',
  contributions: [],
};

describe('buildSectionD — obligation tiers', () => {
  it('test 1: green complexity → contains tier header, no COMPLEXITY STATUS', () => {
    const output = buildSectionD(defaultComplexity);
    expect(output).toContain('NARRATIVE OBLIGATION TIERS');
    expect(output).not.toContain('COMPLEXITY STATUS:');
  });

  it('test 2: yellow complexity with statusText → contains COMPLEXITY STATUS and text', () => {
    const yellow: ComplexityBudgetResult = {
      ...defaultComplexity,
      state: 'yellow',
      complexityStatusText: 'Yellow: 14.2 page-cost vs 14 available.',
    };
    const output = buildSectionD(yellow);
    expect(output).toContain('COMPLEXITY STATUS:');
    expect(output).toContain('Yellow: 14.2 page-cost vs 14 available.');
    expect(output).toContain('Plan your blueprint with these compression needs');
  });

  it('test 3: red complexity with statusText → contains COMPLEXITY STATUS and text', () => {
    const red: ComplexityBudgetResult = {
      ...defaultComplexity,
      state: 'red',
      complexityStatusText: 'Red: 18.0 page-cost vs 14 available.',
    };
    const output = buildSectionD(red);
    expect(output).toContain('COMPLEXITY STATUS:');
    expect(output).toContain('Red: 18.0 page-cost vs 14 available.');
    expect(output).toContain('Plan your blueprint with these compression needs');
  });

  it('test 4: output contains all four tier headers', () => {
    const output = buildSectionD(defaultComplexity);
    expect(output).toContain('TIER 1');
    expect(output).toContain('TIER 2');
    expect(output).toContain('TIER 3');
    expect(output).toContain('TIER 4');
  });

  it('test 5: Tier 3 contains first supporting character functional role', () => {
    const output = buildSectionD(defaultComplexity);
    // Locate TIER 3 text and verify it contains this phrase
    expect(output).toContain("The first supporting character's functional role");
  });

  it("test 6: Tier 4 contains second supporting character's functional role", () => {
    const output = buildSectionD(defaultComplexity);
    expect(output).toContain("The second supporting character's functional role");
  });

  it('test 7: Tier 2 contains introduced model character reference', () => {
    const output = buildSectionD(defaultComplexity);
    expect(output).toContain('An introduced model character');
  });

  it('test 8: output does not contain "undefined"', () => {
    const output = buildSectionD(defaultComplexity);
    expect(output).not.toContain('undefined');
  });
});
