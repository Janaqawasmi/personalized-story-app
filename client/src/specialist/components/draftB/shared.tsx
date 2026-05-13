import React, { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import type { Story } from "../../../types/story";
import type { PostValidationFlag } from "../../../types/agent1Result";
import { COLORS } from "../../../theme";
import { draftStore } from "../../storage";

export interface DraftTabProps {
  story: Story;
  onStoryUpdate: (story: Story) => void;
  onNavigateToTab?: (tab: "brief" | "history") => void;
  /** Lets the workspace intercept tab/back navigation when the draft has unsaved edits. */
  onUnsavedDraftChange?: (hasUnsaved: boolean) => void;
}

export const CHECK_TYPE_LABELS: Record<PostValidationFlag["checkType"], string> =
  {
    must_never: "Must-never violation",
    shame_handling: "Shame handling",
    coping_tool: "Coping tool",
    age_appropriateness: "Age appropriateness",
  };

/** Lower = higher priority for the sticky blocker strip (must-never → shame → age → coping). */
export const FLAG_BLOCKER_PRIORITY: Record<
  PostValidationFlag["checkType"],
  number
> = {
  must_never: 0,
  shame_handling: 1,
  age_appropriateness: 2,
  coping_tool: 3,
};

export function getTopUndismissedBlockers(
  flags: PostValidationFlag[],
  dismissedFlags: Set<number>,
  limit = 3,
): Array<{ index: number; flag: PostValidationFlag }> {
  const items = flags
    .map((flag, index) => ({ flag, index }))
    .filter(({ index }) => !dismissedFlags.has(index));
  items.sort(
    (a, b) =>
      FLAG_BLOCKER_PRIORITY[a.flag.checkType] -
      FLAG_BLOCKER_PRIORITY[b.flag.checkType],
  );
  return items.slice(0, limit);
}

export function countUndismissedFlags(
  flags: PostValidationFlag[],
  dismissedFlags: Set<number>,
): number {
  return flags.reduce((n, _, i) => n + (dismissedFlags.has(i) ? 0 : 1), 0);
}

export const PLACEHOLDERS = [
  "[CHILD_NAME]",
  "[HE/SHE/THEY]",
  "[HIM/HER/THEM]",
  "[HIS/HER/THEIR]",
] as const;

export const MAX_VERSIONS = 3;

/** Whether a post-validation flag targets this must-never line (by index or text). */
export function mustNeverFlaggedForIndex(
  index: number,
  item: string,
  flags: PostValidationFlag[],
): boolean {
  return flags.some((f) => {
    if (f.checkType !== "must_never") return false;
    const c = f.constraintIdOrIndex;
    if (typeof c === "number") return c === index;
    if (typeof c === "string") {
      const t = c.trim();
      return t === String(index) || t === item.trim();
    }
    return false;
  });
}

export function truncatePassage(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars)}…`;
}

export function GeneratingState({
  story,
  onStoryUpdate,
}: {
  story: Story;
  onStoryUpdate: (s: Story) => void;
}) {
  const [prevDialogOpen, setPrevDialogOpen] = useState(false);

  const hasPrevVersion = story.agent1Versions.length > 0;
  const prevVersion = hasPrevVersion
    ? story.agent1Versions[story.agent1Versions.length - 1]
    : null;

  const onStoryUpdateRef = useRef(onStoryUpdate);
  useEffect(() => {
    onStoryUpdateRef.current = onStoryUpdate;
  });

  const storyRef = useRef(story);
  useEffect(() => {
    storyRef.current = story;
  }, [story]);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      if (cancelled) return;
      try {
        const updated = await draftStore.getStory(story.id);
        if (!updated || cancelled) return;
        const cur = storyRef.current;
        if (updated.status !== cur.status || updated.updatedAt !== cur.updatedAt) {
          onStoryUpdateRef.current(updated);
        }
      } catch {
        // Ignore transient poll errors — next tick will retry.
      }
    }

    void tick();
    const interval = setInterval(() => void tick(), 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [story.id]);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        mt: 2,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          py: 6,
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography variant="h6">AI is generating your story…</Typography>
        <Typography variant="body2" color="text.secondary">
          This often takes about one to two minutes (three model steps plus validation). The server
          stops waiting after about two minutes; if that happens, try again.
        </Typography>

        {hasPrevVersion && (
          <Button variant="text" onClick={() => setPrevDialogOpen(true)}>
            View previous version while you wait
          </Button>
        )}
      </Box>

      {prevVersion && (
        <Dialog
          open={prevDialogOpen}
          onClose={() => setPrevDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Previous version (read-only)</DialogTitle>
          <DialogContent>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              Emotional truth
            </Typography>
            <Typography variant="body2" sx={{ mb: 2.5 }}>
              {prevVersion.emotionalTruth}
            </Typography>

            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              Narrative blueprint
            </Typography>
            <Box sx={{ mb: 2.5 }}>
              {prevVersion.blueprint.map((point) => (
                <Typography key={point.index} variant="body2" sx={{ mb: 0.25 }}>
                  {point.index}. {point.text}
                </Typography>
              ))}
            </Box>

            {prevVersion.alignmentNote && (
              <>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                  Alignment note
                </Typography>
                <Typography variant="body2">
                  {prevVersion.alignmentNote}
                </Typography>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPrevDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </Paper>
  );
}

export function FeedbackDialog({
  open,
  title,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState("");

  function handleSubmit() {
    if (text.trim()) {
      onSubmit(text.trim());
      setText("");
      onClose();
    }
  }

  function handleClose() {
    setText("");
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          multiline
          minRows={3}
          fullWidth
          placeholder="What did it miss?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!text.trim()}>
          Submit
        </Button>
      </DialogActions>
    </Dialog>
  );
}
