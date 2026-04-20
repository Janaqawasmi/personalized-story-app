// client/src/specialist/components/BriefTab.tsx
//
// Renders the Brief tab inside StoryWorkspacePage.
// Three modes driven by story.status / story.briefStatus:
//   Case 1: status === 'generating'   → read-only + polling banner
//   Case 2: briefStatus === 'submitted' (not generating) → read-only + locked banner
//   Case 3: briefStatus === 'draft'   → editable BriefForm

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CloseIcon from "@mui/icons-material/Close";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import type { Story } from "../../types/story";
import type { CompleteBrief } from "../../types/storyBrief";
import BriefForm, { type BriefFormStorageAdapter } from "../../components/brief/BriefForm";
import SubmittedBriefReadView from "../../components/specialist/SubmittedBriefReadView";
import { draftStore } from "../storage";
import { useSpecialistUi } from "../../i18n/specialistUi";
import { formatRelativeTime } from "./StoryRow";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 5000;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface BriefTabProps {
  story: Story;
  onStoryUpdate: (story: Story) => void;
  onNavigateToTab: (tab: "draft") => void;
}

// ---------------------------------------------------------------------------
// BriefTab
// ---------------------------------------------------------------------------

function shouldOfferNewStoryWelcome(story: Story): boolean {
  if (story.status !== "draft_brief" || story.briefStatus !== "draft") return false;
  const untitled = !story.title.trim() || story.title === "Untitled story";
  return untitled && story.brief.storyType == null;
}

