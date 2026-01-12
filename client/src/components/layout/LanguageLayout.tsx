import { Outlet, useParams, Navigate } from "react-router-dom";
import { useLanguage, type Language } from "../../i18n/context/LanguageContext";
import { useEffect } from "react";

const VALID_LANGUAGES: Language[] = ["he", "en", "ar"];

export default function LanguageLayout() {
  const { lang } = useParams<{ lang: string }>();
  const { setLanguage } = useLanguage();

  useEffect(() => {
    // Validate and set language from URL
    if (lang && VALID_LANGUAGES.includes(lang as Language)) {
      setLanguage(lang as Language);
    }
  }, [lang, setLanguage]);

  // Redirect invalid language codes to /he
  if (!lang || !VALID_LANGUAGES.includes(lang as Language)) {
    return <Navigate to="/he" replace />;
  }

  return <Outlet />;
}

