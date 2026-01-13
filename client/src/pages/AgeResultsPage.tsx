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

export default function AgeResultsPage() {
  const { ageId } = useParams<{ ageId: string }>();
  const navigate = useLangNavigate();
  const location = useLocation();
  const { data, loading } = useReferenceData();
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const t = useTranslation();
  const { language } = useLanguage();

  const ageGroup = AGE_GROUPS.find((a) => a.id === ageId);

  // Reset filters when coming from MegaMenu
  useEffect(() => {
    if (location.state?.fromMegaMenu) {
      // 🔥 Full reset and apply - clear all filters, then apply only the new selection
      // This ensures previous filter state is completely cleared
      setSelectedCategory(location.state.category ?? null);
      setSelectedTopic(null);
      
      // Clean up location.state to prevent re-triggering
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location.key, location.pathname]);

  // Fetch stories when filters change
  useEffect(() => {
    if (!ageId) return;

    // Get situation IDs for the selected category
    const situationIds = selectedCategory
      ? data?.situations
          .filter((s) => s.topicKey === selectedCategory && s.active)
          .map((s) => s.id) || []
      : undefined;

    fetchStoriesWithFilters({
      ageGroup: ageId,
      categoryId: selectedCategory || undefined,
      topicId: selectedTopic || undefined,
      situationIds: selectedCategory && !selectedTopic ? situationIds : undefined,
    }).then((results) => {
      setStories(
        results.map((s) => ({
          id: s.id,
          title: s.title ?? t("search.storyWithoutName"),
        }))
      );
    });
  }, [ageId, selectedCategory, selectedTopic, data]);

  if (!ageGroup) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: "center" }}>
        <Typography variant="h5">{t("pages.ageResults.ageNotFound")}</Typography>
        <Button onClick={() => navigate("/")} sx={{ mt: 2 }}>
          {t("pages.placeholder.backToHome")}
        </Button>
      </Container>
    );
  }

  const availableCategories = data?.topics || [];
  const availableTopics = data?.situations.filter(
    (s) => !selectedCategory || s.topicKey === selectedCategory
  ) || [];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          {t("pages.ageResults.title", { age: ageGroup.label })}
        </Typography>
        <Typography color="text.secondary">
          {t("pages.ageResults.storiesFound", { count: stories.length })}
        </Typography>
      </Box>

      {/* Filters */}
      <Box sx={{ mb: 4 }}>
        {/* Category Filter */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontWeight: 600, mb: 2 }}>
            {t("filters.category")} ({t("filters.optional")})
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            <Button
              variant={selectedCategory === null ? "contained" : "outlined"}
              size="small"
              onClick={() => {
                setSelectedCategory(null);
                setSelectedTopic(null);
              }}
            >
              {t("filters.all")}
            </Button>
            {availableCategories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "contained" : "outlined"}
                size="small"
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSelectedTopic(null);
                }}
              >
                {language === "en" ? (cat.label_en || cat.label_he) : cat.label_he}
              </Button>
            ))}
          </Box>
        </Box>

        {/* Topic Filter */}
        {selectedCategory && (
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontWeight: 600, mb: 2 }}>
              {t("filters.topic")} ({t("filters.optional")})
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              <Button
                variant={selectedTopic === null ? "contained" : "outlined"}
                size="small"
                onClick={() => setSelectedTopic(null)}
              >
                {t("filters.all")}
              </Button>
              {availableTopics.map((topic) => (
                <Button
                  key={topic.id}
                  variant={selectedTopic === topic.id ? "contained" : "outlined"}
                  size="small"
                  onClick={() => setSelectedTopic(topic.id)}
                >
                  {language === "en" ? (topic.label_en || topic.label_he) : topic.label_he}
                </Button>
              ))}
            </Box>
          </Box>
        )}
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
            {t("pages.ageResults.noStories")}
          </Typography>
        </Box>
      )}
    </Container>
  );
}

