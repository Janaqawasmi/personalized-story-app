import { getApproachInstruction } from '@/agent1/shared/approach-instructions';
import { FEAR_ANXIETY_APPROACHES } from '@/models/storyBrief.model';

describe('getApproachInstruction', () => {
  it('returns non-empty string for every approach', () => {
    for (const approach of FEAR_ANXIETY_APPROACHES) {
      const result = getApproachInstruction(approach);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it('normalization contains distinctive phrase', () => {
    expect(getApproachInstruction('normalization')).toContain('treats the fear as unremarkable');
  });

  it('cognitive_reframing contains distinctive phrase', () => {
    expect(getApproachInstruction('cognitive_reframing')).toContain(
      "the protagonist's interpretation of it shifts",
    );
  });

  it('graduated_exposure contains distinctive phrase', () => {
    expect(getApproachInstruction('graduated_exposure')).toContain('faces the feared situation in increments');
  });

  it('modeling contains distinctive phrase', () => {
    expect(getApproachInstruction('modeling')).toContain('show effort, not effortlessness');
  });

  it('reassurance_predictability contains distinctive phrase', () => {
    expect(getApproachInstruction('reassurance_predictability')).toContain(
      'recognizing the predictability rather than only receiving it',
    );
  });

  it('self_regulation contains distinctive phrase', () => {
    expect(getApproachInstruction('self_regulation')).toContain('agency and internal capacity');
  });

  it('psychoeducation contains distinctive phrase', () => {
    expect(getApproachInstruction('psychoeducation')).toContain('never from narrator exposition');
  });

  it('each approach returns a different string', () => {
    const approaches = FEAR_ANXIETY_APPROACHES;
    for (let i = 0; i < approaches.length; i++) {
      for (let j = i + 1; j < approaches.length; j++) {
        expect(getApproachInstruction(approaches[i]!)).not.toBe(getApproachInstruction(approaches[j]!));
      }
    }
  });

  it('no output contains the literal word "undefined"', () => {
    for (const approach of FEAR_ANXIETY_APPROACHES) {
      expect(getApproachInstruction(approach)).not.toContain('undefined');
    }
  });

  it('no output contains "Psychologist-facing"', () => {
    for (const approach of FEAR_ANXIETY_APPROACHES) {
      expect(getApproachInstruction(approach)).not.toContain('Psychologist-facing');
    }
  });
});
