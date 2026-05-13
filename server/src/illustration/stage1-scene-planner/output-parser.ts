import type { SceneDirection } from "@/illustration/types";

export interface ParsedScenePlan {
  title: string;
  prose: string;
  emotionalIntent: string;
  keyVisibleDetail: string;
  director: SceneDirection;
}

export class ScenePlanParseError extends Error {
  readonly rawText: string;

  constructor(message: string, rawText: string) {
    super(message);
    this.name = "ScenePlanParseError";
    this.rawText = rawText;
  }
}

function readDirector(o: Record<string, unknown>): SceneDirection {
  const d = o.director;
  if (!d || typeof d !== "object") {
    return {
      moment: "",
      cameraSpec: "",
      lightingChoice: "",
      visualHook: "",
      keyPhysicalDetail: "",
    };
  }
  const r = d as Record<string, unknown>;
  return {
    moment: String(r.moment ?? ""),
    cameraSpec: String(r.cameraSpec ?? ""),
    lightingChoice: String(r.lightingChoice ?? ""),
    visualHook: String(r.visualHook ?? ""),
    keyPhysicalDetail: String(r.keyPhysicalDetail ?? ""),
  };
}

export function parseScenePlanOutput(raw: string): ParsedScenePlan {
  const trimmed = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new ScenePlanParseError("Response was not valid JSON", raw);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new ScenePlanParseError("JSON root must be an object", raw);
  }
  const o = parsed as Record<string, unknown>;
  return {
    title: String(o.title ?? ""),
    prose: String(o.prose ?? ""),
    emotionalIntent: String(o.emotionalIntent ?? ""),
    keyVisibleDetail: String(o.keyVisibleDetail ?? ""),
    director: readDirector(o),
  };
}
