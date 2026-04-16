import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const prevPathnameRef = useRef<string>(pathname);

  useEffect(() => {
    // Scroll to top on real navigation (pathname change).
    // Hash-only changes (e.g. /books -> /books#categories) are handled by the page.
    const prevPathname = prevPathnameRef.current;
    prevPathnameRef.current = pathname;
    if (prevPathname === pathname) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, hash]);

  return null;
}