export default function BriefTab({ story, onStoryUpdate, onNavigateToTab }: BriefTabProps) {
  const sp = useSpecialistUi();
  const navigate = useNavigate();
  const { lang } = useParams<{ lang?: string }>();
  const base = `/${lang ?? "he"}/specialist`;

  // ---- "View as JSON" dialog ----
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false);
  const [copyHint, setCopyHint] = useState<string | null>(null);

  // ---- generation failure: switch to editable ----
  const [generationFailed, setGenerationFailed] = useState(false);

  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const showNewStoryWelcome =
    !welcomeDismissed && !generationFailed && shouldOfferNewStoryWelcome(story);

  // ---- polling ----
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current !== null) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (story.status !== "generating" || generationFailed) {
      stopPolling();
      return;
    }

    pollingRef.current = setInterval(async () => {
      try {
        const updated = await draftStore.getStory(story.id);
        if (!updated) return;
        if (updated.status !== "generating") {
          stopPolling();
          onStoryUpdate(updated);
          if (updated.status === "awaiting_review") {
            onNavigateToTab("draft");
          } else if (updated.status === "draft_brief") {
            setGenerationFailed(true);
          }
        }
      } catch {
        // Transient fetch errors are silently ignored; polling continues.
      }
    }, POLL_INTERVAL_MS);

    return stopPolling;
  }, [story.id, story.status, generationFailed, onStoryUpdate, onNavigateToTab, stopPolling]);

  // ---- storage adapter (editable mode) ----
  const storageAdapter = useMemo<BriefFormStorageAdapter>(
    () => ({
      load: () => story.brief,
      save: (brief: CompleteBrief) => {
        draftStore
          .updateBrief(story.id, brief)
          .then((updated) => onStoryUpdate(updated))
          .catch((err) => console.error("Brief save failed:", err));
      },
      onSubmitted: () => {
        // No-op: draftStore.submitBrief (called via onSubmit) already handles cleanup.
      },
      onCreateAnother: async () => {
        const newStory = await draftStore.createStory();
        return newStory.id;
      },
    }),
    // Intentionally depends only on story.id so the adapter identity is stable
    // while the user edits. Parent updates story ref via onStoryUpdate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [story.id],
  );

  const handleSubmit = useCallback(
    async (_brief: CompleteBrief): Promise<{ briefId: string }> => {
      const updated = await draftStore.submitBrief(story.id);
      onStoryUpdate(updated);
      return { briefId: story.id };
    },
    [story.id, onStoryUpdate],
  );

  // ---- "Open new revision" ----
  const handleNewRevision = useCallback(async () => {
    try {
      const newStory = await draftStore.createStory({
        title: `${story.title} (revision)`,
      });
      await draftStore.updateBrief(newStory.id, story.brief);
      await draftStore.updateStory(newStory.id, { parentStoryId: story.id });
      navigate(`${base}/stories/${newStory.id}/brief`);
    } catch (err) {
      console.error("Failed to create revision:", err);
    }
  }, [story, base, navigate]);

  // ---- "Copy JSON" ----
  const handleCopyJson = useCallback(async () => {
    const text = JSON.stringify(story.brief, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopyHint("Copied!");
      setTimeout(() => setCopyHint(null), 2400);
    } catch {
      setCopyHint("Could not copy — select the text below.");
      setTimeout(() => setCopyHint(null), 3200);
    }
  }, [story.brief]);

  // ── Case 1: generating ────────────────────────────────────────────────────

  if (story.status === "generating" && !generationFailed) {
    return (
      <Box sx={{ mt: 2 }}>
        <Alert
          severity="info"
          icon={<CircularProgress size={18} color="inherit" />}
          sx={{ mb: 2, borderRadius: 2 }}
        >
          Agent 1 is generating your story. This usually takes 30–60 seconds.
        </Alert>
        <SubmittedBriefReadView
          brief={story.brief}
          emptyLabel={sp.reviewFieldEmpty}
          specialistUi={sp}
        />
      </Box>
    );
  }

  // ── Case 3: draft (editable) — also shown on generation failure ───────────

  if (story.briefStatus === "draft" || generationFailed) {
    return (
      <Box sx={{ mt: 2 }}>
        {generationFailed && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            Generation failed. You can edit the brief and try submitting again.
          </Alert>
        )}

        {showNewStoryWelcome && (
          <Paper
            elevation={0}
            sx={{
              position: "relative",
              pr: 5,
              pt: 2,
              pb: 2,
              px: 2,
              mb: 2,
              borderRadius: 2,
              border: "1px solid rgba(208, 200, 192, 0.55)",
              bgcolor: "rgba(97, 120, 145, 0.06)",
            }}
          >
            <IconButton
              size="small"
              aria-label="Dismiss"
              onClick={() => setWelcomeDismissed(true)}
              sx={{ position: "absolute", top: 8, right: 8 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
            <Typography variant="subtitle1" fontWeight={700} sx={{ pr: 1 }}>
              Start by filling out the clinical brief
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.65 }}>
              This 5-section form captures everything Agent 1 needs to generate a therapeutic story. You can save
              your progress and come back anytime.
            </Typography>
          </Paper>
        )}

        {story.updatedAt && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mb: 1.5, fontWeight: 500 }}
          >
            Saved {formatRelativeTime(story.updatedAt)}
          </Typography>
        )}

        <BriefForm
          storageAdapter={storageAdapter}
          onSubmit={handleSubmit}
          onUserInteraction={() => setWelcomeDismissed(true)}
        />
      </Box>
    );
  }

  // ── Case 2: submitted (read-only) ─────────────────────────────────────────

  const submittedDate = story.submittedAt
    ? new Date(story.submittedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <Box sx={{ mt: 2 }}>
      {/* Locked banner */}
      <Alert
        severity="warning"
        sx={{ mb: 2, borderRadius: 2 }}
        action={
          <Button color="inherit" size="small" onClick={() => void handleNewRevision()}>
            Open new revision
          </Button>
        }
      >
        {submittedDate
          ? `This brief was submitted on ${submittedDate}. Briefs cannot be edited after submission.`
          : "This brief has been submitted. Briefs cannot be edited after submission."}
        {" "}
        To make changes,{" "}
        <Link
          component="button"
          variant="body2"
          onClick={() => void handleNewRevision()}
          sx={{ fontWeight: 700 }}
        >
          Open new revision
        </Link>
        .
      </Alert>

      {/* View as JSON */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Link
          component="button"
          variant="body2"
          onClick={() => setJsonDialogOpen(true)}
          sx={{ fontWeight: 600 }}
        >
          View as JSON
        </Link>
      </Stack>

      <SubmittedBriefReadView
        brief={story.brief}
        emptyLabel={sp.reviewFieldEmpty}
        specialistUi={sp}
      />

      {/* JSON dialog */}
      <Dialog
        open={jsonDialogOpen}
        onClose={() => setJsonDialogOpen(false)}
        fullWidth
        maxWidth="md"
        aria-labelledby="brief-json-dialog-title"
      >
        <DialogTitle id="brief-json-dialog-title" sx={{ fontWeight: 800 }}>
          Brief JSON
        </DialogTitle>
        <DialogContent dividers>
          {copyHint && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
              {copyHint}
            </Typography>
          )}
          <Box
            component="pre"
            sx={{
              p: 2,
              borderRadius: 1.5,
              bgcolor: "rgba(97, 120, 145, 0.06)",
              border: "1px solid rgba(208, 200, 192, 0.55)",
              overflow: "auto",
              maxHeight: 480,
              fontSize: "0.75rem",
              lineHeight: 1.55,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              m: 0,
            }}
          >
            {JSON.stringify(story.brief, null, 2)}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => void handleCopyJson()}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            Copy
          </Button>
          <Button
            onClick={() => setJsonDialogOpen(false)}
            sx={{ textTransform: "none" }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
