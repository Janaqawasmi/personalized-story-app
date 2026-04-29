// Gate 2 — specialist reviews Seedream-generated illustrations.
// Shows each page's illustration alongside the text; approve or reject.
// When all are approved the server auto-advances to illustration_ready.

import React, { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";

import type { PageIllustration, Story } from "../../types/story";
import { COLORS, DESIGN_TOKENS } from "../../theme";
import * as api from "../../api/specialistStories";

// ---------------------------------------------------------------------------
// Illustration status chip
// ---------------------------------------------------------------------------

function IllustrationStatusChip({ status }: { status: PageIllustration["illustrationStatus"] }) {
  const map = {
    pending:    { label: "Pending",     bg: "#f0ece5", color: COLORS.textSecondary },
    generating: { label: "Generating",  bg: "#e4eaf0", color: COLORS.primary },
    done:       { label: "Done",        bg: "#eaf0e4", color: COLORS.success },
    failed:     { label: "Failed",      bg: "#f0e4e8", color: COLORS.error },
  } as const;
  const s = map[status];
  return (
    <Chip size="small" label={s.label}
      sx={{ bgcolor: s.bg, color: s.color, fontWeight: 600, fontSize: "0.72rem" }} />
  );
}

// ---------------------------------------------------------------------------
// Lightbox
// ---------------------------------------------------------------------------

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <Dialog open onClose={onClose} maxWidth="lg" PaperProps={{ sx: { bgcolor: "#111", p: 0 } }}>
      <DialogContent sx={{ p: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Box
          component="img"
          src={url}
          alt="Illustration"
          sx={{ maxWidth: "90vw", maxHeight: "90vh", display: "block" }}
        />
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Single page card
// ---------------------------------------------------------------------------

interface PageCardProps {
  page: PageIllustration;
  storyId: string;
  onUpdated: (page: PageIllustration, allApproved: boolean, newStatus: Story["status"]) => void;
}

function PageCard({ page, storyId, onUpdated }: PageCardProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [rejecting, setRejecting]       = useState(false);
  const [note, setNote]                 = useState(page.illustrationRejectionNote ?? "");
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const isDone = page.illustrationStatus === "done";
  const isFailed = page.illustrationStatus === "failed";
  const isGenerating = page.illustrationStatus === "generating";
  const isPending = page.illustrationStatus === "pending";

  async function handleApprove() {
    setSaving(true); setError(null);
    try {
      const result = await api.reviewIllustration(storyId, page.pageNumber, "approve");
      onUpdated(result.page, result.allApproved, result.storyStatus);
      setRejecting(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to approve illustration.");
    } finally { setSaving(false); }
  }

  async function handleReject() {
    if (!note.trim()) return;
    setSaving(true); setError(null);
    try {
      const result = await api.reviewIllustration(storyId, page.pageNumber, "reject", note.trim());
      onUpdated(result.page, result.allApproved, result.storyStatus);
      setRejecting(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reject illustration.");
    } finally { setSaving(false); }
  }

  return (
    <>
      {lightboxOpen && page.illustrationUrl && (
        <Lightbox url={page.illustrationUrl} onClose={() => setLightboxOpen(false)} />
      )}

      <Box
        sx={{
          bgcolor: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        {/* Card header */}
        <Stack
          direction="row" alignItems="center" justifyContent="space-between"
          sx={{ px: 3, py: 1.5, bgcolor: "#f8f5f1", borderBottom: `1px solid ${COLORS.border}` }}
        >
          <Typography
            sx={{ fontFamily: DESIGN_TOKENS.fontDisplay, fontWeight: 600, fontSize: "0.85rem",
              color: COLORS.textSecondary, letterSpacing: "0.06em", textTransform: "uppercase" }}
          >
            Page {page.pageNumber}
          </Typography>
          <IllustrationStatusChip status={page.illustrationStatus} />
        </Stack>

        {/* Vertical layout: text on top, image below */}
        <Stack
          direction="column"
          sx={{ minHeight: 220 }}
          divider={<Box sx={{ width: "100%", height: 1, bgcolor: COLORS.border }} />}
        >
          {/* Left: story text */}
          <Box sx={{ flex: 1, px: 3, py: 2.5 }}>
            <Typography
              variant="caption"
              sx={{ color: COLORS.textSecondary, fontWeight: 700, letterSpacing: "0.08em",
                textTransform: "uppercase", display: "block", mb: 1 }}
            >
              Story text
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: COLORS.textPrimary, lineHeight: 1.8,
                fontFamily: DESIGN_TOKENS.fontBody, fontSize: "0.92rem" }}
            >
              {page.text}
            </Typography>
          </Box>

          {/* Right: illustration */}
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", p: 2.5, gap: 2 }}>
            {isDone && page.illustrationUrl ? (
              <Box
                onClick={() => setLightboxOpen(true)}
                sx={{ position: "relative", cursor: "zoom-in",
                  borderRadius: 2, overflow: "hidden", width: "100%",
                  border: `1px solid ${COLORS.border}`, bgcolor: "#f8f5f1",
                  "&:hover .zoom-hint": { opacity: 1 } }}
              >
                <Box
                  component="img"
                  src={page.illustrationUrl}
                  alt={`Page ${page.pageNumber} illustration`}
                  sx={{ width: "100%", display: "block", borderRadius: 2,
                    minHeight: { xs: 260, md: 320 }, maxHeight: 420, objectFit: "contain" }}
                />
                <Box className="zoom-hint"
                  sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,0.35)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    opacity: 0, transition: "opacity 0.15s", borderRadius: 2 }}
                >
                  <ZoomInIcon sx={{ color: "#fff", fontSize: 36 }} />
                </Box>
              </Box>
            ) : isGenerating ? (
              <Stack alignItems="center" spacing={1.5}>
                <CircularProgress size={32} sx={{ color: COLORS.primary }} />
                <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
                  Generating illustration…
                </Typography>
              </Stack>
            ) : isFailed ? (
              <Stack alignItems="center" spacing={1} sx={{ color: COLORS.error }}>
                <ErrorOutlineIcon sx={{ fontSize: 36 }} />
                <Typography variant="body2" sx={{ textAlign: "center", maxWidth: 220 }}>
                  {page.illustrationRejectionNote ?? "Generation failed."}
                </Typography>
              </Stack>
            ) : (
              <Stack alignItems="center" spacing={1} sx={{ color: COLORS.textSecondary }}>
                <HourglassEmptyIcon sx={{ fontSize: 32 }} />
                <Typography variant="body2">Waiting to generate…</Typography>
              </Stack>
            )}
          </Box>
        </Stack>

        {/* Footer: rejection note history + actions */}
        {(error || page.illustrationRejectionNote || isDone) && (
          <Box sx={{ px: 3, pt: 1.5, pb: 2.5, borderTop: `1px solid ${COLORS.border}` }}>
            {page.illustrationRejectionNote && !rejecting && (
              <Alert severity="warning" sx={{ mb: 1.5, py: 0.5, fontSize: "0.82rem" }}>
                <strong>Rejection note:</strong> {page.illustrationRejectionNote}
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 1.5, py: 0.5, fontSize: "0.82rem" }}>{error}</Alert>
            )}

            <Collapse in={rejecting}>
              <Stack spacing={1.5} sx={{ mb: 1.5 }}>
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
                  <Button size="small" variant="contained" color="error"
                    disabled={!note.trim() || saving} onClick={handleReject}
                    sx={{ fontWeight: 700, borderRadius: 1.5 }}>
                    {saving ? <CircularProgress size={14} color="inherit" /> : "Confirm rejection"}
                  </Button>
                  <Button size="small" variant="outlined" disabled={saving}
                    onClick={() => { setRejecting(false); setNote(page.illustrationRejectionNote ?? ""); }}
                    sx={{ borderRadius: 1.5 }}>
                    Cancel
                  </Button>
                </Stack>
              </Stack>
            </Collapse>

            {!rejecting && isDone && (
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button size="small" variant="outlined" color="error" disabled={saving}
                  onClick={() => setRejecting(true)} startIcon={<HighlightOffIcon />}
                  sx={{ borderRadius: 1.5, fontWeight: 600 }}>
                  Reject
                </Button>
                <Button size="small" variant="contained" disabled={saving}
                  onClick={handleApprove}
                  startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <CheckCircleOutlineIcon />}
                  sx={{ bgcolor: COLORS.success, "&:hover": { bgcolor: "#4a6840" },
                    borderRadius: 1.5, fontWeight: 700 }}>
                  Approve
                </Button>
              </Stack>
            )}
          </Box>
        )}
      </Box>
    </>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

interface IllustrationReviewPanelProps {
  story: Story;
  onStoryStatusChange: (status: Story["status"]) => void;
}

export default function IllustrationReviewPanel({ story, onStoryStatusChange }: IllustrationReviewPanelProps) {
  const [pages, setPages] = useState<PageIllustration[]>(story.pages ?? []);

  function handlePageUpdated(
    updated: PageIllustration,
    allApproved: boolean,
    newStatus: Story["status"],
  ) {
    setPages((prev) => prev.map((p) => p.pageNumber === updated.pageNumber ? updated : p));
    if (allApproved) {
      onStoryStatusChange(newStatus);
    }
  }

  const approvedCount = pages.filter(
    (p) => p.illustrationStatus === "done" && p.illustrationRejectionNote === null,
  ).length;
  const doneCount = pages.filter((p) => p.illustrationStatus === "done").length;

  return (
    <Stack spacing={0}>
      {/* Header */}
      <Box sx={{ px: { xs: 2, sm: 3, md: 5 }, pt: 3, pb: 2 }}>
        <Typography
          variant="h6"
          sx={{ fontFamily: DESIGN_TOKENS.fontDisplay, fontWeight: 700,
            color: COLORS.textPrimary, mb: 0.4 }}
        >
          Illustration review
        </Typography>
        <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
          Review each generated illustration. Approve all to advance the story to "Illustration ready."
          {pages.length > 0 && (
            <> &nbsp;
              <Box component="span" sx={{ fontWeight: 700,
                color: doneCount === pages.length ? COLORS.success : COLORS.textPrimary }}>
                {doneCount} of {pages.length} generated.
              </Box>
            </>
          )}
        </Typography>
      </Box>

      {/* Page cards */}
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
    </Stack>
  );
}
