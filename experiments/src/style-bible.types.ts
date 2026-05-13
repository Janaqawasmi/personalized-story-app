/**
 * Style Bible — the exp-04 upgrade of VisualBible.
 * Follows the children's-book-illustrator skill framework.
 * Lives in experiments/ until proven; migrate to src/models/ if adopted.
 */

/** Spatial + atmospheric description of one setting. */
export interface EnvironmentEntry {
  /** One sentence: feeling, light quality, visual tone of this space. */
  atmosphere: string;
  /**
   * One sentence: fixed positions of every key prop/furniture using wall
   * references (back wall, left wall, right corner, centre of floor).
   * This is the spatial contract every illustration must respect.
   */
  spatialLayout: string;
}

/** The five structured sections Claude generates per page. */
export interface ScenePromptSections {
  /**
   * "<registry key> | <time/light state> | <2–3 props from spatialLayout
   *  with positions>"
   */
  setting: string;
  /**
   * "<surface/furniture the character is on/in> | <body language:
   *  limb positions, posture, gaze — no emotion words>"
   */
  character: string;
  /** One element the viewer's eye lands on first. */
  focalPoint: string;
  /** "<framing> | <angle> | <foreground>/<midground>/<background>" */
  composition: string;
  /**
   * "<light source + position> | <quality> | <what it illuminates> |
   *  <what it leaves in shadow> | mood: <one word>"
   */
  lighting: string;
}

export interface StyleBible {
  /** Full 5–7 sentence character description (for reference, not embedded verbatim). */
  characterSheet: string;
  /**
   * Compact 1–2 sentence visual identifier extracted from characterSheet.
   * THIS is embedded in every image prompt.
   */
  characterAnchor: string;
  /** Art medium, line quality, colour treatment, level of stylisation, mood. */
  styleGuide: string;
  /** 3–5 short phrases (5–10 words each) repeated verbatim in every prompt. */
  consistencyAnchors: string[];
  environmentRegistry: Record<string, EnvironmentEntry>;
  /** Comma-separated colour names (compact — no role descriptions). */
  palette: string;
  /** 5–8 specific things that must never appear. Embedded as "Avoid: …" */
  avoidList: string[];
  generatedAt: number;
}
