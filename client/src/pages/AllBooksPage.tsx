import {
  Box,
  Typography,
  Container,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Skeleton,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useEffect, useState, useMemo } from "react";
import { useLanguage } from "../i18n/context/useLanguage";
import { fetchStoriesWithFilters } from "../api/stories";
import StoryGridCard from "../components/StoryGridCard";
import type { Story } from "../api/stories";
import { AGE_GROUPS } from "../components/MegaMenu/data";
import { useTranslation } from "../i18n/useTranslation";

// Normalize age group for comparison (handles "0-3", "0_3", etc.)
// Converts to "0_3" format to match database storage format
function normalizeAgeGroup(value?: string): string | null {
  if (!value) return null;
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "") // remove spaces
    .replace(/[–-]/g, "_"); // dash or en-dash → underscore (database uses "0_3" format)
}

const filterBarSurfaceSx = {
  bgcolor: (theme: { palette: { primary: { main: string } } }) =>
    alpha(theme.palette.primary.main, 0.04),
  border: "0.5px solid",
  borderColor: "divider",
  borderRadius: 3,
  px: 2.5,
  py: 1.75,
  mb: 5,
  display: "flex",
  alignItems: "center",
  gap: 2,
  flexWrap: "wrap" as const,
};

function CatalogHeader({
  t,
  count,
  showCountChip,
}: {
  t: (key: string, params?: Record<string, string | number>) => string;
  count: number;
  showCountChip: boolean;
}) {
  return (
    <Box sx={{ mb: 4 }}>
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

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
        <Typography variant="h4" fontWeight={500} color="text.primary">
          {t("pages.allBooks.title")}
        </Typography>

        {showCountChip && (
          <Box
            component="span"
            sx={{
              fontSize: "0.75rem",
              px: 1.25,
              py: 0.4,
              borderRadius: "20px",
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
              color: "primary.main",
            }}
          >
            {t("pages.allBooks.storiesFound", { count })}
          </Box>
        )}
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {t("pages.allBooks.subtitle")}
      </Typography>
    </Box>
  );
}

export default function AllBooksPage() {
  const { isRTL } = useLanguage();
  const [allBooks, setAllBooks] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAge, setSelectedAge] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const t = useTranslation();

  const filterDirection = isRTL ? "rtl" : "ltr";

  // Fetch all books once
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

  // Extract unique categories and topics from allBooks
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

  const availableTopics = useMemo(() => {
    const topics = new Set<string>();
    allBooks.forEach((book) => {
      const topic = (book as any).specificSituation || (book as any).topicKey;
      if (topic) {
        topics.add(topic);
      }
    });
    return Array.from(topics).sort();
  }, [allBooks]);

  // Apply filters client-side
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

  const handleClearFilters = () => {
    setSelectedAge("");
    setSelectedCategory("");
    setSelectedTopic("");
  };

  const hasActiveFilters = Boolean(selectedAge || selectedCategory || selectedTopic);

  const gridSx = {
    display: "grid",
    gridTemplateColumns: {
      xs: "1fr",
      sm: "repeat(2, 1fr)",
      md: "repeat(3, 1fr)",
    },
    gap: 3.5,
    mt: 1,
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ px: { xs: 2, md: 4 }, py: 4 }}>
        <CatalogHeader t={t} count={0} showCountChip={false} />

        <Box sx={filterBarSurfaceSx}>
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ marginInlineEnd: 0.5, whiteSpace: "nowrap" }}
          >
            {t("filters.filterBy")}
          </Typography>
          <Skeleton variant="rounded" width={140} height={40} />
          <Skeleton variant="rounded" width={160} height={40} />
          <Skeleton variant="rounded" width={160} height={40} />
        </Box>

        <Box sx={{ ...gridSx, mt: 2 }}>
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
      <Container maxWidth="xl" sx={{ px: { xs: 2, md: 4 }, py: 8, textAlign: "center" }}>
        <Typography variant="h5" color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
        <Typography color="text.secondary">{t("pages.allBooks.errorMessage")}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ px: { xs: 2, md: 4 }, py: 4 }}>
      <CatalogHeader t={t} count={filteredBooks.length} showCountChip />

      <Box sx={filterBarSurfaceSx}>
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ marginInlineEnd: 0.5, whiteSpace: "nowrap" }}
        >
          {t("filters.filterBy")}
        </Typography>

        <FormControl
          size="small"
          sx={{ direction: filterDirection, minWidth: { xs: "100%", sm: 140 } }}
        >
          <InputLabel>{t("filters.age")}</InputLabel>
          <Select
            value={selectedAge}
            label={t("filters.age")}
            onChange={(e) => setSelectedAge(e.target.value)}
          >
            <MenuItem value="">{t("filters.allAges")}</MenuItem>
            {AGE_GROUPS.map((age) => (
              <MenuItem key={age.id} value={age.id || ""}>
                {age.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl
          size="small"
          sx={{ direction: filterDirection, minWidth: { xs: "100%", sm: 160 } }}
        >
          <InputLabel>{t("filters.category")}</InputLabel>
          <Select
            value={selectedCategory}
            label={t("filters.category")}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setSelectedTopic("");
            }}
          >
            <MenuItem value="">{t("filters.allCategories")}</MenuItem>
            {availableCategories.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl
          size="small"
          sx={{ direction: filterDirection, minWidth: { xs: "100%", sm: 160 } }}
        >
          <InputLabel>{t("filters.topic")}</InputLabel>
          <Select
            value={selectedTopic}
            label={t("filters.topic")}
            onChange={(e) => setSelectedTopic(e.target.value)}
          >
            <MenuItem value="">{t("filters.allTopics")}</MenuItem>
            {availableTopics.map((topic) => (
              <MenuItem key={topic} value={topic}>
                {topic}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {hasActiveFilters && (
          <Button
            size="small"
            onClick={handleClearFilters}
            sx={{
              marginInlineStart: "auto",
              color: "text.disabled",
              fontSize: "0.75rem",
              minWidth: "auto",
              "&:hover": { color: "text.secondary", bgcolor: "transparent" },
            }}
            disableRipple
          >
            {t("filters.clear")}
          </Button>
        )}
      </Box>

      {filteredBooks.length > 0 ? (
        <Box sx={gridSx}>
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
          {hasActiveFilters && (
            <Button
              variant="outlined"
              size="small"
              onClick={handleClearFilters}
              sx={{ mt: 1, borderRadius: 2 }}
            >
              {t("filters.clear")}
            </Button>
          )}
        </Box>
      )}
    </Container>
  );
}
