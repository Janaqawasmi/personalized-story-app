import { Request, Response } from "express";
import { getApprovedStoryTemplate } from "../services/template.service";

export async function getStoryTemplate(req: Request, res: Response) {
  try {
    const { templateId } = req.params;

    if (!templateId) {
      return res.status(400).json({ error: "templateId is required" });
    }

    const template = await getApprovedStoryTemplate(templateId);

    res.json({
      success: true,
      template,
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
}
