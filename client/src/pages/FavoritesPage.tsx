import { Box, CircularProgress, Container, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslation } from "../i18n/useTranslation";
import { useLanguage } from "../i18n/context/useLanguage";
import { useAuth } from "../contexts/AuthContext";
import { listFavorites, type FavoriteStory } from "../api/favorites";
import StoryGridCard from "../components/StoryGridCard";

export default function FavoritesPage() {
  const t = useTranslation();
  const { direction } = useLanguage();
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
    <Container maxWidth="lg" sx={{ py: 6 }} dir={direction}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 3 }}>
        {t("pages.favorites.title")}
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
            {t("pages.favorites.emptyTitle")}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {t("pages.favorites.emptySubtitle", {
              action: t("storyDetail.addToFavorites"),
            })}
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
              story={{
                id: fav.storyId,
                title: fav.title || t("pages.favorites.fallbackStoryTitle"),
                shortDescription:
                  fav.ageGroup || fav.category || fav.topic
                    ? String(fav.ageGroup || fav.category || fav.topic)
                    : undefined,
                coverImage: fav.coverImage || undefined,
                ageGroup: fav.ageGroup ?? undefined,
                topicKey: fav.topic ?? undefined,
                primaryTopic: fav.category ?? undefined,
                category: fav.category ?? null,
              }}
            />
          ))}
        </Box>
      )}
    </Container>
  );
}

