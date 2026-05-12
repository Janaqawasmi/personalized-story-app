/**
 * Style Bible types — production copy used by the per-scene pilot pipeline.
 *
 * Mirrors server/experiments/src/style-bible.types.ts. Pilot owns its own copy
 * so the experiments folder is free to evolve without breaking the production
 * server build (experiments are excluded from src/**\/*, so they cannot be
 * imported here).
 */

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
  setting: string;
  character: string;
  focalPoint: string;
  composition: string;
  lighting: string;
}

export interface StyleBible {
  /** Full 5–7 sentence character description (for reference, not embedded verbatim). */
  characterSheet: string;
  /** Compact 1–2 sentence visual identifier extracted from characterSheet. */
  characterAnchor: string;
  /** Art medium, line quality, colour treatment, level of stylisation, mood. */
  styleGuide: string;
  /** 3–5 short phrases (4–6 words each) repeated verbatim in every prompt. */
  consistencyAnchors: string[];
  environmentRegistry: Record<string, EnvironmentEntry>;
  /** Comma-separated colour names (compact — no role descriptions). */
  palette: string;
  /** 5–8 specific things that must never appear. Embedded as "Avoid: …" */
  avoidList: string[];
  /** ms since epoch */
  generatedAt: number;
}
