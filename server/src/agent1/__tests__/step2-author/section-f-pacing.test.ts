import { buildStep2SectionF } from '@/agent1/step2-author/prompt-sections/section-f-pacing';

describe('buildStep2SectionF', () => {
  it('returns a non-empty string', () => {
    expect(buildStep2SectionF().length).toBeGreaterThan(0);
  });

  it('contains emotional peak and the coping tool scene are the heart', () => {
    expect(buildStep2SectionF()).toContain(
      'emotional peak and the coping tool scene are the heart',
    );
  });

  it('contains difficulty must feel real before the shift feels earned', () => {
    expect(buildStep2SectionF()).toContain(
      'difficulty must feel real before the shift feels earned',
    );
  });

  it('returns identical output on consecutive calls', () => {
    const a = buildStep2SectionF();
    const b = buildStep2SectionF();
    expect(a).toBe(b);
  });
});
