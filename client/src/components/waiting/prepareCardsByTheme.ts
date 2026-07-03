import type { Language } from "../../i18n/context/useLanguage";

/**
 * "Prepare to read" conversation prompts shown while a story generates.
 * Not part of the i18n system: useTranslation()'s t() only returns strings,
 * it has no returnObjects support, so these arrays live in a plain map instead.
 */
const DEFAULT_CARDS: Record<Language, string[]> = {
  en: [
    "What has your child been worried about lately?",
    "Let them turn the pages — it helps them feel in control.",
    "It's okay to pause and ask how the hero feels right now.",
    "Afterward, ask: what would you tell the hero?",
  ],
  he: [
    "במה הילד/ה שלכם עסוק/ה לאחרונה?",
    "תנו להם להפוך את הדפים בעצמם — זה עוזר להם להרגיש בשליטה.",
    "אפשר לעצור ולשאול איך הגיבור/ה מרגיש/ה עכשיו.",
    "בסיום, שאלו: מה היית אומר/ת לגיבור/ה?",
  ],
  ar: [
    "بم انشغل طفلكم مؤخرًا؟",
    "دعوه يقلب الصفحات بنفسه — هذا يساعده على الشعور بالسيطرة.",
    "لا بأس أن تتوقفوا وتسألوا كيف يشعر البطل الآن.",
    "بعد الانتهاء، اسألوا: ماذا كنتم لتقولوا للبطل؟",
  ],
};

/**
 * Keyed by story_templates `primaryTopic` values (e.g. "fear_anxiety", "confidence").
 * Empty until real per-theme copy is finalized — "default" is the safe fallback.
 */
const CARDS_BY_THEME: Record<string, Partial<Record<Language, string[]>>> = {};

export function getPrepareCards(theme: string | undefined, language: Language): string[] {
  const themeCards = theme ? CARDS_BY_THEME[theme]?.[language] : undefined;
  return themeCards ?? DEFAULT_CARDS[language] ?? DEFAULT_CARDS.en;
}
