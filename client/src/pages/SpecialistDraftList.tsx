import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Container,
  Paper,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Refresh,
  CheckCircle,
  Edit,
  Error as ErrorIcon,
  Inbox,
  Search,
} from "@mui/icons-material";
import { fetchDraftsForReview, StoryDraftView, fetchStoryBriefs, StoryBrief } from "../api/api";
import { useNavigate, useLocation } from "react-router-dom";
import SpecialistNav from "../components/SpecialistNav";

// Helper to format age group for display
const formatAgeGroup = (ageGroup: string): string => {
  const mapping: Record<string, string> = {
    "0_3": "0–3",
    "3_6": "3–6",
    "6_9": "6–9",
    "9_12": "9–12",
  };
  return mapping[ageGroup] || ageGroup;
};

// Helper to format topic/situation for display (convert snake_case to Title Case)
const formatTopicLabel = (value: string): string => {
  if (!value) return "";
  return value
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

// Get status chip configuration
// NOTE: "editing" status now means "revised" (content has been modified), not "actively being edited"
const getStatusChip = (status: string | undefined) => {
  switch (status) {
    case "generated":
      return { label: "Generated", color: "success" as const, icon: <CheckCircle fontSize="small" /> };
    case "editing":
      return { label: "Revised", color: "info" as const, icon: <Edit fontSize="small" /> };
    case "approved":
      return { label: "Approved", color: "secondary" as const, icon: <CheckCircle fontSize="small" /> };
    case "failed":
      return { label: "Failed", color: "error" as const, icon: <ErrorIcon fontSize="small" /> };
    default:
      return { label: status || "Unknown", color: "default" as const, icon: null };
  }
};

// Get button label based on status
const getButtonLabel = (status: string | undefined): string => {
  switch (status) {
    case "generated":
      return "Start Review";
    case "editing":
      return "Continue Review"; // Changed from "Continue Editing" to reflect new semantics
    case "approved":
      return "View";
    case "failed":
      return "View Error";
    default:
      return "Review";
  }
};

type FilterTab = "all" | "generated" | "editing" | "approved" | "failed";

const SpecialistDraftList: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [drafts, setDrafts] = useState<StoryDraftView[]>([]);
  const [briefs, setBriefs] = useState<StoryBrief[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Load drafts and briefs in parallel
      const [draftsData, briefsData] = await Promise.all([
        fetchDraftsForReview(),
        fetchStoryBriefs(),
      ]);
      setDrafts(draftsData);
      setBriefs(briefsData);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || "Failed to load drafts");
    } finally {
      setLoading(false);
    }
  }, []);

  // Helper to get brief for a draft
  const getBriefForDraft = useCallback((draft: StoryDraftView): StoryBrief | null => {
    if (!draft.briefId) return null;
    return briefs.find(b => b.id === draft.briefId) || null;
  }, [briefs]);

  // Track if this is the initial mount
  const isInitialMount = useRef(true);

  // Load drafts on mount and when navigating back to this page
  useEffect(() => {
    // On initial mount, load immediately
    if (isInitialMount.current) {
      isInitialMount.current = false;
      loadDrafts();
      return;
    }

    // When navigating back to this page, refresh after a small delay
    if (location.pathname === "/specialist/drafts") {
      const timer = setTimeout(() => {
        loadDrafts();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, loadDrafts]);

  // Refresh when window regains focus (user returns to tab/window)
  useEffect(() => {
    const handleFocus = () => {
      // Only refresh if we're on the drafts list page and haven't updated recently
      if (location.pathname === "/specialist/drafts" && 
          (!lastUpdated || (Date.now() - lastUpdated.getTime()) > 2000)) {
    loadDrafts();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [lastUpdated, location.pathname, loadDrafts]);

  // Filter and search drafts
  const filteredDrafts = useMemo(() => {
    let filtered = drafts;

    // Filter by status tab
    if (filterTab === "generated") {
      filtered = filtered.filter((d) => d.status === "generated");
    } else if (filterTab === "editing") {
      filtered = filtered.filter((d) => d.status === "editing");
    } else if (filterTab === "approved") {
      filtered = filtered.filter((d) => d.status === "approved");
    } else if (filterTab === "failed") {
      filtered = filtered.filter((d) => d.status === "failed");
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (draft) =>
          (draft.title || "Untitled Draft").toLowerCase().includes(query) ||
          draft.generationConfig?.targetAgeGroup?.toLowerCase().includes(query) ||
          draft.generationConfig?.language?.toLowerCase().includes(query) ||
          draft.status?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [drafts, filterTab, searchQuery]);

  // Calculate status counts
  const statusCounts = useMemo(() => {
    return {
      all: drafts.length,
      generated: drafts.filter((d) => d.status === "generated").length,
      editing: drafts.filter((d) => d.status === "editing").length,
      approved: drafts.filter((d) => d.status === "approved").length,
      failed: drafts.filter((d) => d.status === "failed").length,
    };
  }, [drafts]);

  // Calculate pending drafts (not approved)
  const pendingDrafts = drafts.filter((d) => d.status !== "approved");
  const totalDrafts = drafts.length;

  const handleCardClick = (draftId: string) => {
    if (!loading) {
      navigate(`/specialist/drafts/${draftId}`);
    }
  };

  // Format time ago
  const getTimeAgo = (date: Date | null): string => {
    if (!date) return "";
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  };

  return (
    <>
      <SpecialistNav />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header Section */}
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} mb={3} spacing={2}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Drafts Awaiting Specialist Review
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" gap={1}>
              <Typography variant="body2" color="text.secondary">
                {totalDrafts} draft{totalDrafts !== 1 ? "s" : ""} • {pendingDrafts.length} pending
              </Typography>
              {lastUpdated && (
                <Typography variant="caption" color="text.secondary">
                  • Last updated {getTimeAgo(lastUpdated)}
                </Typography>
              )}
            </Stack>
          </Box>
          <Tooltip title="Refresh drafts">
            <IconButton
              onClick={loadDrafts}
              disabled={loading}
              color="primary"
              sx={{ 
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              {loading ? (
                <CircularProgress size={20} />
              ) : (
                <Refresh />
              )}
            </IconButton>
          </Tooltip>
      </Stack>

        {/* Error State */}
      {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" onClick={loadDrafts} disabled={loading}>
                Retry
              </Button>
            }
            onClose={() => setError(null)}
          >
          {error}
        </Alert>
      )}

        {/* Filters and Search */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
            Filter drafts
          </Typography>
          <Paper 
            sx={{ 
              p: 2, 
              bgcolor: "grey.50",
              border: "1px solid",
              borderColor: "divider"
            }}
          >
            <Stack spacing={2}>
              {/* Search */}
              <TextField
                fullWidth
                placeholder="Search by title, age group, language, or status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                size="small"
              />

              {/* Status Tabs */}
              <Tabs
                value={filterTab}
                onChange={(_, newValue) => setFilterTab(newValue)}
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab label={`All (${statusCounts.all})`} value="all" />
                <Tab label={`Generated (${statusCounts.generated})`} value="generated" />
                <Tab label={`Revised (${statusCounts.editing})`} value="editing" />
                <Tab label={`Approved (${statusCounts.approved})`} value="approved" />
                <Tab label={`Failed (${statusCounts.failed})`} value="failed" />
              </Tabs>
            </Stack>
          </Paper>
        </Box>

        {/* Loading State */}
        {loading && drafts.length === 0 ? (
          <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={2}>
            {/* Draft Cards */}
            {filteredDrafts.length === 0 && !loading ? (
              <Paper
                sx={{
                  p: 6,
                  textAlign: "center",
                  bgcolor: "grey.50",
                }}
              >
                <Inbox sx={{ fontSize: 64, color: "text.secondary", mb: 2, opacity: 0.5 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {searchQuery || filterTab !== "all"
                    ? "No drafts match your filters"
                    : "All caught up!"}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {searchQuery || filterTab !== "all"
                    ? "Try adjusting your search or filter criteria"
                    : "No drafts are waiting for review."}
                </Typography>
                {(searchQuery || filterTab !== "all") && (
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setSearchQuery("");
                      setFilterTab("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </Paper>
            ) : (
              filteredDrafts.map((draft) => {
              const statusChip = getStatusChip(draft.status);
              const buttonLabel = getButtonLabel(draft.status);
              const ageGroup = draft.generationConfig?.targetAgeGroup 
                ? formatAgeGroup(draft.generationConfig.targetAgeGroup) 
                : "N/A";
              const brief = getBriefForDraft(draft);
              const topic = brief?.therapeuticFocus?.primaryTopic 
                ? formatTopicLabel(brief.therapeuticFocus.primaryTopic) 
                : null;
              const situation = brief?.therapeuticFocus?.specificSituation 
                ? formatTopicLabel(brief.therapeuticFocus.specificSituation) 
                : null;

              return (
                <Card
                  key={draft.id}
                  variant="outlined"
                  sx={{
                    cursor: loading ? "default" : "pointer",
                    transition: "all 0.2s ease-in-out",
                    "&:hover": {
                      boxShadow: 3,
                      transform: "translateY(-2px)",
                      borderColor: "primary.main",
                    },
                    "&:focus-within": {
                      outline: "2px solid",
                      outlineColor: "primary.main",
                      outlineOffset: 2,
                    },
                  }}
                  onClick={() => handleCardClick(draft.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleCardClick(draft.id);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Review draft: ${draft.title || "Untitled Draft"}`}
                >
              <CardContent>
                    <Stack 
                      direction={{ xs: "column", sm: "row" }} 
                      spacing={2} 
                      alignItems={{ xs: "flex-start", sm: "center" }} 
                      justifyContent="space-between"
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" gap={1} mb={1}>
                          <Typography variant="h6" sx={{ flex: 1, minWidth: 200 }}>
                            {draft.title || "Untitled Draft"}
                          </Typography>
                          <Chip
                            icon={statusChip.icon || undefined}
                            label={statusChip.label}
                            color={statusChip.color}
                            size="small"
                            sx={{ fontWeight: 500 }}
                          />
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" gap={1}>
                          {topic && (
                            <Chip
                              label={`Topic: ${topic}`}
                              size="small"
                              variant="outlined"
                              sx={{ 
                                fontSize: "0.75rem",
                                height: 24,
                                "& .MuiChip-label": {
                                  px: 1,
                                },
                              }}
                            />
                          )}
                          {situation && (
                            <Chip
                              label={`Situation: ${situation}`}
                              size="small"
                              variant="outlined"
                              sx={{ 
                                fontSize: "0.75rem",
                                height: 24,
                                "& .MuiChip-label": {
                                  px: 1,
                                },
                              }}
                            />
                          )}
                          <Chip
                            label={`Age ${ageGroup}`}
                            size="small"
                            variant="outlined"
                            sx={{ 
                              fontSize: "0.75rem",
                              height: 24,
                              "& .MuiChip-label": {
                                px: 1,
                              },
                            }}
                          />
                          {draft.generationConfig?.language && (
                            <Chip
                              label={draft.generationConfig.language.toUpperCase()}
                              size="small"
                              variant="outlined"
                              sx={{ 
                                fontSize: "0.75rem",
                                height: 24,
                                "& .MuiChip-label": {
                                  px: 1,
                                },
                              }}
                            />
                          )}
                          {draft.revisionCount !== undefined && draft.revisionCount > 0 && (
                            <Typography variant="caption" color="text.secondary">
                              {draft.revisionCount} revision{draft.revisionCount !== 1 ? "s" : ""}
                    </Typography>
                          )}
                        </Stack>
                  </Box>
                      <Button
                        variant="contained"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCardClick(draft.id);
                        }}
                        sx={{
                          minWidth: { xs: "100%", sm: 140 },
                          mt: { xs: 1, sm: 0 },
                        }}
                      >
                        {buttonLabel}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
              );
            })
          )}
        </Stack>
      )}
      </Container>
    </>
  );
};

export default SpecialistDraftList;


