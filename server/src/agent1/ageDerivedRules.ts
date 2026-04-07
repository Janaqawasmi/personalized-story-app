import type { AgeRange } from "../models/storyBrief.model";

/** Agent 1 spec v3 §10 — verbatim age-derived writing rules. */
export function getAgeDerivedRulesForAuthor(age: AgeRange): string {
  switch (age) {
    case "3-5":
      return `
### Ages 3–5
- Sentences: 5–10 words average, 15 max
- Vocabulary: concrete, physical, sensory. "Scared" not "anxious."
- Structure: strictly linear. No subplots, flashbacks, parallel threads.
- Coping tool: physical action only. Never verbal self-talk.
- Caregiver: almost always present or returning.
- Repetition: rhythmic, soothing.
`.trim();
    case "5-7":
      return `
### Ages 5–7
- Sentences: 8–15 words average, 20 max
- Vocabulary: concrete + simple emotional words. "Worried" ok. "Overwhelmed" no.
- Structure: linear, one minor complication allowed.
- Coping tool: deliberate choice. Simple internal narration ok.
- Caregiver: can be less present.
`.trim();
    case "7-9":
      return `
### Ages 7–9
- Sentences: 10–20 words average, varied for rhythm
- Vocabulary: expanded emotional. Simile ok.
- Structure: secondary arcs, brief flashback, attempt → setback → new attempt.
- Coping tool: internal process. Visualization and self-talk shown naturally.
- Caregiver: protagonist can be independent.
`.trim();
    case "9-12":
      return `
### Ages 9–12
- Sentences: full range, stylistic variation
- Vocabulary: full emotional range. Abstract concepts.
- Structure: subplots, secondary perspectives, non-linear, thematic layering.
- Coping tool: full process — recognition, choice, effort, partial success. Can fail then work.
- Caregiver: fully optional.
`.trim();
    default: {
      const _exhaustive: never = age;
      return _exhaustive;
    }
  }
}
