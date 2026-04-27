// Gate 1 — specialist reviews AI-generated image prompts before Seedream runs.
// Shows each page's text alongside its imagePrompt; specialist approves or rejects.
// When all prompts are approved the "Generate illustrations" button becomes active.

import React, { useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import PendingOutlinedIcon from "@mui/icons-material/PendingOutlined";

import type { PageIllustration, Story } from "../../types/story";
import { COLORS, DESIGN_TOKENS } from "../../theme";
import * as api from "../../api/specialistStories";

// ---------------------------------------------------------------------------
// Prompt status chip
// ---------------------------------------------------------------------------

function PromptStatusChip({ status }: { status: PageIllustration["promptStatus"] }) {
  const map = {
    pending:  { label: "Pending",  bg: "#f0ece5", color: COLORS.textSecondary, icon: <PendingOutlinedIcon sx={{ fontSize: 14 }} /> },
    approved: { label: "Approved", bg: "#eaf0e4", color: COLORS.success,       icon: <CheckCircleOutlineIcon sx={{ fontSize: 14 }} /> },
    rejected: { label: "Rejected", bg: "#f0e4e8", color: COLORS.error,         icon: <HighlightOffIcon sx={{ fontSize: 14 }} /> },
  } as const;
  const s = map[status];
  return (
    <Chip
      size="small"
      icon={s.icon}
      label={s.label}
      sx={{ bgcolor: s.bg, color: s.color, fontWeight: 600, fontSize: "0.72rem",
        "& .MuiChip-icon": { color: s.color } }}
    />
  );
}

// ---------------------------------------------------------------------------
// Single page card
// ---------------------------------------------------------------------------

interface PageCardProps {
  page: PageIllustration;
  storyId: string;
  onUpdated: (updated: PageIllustration) => void;
}

function PageCard({ page, storyId, onUpdated }: PageCardProps) {
  const [rejecting, setRejecting]     = useState(false);
  const [note, setNote]               = useState(page.promptRejectionNote ?? "");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);

  async function handleApprove() {
    setSaving(true); setError(null);
    try {
      const updated = await api.reviewPrompt(storyId, page.pageNumber, "approve");
      onUpdated(updated);
      setRejecting(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to approve prompt.");
    } finally { setSaving(false); }
  }

  async function handleReject() {
    if (!note.trim()) return;
    setSaving(true); setError(null);
    try {
      const updated = await api.reviewPrompt(storyId, page.pageNumber, "reject", note.trim());
      onUpdated(updated);
      setRejecting(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reject prompt.");
    } finally { setSaving(false); }
  }

  return (
    <Box
      sx={{
        bgcolor: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      {/* Page header */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 3, py: 1.5, bgcolor: "#f8f5f1", borderBottom: `1px solid ${COLORS.border}` }}
      >
        <Typography
          sx={{ fontFamily: DESIGN_TOKENS.fontDisplay, fontWeight: 600, fontSize: "0.85rem",
            color: COLORS.textSecondary, letterSpacing: "0.06em", textTransform: "uppercase" }}
        >
          Page {page.pageNumber}
        </Typography>
        <PromptStatusChip status={page.promptStatus} />
      </Stack>

      <Stack sx={{ px: 3, py: 2.5 }} spacing={2}>
        {/* Story text */}
        <Box>
          <Typography
            variant="caption"
            sx={{ color: COLORS.textSecondary, fontWeight: 700, letterSpacing: "0.08em",
              textTransform: "uppercase", display: "block", mb: 0.75 }}
          >
            Story text
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: COLORS.textPrimary, lineHeight: 1.75,
              fontFamily: DESIGN_TOKENS.fontBody, fontSize: "0.92rem" }}
          >
            {page.text}
          </Typography>
        </Box>

        <Divider sx={{ borderColor: COLORS.border }} />

        {/* Image prompt */}
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
            <AutoAwesomeIcon sx={{ fontSize: 14, color: COLORS.primary }} />
            <Typography
              variant="caption"
              sx={{ color: COLORS.textSecondary, fontWeight: 700, letterSpacing: "0.08em",
                textTransform: "uppercase" }}
            >
              Image prompt
            </Typography>
          </Stack>
          {page.imagePrompt ? (
            <Box
              sx={{ bgcolor: "#f3f0eb", borderRadius: 1.5, px: 2, py: 1.5,
                border: `1px solid ${COLORS.border}` }}
            >
              <Typography
                variant="body2"
                sx={{ color: COLORS.textPrimary, lineHeight: 1.7,
                  fontFamily: "'DM Mono', 'Fira Mono', monospace", fontSize: "0.83rem",
                  whiteSpace: "pre-wrap" }}
              >
                {page.imagePrompt}
              </Typography>
            </Box>
          ) : (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={14} />
              <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
                Generating prompt…
              </Typography>
            </Stack>
          )}
        </Box>

        {/* Rejection note (if previously rejected) */}
        {page.promptStatus === "rejected" && page.promptRejectionNote && !rejecting && (
          <Alert severity="warning" sx={{ py: 0.5, fontSize: "0.82rem" }}>
            <strong>Rejection note:</strong> {page.promptRejectionNote}
          </Alert>
        )}

        {/* Error */}
        {error && <Alert severity="error" sx={{ py: 0.5, fontSize: "0.82rem" }}>{error}</Alert>}

        {/* Inline reject form */}
        <Collapse in={rejecting}>
          <Stack spacing={1.5}>
            <TextField
              size="small"
              multiline
              minRows={2}
              label="Rejection note (required)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.5 } }}
            />
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="contained"
                color="error"
                disabled={!note.trim() || saving}
                onClick={handleReject}
                sx={{ fontWeight: 700, borderRadius: 1.5 }}
              >
                {saving ? <CircularProgress size={14} color="inherit" /> : "Confirm rejection"}
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={saving}
                onClick={() => { setRejecting(false); setNote(page.promptRejectionNote ?? ""); }}
                sx={{ borderRadius: 1.5 }}
              >
                Cancel
              </Button>
            </Stack>
          </Stack>
        </Collapse>

        {/* Action buttons */}
        {!rejecting && page.imagePrompt && (
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            {page.promptStatus !== "rejected" && (
              <Button
                size="small"
                variant="outlined"
                color="error"
                disabled={saving}
                onClick={() => setRejecting(true)}
                startIcon={<HighlightOffIcon />}
                sx={{ borderRadius: 1.5, fontWeight: 600 }}
              >
                Reject
              </Button>
            )}
            {page.promptStatus !== "approved" && (
              <Button
                size="small"
                variant="contained"
                disabled={saving}
                onClick={handleApprove}
                startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <CheckCircleOutlineIcon />}
                sx={{ bgcolor: COLORS.success, "&:hover": { bgcolor: "#4a6840" },
                  borderRadius: 1.5, fontWeight: 700 }}
              >
                Approve prompt
              </Button>
            )}
            {page.promptStatus === "approved" && (
              <Button
                size="small"
                variant="outlined"
                disabled={saving}
                onClick={() => setRejecting(true)}
                sx={{ borderRadius: 1.5, color: COLORS.textSecondary, borderColor: COLORS.border }}
              >
                Revise
              </Button>
            )}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

interface PromptReviewPanelProps {
  story: Story;
  onStoryStatusChange: (status: Story["status"]) => void;
}

export default function PromptReviewPanel({ story, onStoryStatusChange }: PromptReviewPanelProps) {
  const [pages, setPages] = useState<PageIllustration[]>(story.pages ?? []);
  const [triggering, setTriggering] = useState(false);
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const [pollTick, setPollTick] = useState(0);
  const waitingSinceRef = useRef<number>(Date.now());

  function handlePageUpdated(updated: PageIllustration) {
    setPages((prev) => prev.map((p) => p.pageNumber === updated.pageNumber ? updated : p));
  }

  const approvedCount = pages.filter((p) => p.promptStatus === "approved").length;
  const allApproved = pages.length > 0 && approvedCount === pages.length;
  const hasPrompts = pages.some((p) => p.imagePrompt !== null);
  const waitingTooLong = !hasPrompts && Date.now() - waitingSinceRef.current > 120_000;

  // Poll every 5 s while prompts are still generating.
  // Each completed poll increments pollTick, re-running the effect to schedule the next one.
  useEffect(() => {
    if (hasPrompts) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const latest = await api.getStory(story.id);
        if (cancelled) return;
        setPages(latest.pages ?? []);
        if (latest.status !== story.status) {
          onStoryStatusChange(latest.status);
        }
      } catch {
        // Keep polling silently; the info alert remains visible.
      } finally {
        if (!cancelled) setPollTick((t) => t + 1);
      }
    }, 5000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPrompts, pollTick, story.id, story.status]);

  useEffect(() => {
    waitingSinceRef.current = Date.now();
    setPollTick(0);
  }, [story.id]);

  async function handleGenerateIllustrations() {
    setTriggering(true); setTriggerError(null);
    try {
      await api.transitionStory(story.id, "illustrating");
      onStoryStatusChange("illustrating");
    } catch (e) {
      setTriggerError(e instanceof Error ? e.message : "Failed to start illustration generation.");
    } finally { setTriggering(false); }
  }

  return (
    <Stack spacing={0} sx={{ height: "100%" }}>
      {/* Section header */}
      <Box sx={{ px: { xs: 2, sm: 3, md: 5 }, pt: 3, pb: 2 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <Box>
            <Typography
              variant="h6"
              sx={{ fontFamily: DESIGN_TOKENS.fontDisplay, fontWeight: 700,
                color: COLORS.textPrimary, mb: 0.4 }}
            >
              Image prompt review
            </Typography>
            <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
              Review each AI-generated prompt before illustrations are created.
              {hasPrompts && (
                <> &nbsp;
                  <Box component="span" sx={{ fontWeight: 700, color: allApproved ? COLORS.success : COLORS.textPrimary }}>
                    {approvedCount} of {pages.length} approved.
                  </Box>
                </>
              )}
            </Typography>
          </Box>

          <Button
            variant="contained"
            disabled={!allApproved || triggering}
            onClick={handleGenerateIllustrations}
            startIcon={triggering ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
            sx={{
              px: 3, py: 1.25, fontWeight: 700, borderRadius: 2,
              bgcolor: COLORS.primary, flexShrink: 0,
              "&:hover": { bgcolor: COLORS.primaryDark },
              "&.Mui-disabled": { bgcolor: COLORS.border, color: COLORS.textSecondary },
              boxShadow: allApproved ? "0 8px 24px -8px rgba(97,120,145,0.45)" : "none",
            }}
          >
            Generate illustrations
          </Button>
        </Stack>

        {triggerError && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{triggerError}</Alert>
        )}

        {!hasPrompts && (
          <Alert severity={waitingTooLong ? "warning" : "info"} sx={{ mt: 2, borderRadius: 2 }} icon={<CircularProgress size={16} />}>
            Claude is generating image prompts — checking for updates every 5 seconds.
            {waitingTooLong && " This is taking longer than usual. Check the server logs if it doesn't appear soon."}
          </Alert>
        )}
      </Box>

      {/* Page cards */}
      {hasPrompts && (
        <Box sx={{ px: { xs: 2, sm: 3, md: 5 }, pb: 6 }}>
          <Stack spacing={2}>
            {pages.map((page) => (
              <PageCard
                key={page.pageNumber}
                page={page}
                storyId={story.id}
                onUpdated={handlePageUpdated}
              />
            ))}
          </Stack>
        </Box>
      )}
    </Stack>
  );
}
