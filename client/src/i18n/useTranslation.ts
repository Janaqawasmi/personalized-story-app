import { useLanguage } from "./context/useLanguage";
import heTranslations from "./translations/he.json";
import enTranslations from "./translations/en.json";

type TranslationKey = string;
type Translations = typeof heTranslations;

// Load translations based on language
const translations: Record<"he" | "en" | "ar", Translations> = {
  he: heTranslations,
  en: enTranslations,
  ar: heTranslations, // Fallback to Hebrew for Arabic (not implemented yet)
};

/**
 * Get nested value from object using dot notation
 * Example: getNestedValue(obj, "home.journey.title") → obj.home.journey.title
 */
function getNestedValue(obj: any, path: string): string | undefined {
  return path.split(".").reduce((current, key) => {
    return current && typeof current === "object" ? current[key] : undefined;
  }, obj);
}

/**
 * Translation hook
 * Returns a function to translate keys
 * 
 * @example
 * const t = useTranslation();
 * t("navbar.browseStories") → "עיון בסיפורים" (if Hebrew) or "Browse Stories" (if English)
 */
export function useTranslation() {
  const { language } = useLanguage();

  const t = (key: TranslationKey): string => {
    const currentTranslations = translations[language];
    
    // Try to get translation for current language
    let value = getNestedValue(currentTranslations, key);
    
    // If not found and not Hebrew, fallback to Hebrew
    if (!value && language !== "he") {
      value = getNestedValue(translations.he, key);
    }
    
    // If still not found, return the key itself (helps with debugging)
    return value || key;
  };

  return t;
}

