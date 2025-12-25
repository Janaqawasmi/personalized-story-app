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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Skeleton,
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

// Helper function to capitalize first letter
function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Helper function to format text for display (replace underscores with spaces and capitalize)
function formatDisplayText(text: string): string {
  if (!text) return text;
  return capitalize(text.replace(/_/g, " "));
}

// Helper function to derive display title from StoryBrief fields
function getBriefDisplayTitle(brief: StoryBrief): string {
  const topic = brief.therapeuticFocus?.primaryTopic;
  const situation = brief.therapeuticFocus?.specificSituation;

  if (topic && situation) {
    return `${formatDisplayText(topic)} → ${formatDisplayText(situation)}`;
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

// Confirmation Dialog Component
interface ConfirmGenerateDialogProps {
  open: boolean;
  brief: StoryBrief | null;
  onClose: () => void;
  onConfirm: () => void;
}

const ConfirmGenerateDialog: React.FC<ConfirmGenerateDialogProps> = ({
  open,
  brief,
  onClose,
  onConfirm,
}) => {
  if (!brief) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="confirm-generate-dialog-title"
    >
      <DialogTitle id="confirm-generate-dialog-title">
        Generate Story Draft
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Please review the following details before generating the draft:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText
                primary="Primary Topic"
                secondary={formatDisplayText(brief.therapeuticFocus?.primaryTopic || "—")}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Situation"
                secondary={formatDisplayText(brief.therapeuticFocus?.specificSituation || "—")}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Age Group"
                secondary={formatAgeGroup(brief.childProfile?.ageGroup || "")}
              />
            </ListItem>
            {brief.therapeuticIntent?.emotionalGoals && brief.therapeuticIntent.emotionalGoals.length > 0 && (
              <ListItem>
                <ListItemText
                  primary="Emotional Goals"
                  secondary={brief.therapeuticIntent.emotionalGoals
                    .map((goal) => formatDisplayText(goal))
                    .join(", ")}
                />
              </ListItem>
            )}
          </List>
          <Alert severity="warning" sx={{ mt: 2 }}>
            This action will lock the story brief and cannot be undone.
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button onClick={onConfirm} variant="contained" color="primary" autoFocus>
          Generate Draft
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Skeleton Card Component for Loading State
const BriefCardSkeleton: React.FC = () => (
  <Card variant="outlined">
    <CardContent>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" height={32} />
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 1 }} />
              <Skeleton variant="rectangular" width={100} height={24} sx={{ borderRadius: 1 }} />
            </Stack>
          </Box>
          <Stack direction="row" spacing={1}>
            <Skeleton variant="rectangular" width={100} height={36} sx={{ borderRadius: 1 }} />
            <Skeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 1 }} />
          </Stack>
        </Stack>
        <Divider />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
            gap: 2,
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <Box key={i}>
              <Skeleton variant="text" width="40%" height={16} />
              <Skeleton variant="text" width="80%" height={24} />
            </Box>
          ))}
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

type FilterTab = "all" | "ready" | "generating" | "generated";

const GenerateDraftPage: React.FC = () => {
  const navigate = useNavigate();
  const [briefs, setBriefs] = useState<StoryBrief[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [successDraftId, setSuccessDraftId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [briefToGenerate, setBriefToGenerate] = useState<StoryBrief | null>(null);

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

  const handleGenerateClick = (brief: StoryBrief) => {
    setBriefToGenerate(brief);
    setConfirmDialogOpen(true);
  };

  const handleConfirmGenerate = async () => {
    if (!briefToGenerate) return;

    setConfirmDialogOpen(false);
    const briefId = briefToGenerate.id;
    setGenerating(briefId);
    setError(null);
    setSuccess(null);
    setSuccessDraftId(null);

    try {
      const result = await generateDraftFromBrief(briefId);
      setSuccess(`Draft generated successfully! You can now review it.`);
      setSuccessDraftId(result.draftId);
      // Reload briefs to update status
      await loadBriefs();
    } catch (err: any) {
      setError(err.message || "Failed to generate draft");
    } finally {
      setGenerating(null);
      setBriefToGenerate(null);
    }
  };

  const handleCancelGenerate = () => {
    setConfirmDialogOpen(false);
    setBriefToGenerate(null);
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

  // Get tooltip text for disabled Generate button
  const getGenerateButtonTooltip = (brief: StoryBrief): string => {
    if (brief.status === "draft_generated") {
      return "Draft already generated";
    }
    if (brief.status === "draft_generating") {
      return "Draft is currently generating";
    }
    return "";
  };

  return (
    <>
      <SpecialistNav />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header Section */}
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} mb={2} spacing={2}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Generate Story Drafts
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Select a story brief to generate a draft from
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
              Only briefs with status 'Ready' can generate drafts.
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
            onClose={() => {
              setSuccess(null);
              setSuccessDraftId(null);
            }}
            action={
              successDraftId ? (
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={() => navigate(`/specialist/drafts/${successDraftId}`)}
                  startIcon={<Launch />}
                >
                  View Draft
                </Button>
              ) : (
                <Button color="inherit" size="small" onClick={() => navigate("/specialist/drafts")}>
                  View Drafts
                </Button>
              )
            }
          >
            {success}
          </Alert>
        )}

        {/* Filters and Search */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
            Filter story briefs
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
        </Box>

        {/* Briefs List */}
        {loading ? (
          <Stack spacing={3}>
            {[1, 2, 3].map((i) => (
              <BriefCardSkeleton key={i} />
            ))}
          </Stack>
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
              const isReady = brief.status === "created";
              const isDisabled = isGenerating || isGenerated || !isReady;
              const tooltipText = isDisabled ? getGenerateButtonTooltip(brief) : "";

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
                            <Tooltip title={tooltipText} disableHoverListener={!isDisabled}>
                              <span>
                                <Button
                                  variant="contained"
                                  onClick={() => handleGenerateClick(brief)}
                                  disabled={isDisabled}
                                  startIcon={
                                    isGenerating ? (
                                      <CircularProgress size={16} />
                                    ) : null
                                  }
                                >
                                  {isGenerating ? "Generating..." : "Generate Draft"}
                                </Button>
                              </span>
                            </Tooltip>
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
                            {formatDisplayText(brief.therapeuticFocus.primaryTopic) || "—"}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Situation
                          </Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {formatDisplayText(brief.therapeuticFocus.specificSituation) || "—"}
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
                                  label={formatDisplayText(goal)}
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

      {/* Confirmation Dialog */}
      <ConfirmGenerateDialog
        open={confirmDialogOpen}
        brief={briefToGenerate}
        onClose={handleCancelGenerate}
        onConfirm={handleConfirmGenerate}
      />
    </>
  );
};

export default GenerateDraftPage;
