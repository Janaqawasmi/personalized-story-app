import { doc, getDoc } from "firebase/firestore";
import { API_BASE, getAuthHeadersForUpload } from "../api/api";
import { auth, db } from "../firebase";

export type CaregiverVoiceProfile = {
  elevenLabsVoiceId: string | null;
  elevenLabsVoiceStatus: string | null;
};

async function getAuthToken(): Promise<string> {
  const headers = await getAuthHeadersForUpload();
  const token = headers.Authorization?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token) throw new Error("Not authenticated");
  return token;
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

  const formData = new FormData();
  audioBlobs.forEach((blob, i) => {
    // Raw multipart file upload — never base64 or JSON audio payload.
    formData.append("files", blob, `sample_${i}.webm`);
  });

  const res = await fetch(`${API_BASE}/api/caregiver/voice/clone`, {
    method: "POST",
    headers: await getAuthHeadersForUpload(),
    body: formData,
  });

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail =
        (typeof body?.error?.message === "string" && body.error.message) ||
        (typeof body?.details === "string" && body.details) ||
        (typeof body?.error?.details === "string" && body.error.details) ||
        (typeof body?.message === "string" && body.message) ||
        (typeof body?.error === "string" && body.error) ||
        JSON.stringify(body);
    } catch {
      detail = await res.text().catch(() => "");
    }
    console.error("[voiceProfile] clone upload failed:", res.status, detail);
    throw new Error(
      detail
        ? `Voice clone upload failed (${res.status}): ${detail}`
        : `Voice clone upload failed (${res.status})`,
    );
  }

  const body = await res.json();
  const data = body.data ?? body;
  return {
    voiceId: data.voiceId as string,
    requiresVerification: Boolean(data.requiresVerification),
  };
}

export async function deleteVoiceClone(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/caregiver/voice`, {
    method: "DELETE",
    headers: await getAuthHeadersForUpload(),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      body?.error?.message || body?.error || "Voice delete failed";
    throw new Error(typeof message === "string" ? message : "Voice delete failed");
  }
}
