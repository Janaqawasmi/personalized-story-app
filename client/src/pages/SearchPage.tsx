import { Box, Typography, Container, TextField, InputAdornment, CircularProgress } from "@mui/material";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLangNavigate } from "../i18n/navigation";
import SearchIcon from "@mui/icons-material/Search";
import { searchStories, StorySearchResult } from "../api/api";
import StoryGridCard from "../components/StoryGridCard";
import { formatAgeGroupLabel } from "../data/categories";
import { useTranslation } from "../i18n/useTranslation";

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useLangNavigate();
  const query = searchParams.get("q") ?? "";
  const t = useTranslation();
  
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
        setError(err.message || t("searchPage.searchFailed"));
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
          {t("searchPage.title")}
        </Typography>
        
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit}>
          <TextField
            fullWidth
            placeholder={t("searchPage.placeholder")}
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
                {t("searchPage.foundForAge", { count: results.length, age: formatAgeGroupLabel(matchedAgeGroup) })}
              </Typography>
            ) : (
              <Typography color="text.secondary">
                {t("searchPage.foundForQuery", { count: results.length, query })}
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
                    title={story.title || t("search.storyWithoutName")}
                    description={
                      ageGroup
                        ? `${t("filters.age")}: ${formatAgeGroupLabel(ageGroup)}`
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
                {t("searchPage.noResults", { query })}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                {t("searchPage.tryDifferent")}
              </Typography>
            </Box>
          )}
        </>
      )}

      {/* Empty State (no query) */}
      {!isLoading && !error && !query && (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            {t("searchPage.enterQuery")}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {t("searchPage.searchHint")}
          </Typography>
        </Box>
      )}
    </Container>
  );
}


