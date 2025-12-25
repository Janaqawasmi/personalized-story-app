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
  Skeleton,
  IconButton,
} from "@mui/material";
import {
  CheckCircle,
  RadioButtonUnchecked,
  Autorenew,
  Visibility,
  Refresh,
  Search,
  Launch,
  ExpandMore,
  ExpandLess,
  Check,
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
    "0_3": "0–3 years",
    "3_6": "3–6 years",
    "6_9": "6–9 years",
    "9_12": "9–12 years",
  };

  return map[ageGroup] || ageGroup;
}

// Helper function to format emotional sensitivity
function formatEmotionalSensitivity(sensitivity: string): string {
  return formatDisplayText(sensitivity);
}

// Helper function to format emotional tone
function formatEmotionalTone(tone: string): string {
  return formatDisplayText(tone);
}

// Helper function to format complexity
function formatComplexity(complexity: string): string {
  return formatDisplayText(complexity);
}

// Helper function to format caregiver presence
function formatCaregiverPresence(presence: string): string {
  const map: Record<string, string> = {
    "included": "Caregiver Included",
    "self_guided": "Self-Guided",
  };
  return map[presence] || formatDisplayText(presence);
}

// Helper function to format ending style
function formatEndingStyle(style: string): string {
  const map: Record<string, string> = {
    "calm_resolution": "Calm Resolution",
    "open_ended": "Open-Ended",
    "empowering": "Empowering",
  };
  return map[style] || formatDisplayText(style);
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

// Collapsible Message Callout Component
interface MessageCalloutProps {
  message: string;
}

const MessageCallout: React.FC<MessageCalloutProps> = ({ message }) => {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation = message.length > 120; // Approximate 2 lines of text
  
  const displayText = expanded || !needsTruncation 
    ? message 
    : `${message.substring(0, 120)}...`;

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
        Core Therapeutic Message
      </Typography>
      <Paper
        variant="outlined"
        sx={{
          p: 1.5,
          bgcolor: "grey.50",
          borderColor: "divider",
          borderWidth: 1,
          position: "relative",
        }}
      >
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ 
              flex: 1,
              fontStyle: "italic",
              lineHeight: 1.5,
            }}
          >
            "{displayText}"
          </Typography>
          {needsTruncation && (
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
              sx={{ 
                mt: -0.5,
                ml: 0.5,
                p: 0.5,
              }}
            >
              {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </IconButton>
          )}
        </Stack>
      </Paper>
    </Box>
  );
};

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

  // Build compact summary string
  const topic = formatDisplayText(brief.therapeuticFocus?.primaryTopic || "");
  const situation = formatDisplayText(brief.therapeuticFocus?.specificSituation || "");
  const ageGroup = formatAgeGroup(brief.childProfile?.ageGroup || "");
  const complexity = formatComplexity(brief.languageTone?.complexity || "");
  const tone = formatEmotionalTone(brief.languageTone?.emotionalTone || "");

  const summaryParts = [];
  if (topic && situation) {
    summaryParts.push(`${topic} → ${situation}`);
  }
  if (ageGroup) {
    summaryParts.push(`Age ${ageGroup}`);
  }
  if (complexity && tone) {
    summaryParts.push(`${complexity} · ${tone}`);
  }

  const summary = summaryParts.join(" · ");

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
        <Stack spacing={3} sx={{ py: 1 }}>
          {/* Prominent Warning - Always visible at top */}
          <Alert severity="warning" sx={{ mb: 1 }}>
            <Typography variant="body2" fontWeight="medium">
              This action will lock the story brief and cannot be undone.
            </Typography>
          </Alert>

          {/* Compact Summary */}
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Brief Summary
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {summary || "Untitled Brief"}
            </Typography>
          </Box>
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
                <Stack spacing={2}>
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

                      {/* Writing Style */}
                    <Box>
                        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                          Writing Style
                      </Typography>
                        <Stack direction="row" spacing={0.75} flexWrap="wrap" gap={0.75}>
                          {brief.childProfile?.emotionalSensitivity && (
                            <Chip
                              label={`Sensitivity: ${formatEmotionalSensitivity(brief.childProfile.emotionalSensitivity)}`}
                              size="small"
                              variant="outlined"
                              color="default"
                            />
                          )}
                          {brief.languageTone?.emotionalTone && (
                            <Chip
                              label={`Tone: ${formatEmotionalTone(brief.languageTone.emotionalTone)}`}
                              size="small"
                              variant="outlined"
                              color="default"
                            />
                          )}
                          {brief.languageTone?.complexity && (
                            <Chip
                              label={`Complexity: ${formatComplexity(brief.languageTone.complexity)}`}
                              size="small"
                              variant="outlined"
                              color="default"
                            />
                          )}
                      </Stack>
                    </Box>

                      {/* Core Therapeutic Message (Collapsible) */}
                      {brief.therapeuticIntent?.keyMessage && (
                        <MessageCallout message={brief.therapeuticIntent.keyMessage} />
                  )}

                      {/* Story Constraints & Structure */}
                    <Box>
                        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                          Story Constraints & Structure
                      </Typography>
                        <Stack direction="row" spacing={0.75} flexWrap="wrap" gap={0.75} alignItems="center">
                          {brief.storyPreferences?.caregiverPresence && (
                            <Chip
                              label={formatCaregiverPresence(brief.storyPreferences.caregiverPresence)}
                              size="small"
                              variant="outlined"
                              color="default"
                            />
                          )}
                          {brief.storyPreferences?.endingStyle && (
                            <Chip
                              label={`Ending: ${formatEndingStyle(brief.storyPreferences.endingStyle)}`}
                              size="small"
                              variant="outlined"
                              color="default"
                            />
                          )}
                          <Tooltip title="Safety and therapeutic constraints are enforced automatically.">
                            <Chip
                              icon={<Check />}
                              label="Safety Enforced"
                              size="small"
                              variant="outlined"
                              color="info"
                            />
                          </Tooltip>
                      </Stack>
                    </Box>

                      {/* Emotional Goals (De-emphasized) */}
                      {brief.therapeuticIntent?.emotionalGoals && brief.therapeuticIntent.emotionalGoals.length > 0 && (
                    <Box>
                          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                            Emotional Goals
                          </Typography>
                          <Stack direction="row" spacing={0.75} flexWrap="wrap" gap={0.75}>
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
                      )}

                      <Divider sx={{ my: 1 }} />

                      {/* Metadata Section (Quieter) */}
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
                          gap: 1.5,
                        }}
                      >
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block" fontSize="0.7rem">
                            Primary Topic
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDisplayText(brief.therapeuticFocus.primaryTopic) || "—"}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block" fontSize="0.7rem">
                            Situation
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDisplayText(brief.therapeuticFocus.specificSituation) || "—"}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block" fontSize="0.7rem">
                            Created
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatTimestamp(brief.createdAt)}
                          </Typography>
                    </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block" fontSize="0.7rem">
                            Created By
                          </Typography>
                  <Typography variant="caption" color="text.secondary">
                            {brief.createdBy || "—"}
                  </Typography>
                        </Box>
                      </Box>
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
