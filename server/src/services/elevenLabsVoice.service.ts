import FormData from "form-data";

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

function requireApiKey(): string {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not configured");
  }
  return apiKey;
}

export function isElevenLabsConfigured(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY?.trim());
}

export async function createVoiceClone(params: {
  name: string;
  audioBuffers: { buffer: Buffer; filename: string; mimetype: string }[];
}): Promise<{ voiceId: string; requiresVerification: boolean }> {
  const apiKey = requireApiKey();

  if (!params.audioBuffers.length) {
    throw new Error("At least one audio sample is required");
  }

  const form = new FormData();
  form.append("name", params.name);
  form.append("remove_background_noise", "true");
  for (const file of params.audioBuffers) {
    form.append("files", file.buffer, {
      filename: file.filename,
      contentType: file.mimetype,
    });
  }

  const res = await fetch(`${ELEVENLABS_BASE}/voices/add`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, ...form.getHeaders() },
    body: form as unknown as BodyInit,
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`ElevenLabs clone failed (${res.status}): ${errBody}`);
  }

  const data = (await res.json()) as {
    voice_id: string;
    requires_verification: boolean;
  };
  return {
    voiceId: data.voice_id,
    requiresVerification: data.requires_verification,
  };
}

export async function deleteVoiceClone(voiceId: string): Promise<void> {
  const apiKey = requireApiKey();
  const res = await fetch(`${ELEVENLABS_BASE}/voices/${voiceId}`, {
    method: "DELETE",
    headers: { "xi-api-key": apiKey },
  });
  if (!res.ok && res.status !== 404) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`ElevenLabs delete voice failed (${res.status}): ${errBody}`);
  }
}

export async function synthesizeSpeech(params: {
  voiceId: string;
  text: string;
}): Promise<Buffer> {
  const apiKey = requireApiKey();
  const modelId = process.env.ELEVENLABS_MODEL_ID?.trim() || "eleven_multilingual_v2";

  const res = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${params.voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: params.text,
      model_id: modelId,
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${errBody}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
