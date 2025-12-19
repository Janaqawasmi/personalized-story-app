import React, { useEffect, useState } from "react";
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
                          color={brief.status === "draft_generated" ? "success" : "default"}
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
                    <Button
                      variant="contained"
                      onClick={() => handleGenerateDraft(brief.id)}
                      disabled={generating === brief.id || brief.status === "draft_generated"}
                    >
                      {generating === brief.id ? (
                        <>
                          <CircularProgress size={16} sx={{ mr: 1 }} />
                          Generating...
                        </>
                      ) : brief.status === "draft_generated" ? (
                        "Draft Generated"
                      ) : (
                        "Generate Draft"
                      )}
                    </Button>
                  </Stack>

                  {brief.shortDescription && (
                    <Typography variant="body2" color="text.secondary">
                      {brief.shortDescription}
                    </Typography>
                  )}

                  {brief.therapeuticMessages && brief.therapeuticMessages.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Therapeutic Messages:
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                        {brief.therapeuticMessages.map((msg, idx) => (
                          <Chip key={idx} label={msg} size="small" variant="outlined" />
                        ))}
                      </Stack>
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

