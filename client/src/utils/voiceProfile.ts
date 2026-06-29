import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

export async function saveElevenLabsVoiceId(voiceId: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  await updateDoc(doc(db, "caregivers", uid), {
    elevenLabsVoiceId: voiceId,
  });
}

export async function getExistingVoiceId(): Promise<string | null> {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  const snap = await getDoc(doc(db, "caregivers", uid));
  const voiceId = snap.data()?.elevenLabsVoiceId;
  return typeof voiceId === "string" && voiceId.trim() ? voiceId : null;
}
