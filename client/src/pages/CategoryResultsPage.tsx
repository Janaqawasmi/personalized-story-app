import { Box, Typography, Container, Button, Link } from "@mui/material";
import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useParams, useSearchParams, useLocation } from "react-router-dom";
import { useLangNavigate } from "../i18n/navigation";
import { withLang } from "../i18n/navigation/withLang";
import { fetchStoriesWithFilters } from "../api/stories";
import { useReferenceData } from "../hooks/useReferenceData";
import { AGE_GROUPS } from "../components/MegaMenu/data";
import StoryGridCard from "../components/StoryGridCard";
import type { Story } from "../api/stories";
import { useTranslation } from "../i18n/useTranslation";
import { useLanguage } from "../i18n/context/useLanguage";
import FilterBar from "../components/FilterBar/FilterBar";
import type { FilterGroup, LockedFilter } from "../components/FilterBar/types";
import { getTopicColor } from "../constants/topicColors";
import SuggestStoryBanner from "../components/SuggestStoryBanner";

const storyGridSx = {
  display: "grid",
  gridTemplateColumns: {
    xs: "1fr",
    sm: "repeat(2, 1fr)",
    md: "repeat(3, 1fr)",
    lg: "repeat(4, 1fr)",
  },
  gap: 2.5,
};

const pageHeaderTitleSx = {
  fontFamily: "'Playfair Display', serif",
  fontSize: { xs: "24px", md: "28px" },
  fontWeight: 600,
  color: "#1a1a1a",
  mb: 0.5,
};

const countBadgeSx = {
  display: "inline-flex",
  alignItems: "center",
  padding: "2px 10px",
  borderRadius: "20px",
  backgroundColor: "#f5ece9",
  color: "#824D5C",
  fontSize: "12px",
  fontWeight: 600,
};

const breadcrumbBoxSx = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  mb: 1.5,
  fontSize: "13px",
  color: "#888888",
};

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

  useEffect(() => {
    if (location.state?.fromMegaMenu) {
      setSelectedAge(location.state.age ?? null);
      setSelectedTopic(null);
      window.history.replaceState({}, document.title, location.pathname + location.search);
    }
  }, [location.key, location.pathname, location.search, location.state?.age, location.state?.fromMegaMenu]);

  const situationIds =
    data?.situations
      .filter((s) => s.topicKey === categoryId && s.active)
      .map((s) => s.id) || [];

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
  }, [categoryId, selectedAge, selectedTopic, situationIds, data, t]);

  const containerSx = { px: { xs: 2, md: 4 }, py: 3 };

  if (loading || !data) {
    return (
      <Container maxWidth="xl" sx={{ ...containerSx, py: 8, textAlign: "center" }}>
        <Typography>{t("pages.categoryResults.loading")}</Typography>
      </Container>
    );
  }

  const category = data.topics.find((top) => top.id === categoryId);

  if (!category) {
    return (
      <Container maxWidth="xl" sx={{ ...containerSx, py: 8, textAlign: "center" }}>
        <Typography variant="h5">{t("pages.categoryResults.categoryNotFound")}</Typography>
        <Button onClick={() => navigate("/")} sx={{ mt: 2 }}>
          {t("pages.placeholder.backToHome")}
        </Button>
      </Container>
    );
  }

  const availableTopics = data.situations.filter(
    (s) => s.topicKey === categoryId && s.active
  );

  const categoryTitleHe = category.label_he;
  const categoryTitleDisplay =
    language === "en" ? category.label_en || categoryTitleHe : categoryTitleHe;

  const lockedFilters: LockedFilter[] = [
    {
      label: categoryTitleDisplay,
      dotColor: categoryId ? getTopicColor(categoryId) : undefined,
    },
  ];

  const ageGroup: FilterGroup = {
    type: "chips",
    key: "age",
    label: t("filters.age"),
    options: [
      { value: "", label: t("filters.allAges") },
      ...AGE_GROUPS.map((ag) => ({ value: ag.id ?? "", label: ag.label })),
    ],
    value: selectedAge ?? "",
    onChange: (val) => setSelectedAge(val || null),
  };

  const situationGroup: FilterGroup | null =
    availableTopics.length > 0
      ? {
          type: "dropdown",
          key: "topic",
          label: t("filters.topic"),
          placeholder: t("filters.all"),
          searchable: availableTopics.length > 8,
          grouped: false,
          options: [
            { value: "", label: t("filters.all") },
            ...availableTopics.map((sit) => ({
              value: sit.id,
              label: language === "en" ? sit.label_en || sit.label_he : sit.label_he,
            })),
          ],
          value: selectedTopic ?? "",
          onChange: (val) => setSelectedTopic(val || null),
        }
      : null;

  const groups: FilterGroup[] = [ageGroup, ...(situationGroup ? [situationGroup] : [])];

  return (
    <Container maxWidth="xl" sx={containerSx}>
      <Box sx={breadcrumbBoxSx}>
        <Link
          component={RouterLink}
          to={withLang("/books", language)}
          underline="hover"
          sx={{ color: "#824D5C", textDecoration: "none" }}
        >
          {t("nav.browse")}
        </Link>
        <span>/</span>
        <span>{categoryTitleDisplay}</span>
      </Box>

      <Box sx={{ mb: 2.5 }}>
        <Typography component="h1" sx={pageHeaderTitleSx}>
          {categoryTitleDisplay}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Typography sx={{ fontSize: "14px", color: "#4A4A4A" }}>
            {t("pages.categoryResults.storiesFound", { count: stories.length })}
          </Typography>
          <Box component="span" sx={countBadgeSx}>
            {stories.length} {t("catalog.stories")}
          </Box>
        </Box>
      </Box>

      <FilterBar lockedFilters={lockedFilters} groups={groups} />

      {stories.length > 0 ? (
        <Box sx={storyGridSx}>
          {stories.map((story) => (
            <StoryGridCard
              key={story.id}
              story={{
                ...story,
                ageGroup: (story as any).ageGroup,
                primaryTopic: (story as any).primaryTopic,
                specificSituation: (story as any).specificSituation,
                coverImageUrl: (story as any).coverImageUrl,
                category: (story as any).category ?? null,
              }}
            />
          ))}
          <SuggestStoryBanner variant="category" filterLabel={categoryTitleDisplay} />
        </Box>
      ) : (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            {t("pages.categoryResults.noStories")}
          </Typography>
          <Box sx={{ mt: 3 }}>
            <SuggestStoryBanner variant="category" filterLabel={categoryTitleDisplay} />
          </Box>
        </Box>
      )}
    </Container>
  );
}
