import { AGE_RANGES, type AgeRange } from '@/models/storyBrief.model';

type AgeRangeFromModel = (typeof AGE_RANGES)[number];

const AGE_RANGE_RULES: Record<AgeRangeFromModel, string> = {
  '3-5': `Vocabulary: Concrete, physical, sensory words. No emotional abstraction. "Scared" not "anxious." "Tummy felt funny" not "a wave of nausea."
Emotional pacing: Fast return to safety. The dark moment is brief — 1–2 pages at most. Reassurance arrives quickly.
Coping tool presentation: Shown as a physical action. The rabbit takes three big breaths. The bear squeezes his special stone. Never verbal self-talk or internal monologue.
Narrative complexity: Strictly linear. One character, one problem, one resolution. No subplots, no flashbacks, no parallel threads.
Caregiver role: Almost always present or returning. Stories where the protagonist is fully alone for extended periods are inappropriate for this age.
Repetition: Use rhythmic repetition — repeated phrases, predictable patterns. This is soothing and aids comprehension.`,
  '5-7': `Vocabulary: Still concrete but can include simple emotional words. "Worried" is acceptable. "Overwhelmed" is not.
Emotional pacing: Moderate. The dark moment can be sustained for 2–3 pages. The child can hold mild discomfort.
Coping tool presentation: Can be shown as a deliberate choice the character makes. "She decided to count the blue things she could see." Simple internal narration is acceptable.
Narrative complexity: Linear with one minor complication allowed. A friend who has the same problem. A first attempt that doesn't fully work.
Caregiver role: Can be less present. "Waiting at the end" works well. "Not present" is possible if a supporting adult character exists.`,
  '7-9': `Vocabulary: Emotional vocabulary expands. "Anxious," "embarrassed," "frustrated" are appropriate. Can use simile: "it felt like a rock in her chest."
Emotional pacing: Can sustain tension across multiple scenes. The resolution can be gradual rather than sudden.
Coping tool presentation: Can include internal process. "He reminded himself that the last time felt scary too, and he got through it." Visualization and self-talk are shown naturally.
Narrative complexity: Can handle secondary character arcs, a brief flashback, or a moment of reflection. Two-scene structure (attempt → setback → new attempt) works well.
Caregiver role: Protagonist can be independent. Caregiver presence is a design choice, not a developmental necessity.`,
  '9-12': `Vocabulary: Full emotional range. "She felt the weight of everyone's expectations." Abstract emotional concepts are accessible.
Emotional pacing: Can sustain extended tension. The dark moment can be the emotional center of the story. Resolution unfolds over multiple pages.
Coping tool presentation: Can show full internal process — recognition, choice, effort, partial success. The tool can be shown failing the first time and working the second.
Narrative complexity: Subplots, secondary character perspectives, non-linear moments (flashback to a previous success or failure), and thematic layering are all appropriate.
Caregiver role: Fully optional. The protagonist's journey can be entirely self-directed. Caregiver presence, when chosen, represents a thematic choice rather than a safety need.`,
};

export function getAgeRangeRules(age: AgeRange): string {
  return AGE_RANGE_RULES[age];
}
