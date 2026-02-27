import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { LanguageProvider } from "./i18n/context/LanguageContext";
import { ReaderProvider } from "./contexts/ReaderContext";

// Get initial language from URL or localStorage
const getInitialLanguage = (): "he" | "en" | "ar" => {
  const pathLang = window.location.pathname.split("/")[1];
  if (pathLang === "he" || pathLang === "en" || pathLang === "ar") {
    return pathLang;
  }
  const stored = localStorage.getItem("app_language");
  if (stored === "he" || stored === "en" || stored === "ar") {
    return stored;
  }
  return "he";
};

const initialLanguage = getInitialLanguage();
const initialDirection = initialLanguage === "en" ? "ltr" : "rtl";

// Set initial html attributes
document.documentElement.setAttribute("dir", initialDirection);
document.documentElement.setAttribute("lang", initialLanguage);

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <LanguageProvider initialLanguage={initialLanguage}>
    <ReaderProvider>
    <App />
    </ReaderProvider>
  </LanguageProvider>
);
