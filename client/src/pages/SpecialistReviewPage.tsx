import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import {
  StoryDraft,
  StoryDraftPage,
  approveDraft,
  fetchDraftById,
  fetchDraftsForReview,
  updateDraftPages,
} from "../api/api";

type DraftSummary = Pick<StoryDraft, "id" | "title" | "status" | "createdAt" | "targetAgeGroup">;

const SpecialistReviewPage: React.FC = () => {
  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<StoryDraft | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [specialistId, setSpecialistId] = useState("");

  const loadDrafts = async () => {
    setLoadingList(true);
    setError(null);
    try {
      const data = await fetchDraftsForReview();
      setDrafts(data);
      if (data.length && !selectedId) {
        setSelectedId(data[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load drafts");
    } finally {
      setLoadingList(false);
    }
  };

  const loadDraft = async (id: string) => {
    setLoadingDraft(true);
    setError(null);
    try {
      const data = await fetchDraftById(id);
      setDraft(data);
    } catch (err: any) {
      setError(err.message || "Failed to load draft");
      setDraft(null);
    } finally {
      setLoadingDraft(false);
    }
  };

  useEffect(() => {
    loadDrafts();
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadDraft(selectedId);
    }
  }, [selectedId]);

  const handlePageChange = (index: number, field: keyof StoryDraftPage, value: string) => {
    if (!draft) return;
    const updatedPages = draft.pages.map((p, i) => (i === index ? { ...p, [field]: value } : p));
    setDraft({ ...draft, pages: updatedPages });
  };

  const handleSave = async () => {
    if (!draft || !selectedId) return;
    setSaving(true);
    setError(null);
    try {
      await updateDraftPages(selectedId, draft.pages);
    } catch (err: any) {
      setError(err.message || "Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!draft || !selectedId) return;
    if (!specialistId.trim()) {
      setError("Enter your specialist ID before approving.");
      return;
    }
    setApproving(true);
    setError(null);
    try {
      await approveDraft(selectedId, specialistId.trim());
      await loadDrafts();
      setDraft(null);
      setSelectedId(null);
    } catch (err: any) {
      setError(err.message || "Failed to approve draft");
    } finally {
      setApproving(false);
    }
  };

  const selectedTitle = useMemo(() => {
    if (!draft) return "Select a draft to review";
    return draft.title || "Untitled Draft";
  }, [draft]);

  return (
    <Box sx={{ p: 3, display: "grid", gridTemplateColumns: { md: "320px 1fr", xs: "1fr" }, gap: 2 }}>
      <Card variant="outlined" sx={{ minHeight: 400 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Drafts in Review</Typography>
            <Button onClick={loadDrafts} size="small" disabled={loadingList}>
              {loadingList ? <CircularProgress size={16} /> : "Refresh"}
            </Button>
          </Stack>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {loadingList ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <List dense>
              {drafts.map((d) => (
                <ListItemButton
                  key={d.id}
                  selected={selectedId === d.id}
                  onClick={() => setSelectedId(d.id)}
                  divider
                >
                  <ListItemText
                    primary={d.title || "Untitled"}
                    secondary={`Age: ${d.targetAgeGroup || "N/A"} • Status: ${d.status || "-"}`}
                  />
                </ListItemButton>
              ))}
              {!drafts.length && <Typography variant="body2">No drafts awaiting review.</Typography>}
            </List>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">{selectedTitle}</Typography>
            {(loadingDraft || saving || approving) && <CircularProgress size={20} />}
          </Stack>

          {draft && (
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
                <Button variant="contained" onClick={handleSave} disabled={saving || loadingDraft}>
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
                  disabled={approving || loadingDraft}
                >
                  Approve draft
                </Button>
              </Stack>
            </Stack>
          )}

          {!draft && !loadingDraft && (
            <Typography variant="body2" color="text.secondary">
              Select a draft from the list to start reviewing.
            </Typography>
          )}

          {loadingDraft && (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default SpecialistReviewPage;

