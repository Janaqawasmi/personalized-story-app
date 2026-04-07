import type { Request, Response } from "express";

import { runAgent1 } from "../agent1";
import { Agent1GenerateRequestSchema } from "../models/storyBrief.schema";

export async function postAgent1Generate(req: Request, res: Response): Promise<void> {
  const parsed = Agent1GenerateRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }
  try {
    const data = await runAgent1(parsed.data.brief);
    res.json({ success: true, data });
  } catch (err) {
    console.error("Agent 1 generation failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
}
