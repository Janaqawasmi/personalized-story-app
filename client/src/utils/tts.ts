// client/src/utils/tts.ts
export type TTSLang = "en-US" | "he-IL" | "ar-SA";

let currentUtterance: SpeechSynthesisUtterance | null = null;

// --- Voices loading (important: voices load async in many browsers) ---
let cachedVoices: SpeechSynthesisVoice[] = [];

function loadVoicesOnce(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined") return Promise.resolve([]);

  const synth = window.speechSynthesis;
  const existing = synth.getVoices();
  if (existing && existing.length > 0) {
    cachedVoices = existing;
    return Promise.resolve(existing);
  }

  return new Promise((resolve) => {
    const onVoicesChanged = () => {
      const v = synth.getVoices();
      if (v && v.length > 0) {
        cachedVoices = v;
        synth.removeEventListener("voiceschanged", onVoicesChanged);
        resolve(v);
      }
    };

    synth.addEventListener("voiceschanged", onVoicesChanged);

    // fallback: if voiceschanged doesn't fire, try again shortly
    setTimeout(() => {
      const v2 = synth.getVoices();
      if (v2 && v2.length > 0) {
        cachedVoices = v2;
        synth.removeEventListener("voiceschanged", onVoicesChanged);
        resolve(v2);
      }
    }, 300);
  });
}

export async function ttsGetVoices(): Promise<SpeechSynthesisVoice[]> {
  if (cachedVoices.length > 0) return cachedVoices;
  return loadVoicesOnce();
}

// --- Smart voice selection ---
function normalizeLang(lang: string) {
  return (lang || "").toLowerCase();
}

function scoreVoice(v: SpeechSynthesisVoice, lang: TTSLang) {
  const name = (v.name || "").toLowerCase();
  const voiceLang = normalizeLang(v.lang);

  // Must match language reasonably
  const target = normalizeLang(lang);
  const sameLang =
    voiceLang === target ||
    voiceLang.startsWith(target.split("-")[0]) ||
    target.startsWith(voiceLang.split("-")[0]);

  if (!sameLang) return -999;

  let score = 0;

  // Prefer "Google" voices (Chrome) - usually best for many languages
  if (name.includes("google")) score += 50;

  // Prefer Microsoft (Edge) and Apple (Safari)
  if (name.includes("microsoft")) score += 40;
  if (name.includes("apple")) score += 35;

  // Prefer neural/natural if present
  if (name.includes("neural")) score += 25;
  if (name.includes("natural")) score += 20;

  // Prefer local service (often higher quality)
  if (v.localService) score += 10;

  // Slightly prefer default voice if it's a good match
  if (v.default) score += 5;

  // Hebrew: sometimes voices include "hebrew" / "ivrit" / "עברית"
  if (lang === "he-IL") {
    if (name.includes("hebrew") || name.includes("ivrit") || name.includes("עברית"))
      score += 15;
  }

  // Arabic: sometimes voices include "arabic" / "العربية"
  if (lang === "ar-SA") {
    if (name.includes("arabic") || name.includes("العربية")) score += 15;
  }

  // English: prefer US/GB common
  if (lang === "en-US") {
    if (voiceLang.includes("en-us")) score += 10;
    if (voiceLang.includes("en-gb")) score += 6;
  }

  return score;
}

function pickBestVoice(voices: SpeechSynthesisVoice[], lang: TTSLang) {
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -9999;

  for (const v of voices) {
    const s = scoreVoice(v, lang);
    if (s > bestScore) {
      bestScore = s;
      best = v;
    }
  }

  return best;
}

// --- Controls ---
export function ttsStop() {
  if (typeof window === "undefined") return;
  window.speechSynthesis.cancel();
  currentUtterance = null;
}

export function ttsPause() {
  if (typeof window === "undefined") return;
  window.speechSynthesis.pause();
}

export function ttsResume() {
  if (typeof window === "undefined") return;
  window.speechSynthesis.resume();
}

export function ttsIsSpeaking() {
  if (typeof window === "undefined") return false;
  return window.speechSynthesis.speaking;
}

export function ttsIsPaused() {
  if (typeof window === "undefined") return false;
  return window.speechSynthesis.paused;
}

// Speak with best available voice (or a specific voiceName if provided)
export async function ttsSpeak(params: {
  text: string;
  lang: TTSLang;
  rate?: number;
  pitch?: number;
  volume?: number;
  voiceName?: string; // optional manual override
  onEnd?: () => void;
}) {
  if (typeof window === "undefined") return;

  const { text, lang, rate = 0.9, pitch = 1, volume = 1, voiceName, onEnd } = params;

  // stop anything currently speaking
  window.speechSynthesis.cancel();

  const voices = await ttsGetVoices();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;

  // Pick voice: manual name OR best automatic
  if (voiceName) {
    const chosen = voices.find((v) => v.name === voiceName) || null;
    if (chosen) utterance.voice = chosen;
  } else {
    const best = pickBestVoice(voices, lang);
    if (best) utterance.voice = best;
  }

  utterance.rate = rate;
  utterance.pitch = pitch;
  utterance.volume = volume;

  utterance.onend = () => {
    currentUtterance = null;
    onEnd?.();
  };

  utterance.onerror = () => {
    currentUtterance = null;
  };

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}
