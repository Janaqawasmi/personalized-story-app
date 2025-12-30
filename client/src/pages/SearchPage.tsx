import { Box, Typography, Container, TextField, InputAdornment, CircularProgress } from "@mui/material";
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";
import { searchStories, StorySearchResult } from "../api/api";
import StoryGridCard from "../components/StoryGridCard";
import { formatAgeGroupLabel } from "../data/categories";

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") ?? "";
  
  const [searchText, setSearchText] = useState(query);
  const [results, setResults] = useState<StorySearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchedAgeGroup, setMatchedAgeGroup] = useState<string | null>(null);

  // Get age group from story (check multiple field locations)
  const getStoryAgeGroup = (story: StorySearchResult): string | undefined => {
    return (
      story.ageGroup ||
      story.targetAgeGroup ||
      story.generationConfig?.targetAgeGroup
    );
  };

  // Search when query param changes
  useEffect(() => {
    const performSearch = async () => {
      if (!query.trim()) {
        setResults([]);
        setMatchedAgeGroup(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await searchStories(query);
        setResults(response.results ?? []);
        setMatchedAgeGroup(response.matchedAgeGroup ?? null);
      } catch (err: any) {
        console.error("Search error:", err);
        setError(err.message || "חיפוש נכשל");
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [query]);

  // Update local state when URL query changes
  useEffect(() => {
    setSearchText(query);
  }, [query]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchText.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchText.trim())}`);
    }
  };

  const handleStoryClick = (storyId: string) => {
    // Navigate to story detail or personalization page
    navigate(`/story/${storyId}`);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Search Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>
          חיפוש סיפורים
        </Typography>
        
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit}>
          <TextField
            fullWidth
            placeholder="חפשו לפי שם, גיל או נושא (למשל: 0-3, פחד מהחושך)"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: "background.paper",
                borderRadius: 2,
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </form>

        {/* Search Info */}
        {query && (
          <Box sx={{ mt: 2 }}>
            {matchedAgeGroup ? (
              <Typography color="text.secondary">
                נמצאו {results.length} סיפורים לגיל {formatAgeGroupLabel(matchedAgeGroup)}
              </Typography>
            ) : (
              <Typography color="text.secondary">
                נמצאו {results.length} תוצאות עבור "{query}"
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Loading State */}
      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="h6" color="error">
            {error}
          </Typography>
        </Box>
      )}

      {/* Results */}
      {!isLoading && !error && query && (
        <>
          {results.length > 0 ? (
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
              {results.map((story) => {
                const ageGroup = getStoryAgeGroup(story);
                return (
                  <StoryGridCard
                    key={story.id}
                    title={story.title || "סיפור ללא שם"}
                    description={
                      ageGroup
                        ? `גיל: ${formatAgeGroupLabel(ageGroup)}`
                        : story.shortDescription
                    }
                    imageUrl={story.coverImage}
                    onClick={() => handleStoryClick(story.id)}
                  />
                );
              })}
            </Box>
          ) : (
            <Box sx={{ textAlign: "center", py: 8 }}>
              <Typography variant="h6" color="text.secondary">
                לא נמצאו תוצאות עבור "{query}"
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                נסו לחפש במילים אחרות או לפי גיל (למשל: 0-3, 3-6)
              </Typography>
            </Box>
          )}
        </>
      )}

      {/* Empty State (no query) */}
      {!isLoading && !error && !query && (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            הכנסו שאילתת חיפוש למעלה
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            תוכלו לחפש לפי שם סיפור, גיל (0-3, 3-6 וכו'), או נושא
          </Typography>
        </Box>
      )}
    </Container>
  );
}


