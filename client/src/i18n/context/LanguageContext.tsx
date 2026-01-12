import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "he" | "en" | "ar";
export type Direction = "rtl" | "ltr";

interface LanguageContextType {
  language: Language;
  direction: Direction;
  isRTL: boolean;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "app_language";
const VALID_LANGUAGES: Language[] = ["he", "en", "ar"];

function getDirection(lang: Language): Direction {
  return lang === "en" ? "ltr" : "rtl";
}

function isValidLanguage(lang: string): lang is Language {
  return VALID_LANGUAGES.includes(lang as Language);
}

function getInitialLanguage(): Language {
  // Priority: localStorage → default to "he"
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && isValidLanguage(stored)) {
    return stored;
  }
  return "he";
}

interface LanguageProviderProps {
  children: ReactNode;
  initialLanguage?: Language;
}

export function LanguageProvider({ children, initialLanguage }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(
    initialLanguage || getInitialLanguage()
  );

  const direction = getDirection(language);
  const isRTL = direction === "rtl";

  const setLanguage = (lang: Language) => {
    if (isValidLanguage(lang)) {
      setLanguageState(lang);
      localStorage.setItem(STORAGE_KEY, lang);
    }
  };

  // Update html dir attribute when language changes
  useEffect(() => {
    document.documentElement.setAttribute("dir", direction);
    document.documentElement.setAttribute("lang", language);
  }, [direction, language]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        direction,
        isRTL,
        setLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

