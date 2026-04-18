import type {
  LLMCallRecord,
  PostValidationFlag,
  PostValidationResult,
} from '@/agent1/types';

const DEFAULT_ALIGNMENT_NOTE = 'Alignment note not available.';

const CHECK_TYPE_BY_NUM: Record<
  1 | 2 | 3 | 4,
  PostValidationFlag['checkType']
> = {
  1: 'must_never',
  2: 'shame_handling',
  3: 'coping_tool',
  4: 'age_appropriateness',
};

function extractAlignmentSections(
  rawResponse: string,
): { constraintPortion: string; alignmentNote: string } {
  const marker = /ALIGNMENT NOTE/i;
  const match = marker.exec(rawResponse);
  if (!match || match.index === undefined) {
    return { constraintPortion: rawResponse, alignmentNote: '' };
  }

  let alignmentSection = rawResponse.slice(match.index);
  alignmentSection = alignmentSection.replace(/^[^\n]*\n/, '');
  const constraintPortion = rawResponse.slice(0, match.index);

  return {
    constraintPortion,
    alignmentNote: alignmentSection.trim(),
  };
}

function looksLikeFlagContent(constraint: string): boolean {
  return (
    /\bCheck\s*[1-4]\s*:/i.test(constraint) ||
    /\bMUST-NEVER\s*LIST\b/i.test(constraint) ||
    /\bSeverity\s*:/i.test(constraint)
  );
}

function shouldAttemptFlagParse(constraint: string): boolean {
  const hasPass = /\bPASS\b/i.test(constraint);
  const flagLike = looksLikeFlagContent(constraint);
  if (hasPass && !flagLike) return false;
  return true;
}

function mapSeverity(text: string): PostValidationFlag['severity'] {
  if (/likely violation/i.test(text)) return 'likely_violation';
  if (/borderline/i.test(text)) return 'borderline_specialist_review';
  return 'borderline_specialist_review';
}

function extractQuotedPassage(block: string): string | undefined {
  const m = block.match(/"([^"]+)"/);
  return m?.[1];
}

function firstFifteenWords(text: string): string {
  const words = text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .slice(0, 15);
  return words.join(' ');
}

function sliceCheckBlock(text: string, n: number): string | null {
  const startRe = new RegExp(`Check\\s*${n}\\s*:`, 'i');
  const startMatch = startRe.exec(text);
  if (!startMatch) return null;
  const startIdx = startMatch.index + startMatch[0].length;
  const tail = text.slice(startIdx);
  let endIdx = tail.length;
  for (let m = n + 1; m <= 4; m++) {
    const nextRe = new RegExp(`(^|\\n)\\s*Check\\s*${m}\\s*:`, 'i');
    const nm = nextRe.exec(tail);
    if (nm && nm.index != null && nm.index < endIdx) endIdx = nm.index;
  }
  const block = tail.slice(0, endIdx).trim();
  return block.length > 0 ? block : null;
}

function extractMustNeverRuleIndex(block: string): number {
  const ruleMatch = block.match(/rule\s*#?\s*(\d+)/i);
  if (!ruleMatch?.[1]) return 0;
  const n = Number(ruleMatch[1]);
  return Number.isFinite(n) ? Math.max(0, n - 1) : 0;
}

function buildFlagFromCheckBlock(
  block: string,
  checkNum: 1 | 2 | 3 | 4,
): PostValidationFlag | null {
  const checkType = CHECK_TYPE_BY_NUM[checkNum];

  let passage = extractQuotedPassage(block);
  if (passage === undefined) {
    passage = firstFifteenWords(block);
  }

  let reasoning = block;
  if (extractQuotedPassage(block) !== undefined) {
    reasoning = block.replace(/"[^"]+"/, ' ').trim();
  }
  reasoning = reasoning.replace(/\bSeverity\s*:.*$/ims, '').trim();

  const severity = mapSeverity(block);

  let constraintIdOrIndex: string | number =
    checkNum === 1 ? extractMustNeverRuleIndex(block) : String(checkNum);

  if (!passage && !reasoning) return null;
  if (!passage && reasoning.length === 0) return null;

  return {
    checkType,
    constraintIdOrIndex,
    passage: passage ?? '',
    reasoning,
    severity,
  };
}

function parseFlagsFromConstraint(constraint: string): PostValidationFlag[] {
  const flags: PostValidationFlag[] = [];
  for (const n of [1, 2, 3, 4] as const) {
    const block = sliceCheckBlock(constraint, n);
    if (!block) continue;
    const flag = buildFlagFromCheckBlock(block, n);
    if (flag) flags.push(flag);
  }
  return flags;
}

export function parsePostValidationResponse(
  rawResponse: string,
  llmCallRecord: LLMCallRecord,
  promptHash: string,
): PostValidationResult {
  const { constraintPortion, alignmentNote: rawAlignment } =
    extractAlignmentSections(rawResponse);

  let alignmentNote =
    rawAlignment.trim().length > 0 ? rawAlignment.trim() : DEFAULT_ALIGNMENT_NOTE;

  let flags: PostValidationFlag[] = [];
  if (shouldAttemptFlagParse(constraintPortion)) {
    flags = parseFlagsFromConstraint(constraintPortion);
  }

  const result: PostValidationResult['result'] =
    flags.length > 0 ? 'FLAGS' : 'PASS';

  return {
    result,
    flags,
    alignmentNote,
    rawResponse,
    promptHash,
    llmCallRecord,
  };
}
