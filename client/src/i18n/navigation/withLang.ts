import { useLanguage } from "../context/useLanguage";

/**
 * Language-aware path helper for Link components
 * Returns path prefixed with current language
 * 
 * @example
 * <Link to={withLang("/books")}>Books</Link>
 * // If current lang is "he", returns "/he/books"
 */
export function useWithLang() {
  const { language } = useLanguage();
  
  return (path: string): string => {
    // Handle paths that already have language prefix
    if (path.startsWith("/he/") || path.startsWith("/en/") || path.startsWith("/ar/")) {
      return path;
    }

    // Handle absolute URLs (external links)
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }

    // Handle root path
    if (path === "/") {
      return `/${language}`;
    }

    // Prefix with current language
    return `/${language}${path.startsWith("/") ? path : `/${path}`}`;
  };
}

/**
 * Standalone helper function (for use outside React components)
 * Requires language parameter
 */
export function withLang(path: string, language: string): string {
  // Handle paths that already have language prefix
  if (path.startsWith("/he/") || path.startsWith("/en/") || path.startsWith("/ar/")) {
    return path;
  }

  // Handle absolute URLs (external links)
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // Handle root path
  if (path === "/") {
    return `/${language}`;
  }

  // Prefix with current language
  return `/${language}${path.startsWith("/") ? path : `/${path}`}`;
}

