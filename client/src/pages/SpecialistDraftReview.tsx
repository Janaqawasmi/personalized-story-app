import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import {
  approveDraft,
  fetchDraftById,
  StoryDraft,
  StoryDraftPage,
  updateDraftPages,
} from "../api/api";
import SpecialistNav from "../components/SpecialistNav";

const SpecialistDraftReview: React.FC = () => {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<StoryDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [specialistId, setSpecialistId] = useState("");

  const loadDraft = async () => {
    if (!draftId) {
      setError("draftId is missing from URL");
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

  useEffect(() => {
    loadDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  const handlePageChange = (index: number, field: keyof StoryDraftPage, value: string) => {
    if (!draft) return;
    const updatedPages = draft.pages.map((p, i) => (i === index ? { ...p, [field]: value } : p));
    setDraft({ ...draft, pages: updatedPages });
  };

  const handleSave = async () => {
    if (!draft || !draftId) return;
    setSaving(true);
    setError(null);
    try {
      await updateDraftPages(draftId, draft.pages);
    } catch (err: any) {
      setError(err.message || "Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!draft || !draftId) return;
    if (!specialistId.trim()) {
      setError("Enter your specialist ID before approving.");
      return;
    }
    setApproving(true);
    setError(null);
    try {
      await approveDraft(draftId, specialistId.trim());
      navigate("/specialist/drafts");
    } catch (err: any) {
      setError(err.message || "Failed to approve draft");
    } finally {
      setApproving(false);
    }
  };

  const title = useMemo(() => {
    if (!draft) return "Draft Review";
    return draft.title || "Untitled Draft";
  }, [draft]);

  return (
    <>
      <SpecialistNav />
      <Box sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5">{title}</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={loadDraft} disabled={loading}>
            {loading ? <CircularProgress size={18} /> : "Refresh"}
          </Button>
          <Button variant="text" onClick={() => navigate("/specialist/drafts")} disabled={loading}>
            Back to list
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      )}

      {!loading && draft && (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Topic: {draft.topicKey || "N/A"} • Language: {draft.language || "N/A"} • Status:{" "}
                {draft.status || "N/A"}
              </Typography>

              <Divider />

              <Stack spacing={2}>
                {draft.pages?.map((page, idx) => (
                  <Card key={page.pageNumber ?? idx} variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Page {page.pageNumber ?? idx + 1}
                    </Typography>
                    <TextField
                      label="Text"
                      multiline
                      minRows={3}
                      value={page.text || ""}
                      onChange={(e) => handlePageChange(idx, "text", e.target.value)}
                      fullWidth
                      sx={{ mb: 1 }}
                    />
                    <TextField
                      label="Emotional Tone"
                      value={page.emotionalTone || ""}
                      onChange={(e) => handlePageChange(idx, "emotionalTone", e.target.value)}
                      fullWidth
                      sx={{ mb: 1 }}
                    />
                    <TextField
                      label="Image Prompt"
                      value={page.imagePrompt || ""}
                      onChange={(e) => handlePageChange(idx, "imagePrompt", e.target.value)}
                      fullWidth
                    />
                  </Card>
                ))}
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-start">
                <Button variant="contained" onClick={handleSave} disabled={saving || loading}>
                  Save edits
                </Button>
                <TextField
                  label="Your Specialist ID"
                  size="small"
                  value={specialistId}
                  onChange={(e) => setSpecialistId(e.target.value)}
                />
                <Button
                  variant="outlined"
                  color="success"
                  onClick={handleApprove}
                  disabled={approving || loading}
                >
                  Approve draft
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      {!loading && !draft && !error && (
        <Typography variant="body2" color="text.secondary">
          Draft not found.
        </Typography>
      )}
      </Box>
    </>
  );
};

export default SpecialistDraftReview;

