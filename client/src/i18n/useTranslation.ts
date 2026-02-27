import { useLanguage } from "./context/useLanguage";
import heTranslations from "./translations/he.json";
import enTranslations from "./translations/en.json";
import arTranslations from "./translations/ar.json";

type TranslationKey = string;
type Translations = typeof heTranslations;

// Load translations based on language
// Arabic translations are partial - missing keys will fallback to Hebrew
const translations: Record<"he" | "en" | "ar", Translations> = {
  he: heTranslations,
  en: enTranslations,
  ar: arTranslations as Translations, // Type assertion: partial translations with fallback
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
 * Returns a function to translate keys with optional interpolation
 * 
 * @example
 * const t = useTranslation();
 * t("navbar.browseStories") → "עיון בסיפורים" (if Hebrew) or "Browse Stories" (if English)
 * t("pages.ageResults.title", { age: "3-6" }) → "סיפורים לגיל 3-6"
 */
export function useTranslation() {
  const { language } = useLanguage();

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    const currentTranslations = translations[language];
    
    // Try to get translation for current language
    let value = getNestedValue(currentTranslations, key);
    
    // If not found and not Hebrew, fallback to Hebrew
    if (!value && language !== "he") {
      value = getNestedValue(translations.he, key);
    }
    
    // If still not found, return the key itself (helps with debugging)
    if (!value) return key;
    
    // Interpolate parameters if provided
    if (params) {
      return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
        return params[paramKey]?.toString() || match;
      });
    }
    
    return value;
  };

  return t;
}

;