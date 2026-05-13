import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";

function readIllustrationDevPanelsFlag(claims: Record<string, unknown>): boolean {
  const direct = claims["illustrationDevPanels"];
  if (direct === true) return true;
  const ff = claims["featureFlag"];
  if (ff && typeof ff === "object" && !Array.isArray(ff)) {
    return (ff as Record<string, unknown>)["illustrationDevPanels"] === true;
  }
  return false;
}

export type IllustrationDevPanelsGate = { ready: boolean; allowed: boolean };

/**
 * Admin role or `featureFlag.illustrationDevPanels` custom claim (pilot opt-in).
 * `ready` becomes true after auth + token claims are resolved (avoid flash-deny).
 */
export function useIllustrationDevPanelsGate(): IllustrationDevPanelsGate {
  const { currentUser, loading: authLoading } = useAuth();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      setAllowed(false);
      setReady(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const tr = await currentUser.getIdTokenResult(true);
      const role = tr.claims.role;
      const ok = role === "admin" || readIllustrationDevPanelsFlag(tr.claims as Record<string, unknown>);
      if (!cancelled) {
        setAllowed(ok);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser, authLoading]);

  return { ready: !authLoading && ready, allowed };
}

/** Convenience: true only once gate is ready and user is allowed. */
export function useIsAdminOrDevPanelEnabled(): boolean {
  const g = useIllustrationDevPanelsGate();
  return g.ready && g.allowed;
}
