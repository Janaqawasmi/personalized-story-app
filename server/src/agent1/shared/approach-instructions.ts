import { FEAR_ANXIETY_APPROACHES, type FearAnxietyApproach } from '@/models/storyBrief.model';

const APPROACH_INSTRUCTIONS: Record<(typeof FEAR_ANXIETY_APPROACHES)[number], string> = {
  normalization: `The story world treats the fear as unremarkable. Other characters (peers, animals, even the environment) reveal that they have experienced the same thing. The protagonist discovers they are not the only one. The narrative never explicitly says "this is normal" — it demonstrates it through the story world.`,

  cognitive_reframing: `The protagonist encounters information, a perspective, or an experience that changes the meaning of the feared situation. The fear doesn't disappear — the protagonist's interpretation of it shifts. Example: the strict teacher is revealed to be worried about the children's safety, not angry at them. The reframe must emerge from the story, never from a lecture or explanation.`,

  graduated_exposure: `The protagonist faces the feared situation in increments. First a small version, then a slightly bigger version. Each step is uncomfortable but survivable. The story shows that the feared consequence does not happen — or is less bad than expected. The caregiver or supporting character may encourage but does not do it for the protagonist.`,

  modeling: `A supporting character (or the protagonist observing another character) demonstrates coping with the same or similar fear. The protagonist watches, learns, and then tries it themselves. The model character should show effort, not effortlessness — coping is hard and the model character shows it is possible, not easy.`,

  reassurance_predictability: `The story world has structure and repetition. Events follow a predictable sequence. Trusted characters behave consistently. The protagonist discovers that the world has patterns they can rely on. The coping comes primarily from external stability and the reliable behavior of trusted characters. However, the story must include at least one moment where the protagonist notices the pattern themselves — recognizing the predictability rather than only receiving it. This seeds internal capacity without requiring the protagonist to self-regulate.`,

  self_regulation: `The protagonist learns to use an internal resource (the coping tool) to shift their own emotional state. No one rescues them. The story shows the protagonist noticing their own state, making a choice, applying the tool, and experiencing a shift. The emphasis is on agency and internal capacity.`,

  psychoeducation: `The protagonist (or a trusted character) names the feeling or the body's response in simple, age-appropriate language embedded in the story's natural flow. This is not a lecture or a lesson — it is a moment of recognition where the experience is given a name or an explanation that makes it less frightening. Example: "That's your worry feeling," said the bear. "It comes when something is new. It doesn't mean something bad is happening — it means your body is paying extra attention." The explanation must emerge from a character's voice or the protagonist's discovery, never from narrator exposition. For ages 3–5, the naming should be concrete and physical ("your tummy does that when it's worried"). For ages 7+, it can include simple cause-and-effect ("when your brain thinks something might be scary, it sends a signal to your body to get ready").`,
};

export function getApproachInstruction(approach: FearAnxietyApproach): string {
  return APPROACH_INSTRUCTIONS[approach];
}
