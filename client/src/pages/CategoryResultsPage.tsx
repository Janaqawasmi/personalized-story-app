import { Box, Typography, Container, Button } from "@mui/material";
import { useEffect, useState } from "react";
import { useParams, useSearchParams, useLocation } from "react-router-dom";
import { useLangNavigate } from "../i18n/navigation";
import { fetchStoriesWithFilters } from "../api/stories";
import { useReferenceData } from "../hooks/useReferenceData";
import { AGE_GROUPS } from "../components/MegaMenu/data";
import StoryGridCard from "../components/StoryGridCard";
import type { Story } from "../api/stories";
import { useTranslation } from "../i18n/useTranslation";
import { useLanguage } from "../i18n/context/useLanguage";

export default function CategoryResultsPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useLangNavigate();
  const location = useLocation();
  const { data, loading } = useReferenceData();
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedAge, setSelectedAge] = useState<string | null>(
    searchParams.get("age") || null
  );
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const t = useTranslation();
  const { language } = useLanguage();

  // Reset filters when coming from MegaMenu
  useEffect(() => {
    if (location.state?.fromMegaMenu) {
      // 🔥 Full reset and apply - clear all filters, then apply only the new selection
      // This ensures previous filter state is completely cleared
      setSelectedAge(location.state.age ?? null);
      setSelectedTopic(null);
      
      // Clean up location.state to prevent re-triggering
      window.history.replaceState({}, document.title, location.pathname + location.search);
    }
  }, [location.key, location.pathname, location.search]);

  // Get situation IDs for this category
  const situationIds = data?.situations
    .filter((s) => s.topicKey === categoryId && s.active)
    .map((s) => s.id) || [];

  // Fetch stories when filters change
  useEffect(() => {
    if (!categoryId) return;

    fetchStoriesWithFilters({
      categoryId,
      ageGroup: selectedAge || undefined,
      topicId: selectedTopic || undefined,
      situationIds: !selectedTopic ? situationIds : undefined,
    }).then((results) => {
      setStories(
        results.map((s) => ({
          id: s.id,
          title: s.title ?? t("search.storyWithoutName"),
        }))
      );
    });
  }, [categoryId, selectedAge, selectedTopic, situationIds, data]);

  if (loading || !data) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: "center" }}>
        <Typography>{t("pages.categoryResults.loading")}</Typography>
      </Container>
    );
  }

  const category = data.topics.find((t) => t.id === categoryId);

  if (!category) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: "center" }}>
        <Typography variant="h5">{t("pages.categoryResults.categoryNotFound")}</Typography>
        <Button onClick={() => navigate("/")} sx={{ mt: 2 }}>
          {t("pages.placeholder.backToHome")}
        </Button>
      </Container>
    );
  }

  // Get topics (situations) for this category
  const availableTopics = data.situations.filter(
    (s) => s.topicKey === categoryId && s.active
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          {language === "en" ? (category.label_en || category.label_he) : category.label_he}
        </Typography>
        <Typography color="text.secondary">
          {t("pages.categoryResults.storiesFound", { count: stories.length })}
        </Typography>
      </Box>

      {/* Filters */}
      <Box sx={{ mb: 4 }}>
        {/* Age Filter */}
        <Box sx={{ mb: 3 }}>
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

        {/* Topic Filter */}
        {availableTopics.length > 0 && (
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
            {t("pages.categoryResults.noStories")}
          </Typography>
        </Box>
      )}
    </Container>
  );
}
