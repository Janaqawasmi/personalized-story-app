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
                      <Typography variant="h6">{brief.topicKey || "Untitled Brief"}</Typography>
                      <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" gap={1}>
                        <Chip
                          label={`Age: ${brief.targetAgeGroup}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        <Chip
                          label={`Status: ${brief.status}`}
                          size="small"
                          color={brief.status === "generated" ? "success" : "default"}
                          variant="outlined"
                        />
                        {brief.generatedDraftId && (
                          <Chip
                            label={`Draft: ${brief.generatedDraftId.substring(0, 8)}...`}
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
                        disabled={generating === brief.id || brief.status === "generated"}
                      >
                        {generating === brief.id ? (
                          <>
                            <CircularProgress size={16} sx={{ mr: 1 }} />
                            Generating...
                          </>
                        ) : brief.status === "generated" ? (
                          "Draft Generated"
                        ) : (
                          "Generate Draft"
                        )}
                      </Button>
                    </Stack>
                  </Stack>

                  {brief.topicTags && brief.topicTags.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Topic Tags:
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                        {brief.topicTags.map((tag, idx) => (
                          <Chip key={idx} label={tag} size="small" color="primary" variant="outlined" />
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {brief.therapeuticIntent && brief.therapeuticIntent.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Therapeutic Intent:
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                        {brief.therapeuticIntent.map((intent, idx) => (
                          <Chip key={idx} label={intent} size="small" color="secondary" variant="outlined" />
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {brief.constraints && (brief.constraints.avoidMetaphors?.length || brief.constraints.avoidLanguage?.length) && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Constraints:
                      </Typography>
                      {brief.constraints.avoidMetaphors && brief.constraints.avoidMetaphors.length > 0 && (
                        <Box mb={1}>
                          <Typography variant="caption" color="text.secondary">
                            Avoid Metaphors:
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} mt={0.5}>
                            {brief.constraints.avoidMetaphors.map((item, idx) => (
                              <Chip key={idx} label={item} size="small" variant="outlined" />
                            ))}
                          </Stack>
                        </Box>
                      )}
                      {brief.constraints.avoidLanguage && brief.constraints.avoidLanguage.length > 0 && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Avoid Language:
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} mt={0.5}>
                            {brief.constraints.avoidLanguage.map((item, idx) => (
                              <Chip key={idx} label={item} size="small" variant="outlined" />
                            ))}
                          </Stack>
                        </Box>
                      )}
                    </Box>
                  )}

                  <Typography variant="caption" color="text.secondary">
                    Created by: {brief.createdBy} • {new Date(brief.createdAt).toLocaleString()}
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

