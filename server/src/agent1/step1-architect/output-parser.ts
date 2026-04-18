import type {
  BlueprintPoint,
  CompressionMetadata,
  ContradictionFlag,
  InferredIntention,
  LLMCallRecord,
  Step1Output,
} from '@/agent1/types';

// ─── Header markers ───────────────────────────────────────────────────
// The parser is permissive about whitespace and formatting, but strict
// about required sections. Each header is matched case-insensitively,
// allowing optional leading whitespace, markdown decorators (#, *), and
// numeric prefixes (e.g. "1. EMOTIONAL TRUTH").
const HEADERS = [
  'EMOTIONAL TRUTH',
  'NARRATIVE BLUEPRINT',
  'COPING TOOL PLACEMENT NOTE',
  'APPROACH INSTRUCTION',
  'INFERRED INTENTION FLAG',
  'COMPRESSION METADATA',
] as const;

type HeaderName = (typeof HEADERS)[number];

interface HeaderMatch {
  header: HeaderName;
  start: number;
  headerEnd: number;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findHeader(
  text: string,
  header: HeaderName,
): { start: number; headerEnd: number } | null {
  const escaped = escapeRegex(header);
  const re = new RegExp(
    `(?:^|\\n)[ \\t]*(?:[#*]+[ \\t]*)?(?:\\d+[.)][ \\t]*)?${escaped}\\b[^\\n]*`,
    'i',
  );
  const match = re.exec(text);
  if (!match) return null;
  const leadingNewline = match[0].startsWith('\n');
  const start = match.index + (leadingNewline ? 1 : 0);
  const headerEnd = match.index + match[0].length;
  return { start, headerEnd };
}

function getHeaderMatches(text: string): HeaderMatch[] {
  const results: HeaderMatch[] = [];
  for (const header of HEADERS) {
    const m = findHeader(text, header);
    if (m) {
      results.push({ header, start: m.start, headerEnd: m.headerEnd });
    }
  }
  results.sort((a, b) => a.start - b.start);
  return results;
}

function extractSection(text: string, header: HeaderName): string | null {
  const matches = getHeaderMatches(text);
  const idx = matches.findIndex((m) => m.header === header);
  if (idx === -1) return null;
  const cur = matches[idx]!;
  const next = matches[idx + 1];
  const endPos = next ? next.start : text.length;
  return text.slice(cur.headerEnd, endPos).trim();
}

function parseBlueprintPoints(text: string): BlueprintPoint[] {
  const extracted = new Map<number, string>();

  // Line-start markers for blueprint points: "Point N — …", "Point N: …",
  // "N." / "N)", optionally wrapped in ** (e.g. "**1.** …").
  const pointWithDashOrHyphen =
    /(?:^|\n)[ \t]*\*{0,2}Point\s+(\d+)\s*[—\-][^\n]*/g;
  const pointWithColon =
    /(?:^|\n)[ \t]*\*{0,2}Point\s+(\d+)\s*\*{0,2}\s*:\s*[^\n]*/g;
  const numbered =
    /(?:^|\n)[ \t]*\*{0,2}(\d+)[.)]\s*\*{0,2}[ \t]*/g;

  const markers: Array<{
    num: number;
    contentStart: number;
    matchStart: number;
  }> = [];

  function collectWith(re: RegExp): void {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const num = parseInt(m[1]!, 10);
      if (num < 1 || num > 6) continue;
      const leadingNewline = m[0].startsWith('\n');
      markers.push({
        num,
        contentStart: m.index + m[0].length,
        matchStart: m.index + (leadingNewline ? 1 : 0),
      });
    }
  }

  collectWith(pointWithDashOrHyphen);
  collectWith(pointWithColon);
  collectWith(numbered);

  markers.sort((a, b) => a.matchStart - b.matchStart);

  for (let i = 0; i < markers.length; i++) {
    const cur = markers[i]!;
    const next = markers[i + 1];
    const end = next ? next.matchStart : text.length;
    const content = text.slice(cur.contentStart, end).trim();
    if (!extracted.has(cur.num)) {
      extracted.set(cur.num, content);
    }
  }

  const indices: Array<1 | 2 | 3 | 4 | 5 | 6> = [1, 2, 3, 4, 5, 6];
  let missingOrEmpty = 0;
  const points: BlueprintPoint[] = indices.map((index) => {
    const t = extracted.get(index);
    if (t === undefined || t.length === 0) missingOrEmpty++;
    return { index, text: t ?? '' };
  });

  if (missingOrEmpty > 0) {
    console.warn(
      `[step1-architect/output-parser] Narrative blueprint has ${missingOrEmpty} missing or empty point(s). Expected 6.`,
    );
  }

  return points;
}

function parseInferredIntention(text: string): InferredIntention {
  const trimmed = text.trim();
  const match = trimmed.match(/^([\s\S]*?)\bbecause\b([\s\S]*)$/i);
  if (match && match[1] !== undefined && match[2] !== undefined) {
    const feel = match[1].trim();
    const because = match[2].trim();
    if (feel.length > 0 && because.length > 0) {
      return { feel, because, reason: trimmed };
    }
  }
  return { feel: trimmed, because: trimmed, reason: trimmed };
}

