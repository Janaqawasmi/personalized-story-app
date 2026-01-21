import { Box, Typography, Container, Button } from "@mui/material";
import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useLangNavigate } from "../i18n/navigation";
import { fetchStoriesWithFilters } from "../api/stories";
import { useReferenceData } from "../hooks/useReferenceData";
import { AGE_GROUPS } from "../components/MegaMenu/data";
import StoryGridCard from "../components/StoryGridCard";
import type { Story } from "../api/stories";
import { useTranslation } from "../i18n/useTranslation";
import { useLanguage } from "../i18n/context/useLanguage";

export default function TopicResultsPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useLangNavigate();
  const location = useLocation();
  const { data, loading } = useReferenceData();
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedAge, setSelectedAge] = useState<string | null>(null);
  const t = useTranslation();
  const { language } = useLanguage();

  // Reset filters when coming from MegaMenu
  useEffect(() => {
    if (location.state?.fromMegaMenu) {
      // 🔥 Full reset and apply - clear all filters, then apply only the new selection
      // This ensures previous filter state is completely cleared
      setSelectedAge(location.state.age ?? null);
      
      // Clean up location.state to prevent re-triggering
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location.key, location.pathname]);

  // Fetch stories when filters change
  useEffect(() => {
    if (!topicId) return;

    fetchStoriesWithFilters({
      topicId,
      ageGroup: selectedAge || undefined,
    }).then((results) => {
      setStories(
        results.map((s) => ({
          id: s.id,
          title: s.title ?? t("search.storyWithoutName"),
        }))
      );
    });
  }, [topicId, selectedAge]);

  if (loading || !data) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: "center" }}>
        <Typography>{t("pages.topicResults.loading")}</Typography>
      </Container>
    );
  }

  const topic = data.situations.find((s) => s.id === topicId);

  if (!topic) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: "center" }}>
        <Typography variant="h5">{t("pages.topicResults.topicNotFound")}</Typography>
        <Button onClick={() => navigate("/")} sx={{ mt: 2 }}>
          {t("pages.placeholder.backToHome")}
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          {language === "en" ? (topic.label_en || topic.label_he) : topic.label_he}
        </Typography>
        <Typography color="text.secondary">
          {t("pages.topicResults.storiesFound", { count: stories.length })}
        </Typography>
      </Box>

      {/* Age Filter */}
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ fontWeight: 600, mb: 2 }}>
          {t("filters.age")} ({t("filters.optional")})
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          <Button
            variant={selectedAge === null ? "contained" : "outlined"}
            size="small"
            onClick={() => setSelectedAge(null)}
          >
            {t("filters.allAges")}
          </Button>
          {AGE_GROUPS.map((age) => (
            <Button
              key={age.id}
              variant={selectedAge === age.id ? "contained" : "outlined"}
              size="small"
              onClick={() => setSelectedAge(age.id)}
            >
              {age.label}
            </Button>
          ))}
        </Box>
      </Box>

      {/* Stories Grid */}
      {stories.length > 0 ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "1fr 1fr",
              md: "repeat(3, 1fr)",
            },
            gap: 4,
          }}
        >
          {stories.map((story) => (
            <StoryGridCard
              key={story.id}
              title={story.title}
              description={story.shortDescription}
              imageUrl={story.coverImage}
              onClick={() => {
                navigate(`/stories/${story.id}/personalize`);
              }}
            />
          ))}
        </Box>
      ) : (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            {t("pages.topicResults.noStories")}
          </Typography>
        </Box>
      )}
    </Container>
  );
}

