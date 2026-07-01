import { doc, getDoc } from "firebase/firestore";
import { API_BASE } from "../api/api";
import { auth, db } from "../firebase";

export type CaregiverVoiceProfile = {
  elevenLabsVoiceId: string | null;
  elevenLabsVoiceStatus: string | null;
};

async function getAuthToken(): Promise<string> {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  return user.getIdToken();
}

export async function getCaregiverVoiceProfile(): Promise<CaregiverVoiceProfile> {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    return { elevenLabsVoiceId: null, elevenLabsVoiceStatus: null };
  }
  const snap = await getDoc(doc(db, "caregivers", uid));
  const data = snap.data();
  const voiceId = data?.elevenLabsVoiceId;
  return {
    elevenLabsVoiceId:
      typeof voiceId === "string" && voiceId.trim() ? voiceId.trim() : null,
    elevenLabsVoiceStatus:
      typeof data?.elevenLabsVoiceStatus === "string"
        ? data.elevenLabsVoiceStatus
        : null,
  };
}

/** @deprecated Voice ID is written by the server after clone — use uploadVoiceClone. */
export async function getExistingVoiceId(): Promise<string | null> {
  const profile = await getCaregiverVoiceProfile();
  return profile.elevenLabsVoiceId;
}

export async function uploadVoiceClone(
  audioBlobs: Blob[],
): Promise<{ voiceId: string; requiresVerification: boolean }> {
  if (!audioBlobs.length) {
    throw new Error("At least one audio recording is required");
  }

  const token = await getAuthToken();
  const formData = new FormData();
  audioBlobs.forEach((blob, i) => {
    formData.append("files", blob, `sample_${i}.webm`);
  });

  const res = await fetch(`${API_BASE}/api/caregiver/voice/clone`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      body?.error?.message || body?.error || "Voice clone upload failed";
    throw new Error(typeof message === "string" ? message : "Voice clone upload failed");
  }

  const data = body.data ?? body;
  return {
    voiceId: data.voiceId as string,
    requiresVerification: Boolean(data.requiresVerification),
  };
}

export async function deleteVoiceClone(): Promise<void> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE}/api/caregiver/voice`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      body?.error?.message || body?.error || "Voice delete failed";
    throw new Error(typeof message === "string" ? message : "Voice delete failed");
  }
}
