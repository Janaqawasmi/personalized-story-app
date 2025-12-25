import { Box, Typography, Container, Button } from "@mui/material";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchStoriesWithFilters } from "../api/stories";
import { useReferenceData } from "../hooks/useReferenceData";
import { AGE_GROUPS } from "../components/MegaMenu/data";
import { COLORS } from "../theme";
import StoryGridCard from "../components/StoryGridCard";
import type { Story } from "../api/stories";

export default function AgeResultsPage() {
  const { ageId } = useParams<{ ageId: string }>();
  const navigate = useNavigate();
  const { data, loading } = useReferenceData();
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const ageGroup = AGE_GROUPS.find((a) => a.id === ageId);

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
          title: s.title ?? "סיפור ללא שם",
        }))
      );
    });
  }, [ageId, selectedCategory, selectedTopic, data]);

  if (!ageGroup) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: "center" }}>
        <Typography variant="h5">גיל לא נמצא</Typography>
        <Button onClick={() => navigate("/")} sx={{ mt: 2 }}>
          חזרה לדף הבית
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
          סיפורים לגיל {ageGroup.label}
        </Typography>
        <Typography color="text.secondary">
          {stories.length} סיפורים נמצאו
        </Typography>
      </Box>

      {/* Filters */}
      <Box sx={{ mb: 4 }}>
        {/* Category Filter */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontWeight: 600, mb: 2 }}>
            קטגוריה (אופציונלי)
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
              הכל
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
                {cat.label_he}
              </Button>
            ))}
          </Box>
        </Box>

        {/* Topic Filter */}
        {selectedCategory && (
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontWeight: 600, mb: 2 }}>
              נושא (אופציונלי)
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              <Button
                variant={selectedTopic === null ? "contained" : "outlined"}
                size="small"
                onClick={() => setSelectedTopic(null)}
              >
                הכל
              </Button>
              {availableTopics.map((topic) => (
                <Button
                  key={topic.id}
                  variant={selectedTopic === topic.id ? "contained" : "outlined"}
                  size="small"
                  onClick={() => setSelectedTopic(topic.id)}
                >
                  {topic.label_he}
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
              md: "1fr 1fr 1fr 1fr",
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
                // Navigate to story detail or personalization
                console.log("Story selected:", story.id);
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

