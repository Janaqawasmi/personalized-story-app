import { db } from "../config/firebase";

export async function getApprovedStoryTemplate(templateId: string) {
  const docRef = db.collection("approved_story_templates").doc(templateId);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    throw new Error("Story template not found");
  }

  const data = snapshot.data();

  if (data?.status !== "approved") {
    throw new Error("Story template is not approved");
  }

  return {
    id: snapshot.id,
    ...data,
  };
}
