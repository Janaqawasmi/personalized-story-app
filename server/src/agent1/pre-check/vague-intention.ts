import type { TherapeuticIntention } from "@/models/storyBrief.model";
import type { VagueIntentionResult } from "@/agent1/types";

const VAGUE_PATTERNS: readonly string[] = [
  "they can be brave",
  "everything will be okay",
  "it will be fine",
  "it will be alright",
  "there's nothing to be scared of",
  "nothing to worry about",
  "they are safe",
  "they are loved",
  "they can do it",
  "they can handle it",
  "it's not that bad",
  "it's not so scary",
  "feel better",
];

const STOP_WORDS: ReadonlySet<string> = new Set([
  "a",
  "an",
  "the",
  "is",
  "it",
  "be",
  "to",
  "of",
  "in",
  "on",
  "and",
  "or",
  "but",
  "for",
  "not",
  "no",
  "so",
  "as",
  "at",
  "by",
  "if",
  "do",
  "my",
  "me",
  "we",
  "he",
  "she",
  "up",
  "all",
  "can",
  "has",
  "had",
  "was",
  "are",
  "its",
  "that",
  "this",
  "they",
  "them",
  "will",
  "with",
  "from",
  "been",
  "have",
  "than",
  "then",
  "very",
  "just",
  "also",
  "more",
  "when",
  "what",
  "some",
  "about",
  "into",
  "over",
]);

function hasConcreteNoun(secondHalfLower: string): boolean {
  const tokens = secondHalfLower.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    if (token.length > 4 && !STOP_WORDS.has(token)) {
      return true;
    }
  }
  return false;
}

export function checkVagueIntention(
  intention: TherapeuticIntention,
): VagueIntentionResult {
  const combined =
    intention.feel.trim().toLowerCase() +
    " because " +
    intention.because.trim().toLowerCase();

  for (const pattern of VAGUE_PATTERNS) {
    if (combined.includes(pattern)) {
      return { isVague: true, matchedPattern: pattern };
    }
  }

  const secondHalf = intention.because.trim();
  if (secondHalf.length < 30 && !hasConcreteNoun(secondHalf.toLowerCase())) {
    return {
      isVague: true,
      matchedPattern: "short_second_half_no_concrete_noun",
    };
  }

  return { isVague: false };
}
