import {
    Box,
    TextField,
    Typography,
    Chip,
    IconButton,
    InputAdornment,
    useTheme,
  } from "@mui/material";
  import SearchIcon from "@mui/icons-material/Search";
  import CloseIcon from "@mui/icons-material/Close";
  import { useEffect, useMemo, useRef, useState } from "react";
  import { useNavigate } from "react-router-dom";
  import {
    collection,
    getDocs,
    query,
    where,
  } from "firebase/firestore";
  import { db } from "../../firebase";
  import { useReferenceData } from "../../hooks/useReferenceData";
  
  type SearchOverlayProps = {
    isOpen: boolean;
    onClose: () => void;
  };
  
  type StoryTemplate = {
    id: string;
    title?: string;
    primaryTopic?: string;
    specificSituation?: string;
    ageGroup?: string;
    targetAgeGroup?: string;
    language?: string;
    generationConfig?: {
      language?: string;
      targetAgeGroup?: string;
    };
    status?: string;
    createdAt?: any;
  };
  
  type Suggestion = {
    label: string;
    type: "situation" | "topic";
    id: string;
  };
  
  function getCurrentLanguage(): string {
    const fromStorage =
      (typeof window !== "undefined" && localStorage.getItem("lang")) || "";
    const norm = fromStorage.toLowerCase();
    if (["he", "he-il", "iw"].includes(norm)) return "he";
    if (["ar", "ar-sa", "ar-il"].includes(norm)) return "ar";
    return "he";
  }
  
  export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
    const theme = useTheme();
    const navigate = useNavigate();
    const { data: referenceData } = useReferenceData();
  
    const CURRENT_LANGUAGE = useMemo(() => getCurrentLanguage(), [isOpen]);
  
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<StoryTemplate[]>([]);
    const [suggestedSearches, setSuggestedSearches] = useState<Suggestion[]>([]);
    const [popularStories, setPopularStories] = useState<StoryTemplate[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  
    // Cache all approved stories for the current language
    const [allStoriesCache, setAllStoriesCache] = useState<StoryTemplate[]>([]);
  
    const [availableSituations, setAvailableSituations] = useState<Set<string>>(
      new Set()
    );
    const [availableTopics, setAvailableTopics] = useState<Set<string>>(new Set());
  
    const inputRef = useRef<HTMLInputElement>(null);
  
    // ------------------------------
    // Helpers
    // ------------------------------
  
    const getLabel = (id: string, type: "situation" | "topic"): string => {
      if (!referenceData) return id;
  
      if (type === "situation") {
        const s =
          referenceData.situations?.find((x) => x.id === id && x.active) || null;
        return CURRENT_LANGUAGE === "ar" ? (s?.label_ar || s?.label_he || id) : (s?.label_he || s?.label_ar || id);
      }
      const t =
        referenceData.topics?.find((x) => x.id === id && x.active) || null;
      return CURRENT_LANGUAGE === "ar" ? (t?.label_ar || t?.label_he || id) : (t?.label_he || t?.label_ar || id);
    };
  
    const formatAgeGroup = (ageGroup?: string): string => {
      if (!ageGroup) return "";
      // Handle both "0_3" and "0-3" formats
      const normalized = ageGroup.replace(/-/g, "_");
      if (normalized.startsWith("0_") || normalized.match(/^\d+_\d+$/)) {
        const parts = normalized.split("_");
        if (parts.length === 2) {
          return `לגיל ${parts[0]}–${parts[1]}`;
        }
      }
      // Fallback: try to format other patterns
      return `לגיל ${ageGroup.replace(/_/g, "–")}`;
    };

    /**
     * Normalize age group value for comparison
     * Converts "0-3", "0–3", "0_3" etc. to "0_3" format
     */
    const normalizeAgeGroup = (value?: string): string | null => {
      if (!value) return null;
      return value
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "") // remove spaces
        .replace(/[–-]/g, "_"); // dash or en-dash → underscore
    };
  
    const getStoryAge = (story: StoryTemplate): string | undefined => {
      return (
        story.ageGroup ||
        story.targetAgeGroup ||
        story.generationConfig?.targetAgeGroup
      );
    };

    const getStoryLanguage = (story: StoryTemplate): string | undefined => {
      return story.language || story.generationConfig?.language;
    };

    /**
     * NEW APPROACH: Fetch ALL approved stories, then filter by language in memory
     * This avoids Firestore's nested field query limitations
     */
    const fetchAllApprovedStories = async (): Promise<StoryTemplate[]> => {
      const storiesRef = collection(db, "story_templates");
      
      // Only query by status - we'll filter language in memory
      const q = query(storiesRef, where("status", "==", "approved"));
      
      const snap = await getDocs(q);
      
      const allStories = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<StoryTemplate, "id">),
      }));

      // Filter by language in memory
      return allStories.filter(story => {
        const lang = getStoryLanguage(story);
        return lang === CURRENT_LANGUAGE;
      });
    };
  
    // ------------------------------
    // Initial data (suggestions + popular)
    // ------------------------------
    useEffect(() => {
      if (!isOpen) {
        setSearchQuery("");
        setSearchResults([]);
        setSuggestedSearches([]);
        setPopularStories([]);
        setAvailableSituations(new Set());
        setAvailableTopics(new Set());
        setAllStoriesCache([]);
        setIsLoadingInitial(true);
        return;
      }
  
      const loadInitialData = async () => {
        setIsLoadingInitial(true);
  
        try {
          const allStories = await fetchAllApprovedStories();
          
          // Cache for searches
          setAllStoriesCache(allStories);
  
          // Popular stories
          setPopularStories(allStories.slice(0, 6));
  
          // Build distinct ids
          const situations = new Set<string>();
          const topics = new Set<string>();
  
          allStories.forEach((s) => {
            if (s.specificSituation) situations.add(s.specificSituation);
            if (s.primaryTopic) topics.add(s.primaryTopic);
          });
  
          setAvailableSituations(situations);
          setAvailableTopics(topics);
  
          // Build suggestions from actual data
          const fallback: Suggestion[] = [];
  
          Array.from(situations)
            .slice(0, 6)
            .forEach((id) => fallback.push({ label: id, type: "situation", id }));
  
          Array.from(topics)
            .slice(0, 4)
            .forEach((id) => fallback.push({ label: id, type: "topic", id }));
  
          // Upgrade labels to proper language
          const upgraded = fallback.map((s) => ({
            ...s,
            label: getLabel(s.id, s.type),
          }));
  
          const safeDefaults: Suggestion[] = [
            { label: "אח חדש", type: "situation", id: "new_sibling" },
            { label: "שינויים במשפחה", type: "topic", id: "family_changes" },
            { label: "פחד מהחושך", type: "situation", id: "fear_dark" },
            { label: "חרדת פרידה", type: "situation", id: "separation_anxiety" },
          ];
  
          setSuggestedSearches(
            upgraded.length > 0 ? upgraded.slice(0, 8) : safeDefaults
          );
        } catch (e) {
          setSuggestedSearches([
            { label: "אח חדש", type: "situation", id: "new_sibling" },
            { label: "שינויים במשפחה", type: "topic", id: "family_changes" },
          ]);
          setPopularStories([]);
          console.error("[SearchOverlay] Initial data error:", e);
        } finally {
          setIsLoadingInitial(false);
        }
      };
  
      loadInitialData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, CURRENT_LANGUAGE]);
  
    useEffect(() => {
      if (isOpen && inputRef.current) {
        setTimeout(() => inputRef.current?.focus(), 80);
      }
    }, [isOpen]);
  
    useEffect(() => {
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === "Escape" && isOpen) onClose();
      };
      window.addEventListener("keydown", handleEsc);
      return () => window.removeEventListener("keydown", handleEsc);
    }, [isOpen, onClose]);
  
    // ------------------------------
    // Search logic - ALL IN MEMORY
    // ------------------------------
  
    const resolveMatchByReferenceData = (term: string) => {
      const searchLower = term.toLowerCase().trim();
      let situationId: string | undefined;
      let topicId: string | undefined;
  
      if (referenceData?.situations?.length) {
        const s = referenceData.situations.find((x) => {
          const labelHe = (x.label_he || "").toLowerCase();
          const labelAr = (x.label_ar || "").toLowerCase();
          return x.active && (labelHe.includes(searchLower) || labelAr.includes(searchLower));
        });
        if (s) situationId = s.id;
      }
  
      if (!situationId && referenceData?.topics?.length) {
        const t = referenceData.topics.find((x) => {
          const labelHe = (x.label_he || "").toLowerCase();
          const labelAr = (x.label_ar || "").toLowerCase();
          return x.active && (labelHe.includes(searchLower) || labelAr.includes(searchLower));
        });
        if (t) topicId = t.id;
      }
  
      return { situationId, topicId };
    };
  
    const performSearchByField = (field: "specificSituation" | "primaryTopic", value: string) => {
      setIsSearching(true);
      
      try {
        // Filter from cache
        const results = allStoriesCache.filter(story => story[field] === value);
        setSearchResults(results.slice(0, 30));
      } catch (e) {
        console.error("[SearchOverlay] search-by-field error:", e);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };
  
    // Parse age group from query (handles "0-3", "0_3", "0 – 3", etc.)
    const parseAgeGroupFromQuery = (q: string): string | null => {
      if (!q) return null;

      const normalized = q
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "") // remove spaces
        .replace(/years|year|yrs|yr/g, "") // remove year words
        .replace(/[–-]/g, "_"); // convert dash/en-dash to underscore

      // Check against known age group IDs
      const ageGroups = ["0_3", "3_6", "6_9", "9_12"];
      return ageGroups.includes(normalized) ? normalized : null;
    };

    const performSearch = (term: string) => {
      const clean = term.trim();
      if (!clean) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);

      try {
        // Priority 0: Check if query is an age group
        const ageGroupId = parseAgeGroupFromQuery(clean);
        if (ageGroupId) {
          // Debug logging (temporary - can be removed after verification)
          console.log("[SearchOverlay] QUERY ageGroupId:", ageGroupId);
          
          const filtered = allStoriesCache.filter((s) => {
            const storyAge =
              s.ageGroup ||
              s.targetAgeGroup ||
              s.generationConfig?.targetAgeGroup;
            
            // Normalize both sides before comparison
            const normalizedStoryAge = normalizeAgeGroup(storyAge);
            
            // Debug logging (temporary)
            if (s.id === allStoriesCache[0]?.id) {
              console.log("[SearchOverlay] STORY age raw:", storyAge);
              console.log("[SearchOverlay] STORY age normalized:", normalizedStoryAge);
            }
            
            return normalizedStoryAge === ageGroupId;
          });
          setSearchResults(filtered.slice(0, 30));
          setIsSearching(false);
          return;
        }

        // Priority 1: match against reference labels (situations/topics)
        const { situationId, topicId } = resolveMatchByReferenceData(clean);

        // Priority 1b: if referenceData not ready, but term equals a known id, treat it as id
        const rawLower = clean.toLowerCase();
        const rawSituationId = availableSituations.has(rawLower) ? rawLower : undefined;
        const rawTopicId = availableTopics.has(rawLower) ? rawLower : undefined;

        if (situationId || rawSituationId) {
          performSearchByField("specificSituation", situationId || rawSituationId!);
          return;
        }

        if (topicId || rawTopicId) {
          performSearchByField("primaryTopic", topicId || rawTopicId!);
          return;
        }

        // Fallback: filter by title from cache
        const q = clean.toLowerCase();
        const filtered = allStoriesCache.filter((s) =>
          (s.title || "").toLowerCase().includes(q)
        );

        setSearchResults(filtered.slice(0, 30));
      } catch (e) {
        console.error("[SearchOverlay] search error:", e);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };
  
    // Debounce
    useEffect(() => {
      if (!isOpen) return;
  
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
  
      const timer = setTimeout(() => {
        performSearch(searchQuery);
      }, 260);
  
      return () => clearTimeout(timer);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, isOpen]);
  
    const handleChipClick = (s: Suggestion) => {
      setSearchQuery(s.label);
  
      if (s.type === "situation") {
        performSearchByField("specificSituation", s.id);
      } else {
        performSearchByField("primaryTopic", s.id);
      }
    };
  
    const handleStoryClick = (storyId: string) => {
      navigate(`/story/${storyId}`);
      onClose();
    };
  
    if (!isOpen) return null;
  
    const hasQuery = searchQuery.trim().length > 0;
    const showSuggestions = !hasQuery;
  
    return (
      <>
        <Box
          sx={{
            position: "fixed",
            top: 64,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: theme.palette.background.default,
            zIndex: 1200,
            pointerEvents: "auto",
          }}
          onClick={onClose}
        />
  
        <Box
          sx={{
            position: "fixed",
            top: 64,
            left: 0,
            right: 0,
            backgroundColor: theme.palette.background.default,
            zIndex: 1201,
            maxHeight: "calc(100vh - 64px)",
            overflowY: "auto",
            direction: "rtl",
            pointerEvents: "auto",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Box sx={{ maxWidth: 800, mx: "auto", px: 3, py: 3 }}>
            <Typography
              sx={{
                fontSize: "1.1rem",
                fontWeight: 700,
                mb: 1,
                color: theme.palette.text.primary,
                textAlign: "right",
              }}
            >
              חפשו סיפור שמתאים לילד שלכם
            </Typography>
            <Typography
              sx={{
                fontSize: "0.9rem",
                color: theme.palette.text.secondary,
                mb: 3,
                textAlign: "right",
              }}
            >
              חפשו לפי רגש, גיל או מצב (למשל: פחד מהחושך)
            </Typography>
  
            <Box sx={{ position: "relative", mb: 4 }}>
              <TextField
                inputRef={inputRef}
                fullWidth
                placeholder="חפשו לפי רגש, גיל או מצב (למשל: פחד מהחושך)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim()) {
                    e.preventDefault();
                    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                    onClose();
                  }
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: theme.palette.background.paper,
                    borderRadius: 2,
                    "& fieldset": { borderColor: theme.palette.divider },
                    "&:hover fieldset": { borderColor: theme.palette.primary.main },
                    "&.Mui-focused fieldset": { borderColor: theme.palette.primary.main },
                  },
                  "& .MuiInputBase-input": {
                    direction: "rtl",
                    textAlign: "right",
                    fontSize: "1rem",
                    py: 1.4,
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: theme.palette.text.secondary }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={onClose}
                        sx={{
                          color: theme.palette.text.secondary,
                          "&:hover": { color: theme.palette.text.primary },
                        }}
                        aria-label="close"
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
  
            {isLoadingInitial ? (
              <Typography sx={{ color: theme.palette.text.secondary, textAlign: "center", py: 4 }}>
                טוען...
              </Typography>
            ) : showSuggestions ? (
              <>
                <Box sx={{ mb: 5 }}>
                  <Typography
                    sx={{
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      color: theme.palette.text.secondary,
                      mb: 2,
                      textAlign: "right",
                    }}
                  >
                    חיפושים מוצעים
                  </Typography>
  
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 1.2,
                      flexDirection: "row-reverse",
                    }}
                  >
                    {suggestedSearches.map((s) => (
                      <Chip
                        key={`${s.type}-${s.id}`}
                        label={s.label}
                        onClick={() => handleChipClick(s)}
                        sx={{
                          backgroundColor: theme.palette.background.paper,
                          border: `1px solid ${theme.palette.divider}`,
                          color: theme.palette.text.primary,
                          cursor: "pointer",
                          "&:hover": {
                            backgroundColor: theme.palette.primary.main,
                            color: theme.palette.background.paper,
                            borderColor: theme.palette.primary.main,
                          },
                          transition: "all 0.18s ease",
                        }}
                      />
                    ))}
                  </Box>
  
                  <Typography
                    sx={{
                      mt: 2,
                      color: theme.palette.text.secondary,
                      fontSize: "0.9rem",
                      textAlign: "right",
                    }}
                  >
                    לא בטוחים מה לחפש? אנחנו כאן כדי לעזור
                  </Typography>
                </Box>
  
                <Box>
                  <Typography
                    sx={{
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      color: theme.palette.text.secondary,
                      mb: 2,
                      textAlign: "right",
                    }}
                  >
                    סיפורים אהובים
                  </Typography>
  
                  {popularStories.length === 0 ? (
                    <Typography sx={{ color: theme.palette.text.secondary, textAlign: "right" }}>
                      עדיין אין סיפורים פופולריים – נסו לבחור חיפוש מוצע.
                    </Typography>
                  ) : (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      {popularStories.map((story) => {
                        const age = getStoryAge(story);
                        const situation = story.specificSituation
                          ? getLabel(story.specificSituation, "situation")
                          : "";
                        const topic = story.primaryTopic
                          ? getLabel(story.primaryTopic, "topic")
                          : "";
                        const secondary = situation || topic;
  
                        return (
                          <Box
                            key={story.id}
                            onClick={() => handleStoryClick(story.id)}
                            sx={{
                              py: 1.2,
                              px: 2,
                              borderRadius: 1,
                              cursor: "pointer",
                              backgroundColor: theme.palette.background.paper,
                              border: "1px solid transparent",
                              transition: "all 0.18s ease",
                              "&:hover": {
                                borderColor: theme.palette.primary.main,
                                backgroundColor: theme.palette.background.default,
                              },
                            }}
                          >
                            <Typography sx={{ fontSize: "1rem", fontWeight: 500, mb: 0.4 }}>
                              {story.title || "סיפור ללא שם"}
                            </Typography>
                            <Typography sx={{ fontSize: "0.85rem", color: theme.palette.text.secondary }}>
                              {formatAgeGroup(age)}
                              {age && secondary ? " · " : ""}
                              {secondary}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </Box>
              </>
            ) : (
              <Box>
                {isSearching ? (
                  <Typography sx={{ color: theme.palette.text.secondary, textAlign: "center", py: 4 }}>
                    מחפש...
                  </Typography>
                ) : searchResults.length === 0 ? (
                  <Typography sx={{ color: theme.palette.text.secondary, textAlign: "center", py: 4 }}>
                    לא נמצאו תוצאות
                  </Typography>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {searchResults.map((story) => {
                      const age = getStoryAge(story);
                      const situation = story.specificSituation
                        ? getLabel(story.specificSituation, "situation")
                        : "";
                      const topic = story.primaryTopic
                        ? getLabel(story.primaryTopic, "topic")
                        : "";
                      const secondary = situation || topic;
  
                      return (
                        <Box
                          key={story.id}
                          onClick={() => handleStoryClick(story.id)}
                          sx={{
                            py: 1.2,
                            px: 2,
                            borderRadius: 1,
                            cursor: "pointer",
                            backgroundColor: theme.palette.background.paper,
                            border: "1px solid transparent",
                            transition: "all 0.18s ease",
                            "&:hover": {
                              borderColor: theme.palette.primary.main,
                              backgroundColor: theme.palette.background.default,
                            },
                          }}
                        >
                          <Typography sx={{ fontSize: "1rem", fontWeight: 500, mb: 0.4 }}>
                            {story.title || "סיפור ללא שם"}
                          </Typography>
                          <Typography sx={{ fontSize: "0.85rem", color: theme.palette.text.secondary }}>
                            {formatAgeGroup(age)}
                            {age && secondary ? " · " : ""}
                            {secondary}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </>
    );
  }