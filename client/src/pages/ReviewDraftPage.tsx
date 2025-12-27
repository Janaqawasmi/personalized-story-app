// client/src/pages/ReviewDraftPage.tsx
// Specialist Draft Review → Edit → Approve flow
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
  Collapse,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  ExpandMore,
  ExpandLess,
  Description,
  ArrowBack,
} from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import { fetchDraftById, StoryDraftView, enterEditMode, cancelEditMode, updateDraft, approveDraft, StoryDraftPage } from "../api/api";
import SpecialistNav from "../components/SpecialistNav";

const ReviewDraftPage: React.FC = () => {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<StoryDraftView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedPages, setEditedPages] = useState<StoryDraftPage[]>([]);
  
  // Track which page's image prompt is expanded (pageNumber -> boolean)
  const [expandedPrompts, setExpandedPrompts] = useState<Record<number, boolean>>({});

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
        setEditedTitle(data.title || "");
        setEditedPages(data.pages || []);
        // Set edit mode if status is "editing"
        setIsEditing(data.status === "editing");
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
  const formatTimestamp = (timestamp: { seconds?: number; nanoseconds?: number; _seconds?: number; _nanoseconds?: number } | string | Date | null | undefined) => {
    if (!timestamp) {
      return "—";
    }
    
    let date: Date;
    
    if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'object') {
      // Handle Firestore Timestamp formats: { seconds, nanoseconds } or { _seconds, _nanoseconds }
      const seconds = timestamp.seconds || timestamp._seconds;
      if (seconds !== undefined && seconds !== null) {
        date = new Date(seconds * 1000);
      } else {
        return "—";
      }
    } else {
      return "—";
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "—";
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

  // Toggle image prompt visibility for a specific page
  const toggleImagePrompt = (pageNumber: number) => {
    setExpandedPrompts((prev) => ({
      ...prev,
      [pageNumber]: !prev[pageNumber],
    }));
  };

  // Handle entering edit mode
  const handleEnterEditMode = async () => {
    if (!draftId) return;
    
    try {
      setError(null);
      await enterEditMode(draftId);
      setIsEditing(true);
      // Reload draft to get updated status
      const data = await fetchDraftById(draftId);
      setDraft(data);
    } catch (err: any) {
      setError(err.message || "Failed to enter edit mode");
    }
  };

  // Handle canceling edit mode
  const handleCancelEdit = async () => {
    if (!draftId) return;
    
    try {
      setError(null);
      // Reset backend status to "generated"
      await cancelEditMode(draftId);
      // Reload draft to get updated status
      const data = await fetchDraftById(draftId);
      setDraft(data);
      setEditedTitle(data.title || "");
      setEditedPages(data.pages || []);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || "Failed to cancel editing");
    }
  };

  // Handle saving edits
  const handleSaveChanges = async () => {
    if (!draftId) return;
    
    setSaving(true);
    setError(null);
    
    try {
      await updateDraft(draftId, {
        title: editedTitle,
        pages: editedPages,
      });
      
      // Reload draft to get updated data
      const data = await fetchDraftById(draftId);
      setDraft(data);
      setEditedTitle(data.title || "");
      setEditedPages(data.pages || []);
      // Stay in editing mode
      setIsEditing(true);
    } catch (err: any) {
      setError(err.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  // Handle approving draft
  const handleApprove = async () => {
    if (!draftId) return;
    
    setApproving(true);
    setError(null);
    
    try {
      await approveDraft(draftId);
      setApproveDialogOpen(false);
      // Redirect to drafts list
      navigate("/specialist/drafts");
    } catch (err: any) {
      setError(err.message || "Failed to approve draft");
      setApproving(false);
    }
  };

  // Update edited page
  const updateEditedPage = (pageNumber: number, field: keyof StoryDraftPage, value: string) => {
    setEditedPages((prev) =>
      prev.map((page) =>
        page.pageNumber === pageNumber ? { ...page, [field]: value } : page
      )
    );
  };

  // Determine if draft can be edited (only if status is "generated")
  const canEdit = draft?.status === "generated";
  // Determine if draft can be approved (only if status is "generated" or "editing")
  const canApprove = draft?.status === "generated" || draft?.status === "editing";
  // Determine if draft is approved
  const isApproved = draft?.status === "approved";

  return (
    <>
      <SpecialistNav />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Stack spacing={1} mb={3}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box flex={1}>
              {isEditing ? (
                <TextField
                  fullWidth
                  label="Story Title"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  variant="outlined"
                  sx={{ mb: 1 }}
                />
              ) : (
                <Typography variant="h4" component="h1">
                  {draft?.title || "Draft Review"}
                </Typography>
              )}
              {!isEditing && !isApproved && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                  This draft was generated automatically and is read-only.
                </Typography>
              )}
              {isEditing && (
                <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, display: "block" }}>
                  You are editing this draft. Save your changes to preserve them.
                </Typography>
              )}
              {isApproved && (
                <Typography variant="caption" color="secondary.main" sx={{ mt: 0.5, display: "block" }}>
                  This draft has been approved and is now immutable.
                </Typography>
              )}
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {!isApproved && (
                <>
                  {!isEditing && canEdit && (
                    <Button variant="outlined" onClick={handleEnterEditMode}>
                      Edit Draft
                    </Button>
                  )}
                  {canApprove && (
                    <Button variant="contained" color="primary" onClick={() => setApproveDialogOpen(true)} disabled={saving || approving}>
                      Approve Draft
                    </Button>
                  )}
                  {isEditing && (
                    <>
                      <Button variant="outlined" onClick={handleCancelEdit} disabled={saving}>
                        Cancel Editing
                      </Button>
                      <Button variant="contained" color="primary" onClick={handleSaveChanges} disabled={saving}>
                        {saving ? <CircularProgress size={20} /> : "Save Changes"}
                      </Button>
                    </>
                  )}
                </>
              )}
              {draft?.briefId && (
                <Button
                  variant="outlined"
                  startIcon={<Description />}
                  onClick={() => navigate(`/specialist/generate-draft?briefId=${draft.briefId}`)}
                  disabled={saving}
                >
                  View Story Brief
                </Button>
              )}
              <Button 
                variant="outlined" 
                startIcon={<ArrowBack />}
                onClick={async () => {
                  // If in editing mode, cancel it before navigating
                  if (isEditing && draftId) {
                    try {
                      await cancelEditMode(draftId);
                    } catch (err) {
                      // Log error but still navigate
                      console.error("Failed to cancel edit mode before navigation:", err);
                    }
                  }
                  navigate("/specialist/drafts");
                }}
                disabled={saving}
              >
                Back to List
              </Button>
            </Stack>
          </Stack>
        </Stack>

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
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
                  {draft.revisionCount !== undefined && draft.revisionCount > 0 && (
                    <Chip label={`Revisions: ${draft.revisionCount}`} variant="outlined" color="info" />
                  )}
                  {draft.status && (
                    <Chip 
                      label={`Status: ${draft.status}`} 
                      variant="outlined" 
                      color={draft.status === "approved" ? "secondary" : draft.status === "editing" ? "warning" : "default"}
                    />
                  )}
                </Stack>
                <Stack direction="row" spacing={2} sx={{ mt: 2 }} flexWrap="wrap" gap={1}>
                  <Typography variant="caption" color="text.secondary">
                    Created: {formatTimestamp(draft.createdAt)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Updated: {formatTimestamp(draft.updatedAt)}
                  </Typography>
                  {draft.approvedAt && (
                    <Typography variant="caption" color="secondary.main">
                      Approved: {formatTimestamp(draft.approvedAt)}
                      {draft.approvedBy && ` by ${draft.approvedBy}`}
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* Story Pages */}
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    Story Pages ({isEditing ? editedPages.length : (draft.pages?.length || 0)})
                  </Typography>
                  {!isEditing && draft.pages && draft.pages.length > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      Page 1 of {draft.pages.length}
                    </Typography>
                  )}
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={3}>
                  {(isEditing ? editedPages : (draft.pages || []))
                    .sort((a, b) => a.pageNumber - b.pageNumber)
                    .map((page) => (
                      <Card 
                        key={page.pageNumber} 
                        variant="outlined" 
                        sx={{ p: 2 }}
                        id={`page-${page.pageNumber}`}
                      >
                        <Stack spacing={2}>
                          {/* Page Header */}
                          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                            <Typography variant="subtitle1" fontWeight="bold">
                              Page {page.pageNumber}
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                              {isEditing ? (
                                <FormControl size="small" sx={{ minWidth: 150 }}>
                                  <InputLabel>Emotional Tone</InputLabel>
                                  <Select
                                    value={page.emotionalTone || ""}
                                    label="Emotional Tone"
                                    onChange={(e) => updateEditedPage(page.pageNumber, "emotionalTone", e.target.value)}
                                  >
                                    <MenuItem value="gentle">Gentle</MenuItem>
                                    <MenuItem value="reassuring">Reassuring</MenuItem>
                                    <MenuItem value="calm">Calm</MenuItem>
                                  </Select>
                                </FormControl>
                              ) : (
                                <>
                                  {page.emotionalTone && (
                                    <Chip
                                      label={`Tone: ${page.emotionalTone}`}
                                      size="small"
                                      color="primary"
                                      variant="outlined"
                                    />
                                  )}
                                  {!isEditing && draft.pages && (
                                    <Typography variant="caption" color="text.secondary">
                                      {page.pageNumber} of {draft.pages.length}
                                    </Typography>
                                  )}
                                </>
                              )}
                            </Stack>
                          </Stack>

                          <Divider />

                          {/* Story Text (Editable if in edit mode) */}
                          <Box>
                            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                              Story Text
                            </Typography>
                            {isEditing ? (
                              <TextField
                                fullWidth
                                multiline
                                rows={4}
                                value={page.text}
                                onChange={(e) => updateEditedPage(page.pageNumber, "text", e.target.value)}
                                variant="outlined"
                                sx={{
                                  "& .MuiInputBase-input": {
                                    direction: isRTL ? "rtl" : "ltr",
                                    textAlign: isRTL ? "right" : "left",
                                    fontFamily: isRTL ? "'Noto Sans Arabic', 'Noto Sans Hebrew', sans-serif" : undefined,
                                  },
                                }}
                              />
                            ) : (
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
                            )}
                          </Box>

                          {/* Image Prompt (Editable if in edit mode) */}
                          <Box>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                              <Typography variant="caption" color="text.secondary">
                                Image Prompt
                              </Typography>
                              {!isEditing && (
                                <Button
                                  size="small"
                                  onClick={() => toggleImagePrompt(page.pageNumber)}
                                  endIcon={expandedPrompts[page.pageNumber] ? <ExpandLess /> : <ExpandMore />}
                                  sx={{ 
                                    textTransform: "none",
                                    minWidth: "auto",
                                    fontSize: "0.75rem",
                                  }}
                                >
                                  {expandedPrompts[page.pageNumber] ? "Hide" : "Show"} image prompt
                                </Button>
                              )}
                            </Stack>
                            {isEditing ? (
                              <TextField
                                fullWidth
                                multiline
                                rows={2}
                                value={page.imagePrompt || ""}
                                onChange={(e) => updateEditedPage(page.pageNumber, "imagePrompt", e.target.value)}
                                variant="outlined"
                                size="small"
                              />
                            ) : (
                              <Collapse in={expandedPrompts[page.pageNumber] || false}>
                                <Typography 
                                  variant="body2" 
                                  color="text.secondary" 
                                  sx={{ fontStyle: "italic", mt: 1 }}
                                >
                                  {page.imagePrompt}
                                </Typography>
                              </Collapse>
                            )}
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

      {/* Approval Confirmation Dialog */}
      <Dialog open={approveDialogOpen} onClose={() => !approving && setApproveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Approve Draft</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will finalize the story and make it available for personalization.
            This action cannot be undone.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Once approved, the draft will become immutable and a story template will be created.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialogOpen(false)} disabled={approving}>
            Cancel
          </Button>
          <Button onClick={handleApprove} variant="contained" color="primary" disabled={approving}>
            {approving ? <CircularProgress size={20} /> : "Approve"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ReviewDraftPage;
