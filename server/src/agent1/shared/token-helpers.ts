import {
  FEAR_ANXIETY_COPING_TOOLS,
  SUPPORTING_CHARACTER_TYPES,
  type CopingTool,
  type SomaticExpressionField,
  type SupportingCharacterType,
  type TypeSpecificClinicalField,
} from '@/models/storyBrief.model';
import { TypeMismatchError } from '@/agent1/types';

export const RELATIONAL_COPING_TOOLS = [
  'asking_for_help',
  'safe_person',
] as const satisfies readonly CopingTool[];

export const ABSTRACT_COPING_TOOLS = [
  'routine_awareness',
  'visualization',
  'positive_self_talk',
] as const satisfies readonly CopingTool[];

export const RESPONDING_CHARACTER_TYPES = [
  'teacher_adult_guides',
  'peer_shows_possible',
] as const satisfies readonly SupportingCharacterType[];

const relationalCopingToolSet = new Set<string>(RELATIONAL_COPING_TOOLS);
const abstractCopingToolSet = new Set<string>(ABSTRACT_COPING_TOOLS);
const respondingCharacterTypeSet = new Set<string>(RESPONDING_CHARACTER_TYPES);

// Keep imports runtime-bound so this module stays aligned with model enums.
void FEAR_ANXIETY_COPING_TOOLS;
void SUPPORTING_CHARACTER_TYPES;

/**
 * Per v3.2 §1 "Scope: Fear & Anxiety stories (pilot)", the only
 * supported `TypeSpecificClinicalField.fieldType` is
 * `"somatic_expression"`. This assertion narrows the discriminated
 * union at runtime so Step 1 and Step 2 prompt sections can access
 * `somatic.selections` and `somatic.freeText` safely.
 */
export function assertSomaticField(
  field: TypeSpecificClinicalField,
): SomaticExpressionField {
  if (field.fieldType === 'somatic_expression') {
    return field;
  }
  throw new TypeMismatchError(field.fieldType);
}

/** Returns true if the input is a relational coping tool token. */
export function isRelationalCopingTool(
  tool: unknown,
): tool is 'asking_for_help' | 'safe_person' {
  return typeof tool === 'string' && relationalCopingToolSet.has(tool);
}

/** Returns true if the input is an abstract coping tool token. */
export function isAbstractCopingTool(
  tool: unknown,
): tool is 'routine_awareness' | 'visualization' | 'positive_self_talk' {
  return typeof tool === 'string' && abstractCopingToolSet.has(tool);
}

/** Returns true if the character type can provide direct response support. */
export function canRespondCharacterType(
  type: unknown,
): type is 'teacher_adult_guides' | 'peer_shows_possible' {
  return typeof type === 'string' && respondingCharacterTypeSet.has(type);
}