function splitItems(raw: string): string[] {
  const source = raw.trim();
  if (source.length === 0) return [];

  const byLines = source
    .split(/\r?\n+/)
    .map((s) => s.replace(/^[\s\u2022•\-\*]+/, '').trim())
    .filter((s) => s.length > 0);

  if (byLines.length > 1) return byLines;

  const byCommas = source
    .split(/,(?![^()]*\))/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (byCommas.length > 1) return byCommas;

  return [source];
}

function parseCompressionMetadata(text: string): CompressionMetadata {
  const lowered = text.toLowerCase();

  const findFirst = (re: RegExp): number => {
    const m = re.exec(lowered);
    return m ? m.index : -1;
  };

  const fullyIdx = findFirst(/\bfully\s+included\b|\bincluded\b/);
  const compressedIdx = findFirst(/\bcompressed\b/);
  const omittedIdx = findFirst(/\bomitted\b/);

  type Kind = 'fully' | 'comp' | 'omit';
  const markers: Array<{ kind: Kind; idx: number }> = [];
  if (fullyIdx >= 0) markers.push({ kind: 'fully', idx: fullyIdx });
  if (compressedIdx >= 0) markers.push({ kind: 'comp', idx: compressedIdx });
  if (omittedIdx >= 0) markers.push({ kind: 'omit', idx: omittedIdx });

  if (markers.length === 0) {
    return { fullyIncluded: [text.trim()], compressed: [], omitted: [] };
  }

  markers.sort((a, b) => a.idx - b.idx);

  const segments: Record<Kind, string> = { fully: '', comp: '', omit: '' };
  for (let i = 0; i < markers.length; i++) {
    const cur = markers[i]!;
    const next = markers[i + 1];
    const endIdx = next ? next.idx : text.length;
    let seg = text.slice(cur.idx, endIdx);
    const colonIdx = seg.indexOf(':');
    if (colonIdx >= 0 && colonIdx < 40) {
      seg = seg.slice(colonIdx + 1);
    }
    segments[cur.kind] = seg.trim();
  }

  const fullyIncluded = splitItems(segments.fully);
  const compressed = splitItems(segments.comp).map((s) => ({
    obligation: s,
    how: s,
  }));
  const omitted = splitItems(segments.omit).map((s) => ({
    obligation: s,
    why: s,
  }));

  return { fullyIncluded, compressed, omitted };
}

function parseCharacterNotesContradictions(
  rawResponse: string,
): ContradictionFlag[] | undefined {
  if (!/contradict/i.test(rawResponse)) return undefined;

  const sentences = rawResponse
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const matched =
    sentences.find((s) => /contradict/i.test(s)) ?? rawResponse.trim();

  return [
    {
      contradictedField: 'character_notes',
      contradictingPhrase: matched,
      resolution: 'structured field used',
    },
  ];
}

export function parseStep1Response(
  rawResponse: string,
  llmCallRecord: LLMCallRecord,
  promptHash: string,
): Step1Output {
  const emotionalTruth = extractSection(rawResponse, 'EMOTIONAL TRUTH');
  if (emotionalTruth === null) {
    throw new Error(
      "Step 1 output parse failure: missing 'EMOTIONAL TRUTH' section header.",
    );
  }

  if (!/by the end, this child needs to feel/i.test(emotionalTruth)) {
    console.warn(
      "[step1-architect/output-parser] Emotional truth is missing the required ending sentence ('By the end, this child needs to feel ___.'). Accepting output but flagging.",
    );
  }

  const blueprintSection = extractSection(rawResponse, 'NARRATIVE BLUEPRINT');
  const blueprint = parseBlueprintPoints(blueprintSection ?? '');

  const copingToolPlacement =
    extractSection(rawResponse, 'COPING TOOL PLACEMENT NOTE') ?? '';
  const approachInstruction =
    extractSection(rawResponse, 'APPROACH INSTRUCTION') ?? '';

  const inferredIntentionSection = extractSection(
    rawResponse,
    'INFERRED INTENTION FLAG',
  );
  const inferredIntention =
    inferredIntentionSection !== null
      ? parseInferredIntention(inferredIntentionSection)
      : undefined;

  const compressionSection = extractSection(rawResponse, 'COMPRESSION METADATA');
  const compressionMetadata =
    compressionSection !== null
      ? parseCompressionMetadata(compressionSection)
      : undefined;

  const characterNotesContradictions =
    parseCharacterNotesContradictions(rawResponse);

  return {
    emotionalTruth,
    blueprint,
    copingToolPlacement,
    approachInstruction,
    ...(inferredIntention !== undefined ? { inferredIntention } : {}),
    ...(compressionMetadata !== undefined ? { compressionMetadata } : {}),
    ...(characterNotesContradictions !== undefined
      ? { characterNotesContradictions }
      : {}),
    rawResponse,
    promptHash,
    llmCallRecord,
  };
}
