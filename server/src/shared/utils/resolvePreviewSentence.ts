const TOPIC_SENTENCES: Array<{
  keywords: string[];
  sentence: string;
}> = [
  {
    keywords: ["anxiety", "calm", "worry", "separation"],
    sentence: "{{CHILD_NAME}} took a deep breath, and slowly, the worry began to lift.",
  },
  {
    keywords: ["fear", "dark", "scared", "fright"],
    sentence: "{{CHILD_NAME}} looked into the dark and decided — tonight, she wasn't afraid.",
  },
  {
    keywords: ["confidence", "self_confidence", "self-esteem", "brave", "kindergarten"],
    sentence: "Everyone in the village knew that {{CHILD_NAME}} could do anything she tried.",
  },
  {
    keywords: ["grief", "loss", "sadness", "sad", "missing"],
    sentence: "{{CHILD_NAME}} sat quietly and remembered, and that felt like enough for now.",
  },
  {
    keywords: ["change", "transition", "new_beginning", "new_sibling", "sibling", "baby"],
    sentence:
      "{{CHILD_NAME}} had never been somewhere new before — but here she was, and it was okay.",
  },
  {
    keywords: ["anger", "emotion", "feeling", "mad"],
    sentence: "When {{CHILD_NAME}} felt the heat rise inside, she found a way to let it go.",
  },
  {
    keywords: ["friend", "social", "lonely", "belong"],
    sentence: "{{CHILD_NAME}} wasn't sure anyone would notice her — until someone finally did.",
  },
  {
    keywords: ["family", "parent", "sibling", "home", "table"],
    sentence: "{{CHILD_NAME}} looked around the table and thought — this, right here, is everything.",
  },
  {
    keywords: ["bedtime", "sleep", "night", "dream"],
    sentence: "As {{CHILD_NAME}} closed her eyes, the whole world became soft and still.",
  },
];

export const UNIVERSAL_FALLBACK =
  "{{CHILD_NAME}} looked up and smiled — this story had been waiting just for her.";

/**
 * Given a raw topic string from Firestore (e.g. "fear_anxiety",
 * "family_changes", "self_confidence"), returns the best matching
 * preview sentence with the {{CHILD_NAME}} token.
 * Falls back to UNIVERSAL_FALLBACK if no keyword matches.
 */
export function resolvePreviewSentence(topic: string): string {
  if (!topic) return UNIVERSAL_FALLBACK;

  const lower = topic.toLowerCase();
  const segments = lower.split(/[_\-\s]+/).filter(Boolean);

  for (const { keywords, sentence } of TOPIC_SENTENCES) {
    const matches = keywords.some(
      (kw) =>
        segments.includes(kw) ||
        segments.some((seg) => seg.includes(kw)) ||
        lower.includes(kw)
    );
    if (matches) return sentence;
  }

  return UNIVERSAL_FALLBACK;
}

/**
 * Resolves preview sentence using `topic`, `primaryTopic`, `specificSituation`, and `topicKey`
 * (first non-universal wins, then combined string, else universal).
 */
export function resolvePreviewSentenceForTemplate(data: Record<string, unknown>): string {
  const candidates: string[] = [];
  for (const key of ["topic", "primaryTopic", "specificSituation", "topicKey"] as const) {
    const v = data[key];
    if (typeof v === "string" && v.trim()) candidates.push(v.trim());
  }

  for (const c of candidates) {
    const s = resolvePreviewSentence(c);
    if (s !== UNIVERSAL_FALLBACK) return s;
  }

  if (candidates.length > 0) {
    return resolvePreviewSentence(candidates.join(" "));
  }

  return UNIVERSAL_FALLBACK;
}
