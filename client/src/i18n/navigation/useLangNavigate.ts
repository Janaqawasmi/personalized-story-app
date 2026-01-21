import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/useLanguage";

/**
 * Language-aware navigation hook
 * Automatically prefixes paths with current language
 * 
 * @example
 * const langNavigate = useLangNavigate();
 * langNavigate("/books") → navigates to "/he/books" (if current lang is "he")
 * langNavigate("/login") → navigates to "/he/login"
 */
export function useLangNavigate() {
  const navigate = useNavigate();
  const { language } = useLanguage();

  return (to: string | number, options?: { replace?: boolean; state?: any }) => {
    // Handle relative numbers (back/forward navigation)
    if (typeof to === "number") {
      navigate(to);
      return;
    }

    // Handle absolute URLs (external links)
    if (to.startsWith("http://") || to.startsWith("https://")) {
      window.location.href = to;
      return;
    }

    // Handle relative paths (don't start with /) - pass through as-is
    // React Router will resolve them relative to current route
    if (!to.startsWith("/")) {
      navigate(to, options);
      return;
    }

    // Handle paths that already have language prefix
    if (to.startsWith("/he/") || to.startsWith("/en/") || to.startsWith("/ar/")) {
      navigate(to, options);
      return;
    }

    // Handle root path
    if (to === "/") {
      navigate(`/${language}`, options);
      return;
    }

    // Prefix with current language
    const prefixedPath = `/${language}${to.startsWith("/") ? to : `/${to}`}`;
    navigate(prefixedPath, options);
  };
}

