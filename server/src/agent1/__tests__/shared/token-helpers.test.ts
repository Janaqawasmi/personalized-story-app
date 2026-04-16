import {
  FEAR_ANXIETY_COPING_TOOLS,
  SUPPORTING_CHARACTER_TYPES,
  type TypeSpecificClinicalField,
} from '@/models/storyBrief.model';
import { TypeMismatchError } from '@/agent1/types';
import {
  ABSTRACT_COPING_TOOLS,
  RELATIONAL_COPING_TOOLS,
  RESPONDING_CHARACTER_TYPES,
  assertSomaticField,
  canRespondCharacterType,
  isAbstractCopingTool,
  isRelationalCopingTool,
} from '@/agent1/shared/token-helpers';

describe('assertSomaticField', () => {
  it('returns the same field reference for somatic_expression', () => {
    const field: TypeSpecificClinicalField = {
      fieldType: 'somatic_expression',
      selections: ['freezing_going_still'],
      freeText: 'shaky hands',
    };

    expect(assertSomaticField(field)).toBe(field);
  });

  it('throws TypeMismatchError for emotion_appearance', () => {
    const field: TypeSpecificClinicalField = {
      fieldType: 'emotion_appearance',
      text: 'Looks upset and cries.',
    };

    expect(() => assertSomaticField(field)).toThrow(TypeMismatchError);
    expect(() => assertSomaticField(field)).toThrow(/emotion_appearance/);
  });

  it('throws TypeMismatchError for grief_process', () => {
    const field: TypeSpecificClinicalField = {
      fieldType: 'grief_process',
      selection: 'denial',
    };

    expect(() => assertSomaticField(field)).toThrow(TypeMismatchError);
    expect(() => assertSomaticField(field)).toThrow(/grief_process/);
  });

  it('error message includes actual fieldType value', () => {
    const field: TypeSpecificClinicalField = {
      fieldType: 'negative_self_belief',
      text: 'I am not good enough.',
    };

    try {
      assertSomaticField(field);
      throw new Error('Expected assertSomaticField to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(TypeMismatchError);
      expect((error as Error).message).toContain('negative_self_belief');
    }
  });
});

describe('isRelationalCopingTool', () => {
  const relationalSet = new Set<string>(RELATIONAL_COPING_TOOLS);

  it.each(FEAR_ANXIETY_COPING_TOOLS)(
    'matches subset membership for "%s"',
    (value) => {
      expect(isRelationalCopingTool(value)).toBe(relationalSet.has(value));
    },
  );

  it('returns false for undefined', () => {
    expect(isRelationalCopingTool(undefined)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isRelationalCopingTool(null)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isRelationalCopingTool('')).toBe(false);
  });

  it('returns false for unknown token', () => {
    expect(isRelationalCopingTool('not_a_token')).toBe(false);
  });

  it('returns false for non-string input', () => {
    expect(isRelationalCopingTool(42)).toBe(false);
  });
});

describe('isAbstractCopingTool', () => {
  const abstractSet = new Set<string>(ABSTRACT_COPING_TOOLS);

  it.each(FEAR_ANXIETY_COPING_TOOLS)(
    'matches subset membership for "%s"',
    (value) => {
      expect(isAbstractCopingTool(value)).toBe(abstractSet.has(value));
    },
  );

  it('returns false for undefined', () => {
    expect(isAbstractCopingTool(undefined)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isAbstractCopingTool(null)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isAbstractCopingTool('')).toBe(false);
  });

  it('returns false for unknown token', () => {
    expect(isAbstractCopingTool('not_a_token')).toBe(false);
  });

  it('returns false for non-string input', () => {
    expect(isAbstractCopingTool(42)).toBe(false);
  });
});

describe('canRespondCharacterType', () => {
  const respondingSet = new Set<string>(RESPONDING_CHARACTER_TYPES);

  it.each(SUPPORTING_CHARACTER_TYPES)(
    'matches subset membership for "%s"',
    (value) => {
      expect(canRespondCharacterType(value)).toBe(respondingSet.has(value));
    },
  );

  it('returns false for undefined', () => {
    expect(canRespondCharacterType(undefined)).toBe(false);
  });

  it('returns false for null', () => {
    expect(canRespondCharacterType(null)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(canRespondCharacterType('')).toBe(false);
  });

  it('returns false for unknown token', () => {
    expect(canRespondCharacterType('not_a_token')).toBe(false);
  });

  it('returns false for non-string input', () => {
    expect(canRespondCharacterType(42)).toBe(false);
  });
});

describe('subset invariants', () => {
  it('every relational coping tool exists in FEAR_ANXIETY_COPING_TOOLS', () => {
    for (const entry of RELATIONAL_COPING_TOOLS) {
      if (!FEAR_ANXIETY_COPING_TOOLS.includes(entry)) {
        throw new Error(`Missing coping tool in full enum: ${entry}`);
      }
    }
  });

  it('every abstract coping tool exists in FEAR_ANXIETY_COPING_TOOLS', () => {
    for (const entry of ABSTRACT_COPING_TOOLS) {
      if (!FEAR_ANXIETY_COPING_TOOLS.includes(entry)) {
        throw new Error(`Missing coping tool in full enum: ${entry}`);
      }
    }
  });

  it('every responding character type exists in SUPPORTING_CHARACTER_TYPES', () => {
    for (const entry of RESPONDING_CHARACTER_TYPES) {
      if (!SUPPORTING_CHARACTER_TYPES.includes(entry)) {
        throw new Error(`Missing character type in full enum: ${entry}`);
      }
    }
  });
});

describe('disjointness sanity check', () => {
  it('relational and abstract coping tools are disjoint', () => {
    const abstractSet = new Set<string>(ABSTRACT_COPING_TOOLS);
    for (const entry of RELATIONAL_COPING_TOOLS) {
      expect(abstractSet.has(entry)).toBe(false);
    }
  });
});

