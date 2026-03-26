import { Box, CircularProgress, Container, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslation } from "../i18n/useTranslation";
import { useAuth } from "../contexts/AuthContext";
import { listFavorites, type FavoriteStory } from "../api/favorites";
import StoryGridCard from "../components/StoryGridCard";
import { useLangNavigate } from "../i18n/navigation";

export default function FavoritesPage() {
  const t = useTranslation();
  const navigate = useLangNavigate();
  const { currentUser } = useAuth();

  const [favorites, setFavorites] = useState<FavoriteStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!currentUser) return;

      try {
        setLoading(true);
        setError(null);
        const items = await listFavorites(currentUser.uid);
        if (!cancelled) setFavorites(items);
      } catch (err: any) {
        console.error("[FavoritesPage] listFavorites failed:", err);
        if (!cancelled) setError(err?.message || "Failed to load favorites");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 3 }}>
        Favorites
      </Typography>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {error && !loading && (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="h6" color="error">
            {error}
          </Typography>
        </Box>
      )}

      {!loading && !error && favorites.length === 0 && (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            No favorites yet.
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Open a story and tap “{t("storyDetail.addToFavorites")}”.
          </Typography>
        </Box>
      )}

      {!loading && !error && favorites.length > 0 && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" },
            gap: 4,
          }}
        >
          {favorites.map((fav) => (
            <StoryGridCard
              key={fav.storyId}
              storyId={fav.storyId}
              title={fav.title || "Story"}
              description={fav.ageGroup || fav.category || fav.topic || undefined}
              imageUrl={fav.coverImage || undefined}
              ageGroup={fav.ageGroup ?? null}
              category={fav.category ?? null}
              topic={fav.topic ?? null}
              onClick={() => navigate(`/stories/${fav.storyId}`)}
            />
          ))}
        </Box>
      )}
    </Container>
  );
}

