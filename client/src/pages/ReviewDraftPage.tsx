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
  Check,
  Warning,
  Psychology,
} from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import { 
  fetchDraftById, 
  StoryDraftView, 
  updateDraft, 
  approveDraft, 
  StoryDraftPage,
  createDraftSuggestion,
  listDraftSuggestions,
  acceptDraftSuggestion,
  rejectDraftSuggestion,
  DraftSuggestion,
  generateImagePromptSuggestion,
  fetchStoryBriefs,
  StoryBrief,
} from "../api/api";
import SpecialistNav from "../components/SpecialistNav";
import PageAISuggestionBox from "../components/PageAISuggestionBox";
import AISuggestionCard from "../components/AISuggestionCard";
import ImagePromptSuggestionCard from "../components/ImagePromptSuggestionCard";

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

  // AI Suggestions state
  const [suggestions, setSuggestions] = useState<DraftSuggestion[]>([]);
  const [requestingSuggestionForPage, setRequestingSuggestionForPage] = useState<number | null>(null);
  const [acceptingSuggestionId, setAcceptingSuggestionId] = useState<string | null>(null);
  const [rejectingSuggestionId, setRejectingSuggestionId] = useState<string | null>(null);

  // Track original page text to detect changes
  const [originalPageTexts, setOriginalPageTexts] = useState<Record<number, string>>({});

  // Image prompt suggestion state (pageNumber -> suggestion data)
  const [imagePromptSuggestions, setImagePromptSuggestions] = useState<Record<number, {
    suggestedImagePrompt: string;
    rationale?: string;
  }>>({});
  const [requestingImagePromptSuggestion, setRequestingImagePromptSuggestion] = useState<number | null>(null);
  const [acceptingImagePromptSuggestion, setAcceptingImagePromptSuggestion] = useState<number | null>(null);

  // Brief data for Review Context
  const [brief, setBrief] = useState<StoryBrief | null>(null);

  // Load draft and suggestions
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
        
        // Store original page texts to detect changes
        const originalTexts: Record<number, string> = {};
        (data.pages || []).forEach(page => {
          originalTexts[page.pageNumber] = page.text;
        });
        setOriginalPageTexts(originalTexts);
        
        // Fetch brief data if briefId exists
        if (data.briefId) {
          try {
            const briefs = await fetchStoryBriefs();
            const foundBrief = briefs.find(b => b.id === data.briefId);
            if (foundBrief) {
              setBrief(foundBrief);
            }
          } catch (briefErr) {
            console.warn("Failed to load brief:", briefErr);
            // Don't fail the whole page if brief fetch fails
          }
        }
        
        // Edit mode is now purely local UI state - don't set based on status
        // Status "editing" means "revised", not "currently being edited"
      } catch (err: any) {
        setError(err.message || "Failed to load draft");
        setDraft(null);
      } finally {
        setLoading(false);
      }
    };

    loadDraft();
  }, [draftId]);

  // Load existing suggestions when draft is loaded
  useEffect(() => {
    const loadSuggestions = async () => {
      if (!draftId || !draft || (draft.status !== "generated" && draft.status !== "editing")) {
        setSuggestions([]);
        return;
      }

      try {
        const result = await listDraftSuggestions(draftId, "proposed");
        setSuggestions(result.data || []);
      } catch (err: any) {
        console.error("Failed to load suggestions:", err);
        // Don't show error to user - suggestions are optional
      }
    };

    if (draft) {
      loadSuggestions();
    }
  }, [draftId, draft]);

  // Determine if content is RTL (Arabic or Hebrew)
  const isRTL = draft?.generationConfig?.language === "ar" || draft?.generationConfig?.language === "he";

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
  // Handle entering edit mode (now purely local UI state)
  const handleEnterEditMode = () => {
    if (!draftId) return;
    
    // Edit mode is now a local UI state - no backend call needed
    // Status only changes when edits are saved
    setIsEditing(true);
    setError(null);
  };

  // Handle canceling edit mode (now purely local UI state)
  const handleCancelEdit = () => {
    if (!draftId || !draft) return;
    
    // Edit mode is now a local UI state - reset to original draft content
    // Status remains unchanged (reflects content revisions, not UI mode)
    setEditedTitle(draft.title || "");
    setEditedPages(draft.pages || []);
    setIsEditing(false);
    setError(null);
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
      
      // Update original page texts to reflect saved changes
      const updatedOriginalTexts: Record<number, string> = {};
      (data.pages || []).forEach(page => {
        updatedOriginalTexts[page.pageNumber] = page.text;
      });
      setOriginalPageTexts(updatedOriginalTexts);
      
      // Stay in editing mode
      setIsEditing(true);
    } catch (err: any) {
      setError(err.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  // Handle AI suggestion request
  const handleRequestSuggestion = async (pageNumber: number, instruction: string) => {
    if (!draftId || !draft?.pages) return;

    const page = draft.pages.find(p => p.pageNumber === pageNumber);
    if (!page) {
      setError(`Page ${pageNumber} not found`);
      return;
    }

    setRequestingSuggestionForPage(pageNumber);
    setError(null);

    try {
      await createDraftSuggestion(draftId, {
        scope: "page",
        pageNumber,
        originalText: page.text,
        instruction,
      });

      // Reload suggestions to show the new one
      const suggestionsResult = await listDraftSuggestions(draftId, "proposed");
      setSuggestions(suggestionsResult.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to create suggestion");
    } finally {
      setRequestingSuggestionForPage(null);
    }
  };

  // Handle accepting a suggestion
  const handleAcceptSuggestion = async (suggestionId: string) => {
    if (!draftId) return;

    setAcceptingSuggestionId(suggestionId);
    setError(null);

    try {
      await acceptDraftSuggestion(draftId, suggestionId);
      
      // Reload draft to get updated text
      const data = await fetchDraftById(draftId);
      setDraft(data);
      setEditedTitle(data.title || "");
      setEditedPages(data.pages || []);

      // Update original page texts to reflect accepted suggestion
      const updatedOriginalTexts: Record<number, string> = {};
      (data.pages || []).forEach(page => {
        updatedOriginalTexts[page.pageNumber] = page.text;
      });
      setOriginalPageTexts(updatedOriginalTexts);

      // Reload suggestions (this one should be gone, others may remain)
      const suggestionsResult = await listDraftSuggestions(draftId, "proposed");
      setSuggestions(suggestionsResult.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to accept suggestion");
    } finally {
      setAcceptingSuggestionId(null);
    }
  };

  // Handle rejecting a suggestion
  const handleRejectSuggestion = async (suggestionId: string) => {
    if (!draftId) return;

    setRejectingSuggestionId(suggestionId);
    setError(null);

    try {
      await rejectDraftSuggestion(draftId, suggestionId);
      
      // Remove from suggestions list (or reload)
      const suggestionsResult = await listDraftSuggestions(draftId, "proposed");
      setSuggestions(suggestionsResult.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to reject suggestion");
    } finally {
      setRejectingSuggestionId(null);
    }
  };

  // Handle requesting image prompt suggestion
  const handleRequestImagePromptSuggestion = async (pageNumber: number) => {
    if (!draftId) return;

    const page = (isEditing ? editedPages : (draft?.pages || [])).find(p => p.pageNumber === pageNumber);
    if (!page) {
      setError(`Page ${pageNumber} not found`);
      return;
    }

    // Validate that imagePrompt exists (required by backend)
    if (!page.imagePrompt || page.imagePrompt.trim().length === 0) {
      setError(`Page ${pageNumber} is missing an image prompt. Cannot generate suggestion.`);
      return;
    }

    setRequestingImagePromptSuggestion(pageNumber);
    setError(null);

    try {
      const result = await generateImagePromptSuggestion(
        draftId,
        pageNumber,
        page.text,
        page.imagePrompt
      );

      // Store the suggestion
      setImagePromptSuggestions(prev => ({
        ...prev,
        [pageNumber]: {
          suggestedImagePrompt: result.data.suggestedImagePrompt,
          rationale: result.data.rationale,
        },
      }));
    } catch (err: any) {
      setError(err.message || "Failed to generate image prompt suggestion");
    } finally {
      setRequestingImagePromptSuggestion(null);
    }
  };

  // Handle accepting image prompt suggestion
  const handleAcceptImagePromptSuggestion = async (pageNumber: number) => {
    if (!draftId) return;

    const suggestion = imagePromptSuggestions[pageNumber];
    if (!suggestion) return;

    setAcceptingImagePromptSuggestion(pageNumber);
    setError(null);

    try {
      // Update the page's image prompt locally
      if (isEditing) {
        // Update in editedPages
        const updatedPages = editedPages.map(p =>
          p.pageNumber === pageNumber
            ? { ...p, imagePrompt: suggestion.suggestedImagePrompt }
            : p
        );
        setEditedPages(updatedPages);
      } else {
        // Update in draft and save immediately
        const updatedPages = (draft?.pages || []).map(p =>
          p.pageNumber === pageNumber
            ? { ...p, imagePrompt: suggestion.suggestedImagePrompt }
            : p
        );

        await updateDraft(draftId, {
          pages: updatedPages,
        });

        // Reload draft
        const data = await fetchDraftById(draftId);
        setDraft(data);
        setEditedTitle(data.title || "");
        setEditedPages(data.pages || []);
        
        // Update original page texts to reflect saved changes
        const updatedOriginalTexts: Record<number, string> = {};
        (data.pages || []).forEach(page => {
          updatedOriginalTexts[page.pageNumber] = page.text;
        });
        setOriginalPageTexts(updatedOriginalTexts);
      }

      // Remove suggestion
      setImagePromptSuggestions(prev => {
        const updated = { ...prev };
        delete updated[pageNumber];
        return updated;
      });
    } catch (err: any) {
      setError(err.message || "Failed to accept image prompt suggestion");
    } finally {
      setAcceptingImagePromptSuggestion(null);
    }
  };

  // Handle rejecting image prompt suggestion
  const handleRejectImagePromptSuggestion = (pageNumber: number) => {
    setImagePromptSuggestions(prev => {
      const updated = { ...prev };
      delete updated[pageNumber];
      return updated;
    });
  };

  // Check if page text has changed from original
  const hasPageTextChanged = (pageNumber: number): boolean => {
    const currentPage = (isEditing ? editedPages : (draft?.pages || [])).find(p => p.pageNumber === pageNumber);
    const originalText = originalPageTexts[pageNumber];
    
    if (!currentPage || !originalText) return false;
    return currentPage.text.trim() !== originalText.trim();
  };

  // Helper: Format relative time (e.g., "2 days ago", "1 hour ago")
  const formatRelativeTime = (timestamp: any): string => {
    if (!timestamp) return "—";
    
    let date: Date;
    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === "string") {
      date = new Date(timestamp);
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp._seconds) {
      date = new Date(timestamp._seconds * 1000);
    } else {
      return "—";
    }
    
    if (isNaN(date.getTime())) return "—";
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} ${diffMinutes === 1 ? "minute" : "minutes"} ago`;
    } else {
      return "just now";
    }
  };

  // Helper: Format topic/situation for display (convert snake_case to Title Case)
  const formatTopicLabel = (value: string): string => {
    return value
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Handle approving draft
  const handleApprove = async () => {
    if (!draftId) return;
    
    setApproving(true);
    setError(null);
    
    try {
      // If in edit mode, save changes first, then approve
      if (isEditing) {
        // Save current edits before approving
        await updateDraft(draftId, {
          title: editedTitle,
          pages: editedPages,
        });
      }
      
      await approveDraft(draftId);
      setApproveDialogOpen(false);
      setApproving(false);
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
  // Can edit if draft is not approved or failed (edit mode is UI-only, status reflects revisions)
  const canEdit = draft?.status !== "approved" && draft?.status !== "failed";
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
          <Box sx={{ textAlign: "center", mb: 2 }}>
            {isEditing ? (
              <TextField
                fullWidth
                label="Story Title"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                variant="outlined"
                sx={{ mb: 1, maxWidth: "600px", mx: "auto" }}
              />
            ) : (
              <Typography variant="h4" component="h1" sx={{ textAlign: "center" }}>
                {draft?.title || "Draft Review"}
              </Typography>
            )}
            {isApproved && (
              <Typography variant="caption" color="secondary.main" sx={{ mt: 0.5, display: "block", textAlign: "center" }}>
                This draft has been approved and is now immutable.
              </Typography>
            )}
          </Box>
          
          {/* Edit Mode Indicator Banner */}
          {isEditing && !isApproved && (
            <Alert 
              severity="info" 
              icon={null}
              sx={{ 
                mt: 1,
                bgcolor: "info.light",
                color: "info.dark",
                "& .MuiAlert-message": {
                  width: "100%",
                },
              }}
            >
              <Typography variant="body2">
                Edit mode: Changes are saved manually. Draft status reflects content revisions, not current activity.
              </Typography>
            </Alert>
          )}

          {/* Toolbar */}
          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" sx={{ mt: 2 }}>
            {!isApproved && (
              <>
                {/* MODE A: READ-ONLY */}
                {!isEditing && (
                  <>
                    {canEdit && (
                      <Button variant="outlined" onClick={handleEnterEditMode} disabled={saving || approving}>
                        Edit Draft
                      </Button>
                    )}
                    {canApprove && (
                      <Button 
                        variant="contained" 
                        color="secondary" 
                        onClick={() => setApproveDialogOpen(true)} 
                        disabled={saving || approving}
                      >
                        Approve Draft
                      </Button>
                    )}
                  </>
                )}

                {/* MODE B: EDIT MODE */}
                {isEditing && (
                  <>
                    <Button 
                      variant="contained" 
                      color="primary" 
                      onClick={handleSaveChanges} 
                      disabled={saving || approving}
                    >
                      {saving ? <CircularProgress size={20} /> : "Save Changes"}
                    </Button>
                    <Button 
                      variant="outlined" 
                      onClick={handleCancelEdit} 
                      disabled={saving || approving}
                    >
                      Cancel Editing
                    </Button>
                    {canApprove && (
                      <Button
                        variant="outlined"
                        color="secondary"
                        onClick={() => setApproveDialogOpen(true)}
                        disabled={saving || approving}
                        sx={{
                          borderWidth: 2,
                          fontWeight: 500,
                          ml: 1, // Visual separation from Save/Cancel
                        }}
                      >
                        Approve & Finalize
                      </Button>
                    )}
                  </>
                )}
              </>
            )}

            {/* Spacer */}
            <Box sx={{ flexGrow: 1 }} />

            {/* Common Actions (always visible) */}
            <Button 
              variant="outlined" 
              startIcon={<ArrowBack />}
              onClick={() => {
                navigate("/specialist/drafts");
              }}
              disabled={saving || approving}
            >
              Back to List
            </Button>
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
            {/* Review Context Section */}
            <Card variant="outlined" sx={{ bgcolor: "background.paper" }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Review Context
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                    {brief?.therapeuticFocus?.primaryTopic && (
                      <Typography variant="body2" color="text.secondary">
                        <strong>Topic:</strong> {formatTopicLabel(brief.therapeuticFocus.primaryTopic)}
                      </Typography>
                    )}
                    {brief?.therapeuticFocus?.specificSituation && (
                      <Typography variant="body2" color="text.secondary">
                        <strong>Situation:</strong> {formatTopicLabel(brief.therapeuticFocus.specificSituation)}
                      </Typography>
                    )}
                    <Typography variant="body2" color="text.secondary">
                      <strong>Target reader:</strong> Ages {formatAgeGroup(brief?.childProfile?.ageGroup || draft.generationConfig.targetAgeGroup)}
                    </Typography>
                  </Stack>
                  {draft.briefId && (
                    <Typography variant="caption" color="text.secondary">
                      <Button
                        variant="text"
                        size="small"
                        startIcon={<Description />}
                        onClick={() => navigate(`/specialist/generate-draft?briefId=${draft.briefId}`)}
                        sx={{ textTransform: "none", p: 0, minWidth: "auto" }}
                      >
                        View full story brief for complete context
                      </Button>
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* Revision Status Section */}
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" gap={1}>
                  {draft.status && (
                    <Chip 
                      label={draft.status === "editing" ? "Revised" : draft.status === "generated" ? "Generated" : draft.status === "approved" ? "Approved" : draft.status}
                      color={draft.status === "approved" ? "secondary" : draft.status === "editing" ? "info" : draft.status === "generated" ? "success" : "default"}
                      size="small"
                    />
                  )}
                  {draft.revisionCount !== undefined && draft.revisionCount > 0 && (
                    <Chip 
                      label={`${draft.revisionCount} ${draft.revisionCount === 1 ? "revision" : "revisions"}`}
                      variant="outlined"
                      color="info"
                      size="small"
                    />
                  )}
                  {draft.status === "editing" && draft.revisionCount !== undefined && draft.revisionCount > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      This draft has been modified since generation
                    </Typography>
                  )}
                  <Box sx={{ flexGrow: 1 }} />
                  <Typography variant="caption" color="text.secondary">
                    Last updated: {formatRelativeTime(draft.updatedAt)}
                  </Typography>
                </Stack>
                {draft.approvedAt && (
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
                    <Typography variant="caption" color="secondary.main">
                      Approved: {formatRelativeTime(draft.approvedAt)}
                      {draft.approvedBy && ` by ${draft.approvedBy}`}
                    </Typography>
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* Story Pages */}
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    Story Pages
                  </Typography>
                  {draft.pages && draft.pages.length > 0 && (
                    <Typography variant="body2" color="text.secondary">
                      {draft.pages.length} {draft.pages.length === 1 ? "page" : "pages"}
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
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="subtitle1" fontWeight="bold">
                                Page {page.pageNumber} of {isEditing ? editedPages.length : (draft.pages?.length || 0)}
                              </Typography>
                              {!isEditing && hasPageTextChanged(page.pageNumber) && (
                                <Chip
                                  label="Edited"
                                  size="small"
                                  color="warning"
                                  variant="outlined"
                                />
                              )}
                            </Stack>
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
                                page.emotionalTone && (
                                  <Chip
                                    label={`Tone: ${page.emotionalTone}`}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                  />
                                )
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
                            
                            {/* Warning when text has changed */}
                            {hasPageTextChanged(page.pageNumber) && (
                              <Alert 
                                severity="warning" 
                                icon={<Warning />}
                                sx={{ mt: 1, fontSize: "0.75rem" }}
                              >
                                Story text has changed. Image prompt may need updating.
                              </Alert>
                            )}
                          </Box>

                          {/* AI Assistant Section (only in read-only mode, only for generated/editing status) */}
                          {!isEditing && !isApproved && (draft.status === "generated" || draft.status === "editing") && (
                            <PageAISuggestionBox
                              pageNumber={page.pageNumber}
                              onRequestSuggestion={(instruction) => handleRequestSuggestion(page.pageNumber, instruction)}
                              disabled={requestingSuggestionForPage !== null || acceptingSuggestionId !== null || rejectingSuggestionId !== null}
                              loading={requestingSuggestionForPage === page.pageNumber}
                            />
                          )}

                          {/* Existing Suggestions for this page */}
                          {!isEditing && suggestions
                            .filter(s => s.pageNumber === page.pageNumber && s.status === "proposed")
                            .map((suggestion) => (
                              <AISuggestionCard
                                key={suggestion.id}
                                suggestion={suggestion}
                                onAccept={handleAcceptSuggestion}
                                onReject={handleRejectSuggestion}
                                isRTL={isRTL}
                                accepting={acceptingSuggestionId === suggestion.id}
                                rejecting={rejectingSuggestionId === suggestion.id}
                                disabled={acceptingSuggestionId !== null || rejectingSuggestionId !== null || requestingSuggestionForPage !== null}
                              />
                            ))}

                          {/* Accepted suggestion indicator */}
                          {!isEditing && suggestions
                            .filter(s => s.pageNumber === page.pageNumber && s.status === "accepted")
                            .length > 0 && (
                              <Box sx={{ mt: 1 }}>
                                <Chip
                                  label="Applied"
                                  color="success"
                                  size="small"
                                  icon={<Check />}
                                />
                              </Box>
                            )}

                          {/* Image Prompt (Editable if in edit mode) */}
                          <Box>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1} flexWrap="wrap" gap={1}>
                              <Typography variant="caption" color="text.secondary">
                                Image Prompt
                              </Typography>
                              <Stack direction="row" spacing={1} alignItems="center">
                                {hasPageTextChanged(page.pageNumber) && (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    startIcon={requestingImagePromptSuggestion === page.pageNumber ? <CircularProgress size={16} /> : <Psychology />}
                                    onClick={() => handleRequestImagePromptSuggestion(page.pageNumber)}
                                    disabled={requestingImagePromptSuggestion !== null || acceptingImagePromptSuggestion !== null}
                                    sx={{ 
                                      textTransform: "none",
                                      fontSize: "0.75rem",
                                    }}
                                  >
                                    {requestingImagePromptSuggestion === page.pageNumber ? "Generating..." : "Align image prompt"}
                                  </Button>
                                )}
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
                            
                            {/* Image Prompt Suggestion Card */}
                            {imagePromptSuggestions[page.pageNumber] && (
                              <ImagePromptSuggestionCard
                                suggestedImagePrompt={imagePromptSuggestions[page.pageNumber].suggestedImagePrompt}
                                rationale={imagePromptSuggestions[page.pageNumber].rationale}
                                onAccept={() => handleAcceptImagePromptSuggestion(page.pageNumber)}
                                onReject={() => handleRejectImagePromptSuggestion(page.pageNumber)}
                                accepting={acceptingImagePromptSuggestion === page.pageNumber}
                                disabled={requestingImagePromptSuggestion !== null || acceptingImagePromptSuggestion !== null}
                              />
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
        <DialogTitle>
          {isEditing ? "Approve final version?" : "Approve Draft"}
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {isEditing 
              ? "This will approve the current content and make it available for personalization."
              : "This will finalize the story and make it available for personalization. This action cannot be undone."}
          </Alert>
          {!isEditing && (
            <Typography variant="body2" color="text.secondary">
              Once approved, the draft will become immutable and a story template will be created.
            </Typography>
          )}
          {isEditing && (
            <Typography variant="body2" color="text.secondary">
              The current edited content will be approved and saved as the final version. This action cannot be undone.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialogOpen(false)} disabled={approving}>
            Cancel
          </Button>
          <Button onClick={handleApprove} variant="contained" color="primary" disabled={approving}>
            {approving ? <CircularProgress size={20} /> : isEditing ? "Approve Final Version" : "Approve"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ReviewDraftPage;
