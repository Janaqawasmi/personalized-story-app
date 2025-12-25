import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Divider,
  Tooltip,
  Paper,
  Container,
} from "@mui/material";
import {
  CheckCircle,
  RadioButtonUnchecked,
  Autorenew,
  Visibility,
  Refresh,
  Search,
  Launch,
} from "@mui/icons-material";
import { fetchStoryBriefs, generateDraftFromBrief, StoryBrief } from "../api/api";
import SpecialistNav from "../components/SpecialistNav";

// Helper function to derive display title from StoryBrief fields
function getBriefDisplayTitle(brief: StoryBrief): string {
  const topic = brief.therapeuticFocus?.primaryTopic;
  const situation = brief.therapeuticFocus?.specificSituation;

  if (topic && situation) {
    return `${topic} → ${situation}`;
  }

  return "Untitled Brief";
}

// Helper function to format age group keys to readable format
function formatAgeGroup(ageGroup: string): string {
  const map: Record<string, string> = {
    "3_4": "3–4 years",
    "5_6": "5–6 years",
    "7_8": "7–8 years",
    "9_10": "9–12 years",
  };

  return map[ageGroup] || ageGroup;
}

// Helper function to format Firestore timestamps
function formatTimestamp(ts: any): string {
  if (!ts) return "—";
  
  if (typeof ts === 'object' && ts.seconds != null) {
    return new Date(ts.seconds * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  
  if (typeof ts === 'object' && ts._seconds != null) {
    return new Date(ts._seconds * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  
  if (typeof ts === 'string') {
    const date = new Date(ts);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  }
  
  if (ts instanceof Date) {
    return ts.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  
  return "—";
}

// Get status icon and color
function getStatusConfig(status: string) {
  switch (status) {
    case "draft_generated":
      return { icon: <CheckCircle />, color: "success" as const, label: "Draft Ready" };
    case "draft_generating":
      return { icon: <Autorenew />, color: "info" as const, label: "Generating" };
    case "created":
      return { icon: <RadioButtonUnchecked />, color: "default" as const, label: "Ready to Generate" };
    default:
      return { icon: null, color: "default" as const, label: status };
  }
}

type FilterTab = "all" | "ready" | "generating" | "generated";

const GenerateDraftPage: React.FC = () => {
  const navigate = useNavigate();
  const [briefs, setBriefs] = useState<StoryBrief[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");

  const loadBriefs = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await fetchStoryBriefs();
      setBriefs(data);
    } catch (err: any) {
      setError(err.message || "Failed to load story briefs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBriefs();
  }, []);

  const handleGenerateDraft = async (briefId: string) => {
    setGenerating(briefId);
    setError(null);
    setSuccess(null);
    try {
      await generateDraftFromBrief(briefId);
      setSuccess(`Draft generated successfully! You can now review it.`);
      // Reload briefs to update status
      await loadBriefs();
    } catch (err: any) {
      setError(err.message || "Failed to generate draft");
    } finally {
      setGenerating(null);
    }
  };

  // Filter and search briefs
  const filteredBriefs = useMemo(() => {
    let filtered = briefs;

    // Filter by status tab
    if (filterTab === "ready") {
      filtered = filtered.filter((b) => b.status === "created");
    } else if (filterTab === "generating") {
      filtered = filtered.filter((b) => b.status === "draft_generating");
    } else if (filterTab === "generated") {
      filtered = filtered.filter((b) => b.status === "draft_generated");
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (brief) =>
          getBriefDisplayTitle(brief).toLowerCase().includes(query) ||
          brief.therapeuticFocus?.primaryTopic?.toLowerCase().includes(query) ||
          brief.therapeuticFocus?.specificSituation?.toLowerCase().includes(query) ||
          brief.childProfile?.ageGroup?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [briefs, filterTab, searchQuery]);

  // Count briefs by status
  const statusCounts = useMemo(() => {
    return {
      all: briefs.length,
      ready: briefs.filter((b) => b.status === "created").length,
      generating: briefs.filter((b) => b.status === "draft_generating").length,
      generated: briefs.filter((b) => b.status === "draft_generated").length,
    };
  }, [briefs]);

  return (
    <>
      <SpecialistNav />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header Section */}
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} mb={3} spacing={2}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Generate Story Drafts
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Select a story brief to generate a draft from
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={loading ? <CircularProgress size={18} /> : <Refresh />}
            onClick={loadBriefs}
            disabled={loading}
          >
            Refresh
          </Button>
        </Stack>

        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert 
            severity="success" 
            sx={{ mb: 3 }} 
            onClose={() => setSuccess(null)}
            action={
              <Button color="inherit" size="small" onClick={() => navigate("/specialist/drafts")}>
                View Drafts
              </Button>
            }
          >
            {success}
          </Alert>
        )}

        {/* Filters and Search */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Stack spacing={2}>
            {/* Search */}
            <TextField
              fullWidth
              placeholder="Search by topic, situation, or age group..."
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
              <Tab label={`Ready (${statusCounts.ready})`} value="ready" />
              <Tab label={`Generating (${statusCounts.generating})`} value="generating" />
              <Tab label={`Generated (${statusCounts.generated})`} value="generated" />
            </Tabs>
          </Stack>
        </Paper>

        {/* Briefs List */}
        {loading ? (
          <Box display="flex" justifyContent="center" py={8}>
            <CircularProgress />
          </Box>
        ) : filteredBriefs.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: "center" }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {searchQuery || filterTab !== "all"
                ? "No briefs match your filters"
                : "No story briefs found"}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {searchQuery || filterTab !== "all"
                ? "Try adjusting your search or filter criteria"
                : "Create a story brief first to generate drafts"}
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
          <Stack spacing={3}>
            {filteredBriefs.map((brief) => {
              const statusConfig = getStatusConfig(brief.status);
              const isGenerating = generating === brief.id || brief.status === "draft_generating";
              const isGenerated = brief.status === "draft_generated";

              return (
                <Card
                  key={brief.id}
                    variant="outlined"
                    sx={{
                      transition: "all 0.2s ease-in-out",
                      "&:hover": {
                        boxShadow: 3,
                        transform: "translateY(-2px)",
                      },
                      ...(isGenerated && {
                        borderLeft: "4px solid",
                        borderLeftColor: "success.main",
                      }),
                      ...(isGenerating && {
                        borderLeft: "4px solid",
                        borderLeftColor: "info.main",
                      }),
                    }}
                  >
                    <CardContent>
                      <Stack spacing={3}>
                        {/* Header Row */}
                        <Stack
                          direction={{ xs: "column", md: "row" }}
                          justifyContent="space-between"
                          alignItems={{ xs: "flex-start", md: "center" }}
                          spacing={2}
                        >
                          <Box sx={{ flex: 1 }}>
                            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                              <Typography variant="h6" component="h2">
                                {getBriefDisplayTitle(brief)}
                              </Typography>
                              {statusConfig.icon && (
                                <Chip
                                  icon={statusConfig.icon}
                                  label={statusConfig.label}
                                  size="small"
                                  color={statusConfig.color}
                                  variant={isGenerated ? "filled" : "outlined"}
                                />
                              )}
                            </Stack>
                            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                              <Chip
                                label={formatAgeGroup(brief.childProfile.ageGroup)}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                              {brief.lockedByDraftId && (
                                <Tooltip title={`View draft: ${brief.lockedByDraftId}`}>
                                  <Chip
                                    label={`Draft ID: ${brief.lockedByDraftId.substring(0, 8)}...`}
                                    size="small"
                                    color="info"
                                    variant="outlined"
                                    onClick={() => navigate(`/specialist/drafts/${brief.lockedByDraftId}`)}
                                    onDelete={() => navigate(`/specialist/drafts/${brief.lockedByDraftId}`)}
                                    deleteIcon={<Launch fontSize="small" />}
                                    sx={{ cursor: "pointer" }}
                                  />
                                </Tooltip>
                              )}
                            </Stack>
                          </Box>
                          <Stack direction="row" spacing={1} flexWrap="wrap">
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<Visibility />}
                              onClick={() => navigate(`/specialist/story-briefs/${brief.id}/prompt-preview`)}
                            >
                              View Prompt
                            </Button>
                            {isGenerated && brief.lockedByDraftId ? (
                              <Button
                                variant="contained"
                                color="success"
                                startIcon={<Launch />}
                                onClick={() => navigate(`/specialist/drafts/${brief.lockedByDraftId}`)}
                              >
                                View Draft
                              </Button>
                            ) : (
                              <Button
                                variant="contained"
                                onClick={() => handleGenerateDraft(brief.id)}
                                disabled={isGenerating || isGenerated}
                                startIcon={
                                  isGenerating ? (
                                    <CircularProgress size={16} />
                                  ) : null
                                }
                              >
                                {isGenerating ? "Generating..." : "Generate Draft"}
                              </Button>
                            )}
                          </Stack>
                        </Stack>

                        <Divider />

                        {/* Details Section */}
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
                            gap: 2,
                          }}
                        >
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Primary Topic
                            </Typography>
                            <Typography variant="body2" fontWeight="medium">
                              {brief.therapeuticFocus.primaryTopic || "—"}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Situation
                            </Typography>
                            <Typography variant="body2" fontWeight="medium">
                              {brief.therapeuticFocus.specificSituation || "—"}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Created
                            </Typography>
                            <Typography variant="body2">
                              {formatTimestamp(brief.createdAt)}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Created By
                            </Typography>
                            <Typography variant="body2">
                              {brief.createdBy || "—"}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Emotional Goals */}
                        {brief.therapeuticIntent?.emotionalGoals && brief.therapeuticIntent.emotionalGoals.length > 0 && (
                          <>
                            <Divider />
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                Emotional Goals
                              </Typography>
                              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                                {brief.therapeuticIntent.emotionalGoals.map((goal, idx) => (
                                  <Chip
                                    key={idx}
                                    label={goal.replace(/_/g, " ")}
                                    size="small"
                                    color="secondary"
                                    variant="outlined"
                                  />
                                ))}
                              </Stack>
                            </Box>
                          </>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
              );
            })}
          </Stack>
        )}
      </Container>
    </>
  );
};

export default GenerateDraftPage;
