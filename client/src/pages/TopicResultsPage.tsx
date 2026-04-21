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
  flexWrap: "wrap",
};

export default function TopicResultsPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useLangNavigate();
  const location = useLocation();
  const { data, loading } = useReferenceData();
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedAge, setSelectedAge] = useState<string | null>(null);
  const t = useTranslation();
  const { language } = useLanguage();

  useEffect(() => {
    if (location.state?.fromMegaMenu) {
      setSelectedAge(location.state.age ?? null);
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location.key, location.pathname, location.state?.age, location.state?.fromMegaMenu]);

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
  }, [topicId, selectedAge, t]);

  const containerSx = { px: { xs: 2, md: 4 }, py: 3 };

  if (loading || !data) {
    return (
      <Container maxWidth="xl" sx={{ ...containerSx, py: 8, textAlign: "center" }}>
        <Typography>{t("pages.topicResults.loading")}</Typography>
      </Container>
    );
  }

  const topic = data.situations.find((s) => s.id === topicId);

  if (!topic) {
    return (
      <Container maxWidth="xl" sx={{ ...containerSx, py: 8, textAlign: "center" }}>
        <Typography variant="h5">{t("pages.topicResults.topicNotFound")}</Typography>
        <Button onClick={() => navigate("/")} sx={{ mt: 2 }}>
          {t("pages.placeholder.backToHome")}
        </Button>
      </Container>
    );
  }

  const parentCategory = data.topics.find((top) => top.id === topic.topicKey);
  const categoryTitleHe = parentCategory?.label_he ?? topic.topicKey;
  const categoryTitleDisplay =
    language === "en"
      ? parentCategory?.label_en || categoryTitleHe
      : categoryTitleHe;

  const situationTitleHe = topic.label_he;
  const situationTitleDisplay =
    language === "en" ? topic.label_en || situationTitleHe : situationTitleHe;

  const lockedFilters: LockedFilter[] = [
    {
      label: situationTitleDisplay,
      dotColor: getTopicColor(topic.topicKey),
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

  const categoryPath =
    topic.topicKey != null && topic.topicKey !== ""
      ? withLang(`/stories/category/${topic.topicKey}`, language)
      : withLang("/books", language);

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
        <Link
          component={RouterLink}
          to={categoryPath}
          underline="hover"
          sx={{ color: "#824D5C", textDecoration: "none" }}
        >
          {categoryTitleDisplay}
        </Link>
        <span>/</span>
        <span>{situationTitleDisplay}</span>
      </Box>

      <Box sx={{ mb: 2.5 }}>
        <Typography component="h1" sx={pageHeaderTitleSx}>
          {situationTitleDisplay}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Typography sx={{ fontSize: "14px", color: "#4A4A4A" }}>
            {t("pages.topicResults.storiesFound", { count: stories.length })}
          </Typography>
          <Box component="span" sx={countBadgeSx}>
            {stories.length} {t("catalog.stories")}
          </Box>
        </Box>
      </Box>

      <FilterBar lockedFilters={lockedFilters} groups={[ageGroup]} />

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
          <SuggestStoryBanner variant="topic" filterLabel={situationTitleDisplay} />
        </Box>
      ) : (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            {t("pages.topicResults.noStories")}
          </Typography>
          <Box sx={{ mt: 3 }}>
            <SuggestStoryBanner variant="topic" filterLabel={situationTitleDisplay} />
          </Box>
        </Box>
      )}
    </Container>
  );
}
