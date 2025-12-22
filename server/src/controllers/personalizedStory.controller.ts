import { Request, Response } from "express";
import { getApprovedStoryTemplate } from "../services/template.service";
import { personalizeTemplate } from "../services/personalization.service";
import { firestore } from "../config/firebase";

export async function createPersonalizedStory(
  req: Request,
  res: Response
) {
  try {
    const { templateId, childName, gender } = req.body;

    if (!templateId || !childName || !gender) {
      return res.status(400).json({
        success: false,
        message: "templateId, childName and gender are required",
      });
    }

    // 1️⃣ Fetch approved template
    const template = await getApprovedStoryTemplate(templateId);

    // 2️⃣ Personalize content
    const personalized = personalizeTemplate(template, {
      name: childName,
      gender,
    });

    // 3️⃣ Save to Firestore
    const docRef = await firestore
      .collection("personalized_stories")
      .add({
        templateId,
        child: {
          name: childName,
          gender,
        },
        ...personalized,
        createdAt: new Date(),
      });

    // 4️⃣ Return story ID
    res.json({
      success: true,
      personalizedStoryId: docRef.id,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}
