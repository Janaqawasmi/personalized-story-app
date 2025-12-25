// client/src/pages/ReviewDraftPage.tsx
// Phase 2: READ-ONLY draft review page
import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { fetchDraftById, StoryDraftView } from "../api/api";
import SpecialistNav from "../components/SpecialistNav";

const ReviewDraftPage: React.FC = () => {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<StoryDraftView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDraft = async () => {
      if (!draftId) {
        setError("Draft ID is missing from URL");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await fetchDraftById(draftId);
        setDraft(data);
      } catch (err: any) {
        setError(err.message || "Failed to load draft");
        setDraft(null);
      } finally {
        setLoading(false);
      }
    };

    loadDraft();
  }, [draftId]);

  // Determine if content is RTL (Arabic or Hebrew)
  const isRTL = draft?.generationConfig?.language === "ar" || draft?.generationConfig?.language === "he";

  // Format timestamp (handles Firestore Timestamp format)
  const formatTimestamp = (timestamp: { seconds: number; nanoseconds: number } | string | Date) => {
    let date: Date;
    if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp.seconds * 1000);
    }
    return date.toLocaleString();
  };

  // Format age group for display
  const formatAgeGroup = (ageGroup: string) => {
    const mapping: Record<string, string> = {
      "0_3": "0-3",
      "3_6": "3-6",
      "6_9": "6-9",
      "9_12": "9-12",
    };
    return mapping[ageGroup] || ageGroup;
  };

  return (
    <>
      <SpecialistNav />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            {draft?.title || "Draft Review"}
          </Typography>
          <Button variant="outlined" onClick={() => navigate("/specialist/drafts")}>
            Back to List
          </Button>
        </Stack>

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Loading */}
        {loading && (
          <Box display="flex" justifyContent="center" py={8}>
            <CircularProgress />
          </Box>
        )}

        {/* Draft Content */}
        {!loading && draft && (
          <Stack spacing={3}>
            {/* Generation Metadata */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Generation Details
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Stack direction="row" spacing={2} flexWrap="wrap" gap={1}>
                  <Chip label={`Language: ${draft.generationConfig.language.toUpperCase()}`} variant="outlined" />
                  <Chip
                    label={`Age Group: ${formatAgeGroup(draft.generationConfig.targetAgeGroup)}`}
                    variant="outlined"
                  />
                  <Chip label={`Length: ${draft.generationConfig.length}`} variant="outlined" />
                  <Chip label={`Tone: ${draft.generationConfig.tone}`} variant="outlined" />
                  {draft.generationConfig.emphasis && (
                    <Chip label={`Emphasis: ${draft.generationConfig.emphasis}`} variant="outlined" />
                  )}
                </Stack>
                <Stack direction="row" spacing={2} sx={{ mt: 2 }} flexWrap="wrap" gap={1}>
                  <Typography variant="caption" color="text.secondary">
                    Created: {formatTimestamp(draft.createdAt)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Updated: {formatTimestamp(draft.updatedAt)}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>

            {/* Story Pages */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Story Pages ({draft.pages?.length || 0})
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={3}>
                  {(draft.pages || [])
                    .sort((a, b) => a.pageNumber - b.pageNumber)
                    .map((page) => (
                      <Card key={page.pageNumber} variant="outlined" sx={{ p: 2 }}>
                        <Stack spacing={2}>
                          {/* Page Header */}
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle1" fontWeight="bold">
                              Page {page.pageNumber}
                            </Typography>
                            {page.emotionalTone && (
                              <Chip
                                label={`Tone: ${page.emotionalTone}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            )}
                          </Stack>

                          <Divider />

                          {/* Story Text (RTL-aware) */}
                          <Box>
                            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                              Story Text
                            </Typography>
                            <Typography
                              variant="body1"
                              sx={{
                                whiteSpace: "pre-wrap",
                                direction: isRTL ? "rtl" : "ltr",
                                textAlign: isRTL ? "right" : "left",
                                fontFamily: isRTL ? "'Noto Sans Arabic', 'Noto Sans Hebrew', sans-serif" : undefined,
                              }}
                            >
                              {page.text}
                            </Typography>
                          </Box>

                          {/* Image Prompt (secondary text) */}
                          <Box>
                            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                              Image Prompt
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                              {page.imagePrompt}
                            </Typography>
                          </Box>
                        </Stack>
                      </Card>
                    ))}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        )}

        {/* Not Found */}
        {!loading && !draft && !error && (
          <Alert severity="info">
            Draft not found.
          </Alert>
        )}
      </Container>
    </>
  );
};

export default ReviewDraftPage;

