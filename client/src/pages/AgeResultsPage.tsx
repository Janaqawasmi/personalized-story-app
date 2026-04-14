import { Box, Typography, Container, Button, Link } from "@mui/material";
import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useParams, useLocation } from "react-router-dom";
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

  const ageGroupMeta = AGE_GROUPS.find((a) => a.id === ageId);

  useEffect(() => {
    if (location.state?.fromMegaMenu) {
      setSelectedCategory(location.state.category ?? null);
      setSelectedTopic(null);
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location.key, location.pathname, location.state?.category, location.state?.fromMegaMenu]);

  useEffect(() => {
    if (!ageId) return;

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
  }, [ageId, selectedCategory, selectedTopic, data, t]);

  const containerSx = { px: { xs: 2, md: 4 }, py: 3 };

  if (!ageGroupMeta) {
    return (
      <Container maxWidth="xl" sx={{ ...containerSx, py: 8, textAlign: "center" }}>
        <Typography variant="h5">{t("pages.ageResults.ageNotFound")}</Typography>
        <Button onClick={() => navigate("/")} sx={{ mt: 2 }}>
          {t("pages.placeholder.backToHome")}
        </Button>
      </Container>
    );
  }

  if (loading || !data) {
    return (
      <Container maxWidth="xl" sx={{ ...containerSx, py: 8, textAlign: "center" }}>
        <Typography>{t("pages.categoryResults.loading")}</Typography>
      </Container>
    );
  }

  const availableCategories = data.topics || [];
  const availableTopics =
    data.situations.filter((s) => !selectedCategory || s.topicKey === selectedCategory) || [];

  const ageLabel = ageGroupMeta.label;
  const lockedFilters: LockedFilter[] = [
    { label: `${ageLabel} ${t("filters.years")}` },
  ];

  const groupLabel = t("filters.groupTopics");

  const categoryGroup: FilterGroup = {
    type: "dropdown",
    key: "category",
    label: t("filters.category"),
    placeholder: t("filters.all"),
    searchable: true,
    grouped: true,
    options: [
      { value: "", label: t("filters.all") },
      ...availableCategories.map((tp) => ({
        value: tp.id,
        label: language === "en" ? tp.label_en || tp.label_he : tp.label_he,
        dotColor: getTopicColor(tp.id),
        category: tp.parentCategory ?? groupLabel,
      })),
    ],
    value: selectedCategory ?? "",
    onChange: (val) => {
      setSelectedCategory(val || null);
      setSelectedTopic(null);
    },
  };

  const topicGroup: FilterGroup | null =
    selectedCategory && availableTopics.length > 0
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

  const groups: FilterGroup[] = [categoryGroup, ...(topicGroup ? [topicGroup] : [])];

  const pageContextLabel = `${ageLabel} ${t("filters.years")}`;
  const pageTitle = t("pages.ageResults.title", { age: ageGroupMeta.label });

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
        <span>{pageContextLabel}</span>
      </Box>

      <Box sx={{ mb: 2.5 }}>
        <Typography component="h1" sx={pageHeaderTitleSx}>
          {pageTitle}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Typography sx={{ fontSize: "14px", color: "#4A4A4A" }}>
            {t("pages.ageResults.storiesFound", { count: stories.length })}
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
