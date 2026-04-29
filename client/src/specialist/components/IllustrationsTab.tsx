// IllustrationsTab — orchestrates the illustration pipeline UI.
// Adapts its content based on story.status:
//   approved           → prompts still generating (loader + polling)
//   prompt_review      → Gate 1: PromptReviewPanel
//   illustrating       → Seedream running (progress + polling)
//   illustration_review → Gate 2: IllustrationReviewPanel
//   illustration_ready / published → read-only gallery

import React, { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import ImageIcon from "@mui/icons-material/Image";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";

import type { Story } from "../../types/story";
import { COLORS, DESIGN_TOKENS } from "../../theme";
import * as api from "../../api/specialistStories";
import { draftStore } from "../storage";
import PromptReviewPanel from "./PromptReviewPanel";
import IllustrationReviewPanel from "./IllustrationReviewPanel";

const POLL_INTERVAL_MS = 5000;

// ---------------------------------------------------------------------------
// Illustrating progress panel — shows per-page status while Seedream runs
// ---------------------------------------------------------------------------

function IllustratingPanel({ story, onStoryUpdate }: { story: Story; onStoryUpdate: (s: Story) => void }) {
  const pages = story.pages ?? [];
  const doneCount = pages.filter((p) => p.illustrationStatus === "done").length;
  const failedCount = pages.filter((p) => p.illustrationStatus === "failed").length;
  const total = pages.length;

  // Poll until all pages are no longer "generating" / "pending"
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const done = pages.every(
      (p) => p.illustrationStatus === "done" || p.illustrationStatus === "failed",
    );
    if (done || story.status !== "illustrating") return;

    pollRef.current = setTimeout(async () => {
      try {
        const updated = await draftStore.getStory(story.id);
        if (updated) onStoryUpdate(updated);
      } catch { /* silent */ }
    }, POLL_INTERVAL_MS);

    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  });

  return (
    <Box sx={{ px: { xs: 2, sm: 3, md: 5 }, pt: 3, pb: 6 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <CircularProgress size={20} sx={{ color: COLORS.primary }} />
        <Typography variant="h6"
          sx={{ fontFamily: DESIGN_TOKENS.fontDisplay, fontWeight: 700, color: COLORS.textPrimary }}>
          Generating illustrations
        </Typography>
      </Stack>

      <Typography variant="body2" sx={{ color: COLORS.textSecondary, mb: 3 }}>
        Seedream is generating images page by page. This page refreshes automatically.
        &nbsp;
        <Box component="span" sx={{ fontWeight: 700, color: COLORS.textPrimary }}>
          {doneCount} of {total} done{failedCount > 0 ? `, ${failedCount} failed` : ""}.
        </Box>
      </Typography>

      <Stack spacing={1.5}>
        {pages.map((page) => {
          const statusConfig = {
            done:       { color: COLORS.success,       label: "Done" },
            failed:     { color: COLORS.error,         label: "Failed" },
            generating: { color: COLORS.primary,       label: "Generating…" },
            pending:    { color: COLORS.textSecondary, label: "Waiting" },
          } as const;
          const s = statusConfig[page.illustrationStatus];

          return (
            <Stack key={page.pageNumber} direction="row" alignItems="center"
              spacing={2} sx={{ py: 1.25, px: 2, bgcolor: COLORS.surface,
                border: `1px solid ${COLORS.border}`, borderRadius: 2 }}>
              <ImageIcon sx={{ color: COLORS.border, fontSize: 20 }} />
              <Typography variant="body2" sx={{ flex: 1, color: COLORS.textPrimary,
                fontWeight: 500 }}>
                Page {page.pageNumber}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                {page.illustrationStatus === "generating" && (
                  <CircularProgress size={12} sx={{ color: COLORS.primary }} />
                )}
                <Typography variant="caption" sx={{ color: s.color, fontWeight: 700 }}>
                  {s.label}
                </Typography>
              </Box>
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Read-only gallery (illustration_ready / published)
// ---------------------------------------------------------------------------

function IllustrationGallery({ story }: { story: Story }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const pages = (story.pages ?? []).filter((p) => p.illustrationUrl);

  return (
    <>
      {lightbox && (
        <Dialog open onClose={() => setLightbox(null)} maxWidth="lg"
          PaperProps={{ sx: { bgcolor: "#111", p: 0 } }}>
          <DialogContent sx={{ p: 0 }}>
            <Box component="img" src={lightbox} alt="Illustration"
              sx={{ maxWidth: "90vw", maxHeight: "90vh", display: "block" }} />
          </DialogContent>
        </Dialog>
      )}

      <Box sx={{ px: { xs: 2, sm: 3, md: 5 }, pt: 3, pb: 6 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
          <CheckCircleIcon sx={{ color: COLORS.success, fontSize: 22 }} />
          <Typography variant="h6"
            sx={{ fontFamily: DESIGN_TOKENS.fontDisplay, fontWeight: 700, color: COLORS.textPrimary }}>
            {story.status === "published" ? "Published illustrations" : "Illustrations ready"}
          </Typography>
        </Stack>
        <Typography variant="body2" sx={{ color: COLORS.textSecondary, mb: 3 }}>
          {pages.length} illustration{pages.length !== 1 ? "s" : ""} approved.
          {story.status === "illustration_ready" && " This story is ready to publish."}
        </Typography>

        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 2 }}>
          {pages.map((page) => (
            <Box key={page.pageNumber}
              onClick={() => setLightbox(page.illustrationUrl!)}
              sx={{ borderRadius: 2, overflow: "hidden", cursor: "zoom-in", position: "relative",
                border: `1px solid ${COLORS.border}`, bgcolor: COLORS.surface,
                "&:hover .zoom-overlay": { opacity: 1 } }}>
              <Box component="img" src={page.illustrationUrl!} alt={`Page ${page.pageNumber}`}
                sx={{ width: "100%", display: "block", height: { xs: 260, md: 320 },
                  objectFit: "contain", bgcolor: "#f8f5f1" }} />
              <Box className="zoom-overlay"
                sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,0.3)",
                  display: "flex", alignItems: "flex-end", p: 1.5,
                  opacity: 0, transition: "opacity 0.15s" }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between"
                  sx={{ width: "100%" }}>
                  <Chip size="small" label={`Page ${page.pageNumber}`}
                    sx={{ bgcolor: "rgba(255,255,255,0.9)", fontWeight: 700, fontSize: "0.72rem" }} />
                  <ZoomInIcon sx={{ color: "#fff", fontSize: 22 }} />
                </Stack>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </>
  );
}

// ---------------------------------------------------------------------------
// IllustrationsTab — main export
// ---------------------------------------------------------------------------

interface IllustrationsTabProps {
  story: Story;
  onStoryUpdate: (story: Story) => void;
}

function ApprovedPanel({
  story,
  onStoryUpdate,
}: {
  story: Story;
  onStoryUpdate: (s: Story) => void;
}) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setStarting(true);
    setError(null);
    try {
      const updated = await api.transitionStory(story.id, "prompt_review");
      onStoryUpdate(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start prompt generation.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <Box sx={{ px: { xs: 2, sm: 3, md: 5 }, pt: 5, pb: 6 }}>
      <Stack alignItems="center" spacing={3} sx={{ maxWidth: 480, mx: "auto", textAlign: "center" }}>
        <Box
          sx={{ width: 64, height: 64, borderRadius: "50%", bgcolor: "#eaf0e4",
            display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <AutoAwesomeIcon sx={{ fontSize: 30, color: COLORS.success }} />
        </Box>

        <Box>
          <Typography variant="h6"
            sx={{ fontFamily: DESIGN_TOKENS.fontDisplay, fontWeight: 700,
              color: COLORS.textPrimary, mb: 0.75 }}>
            Story approved
          </Typography>
          <Typography variant="body2" sx={{ color: COLORS.textSecondary, lineHeight: 1.7 }}>
            The next step is to generate one AI image prompt per page.
            Claude will create a Visual Bible and a tailored prompt for each page —
            you'll review them before any illustrations are produced.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ width: "100%", borderRadius: 2, textAlign: "left" }}>
            {error}
          </Alert>
        )}

        <Button
          variant="contained"
          size="large"
          disabled={starting}
          onClick={handleStart}
          startIcon={starting
            ? <CircularProgress size={18} color="inherit" />
            : <AutoAwesomeIcon />}
          sx={{
            px: 4, py: 1.4, fontWeight: 700, borderRadius: 2,
            bgcolor: COLORS.primary, "&:hover": { bgcolor: COLORS.primaryDark },
            boxShadow: "0 8px 24px -8px rgba(97,120,145,0.45)",
          }}
        >
          {starting ? "Starting…" : "Generate image prompts"}
        </Button>

        <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
          This usually takes under a minute. You can navigate away and come back.
        </Typography>
      </Stack>
    </Box>
  );
}

export default function IllustrationsTab({ story, onStoryUpdate }: IllustrationsTabProps) {
  function handleStatusChange(status: Story["status"]) {
    onStoryUpdate({ ...story, status });
  }

  switch (story.status) {
    case "approved":
      return <ApprovedPanel story={story} onStoryUpdate={onStoryUpdate} />;

    case "prompt_review":
      return (
        <PromptReviewPanel
          story={story}
          onStoryStatusChange={handleStatusChange}
        />
      );

    case "illustrating":
      return (
        <IllustratingPanel story={story} onStoryUpdate={onStoryUpdate} />
      );

    case "illustration_review":
      return (
        <IllustrationReviewPanel
          story={story}
          onStoryStatusChange={handleStatusChange}
        />
      );

    case "illustration_ready":
    case "published":
      return <IllustrationGallery story={story} />;

    default:
      return (
        <Box sx={{ px: { xs: 2, sm: 3, md: 5 }, pt: 5, pb: 6, textAlign: "center" }}>
          <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
            Illustrations will be available after the story is approved.
          </Typography>
        </Box>
      );
  }
}
