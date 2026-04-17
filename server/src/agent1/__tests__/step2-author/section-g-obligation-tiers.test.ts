import { buildStep2SectionG } from '@/agent1/step2-author/prompt-sections/section-g-obligation-tiers';
import type { CompressionMetadata } from '@/agent1/types';

describe('buildStep2SectionG', () => {
  it('omits SPACE CONSTRAINTS without compression metadata but includes PRIORITY TIERS', () => {
    const out = buildStep2SectionG(undefined);
    expect(out).not.toContain('SPACE CONSTRAINTS');
    expect(out).toContain('PRIORITY TIERS');
  });

  it('includes SPACE CONSTRAINTS, Honor these decisions, and PRIORITY TIERS when metadata is set', () => {
    const meta: CompressionMetadata = {
      fullyIncluded: ['a'],
      compressed: [],
      omitted: [],
    };
    const out = buildStep2SectionG(meta);
    expect(out).toContain('SPACE CONSTRAINTS');
    expect(out).toContain('Honor these decisions');
    expect(out).toContain('PRIORITY TIERS');
  });

  it('lists fully included, compressed obligations, and omitted obligations', () => {
    const meta: CompressionMetadata = {
      fullyIncluded: ['trigger', 'resolution'],
      compressed: [
        { obligation: 'arc', how: 'shorten beats' },
        { obligation: 'caregiver', how: 'one scene' },
      ],
      omitted: [{ obligation: 'second somatic', why: 'word budget' }],
    };
    const out = buildStep2SectionG(meta);
    expect(out).toContain('trigger, resolution');
    expect(out).toContain('arc: shorten beats');
    expect(out).toContain('caregiver: one scene');
    expect(out).toContain('second somatic: word budget');
  });

  it('contains Never flatten a Tier 1 element', () => {
    expect(buildStep2SectionG(undefined)).toContain(
      'Never flatten a Tier 1 element for a Tier 3 element',
    );
  });

  it('Tier 3 mentions first character\'s functional role', () => {
    expect(buildStep2SectionG(undefined)).toContain(
      "first character's functional role",
    );
  });

  it('Tier 4 mentions second character\'s functional role', () => {
    expect(buildStep2SectionG(undefined)).toContain(
      "second character's functional role",
    );
  });

  it('never contains the literal undefined', () => {
    expect(buildStep2SectionG(undefined)).not.toContain('undefined');
    const meta: CompressionMetadata = {
      fullyIncluded: ['x'],
      compressed: [{ obligation: 'o', how: 'h' }],
      omitted: [{ obligation: 'o2', why: 'w' }],
    };
    expect(buildStep2SectionG(meta)).not.toContain('undefined');
  });
});
