/** Exact string required as `avoidList[0]` for Visual Bible output (spec §11.1 / phase-2-plan §5.1). */
export const MANDATED_VISUAL_BIBLE_NO_TEXT_AVOID =
  "text, letters, words, captions, labels, speech bubbles, logos of any kind";

export const VISUAL_DIRECTOR_MODEL = "claude-sonnet-4-6";
export const SCENE_PLANNER_MODEL = "claude-sonnet-4-6";

/** Stage 2 — Prompt Engineer (per-page structured prompt). */
export const PROMPT_ENGINEER_MODEL = "claude-haiku-4-5-20251001" as const;
