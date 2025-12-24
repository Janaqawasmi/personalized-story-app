import React, { useEffect, useState } from "react";
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
} from "@mui/material";
import { fetchStoryBriefs, generateDraftFromBrief, StoryBrief } from "../api/api";
import SpecialistNav from "../components/SpecialistNav";

// Helper function to derive display title from StoryBrief fields
function getBriefDisplayTitle(brief: StoryBrief): string {
  const topic = brief.therapeuticFocus?.primaryTopic;
  const situation = brief.therapeuticFocus?.specificSituation;

  if (topic && situation) {
    return `Brief: ${topic} → ${situation}`;
  }

  return "Untitled Brief";
}

// Helper function to format age group keys to readable format
function formatAgeGroup(ageGroup: string): string {
  const map: Record<string, string> = {
    "3_4": "3–4",
    "5_6": "5–6",
    "7_8": "7–8",
    "9_10": "9–10",
  };

  return map[ageGroup] || ageGroup;
}

// Helper function to format Firestore timestamps
// Handles multiple Firestore timestamp formats:
// - admin.firestore.Timestamp (with .seconds property)
// - Older SDK format (with ._seconds property)
// - ISO strings
// - Gracefully falls back to "—" if missing or invalid
function formatTimestamp(ts: any): string {
  if (!ts) return "—";
  
  // Handle admin.firestore.Timestamp format: { seconds: number, nanoseconds: number }
  if (typeof ts === 'object' && ts.seconds != null) {
    return new Date(ts.seconds * 1000).toLocaleDateString();
  }
  
  // Handle older SDK format: { _seconds: number, _nanoseconds: number }
  if (typeof ts === 'object' && ts._seconds != null) {
    return new Date(ts._seconds * 1000).toLocaleDateString();
  }
  
  // Handle ISO string format
  if (typeof ts === 'string') {
    const date = new Date(ts);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString();
    }
  }
  
  // Handle Date object
  if (ts instanceof Date) {
    return ts.toLocaleDateString();
  }
  
  // Fallback for any other format
  return "—";
}

const GenerateDraftPage: React.FC = () => {
  const navigate = useNavigate();
  const [briefs, setBriefs] = useState<StoryBrief[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      const result = await generateDraftFromBrief(briefId);
      setSuccess(`Draft generated successfully! Draft ID: ${result.draftId}`);
      // Reload briefs to update status
      await loadBriefs();
    } catch (err: any) {
      setError(err.message || "Failed to generate draft");
    } finally {
      setGenerating(null);
    }
  };

  return (
    <>
      <SpecialistNav />
      <Box sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5">Generate Story Drafts from Briefs</Typography>
        <Button variant="outlined" onClick={loadBriefs} disabled={loading}>
          {loading ? <CircularProgress size={18} /> : "Refresh"}
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={2}>
          {briefs.map((brief) => (
            <Card key={brief.id} variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="h6">{getBriefDisplayTitle(brief)}</Typography>
                      <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" gap={1}>
                        <Chip
                          label={`Age group: ${formatAgeGroup(brief.childProfile.ageGroup)}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        <Chip
                          label={`Status: ${brief.status}`}
                          size="small"
                          color={brief.status === "draft_generated" ? "success" : "default"}
                          variant="outlined"
                        />
                        {brief.lockedByDraftId && (
                          <Chip
                            label={`Draft: ${brief.lockedByDraftId.substring(0, 8)}...`}
                            size="small"
                            color="info"
                            variant="outlined"
                          />
                        )}
                      </Stack>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        onClick={() => navigate(`/specialist/story-briefs/${brief.id}/prompt-preview`)}
                      >
                        View Prompt (RAG + LLM)
                      </Button>
                      <Button
                        variant="contained"
                        onClick={() => handleGenerateDraft(brief.id)}
                        disabled={generating === brief.id || brief.status === "draft_generated" || brief.status === "draft_generating"}
                      >
                        {generating === brief.id ? (
                          <>
                            <CircularProgress size={16} sx={{ mr: 1 }} />
                            Generating...
                          </>
                        ) : brief.status === "draft_generating" ? (
                          "Generating..."
                        ) : brief.status === "draft_generated" ? (
                          "Draft Generated"
                        ) : (
                          "Generate Draft"
                        )}
                      </Button>
                    </Stack>
                  </Stack>

                  <Stack direction="row" spacing={2} flexWrap="wrap" gap={1}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Primary topic:</strong> {brief.therapeuticFocus.primaryTopic}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Situation:</strong> {brief.therapeuticFocus.specificSituation}
                    </Typography>
                  </Stack>

                  {brief.therapeuticIntent.emotionalGoals && brief.therapeuticIntent.emotionalGoals.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Emotional Goals:
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                        {brief.therapeuticIntent.emotionalGoals.map((goal, idx) => (
                          <Chip key={idx} label={goal} size="small" color="secondary" variant="outlined" />
                        ))}
                      </Stack>
                    </Box>
                  )}

                  <Typography variant="caption" color="text.secondary">
                    Created by: {brief.createdBy} • Created: {formatTimestamp(brief.createdAt)}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          ))}

          {!briefs.length && (
            <Typography variant="body2" color="text.secondary">
              No story briefs found. Create one first!
            </Typography>
          )}
        </Stack>
      )}
      </Box>
    </>
  );
};

export default GenerateDraftPage;

