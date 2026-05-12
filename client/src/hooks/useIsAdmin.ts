/**
 * useIsAdmin — reads Firebase Auth custom claims and returns whether the
 * signed-in user has role="admin". Used to gate admin-only UI (e.g. the pilot
 * illustration panel inside IllustrationsTab) without redirecting away from
 * the page like RequireAdmin does.
 *
 * Mirrors the logic in components/RequireAdmin.tsx — keep them in sync.
 */

import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export interface UseIsAdminResult {
  isAdmin: boolean;
  loading: boolean;
}

export function useIsAdmin(): UseIsAdminResult {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      try {
        // Force-refresh so freshly-set custom claims land in the token.
        const tokenResult = await user.getIdTokenResult(true);
        setIsAdmin(tokenResult.claims.role === "admin");
      } catch (err) {
        console.error("[useIsAdmin] Failed to read token claims:", err);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  return { isAdmin, loading };
}
