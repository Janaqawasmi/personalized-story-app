import {
  Box,
  Typography,
  Container,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from "@mui/material";
import { useEffect, useState, useMemo } from "react";
import { useLangNavigate } from "../i18n/navigation";
import { fetchStoriesWithFilters } from "../api/stories";
import StoryGridCard from "../components/StoryGridCard";
import type { Story } from "../api/stories";
import { AGE_GROUPS } from "../components/MegaMenu/data";

// Normalize age group for comparison (handles "0-3", "0_3", etc.)
function normalizeAgeGroup(value?: string): string | null {
  if (!value) return null;
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "") // remove spaces
    .replace(/[–-]/g, "-"); // dash or en-dash → hyphen (AGE_GROUPS uses "0-3" format)
}

export default function AllBooksPage() {
  const navigate = useLangNavigate();
  const [allBooks, setAllBooks] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAge, setSelectedAge] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");

  // Fetch all books once
  useEffect(() => {
    const loadStories = async () => {
      try {
        setLoading(true);
        setError(null);
        const results = await fetchStoriesWithFilters({});
        setAllBooks(results);
      } catch (err) {
        setError(err instanceof Error ? err.message : "שגיאה בטעינת הסיפורים");
      } finally {
        setLoading(false);
      }
    };

    loadStories();
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

    // Age filter
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

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(
        (book) =>
          (book as any).primaryTopic === selectedCategory ||
          (book as any).topicKey === selectedCategory
      );
    }

    // Topic filter
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

  const hasActiveFilters = selectedAge || selectedCategory || selectedTopic;

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: "center" }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>טוען סיפורים...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: "center" }}>
        <Typography variant="h5" color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
        <Typography color="text.secondary">
          נסה לרענן את הדף או חזור לדף הבית
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          כל הסיפורים
        </Typography>
        <Typography color="text.secondary">
          {filteredBooks.length} סיפורים נמצאו
        </Typography>
      </Box>

      {/* Filters */}
      <Box
        sx={{
          mb: 4,
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 2,
          alignItems: { xs: "flex-start", md: "flex-end" },
        }}
      >
        {/* Age Filter */}
        <FormControl sx={{ minWidth: { xs: "100%", md: 180 }, direction: "rtl" }}>
          <InputLabel>גיל</InputLabel>
          <Select
            value={selectedAge}
            label="גיל"
            onChange={(e) => setSelectedAge(e.target.value)}
          >
            <MenuItem value="">כל הגילאים</MenuItem>
            {AGE_GROUPS.map((age) => (
              <MenuItem key={age.id} value={age.id || ""}>
                {age.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Category Filter */}
        <FormControl sx={{ minWidth: { xs: "100%", md: 180 }, direction: "rtl" }}>
          <InputLabel>קטגוריה</InputLabel>
          <Select
            value={selectedCategory}
            label="קטגוריה"
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              // Clear topic when category changes
              setSelectedTopic("");
            }}
          >
            <MenuItem value="">כל הקטגוריות</MenuItem>
            {availableCategories.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Topic Filter */}
        <FormControl sx={{ minWidth: { xs: "100%", md: 180 }, direction: "rtl" }}>
          <InputLabel>נושא</InputLabel>
          <Select
            value={selectedTopic}
            label="נושא"
            onChange={(e) => setSelectedTopic(e.target.value)}
          >
            <MenuItem value="">כל הנושאים</MenuItem>
            {availableTopics.map((topic) => (
              <MenuItem key={topic} value={topic}>
                {topic}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            variant="outlined"
            onClick={handleClearFilters}
            sx={{
              minWidth: "auto",
              height: "28px",
              fontSize: "12px",
              px: 1.25,
              py: 0,
              lineHeight: 1,
              borderRadius: "8px",
              alignSelf: "flex-end",
            }}
          >
            נקה מסננים
          </Button>
        )}
      </Box>

      {/* Stories Grid */}
      {filteredBooks.length > 0 ? (
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
          {filteredBooks.map((story) => (
            <StoryGridCard
              key={story.id}
              title={story.title || "סיפור ללא שם"}
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
            לא נמצאו סיפורים
          </Typography>
        </Box>
      )}
    </Container>
  );
}
