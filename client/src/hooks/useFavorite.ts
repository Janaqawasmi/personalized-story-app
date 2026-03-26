import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getIsFavorite, toggleFavorite, type FavoriteStory } from "../api/favorites";
import { useLangNavigate } from "../i18n/navigation";
import { auth } from "../firebase";

function logAuthState(prefix: string, currentUser: any) {
  console.log(prefix, {
    contextUser: currentUser
      ? { uid: currentUser.uid, email: currentUser.email, displayName: currentUser.displayName }
      : null,
    authCurrentUser: auth.currentUser
      ? { uid: auth.currentUser.uid, email: auth.currentUser.email, displayName: auth.currentUser.displayName }
      : null,
  });
}

export function useFavorite(storyId: string | null, favoriteDraft?: Omit<FavoriteStory, "addedAt">) {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useLangNavigate();
  const location = useLocation();

  const uid = currentUser?.uid ?? null;

  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load favorite state
  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!storyId || !uid) {
        setIsFavorite(false);
        return;
      }

      try {
        const exists = await getIsFavorite(uid, storyId);
        if (!cancelled) setIsFavorite(exists);
      } catch (err) {
        console.error("[useFavorite] getIsFavorite failed:", err);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [storyId, uid]);

  const canToggle = useMemo(() => !!storyId && !authLoading, [storyId, authLoading]);

  async function toggle() {
    if (!storyId) {
      console.error("[useFavorite] toggle called but storyId is missing:", storyId);
      return;
    }

    logAuthState("[useFavorite] click auth state:", currentUser);

    if (!currentUser) {
      // Redirect to login and come back to the current page
      const from = location.pathname + location.search;
      navigate("/login", { state: { from, mode: "login" } });
      return;
    }

    if (!favoriteDraft) {
      console.error("[useFavorite] Missing favoriteDraft data for story:", {
        storyId,
        favoriteDraft,
      });
      return;
    }

    setLoading(true);
    try {
      console.log("[useFavorite] about to toggleFavorite:", {
        uid: currentUser.uid,
        storyId,
        title: favoriteDraft.title,
        path: `caregivers/${currentUser.uid}/favorites/${storyId}`,
      });
      const res = await toggleFavorite(currentUser.uid, favoriteDraft);
      console.log("[useFavorite] toggleFavorite success:", res);
      setIsFavorite(res.isFavorite);
    } catch (err) {
      const e = err as any;
      console.error("[useFavorite] toggleFavorite FAILED:", {
        code: e?.code,
        message: e?.message,
        raw: err,
      });
      throw err; // IMPORTANT: don't swallow errors during debugging
    } finally {
      setLoading(false);
    }
  }

  return { isFavorite, toggle, loading, canToggle };
}

