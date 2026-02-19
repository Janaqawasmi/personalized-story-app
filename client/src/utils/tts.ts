// client/src/utils/tts.ts
export type TTSLang = "en-US" | "he-IL" | "ar-SA";

let currentUtterance: SpeechSynthesisUtterance | null = null;

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

export function ttsSpeak(params: {
  text: string;
  lang: TTSLang;
  rate?: number;
  pitch?: number;
  volume?: number;
  onEnd?: () => void;
}) {
  if (typeof window === "undefined") return;

  const { text, lang, rate = 0.9, pitch = 1, volume = 1, onEnd } = params;

  // stop anything currently speaking
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
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

export function ttsIsSpeaking() {
  if (typeof window === "undefined") return false;
  return window.speechSynthesis.speaking;
}

export function ttsIsPaused() {
  if (typeof window === "undefined") return false;
  return window.speechSynthesis.paused;
}
