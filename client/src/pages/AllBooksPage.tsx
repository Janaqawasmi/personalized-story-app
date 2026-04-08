import { Box, Typography, Container, Button, Skeleton } from "@mui/material";
import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchStoriesWithFilters } from "../api/stories";
import StoryGridCard from "../components/StoryGridCard";
import type { Story } from "../api/stories";
import { AGE_GROUPS } from "../components/MegaMenu/data";
import { useTranslation } from "../i18n/useTranslation";
import FilterBar from "../components/FilterBar/FilterBar";
import type { FilterGroup } from "../components/FilterBar/types";
import { getTopicColor } from "../constants/topicColors";
import { filterBarSx } from "../components/FilterBar/FilterBar.styles";

function normalizeAgeGroup(value?: string): string | null {
  if (!value) return null;
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/[–-]/g, "_");
}

const storyGridSx = {
  display: "grid",
  gridTemplateColumns: {
    xs: "1fr",
    sm: "repeat(2, 1fr)",
    md: "repeat(3, 1fr)",
    lg: "repeat(4, 1fr)",
  },
  gap: 2.5,
  mt: 1,
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

function CatalogHeader({
  t,
  count,
  showCountBadge,
}: {
  t: (key: string, params?: Record<string, string | number>) => string;
  count: number;
  showCountBadge: boolean;
}) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography
        variant="overline"
        sx={{
          fontSize: "0.7rem",
          letterSpacing: "0.1em",
          color: "text.secondary",
          display: "block",
          mb: 0.75,
        }}
      >
        {t("pages.allBooks.eyebrow")}
      </Typography>

      <Typography component="h1" sx={pageHeaderTitleSx}>
        {t("pages.allBooks.title")}
      </Typography>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Typography sx={{ fontSize: "14px", color: "#4A4A4A" }}>
          {t("pages.allBooks.subtitle")}
        </Typography>
        {showCountBadge ? (
          <Box component="span" sx={countBadgeSx}>
            {count} {t("catalog.stories")}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

export default function AllBooksPage() {
  const [searchParams] = useSearchParams();
  const [allBooks, setAllBooks] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAge, setSelectedAge] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const t = useTranslation();

  useEffect(() => {
    const topic = searchParams.get("topic");
    if (!topic || allBooks.length === 0) return;
    const match = allBooks.some(
      (b) => (b as any).primaryTopic === topic || (b as any).topicKey === topic
    );
    if (match) {
      setSelectedCategory(topic);
      setSelectedTopic("");
    }
  }, [searchParams, allBooks]);

  useEffect(() => {
    const loadStories = async () => {
      try {
        setLoading(true);
        setError(null);
        const results = await fetchStoriesWithFilters({});
        setAllBooks(results);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("pages.allBooks.error"));
      } finally {
        setLoading(false);
      }
    };

    loadStories();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once on mount; t() only used for error fallback
  }, []);

  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    allBooks.forEach((book) => {
      const category = (book as any).primaryTopic || (book as any).topicKey;
      if (category) {
        categories.add(category);
      }
    });
    return Array.from(categories).sort();
  }, [allBooks]);

  const topicOptions = useMemo(() => {
    const topics = new Set<string>();
    const pool = selectedCategory
      ? allBooks.filter(
          (book) =>
            (book as any).primaryTopic === selectedCategory ||
            (book as any).topicKey === selectedCategory
        )
      : [];
    pool.forEach((book) => {
      const topic = (book as any).specificSituation || (book as any).topicKey;
      if (topic && topic !== selectedCategory) {
        topics.add(topic);
      }
    });
    return Array.from(topics).sort();
  }, [allBooks, selectedCategory]);

  const filteredBooks = useMemo(() => {
    let filtered = [...allBooks];

    if (selectedAge) {
      const normalizedSelectedAge = normalizeAgeGroup(selectedAge);
      filtered = filtered.filter((book) => {
        const bookAge =
          (book as any).ageGroup ||
          book.targetAgeGroup ||
          (book as any).generationConfig?.targetAgeGroup;
        const normalizedBookAge = normalizeAgeGroup(bookAge);
        return normalizedBookAge === normalizedSelectedAge;
      });
    }

    if (selectedCategory) {
      filtered = filtered.filter(
        (book) =>
          (book as any).primaryTopic === selectedCategory ||
          (book as any).topicKey === selectedCategory
      );
    }

    if (selectedTopic) {
      filtered = filtered.filter(
        (book) =>
          (book as any).specificSituation === selectedTopic ||
          (book as any).topicKey === selectedTopic
      );
    }

    return filtered;
  }, [allBooks, selectedAge, selectedCategory, selectedTopic]);

  const handleClearAll = () => {
    setSelectedAge("");
    setSelectedCategory("");
    setSelectedTopic("");
  };

  const hasActiveFilters = Boolean(selectedAge || selectedCategory || selectedTopic);

  const graphCategoryLabel = t("filters.groupTopics");

  const categoryOptions = useMemo(
    () => availableCategories.map((cat) => ({ key: cat, label: cat })),
    [availableCategories]
  );

  const ageGroup: FilterGroup = {
    type: "chips",
    key: "age",
    label: t("filters.age"),
    options: [
      { value: "", label: t("filters.allAges") },
      ...AGE_GROUPS.map((ag) => ({ value: ag.id ?? "", label: ag.label })),
    ],
    value: selectedAge,
    onChange: setSelectedAge,
  };

  const categoryGroup: FilterGroup = {
    type: "dropdown",
    key: "category",
    label: t("filters.category"),
    placeholder: t("filters.allCategories"),
    searchable: true,
    grouped: true,
    options: [
      { value: "", label: t("filters.allCategories") },
      ...categoryOptions.map((cat) => ({
        value: cat.key,
        label: cat.label,
        dotColor: getTopicColor(cat.key),
        category: graphCategoryLabel,
      })),
    ],
    value: selectedCategory,
    onChange: (val) => {
      setSelectedCategory(val);
      setSelectedTopic("");
    },
  };

  const topicGroup: FilterGroup | null =
    selectedCategory && topicOptions.length > 0
      ? {
          type: "dropdown",
          key: "topic",
          label: t("filters.topic"),
          placeholder: t("filters.allTopics"),
          searchable: topicOptions.length > 8,
          grouped: false,
          options: [
            { value: "", label: t("filters.allTopics") },
            ...topicOptions.map((tp) => ({ value: tp, label: tp })),
          ],
          value: selectedTopic,
          onChange: setSelectedTopic,
        }
      : null;

  const filterGroups: FilterGroup[] = [
    ageGroup,
    categoryGroup,
    ...(topicGroup ? [topicGroup] : []),
  ];

  const containerSx = { px: { xs: 2, md: 4 }, py: 3 };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={containerSx}>
        <CatalogHeader t={t} count={0} showCountBadge={false} />

        <Box sx={{ ...filterBarSx, mb: 3 }}>
          <Skeleton variant="rounded" width={120} height={32} sx={{ borderRadius: "20px" }} />
          <Skeleton variant="rounded" width={100} height={32} sx={{ borderRadius: "20px" }} />
          <Skeleton variant="rounded" width={140} height={32} sx={{ borderRadius: "20px" }} />
        </Box>

        <Box sx={{ ...storyGridSx, mt: 2 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Box
              key={i}
              sx={{
                border: "0.5px solid",
                borderColor: "divider",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <Skeleton variant="rectangular" width="100%" sx={{ aspectRatio: "4/3" }} />
              <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                <Skeleton variant="text" width="45%" height={12} />
                <Skeleton variant="text" width="75%" height={18} />
                <Skeleton variant="text" width="100%" height={12} />
                <Skeleton variant="text" width="88%" height={12} />
                <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
                  <Skeleton variant="rounded" width={60} height={22} />
                  <Skeleton variant="rounded" width={80} height={28} />
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ ...containerSx, py: 8, textAlign: "center" }}>
        <Typography variant="h5" color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
        <Typography color="text.secondary">{t("pages.allBooks.errorMessage")}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={containerSx}>
      <CatalogHeader t={t} count={filteredBooks.length} showCountBadge />

      <FilterBar groups={filterGroups} onClearAll={handleClearAll} />

      {filteredBooks.length > 0 ? (
        <Box sx={storyGridSx}>
          {filteredBooks.map((story) => (
            <StoryGridCard
              key={story.id}
              story={{
                ...story,
                title: story.title || t("search.storyWithoutName"),
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
        <Box
          sx={{
            textAlign: "center",
            py: 10,
            px: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Box sx={{ fontSize: "2.5rem", opacity: 0.4, mb: 1 }} aria-hidden>
            📚
          </Box>
          <Typography variant="h6" fontWeight={500} color="text.primary">
            {t("pages.allBooks.noStories")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("pages.allBooks.noStoriesSub")}
          </Typography>
          {hasActiveFilters ? (
            <Button
              variant="outlined"
              size="small"
              onClick={handleClearAll}
              sx={{ mt: 1, borderRadius: 2 }}
            >
              {t("filters.clear")}
            </Button>
          ) : null}
        </Box>
      )}
    </Container>
  );
}
