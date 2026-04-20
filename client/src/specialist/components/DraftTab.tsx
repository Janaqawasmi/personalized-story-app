// client/src/specialist/components/DraftTab.tsx
//
// Draft tab: two-zone layout — story editor (left) + evidence panel (right).
// Evidence: safety (flags, must-never) first; AI reasoning in accordions;
// placeholders + coping reminder below. Versions inline above the title.
//
// Status-specific rendering modes:
//   generating / needs_revision → GeneratingState (spinner + polling)
//   approved                    → read-only editor, modified action bar
//   archived                    → dimmed (0.5 opacity), restore banner, no action bar

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import type { Story, StoryDraft } from "../../types/story";
import type {
  Agent1Result,
  PostValidationFlag,
} from "../../types/agent1Result";
import { COPING_TOOL_LABELS } from "../../types/storyBrief";
import { COLORS } from "../../theme";
import { draftStore } from "../storage";
import { formatRelativeTime } from "./StoryRow";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DraftTabProps {
  story: Story;
  onStoryUpdate: (story: Story) => void;
  onNavigateToTab?: (tab: "brief" | "history") => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CHECK_TYPE_LABELS: Record<PostValidationFlag["checkType"], string> = {
  must_never: "Must-never violation",
  shame_handling: "Shame handling",
  coping_tool: "Coping tool",
  age_appropriateness: "Age appropriateness",
};

const PLACEHOLDERS = [
  "[CHILD_NAME]",
  "[HE/SHE/THEY]",
  "[HIM/HER/THEM]",
  "[HIS/HER/THEIR]",
] as const;

const MAX_VERSIONS = 3;

/** Whether a post-validation flag targets this must-never line (by index or text). */
function mustNeverFlaggedForIndex(
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

// ---------------------------------------------------------------------------
// GeneratingState — shown when status === 'generating' | 'needs_revision'
// ---------------------------------------------------------------------------

function GeneratingState({
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

  // Stable ref to the callback so the interval closure never goes stale.
  const onStoryUpdateRef = useRef(onStoryUpdate);
  useEffect(() => {
    onStoryUpdateRef.current = onStoryUpdate;
  });

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const updated = await draftStore.getStory(story.id);
        if (
          updated &&
          updated.status !== "generating" &&
          updated.status !== "needs_revision"
        ) {
          onStoryUpdateRef.current(updated);
        }
      } catch {
        // Ignore transient poll errors — next tick will retry.
      }
    }, 5000);

    return () => clearInterval(interval);
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
        <Typography variant="h6">Agent 1 is generating your story…</Typography>
        <Typography variant="body2" color="text.secondary">
          This usually takes 30–60 seconds.
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

// ---------------------------------------------------------------------------
// Feedback Dialog (reused by multiple cards)
// ---------------------------------------------------------------------------

function FeedbackDialog({
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

// ---------------------------------------------------------------------------
// Emotional Truth Card
// ---------------------------------------------------------------------------

function EmotionalTruthCard({
  result,
  onFeedback,
  hideButtons,
  noOuterCard,
}: {
  result: Agent1Result;
  onFeedback: (feedback: string) => void;
  hideButtons?: boolean;
  noOuterCard?: boolean;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const body = (
    <CardContent sx={{ "&:last-child": { pb: 2 } }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent={noOuterCard ? "flex-end" : "space-between"}
        sx={{ mb: 1 }}
      >
        {!noOuterCard && (
          <Typography variant="subtitle1" fontWeight={600}>
            Emotional truth
          </Typography>
        )}
        {!hideButtons && (
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {confirmed ? (
              <Chip
                icon={<CheckCircleIcon />}
                label="Confirmed"
                color="success"
                size="small"
              />
            ) : (
              <Button
                size="small"
                variant="outlined"
                color="success"
                onClick={() => setConfirmed(true)}
              >
                Captures my intention
              </Button>
            )}
            <Button
              size="small"
              variant="outlined"
              color="warning"
              onClick={() => setDialogOpen(true)}
            >
              Misses something
            </Button>
          </Stack>
        )}
      </Stack>
      <Typography variant="body2">{result.emotionalTruth}</Typography>
    </CardContent>
  );

  return (
    <>
      {noOuterCard ? (
        <Box>{body}</Box>
      ) : (
        <Card variant="outlined" sx={{ mb: 2 }}>
          {body}
        </Card>
      )}
      <FeedbackDialog
        open={dialogOpen}
        title="What did the emotional truth miss?"
        onClose={() => setDialogOpen(false)}
        onSubmit={onFeedback}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Blueprint Card
// ---------------------------------------------------------------------------

function BlueprintCard({
  result,
  onFeedback,
  hideButtons,
  noOuterCard,
}: {
  result: Agent1Result;
  onFeedback: (feedback: string) => void;
  hideButtons?: boolean;
  noOuterCard?: boolean;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const body = (
    <CardContent sx={{ "&:last-child": { pb: 2 } }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent={noOuterCard ? "flex-end" : "space-between"}
        sx={{ mb: 1 }}
      >
        {!noOuterCard && (
          <Typography variant="subtitle1" fontWeight={600}>
            Narrative blueprint
          </Typography>
        )}
        {!hideButtons && (
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {confirmed ? (
              <Chip
                icon={<CheckCircleIcon />}
                label="Confirmed"
                color="success"
                size="small"
              />
            ) : (
              <Button
                size="small"
                variant="outlined"
                color="success"
                onClick={() => setConfirmed(true)}
              >
                Right journey
              </Button>
            )}
            <Button
              size="small"
              variant="outlined"
              color="warning"
              onClick={() => setDialogOpen(true)}
            >
              Wrong direction
            </Button>
          </Stack>
        )}
      </Stack>

      <Box sx={{ mb: 1.5 }}>
        {result.blueprint.map((point) => (
          <Typography key={point.index} variant="body2" sx={{ mb: 0.25 }}>
            {point.index}. {point.text}
          </Typography>
        ))}
      </Box>

      <Typography variant="body2" sx={{ mb: 0.5 }}>
        <strong>Coping tool placement:</strong> {result.copingToolPlacement}
      </Typography>
      <Typography variant="body2">
        <strong>Approach:</strong> {result.approachInstruction}
      </Typography>
    </CardContent>
  );

  return (
    <>
      {noOuterCard ? (
        <Box>{body}</Box>
      ) : (
        <Card variant="outlined" sx={{ mb: 2 }}>
          {body}
        </Card>
      )}
      <FeedbackDialog
        open={dialogOpen}
        title="What's wrong with the blueprint direction?"
        onClose={() => setDialogOpen(false)}
        onSubmit={onFeedback}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Compression Metadata Card (conditional)
// ---------------------------------------------------------------------------

function CompressionMetadataCard({
  result,
  noOuterCard,
}: {
  result: Agent1Result;
  noOuterCard?: boolean;
}) {
  const meta = result.compressionMetadata;
  if (!meta) return null;

  const body = (
    <CardContent sx={{ "&:last-child": { pb: 2 } }}>
      {!noOuterCard && (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            ⚠ Compression metadata
          </Typography>
          <Tooltip title="The brief had more therapeutic obligations than the chosen story length could fully accommodate. Some were compressed or omitted to stay within the word count target.">
            <Typography
              variant="caption"
              sx={{ cursor: "help", color: COLORS.primary, textDecoration: "underline" }}
            >
              Why is this here?
            </Typography>
          </Tooltip>
        </Stack>
      )}

      {meta.fullyIncluded.length > 0 && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.25 }}>
            Fully included:
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {meta.fullyIncluded.map((item, i) => (
              <Typography key={i} component="li" variant="body2">
                {item}
              </Typography>
            ))}
          </Box>
        </Box>
      )}

      {meta.compressed.length > 0 && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.25 }}>
            Compressed:
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {meta.compressed.map((item, i) => (
              <Typography key={i} component="li" variant="body2">
                {item.obligation} — {item.how}
              </Typography>
            ))}
          </Box>
        </Box>
      )}

      {meta.omitted.length > 0 && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.25 }}>
            Omitted:
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {meta.omitted.map((item, i) => (
              <Typography key={i} component="li" variant="body2">
                {item.obligation} — {item.why}
              </Typography>
            ))}
          </Box>
        </Box>
      )}
    </CardContent>
  );

  return noOuterCard ? (
    <Box>{body}</Box>
  ) : (
    <Card
      variant="outlined"
      sx={{ mb: 2, borderLeft: `4px solid ${COLORS.warning}` }}
    >
      {body}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Inferred Intention Card (conditional)
// ---------------------------------------------------------------------------

function InferredIntentionCard({
  result,
  story,
  hideButtons,
  noOuterCard,
}: {
  result: Agent1Result;
  story: Story;
  hideButtons?: boolean;
  noOuterCard?: boolean;
}) {
  const [accepted, setAccepted] = useState(false);
  const navigate = useNavigate();
  const { lang } = useParams<{ lang?: string }>();
  const base = `/${lang ?? "he"}/specialist`;

  const intention = result.inferredIntention;

  async function handleEditBrief() {
    try {
      const newStory = await draftStore.createStory({
        title: `${story.title} (revision)`,
      });
      await draftStore.updateBrief(newStory.id, story.brief);
      await draftStore.updateStory(newStory.id, { parentStoryId: story.id });
      navigate(`${base}/stories/${newStory.id}/brief`);
    } catch {
      // Silently fail — the specialist can try again via header menu
    }
  }

  if (!intention) return null;

  const body = (
    <CardContent sx={{ "&:last-child": { pb: 2 } }}>
      {!noOuterCard && (
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
          ⚠ Inferred intention
        </Typography>
      )}

      <Typography variant="body2" sx={{ mb: 0.25 }}>
        <strong>Feel:</strong> {intention.feel}
      </Typography>
      <Typography variant="body2" sx={{ mb: 0.25 }}>
        <strong>Because:</strong> {intention.because}
      </Typography>
      <Typography variant="body2" sx={{ mb: 1.5 }}>
        <strong>Reason:</strong> {intention.reason}
      </Typography>

      {!hideButtons && (
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {accepted ? (
            <Chip
              icon={<CheckCircleIcon />}
              label="Inferred intention accepted"
              color="success"
              size="small"
            />
          ) : (
            <Button
              size="small"
              variant="outlined"
              color="success"
              onClick={() => setAccepted(true)}
            >
              Use inferred
            </Button>
          )}
          <Button
            size="small"
            variant="outlined"
            color="warning"
            onClick={handleEditBrief}
          >
            Edit brief instead
          </Button>
        </Stack>
      )}
    </CardContent>
  );

  return noOuterCard ? (
    <Box>{body}</Box>
  ) : (
    <Card
      variant="outlined"
      sx={{ mb: 2, borderLeft: "4px solid #FFA000" }}
    >
      {body}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Post-Validation Flags Card (dismissedFlags lifted to DraftTab)
// ---------------------------------------------------------------------------

function PostValidationFlagsCard({
  result,
  dismissedFlags,
  onToggleFlag,
  hideButtons,
}: {
  result: Agent1Result;
  dismissedFlags: Set<number>;
  onToggleFlag: (index: number) => void;
  hideButtons?: boolean;
}) {
  const flags = result.postValidationFlags;
  if (!flags || flags.length === 0) return null;

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 2,
        border: `2px solid ${COLORS.error}`,
        boxShadow: `0 0 0 1px ${COLORS.error}22`,
      }}
    >
      <CardContent>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
          Post-validation safety flags ({flags.length})
        </Typography>

        <Stack spacing={1.5}>
          {flags.map((flag, index) => {
            const isDismissed = dismissedFlags.has(index);
            return (
              <Box
                key={index}
                sx={{
                  opacity: isDismissed ? 0.5 : 1,
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: isDismissed ? "action.disabledBackground" : "grey.50",
                }}
              >
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {CHECK_TYPE_LABELS[flag.checkType]}
                      </Typography>
                      <Chip
                        label={
                          flag.severity === "likely_violation"
                            ? "Likely violation"
                            : "Review recommended"
                        }
                        size="small"
                        sx={{
                          bgcolor:
                            flag.severity === "likely_violation"
                              ? COLORS.error
                              : COLORS.warning,
                          color: "#fff",
                          fontWeight: 600,
                          fontSize: "0.7rem",
                        }}
                      />
                    </Stack>
                    <Typography variant="body2" sx={{ mb: 0.5, fontStyle: "italic" }}>
                      &ldquo;{flag.passage}&rdquo;
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {flag.reasoning}
                    </Typography>
                  </Box>
                  {!hideButtons && (
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => onToggleFlag(index)}
                      sx={{ ml: 1, whiteSpace: "nowrap" }}
                    >
                      {isDismissed ? "Restore" : "Dismiss"}
                    </Button>
                  )}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Version selector (compact, above story title)
// ---------------------------------------------------------------------------

function VersionSelectorRow({
  story,
  selectedVersionIndex,
  onVersionChange,
  displayedResult,
}: {
  story: Story;
  selectedVersionIndex: number;
  onVersionChange: (index: number) => void;
  displayedResult: Agent1Result;
}) {
  const versions = story.agent1Versions;
  const isLatest = selectedVersionIndex === versions.length - 1;

  const wordCountColor =
    displayedResult.wordCountDrift !== "within_range" ? COLORS.error : "text.secondary";

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      flexWrap="wrap"
      gap={1}
      sx={{ mb: 1.5 }}
    >
      <FormControl size="small" sx={{ minWidth: 200, maxWidth: "100%" }}>
        <Select
          value={selectedVersionIndex}
          onChange={(e) => onVersionChange(e.target.value as number)}
        >
          {versions.map((version, i) => {
            const relTime = formatRelativeTime(new Date(version.generatedAt).getTime());
            const label = `v${i + 1} — ${relTime}${i === versions.length - 1 ? " (current)" : ""}`;
            return (
              <MenuItem key={version.generationId ?? i} value={i}>
                {label}
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>

      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
        <Typography variant="caption" sx={{ color: wordCountColor, fontWeight: 500 }}>
          Agent output: {displayedResult.wordCount} words / target{" "}
          {displayedResult.targetWordRange[0]}–{displayedResult.targetWordRange[1]}
        </Typography>
        {!isLatest && <Chip label="Older version" size="small" />}
      </Stack>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Evidence panel (safety + accordions + placeholders)
// ---------------------------------------------------------------------------

function MustNeverChecklist({ story, flags }: { story: Story; flags: PostValidationFlag[] }) {
  const mustNeverList = story.brief.section3?.mustNeverList ?? [];

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent sx={{ pb: "12px !important" }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
          Must-never list
        </Typography>
        {mustNeverList.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No must-never items defined.
          </Typography>
        ) : (
          <Stack spacing={1.25}>
            {mustNeverList.map((item, i) => {
              const flagged = mustNeverFlaggedForIndex(i, item, flags);
              return (
                <Stack key={i} direction="row" alignItems="flex-start" spacing={1}>
                  {flagged ? (
                    <WarningAmberIcon color="warning" sx={{ fontSize: 20, mt: 0.15, flexShrink: 0 }} />
                  ) : (
                    <CheckCircleIcon color="success" sx={{ fontSize: 20, mt: 0.15, flexShrink: 0 }} />
                  )}
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {item}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

function EvidencePanel({
  story,
  displayedResult,
  dismissedFlags,
  onToggleFlag,
  onFeedback,
  hideButtons,
  textareaRef,
  editorBody,
  onEditorBodyChange,
  onNavigateToTab,
}: {
  story: Story;
  displayedResult: Agent1Result;
  dismissedFlags: Set<number>;
  onToggleFlag: (index: number) => void;
  onFeedback: (card: string, feedback: string) => void;
  hideButtons?: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  editorBody: string;
  onEditorBodyChange: (body: string) => void;
  onNavigateToTab?: (tab: "brief" | "history") => void;
}) {
  const flags = displayedResult.postValidationFlags ?? [];
  const copingTool = story.brief.section3?.copingTool;
  const copingToolLabel = copingTool != null ? COPING_TOOL_LABELS[copingTool] : null;

  function insertPlaceholder(placeholder: string) {
    const ta = textareaRef.current;
    if (!ta) {
      onEditorBodyChange(editorBody + placeholder);
      return;
    }
    const start = ta.selectionStart ?? editorBody.length;
    const end = ta.selectionEnd ?? editorBody.length;
    const newBody =
      editorBody.slice(0, start) + placeholder + editorBody.slice(end);
    onEditorBodyChange(newBody);
    requestAnimationFrame(() => {
      ta.setSelectionRange(
        start + placeholder.length,
        start + placeholder.length,
      );
      ta.focus();
    });
  }

  const accordionSx = {
    mb: 1,
    "&:before": { display: "none" },
    boxShadow: "none",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 1,
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        minHeight: { xs: 0, md: "min(82vh, 900px)" },
        maxHeight: { xs: "none", md: "min(82vh, 900px)" },
      }}
    >
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ mb: 1, display: "block", letterSpacing: 0.08 }}
      >
        Evidence
      </Typography>

      <Box sx={{ flex: 1, overflow: "auto", minHeight: 0, pr: 0.5 }}>
        {/* —— Section 1: Safety —— */}
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: "block" }}>
          Safety
        </Typography>

        {flags.length > 0 && (
          <PostValidationFlagsCard
            result={displayedResult}
            dismissedFlags={dismissedFlags}
            onToggleFlag={onToggleFlag}
            hideButtons={hideButtons}
          />
        )}

        <MustNeverChecklist story={story} flags={flags} />

        {/* —— Section 2: AI reasoning (collapsed by default) —— */}
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, mt: 2, display: "block" }}>
          AI reasoning
        </Typography>

        <Accordion defaultExpanded={false} sx={accordionSx}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600}>Emotional truth</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <EmotionalTruthCard
              result={displayedResult}
              onFeedback={(fb) => onFeedback("emotionalTruth", fb)}
              hideButtons={hideButtons}
              noOuterCard
            />
          </AccordionDetails>
        </Accordion>

        <Accordion defaultExpanded={false} sx={accordionSx}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600}>Narrative blueprint</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <BlueprintCard
              result={displayedResult}
              onFeedback={(fb) => onFeedback("blueprint", fb)}
              hideButtons={hideButtons}
              noOuterCard
            />
          </AccordionDetails>
        </Accordion>

        {displayedResult.compressionMetadata && (
          <Accordion defaultExpanded={false} sx={accordionSx}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight={600}>Compression metadata</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <CompressionMetadataCard result={displayedResult} noOuterCard />
            </AccordionDetails>
          </Accordion>
        )}

        {displayedResult.inferredIntention && (
          <Accordion defaultExpanded={false} sx={accordionSx}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight={600}>Inferred intention</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <InferredIntentionCard
                result={displayedResult}
                story={story}
                hideButtons={hideButtons}
                noOuterCard
              />
            </AccordionDetails>
          </Accordion>
        )}

        {displayedResult.alignmentNote ? (
          <Accordion defaultExpanded={false} sx={accordionSx}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight={600}>Alignment note</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2">{displayedResult.alignmentNote}</Typography>
            </AccordionDetails>
          </Accordion>
        ) : null}

        {/* —— Placeholders & coping (always visible) —— */}
        <Stack spacing={2} sx={{ mt: 2, pb: 1 }}>
          <Card variant="outlined">
            <CardContent sx={{ pb: "12px !important" }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                Placeholders
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={0.75}>
                {PLACEHOLDERS.map((ph) => (
                  <Chip
                    key={ph}
                    label={ph}
                    size="small"
                    variant="outlined"
                    clickable
                    onClick={() => insertPlaceholder(ph)}
                    sx={{
                      cursor: "pointer",
                      fontFamily: "monospace",
                      fontSize: "0.72rem",
                    }}
                  />
                ))}
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent sx={{ pb: "12px !important" }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                Coping tool
              </Typography>
              {copingToolLabel ? (
                <Typography variant="body2" fontWeight={500} sx={{ mb: 0.75 }}>
                  {copingToolLabel}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
                  No coping tool selected.
                </Typography>
              )}
              {displayedResult.copingToolPlacement && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {displayedResult.copingToolPlacement}
                </Typography>
              )}
              {onNavigateToTab && (
                <Button
                  size="small"
                  variant="text"
                  onClick={() => onNavigateToTab("brief")}
                  sx={{ p: 0, minWidth: 0, textDecoration: "underline" }}
                >
                  ← Back to brief
                </Button>
              )}
            </CardContent>
          </Card>
        </Stack>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// DraftTab
// ---------------------------------------------------------------------------

export default function DraftTab({
  story,
  onStoryUpdate,
  onNavigateToTab,
}: DraftTabProps) {
  const versions = story.agent1Versions;

  // ── All state & refs must come before any conditional return ──────────────

  const [selectedVersionIndex, setSelectedVersionIndex] = useState(
    versions.length - 1,
  );

  const [feedback, setFeedback] = useState<Record<string, string>>({});

  // dismissedFlags lifted here so the action bar can check all-dismissed
  const [dismissedFlags, setDismissedFlags] = useState<Set<number>>(new Set());

  const [editorTitle, setEditorTitle] = useState(
    story.currentDraft?.title ?? story.agent1Result?.title ?? "",
  );
  const [editorBody, setEditorBody] = useState(
    story.currentDraft?.body ?? story.agent1Result?.story ?? "",
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [pendingVersionIndex, setPendingVersionIndex] = useState<number | null>(null);

  const [regenDialogOpen, setRegenDialogOpen] = useState(false);
  const [regenFeedback, setRegenFeedback] = useState("");

  const [snackbar, setSnackbar] = useState<string | null>(null);

  // Ref to the textarea DOM element (used for placeholder cursor insertion)
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Derived: word count from live editor content
  const currentWordCount = editorBody
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  // Save to store
  const handleSave = useCallback(async () => {
    const draft: StoryDraft = {
      title: editorTitle,
      body: editorBody,
      wordCount: currentWordCount,
      updatedAt: Date.now(),
    };
    try {
      const updatedStory = await draftStore.updateStory(story.id, {
        currentDraft: draft,
      });
      setHasUnsavedChanges(false);
      onStoryUpdate(updatedStory);
    } catch (err) {
      setSnackbar(err instanceof Error ? err.message : "Failed to save.");
    }
  }, [story.id, editorTitle, editorBody, currentWordCount, onStoryUpdate]);

  // Cmd/Ctrl+S shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleSave]);

  // Reset editor content when version is switched
  // TODO D2.5e-2: warn if unsaved edits — implemented via pendingVersionIndex dialog
  useEffect(() => {
    const result = versions[selectedVersionIndex] ?? story.agent1Result;
    if (!result) return;
    setEditorTitle(story.currentDraft?.title ?? result.title);
    setEditorBody(story.currentDraft?.body ?? result.story);
    setHasUnsavedChanges(false);
    // Intentionally only re-runs when the selected version index changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVersionIndex]);

  // ── Status-specific early returns (after all hooks) ───────────────────────

  if (story.status === "generating" || story.status === "needs_revision") {
    return <GeneratingState story={story} onStoryUpdate={onStoryUpdate} />;
  }

  // ── Defensive guard (after all hooks) ─────────────────────────────────────

  if (!story.agent1Result) {
    return (
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No generation results yet.
        </Typography>
      </Paper>
    );
  }

  const displayedResult: Agent1Result =
    versions[selectedVersionIndex] ?? story.agent1Result;

  // ── Read-only mode (approved or archived) ─────────────────────────────────

  const isReadOnly =
    story.status === "approved" || story.status === "archived";

  // ── Derived display values ─────────────────────────────────────────────────

  const [targetMin, targetMax] = displayedResult.targetWordRange;
  const wordCountOutOfRange =
    currentWordCount < targetMin || currentWordCount > targetMax;

  const saveIndicator = hasUnsavedChanges
    ? "Unsaved changes"
    : story.currentDraft
      ? `Last saved ${formatRelativeTime(story.currentDraft.updatedAt)}`
      : "No saved edits yet";

  const flags = displayedResult.postValidationFlags ?? [];
  const hasUndismissedFlags = flags.some((_, i) => !dismissedFlags.has(i));

  const regenCount = versions.length - 1;
  const regenRemaining = MAX_VERSIONS - versions.length;
  const maxRegenReached = versions.length >= MAX_VERSIONS;

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleFeedback(card: string, text: string) {
    setFeedback((prev) => ({ ...prev, [card]: text }));
  }

  function handleToggleFlag(index: number) {
    setDismissedFlags((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function handleVersionChange(index: number) {
    if (hasUnsavedChanges) {
      setPendingVersionIndex(index);
    } else {
      setSelectedVersionIndex(index);
    }
  }

  function handleConfirmVersionSwitch() {
    if (pendingVersionIndex !== null) {
      setSelectedVersionIndex(pendingVersionIndex);
      setPendingVersionIndex(null);
    }
  }

  function handleCancelVersionSwitch() {
    setPendingVersionIndex(null);
  }

  function openRegenDialog() {
    const parts: string[] = [];
    if (feedback.emotionalTruth) {
      parts.push(`Emotional truth: ${feedback.emotionalTruth}`);
    }
    if (feedback.blueprint) {
      parts.push(`Blueprint: ${feedback.blueprint}`);
    }
    setRegenFeedback(parts.join("\n\n"));
    setRegenDialogOpen(true);
  }

  async function handleRegenerate() {
    try {
      const updatedStory = await draftStore.transitionStatus(
        story.id,
        "needs_revision",
        { feedback: regenFeedback },
      );
      onStoryUpdate(updatedStory);
      setRegenDialogOpen(false);
    } catch (err) {
      setSnackbar(
        err instanceof Error ? err.message : "Failed to request regeneration.",
      );
    }
  }

  async function handleApprove() {
    try {
      const updatedStory = await draftStore.transitionStatus(story.id, "approved");
      onStoryUpdate(updatedStory);
    } catch (err) {
      setSnackbar(err instanceof Error ? err.message : "Failed to approve story.");
    }
  }

  async function handleReopen() {
    try {
      const updatedStory = await draftStore.transitionStatus(story.id, "in_review");
      onStoryUpdate(updatedStory);
    } catch (err) {
      setSnackbar(err instanceof Error ? err.message : "Failed to reopen story.");
    }
  }

  async function handleRestore() {
    try {
      const updatedStory = await draftStore.transitionStatus(story.id, "draft_brief");
      onStoryUpdate(updatedStory);
    } catch (err) {
      setSnackbar(err instanceof Error ? err.message : "Failed to restore story.");
    }
  }

  // ── Shared read-only editor sx ─────────────────────────────────────────────

  const readOnlyInputSx = isReadOnly
    ? { "& .MuiInputBase-root": { backgroundColor: COLORS.background } }
    : {};

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        mt: 2,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 2,
        // Archived: dim the entire tab
        opacity: story.status === "archived" ? 0.5 : 1,
      }}
    >
      {/* ── Archived banner ───────────────────────────────────────────────── */}
      {story.status === "archived" && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={handleRestore}>
              Restore
            </Button>
          }
        >
          This story is archived.
        </Alert>
      )}

      {/* Two-zone layout: story editor (left) + evidence panel (right) */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 2,
          alignItems: "stretch",
        }}
      >
        {/* ── Left: story (primary) ───────────────────────────────────────── */}
        <Box
          sx={{
            flex: { xs: "1 1 auto", md: "0 0 60%" },
            width: { xs: "100%", md: "60%" },
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            // Bounded height so flex children (story editor) get real space; xs needs this too or flex:1 collapses.
            minHeight: { xs: "min(70vh, 720px)", md: "min(82vh, 900px)" },
            maxHeight: { md: "min(82vh, 900px)" },
            overflow: "hidden",
          }}
        >
          {versions.length > 0 && (
            <VersionSelectorRow
              story={story}
              selectedVersionIndex={selectedVersionIndex}
              onVersionChange={handleVersionChange}
              displayedResult={displayedResult}
            />
          )}

          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 1 }}
          >
            <TextField
              variant="outlined"
              size="small"
              fullWidth
              label="Title"
              value={editorTitle}
              onChange={(e) => {
                if (!isReadOnly) {
                  setEditorTitle(e.target.value);
                  setHasUnsavedChanges(true);
                }
              }}
              InputProps={{ readOnly: isReadOnly }}
              sx={{ mr: 2, ...readOnlyInputSx }}
            />
            <Typography
              variant="caption"
              sx={{
                whiteSpace: "nowrap",
                color: hasUnsavedChanges ? COLORS.warning : "text.secondary",
                fontWeight: hasUnsavedChanges ? 600 : 400,
              }}
            >
              {saveIndicator}
            </Typography>
          </Stack>

          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 0.5 }}>
            <Typography
              variant="caption"
              sx={{
                color: wordCountOutOfRange ? COLORS.error : "text.secondary",
                fontWeight: wordCountOutOfRange ? 600 : 400,
              }}
            >
              Your draft: {currentWordCount} words / target {targetMin}–{targetMax}
            </Typography>
          </Stack>

          {/* MUI multiline TextField does not reliably stretch with flex; use a fill box + 100% height chain. */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              position: "relative",
              width: "100%",
            }}
          >
            <TextField
              multiline
              fullWidth
              value={editorBody}
              onChange={(e) => {
                if (!isReadOnly) {
                  setEditorBody(e.target.value);
                  setHasUnsavedChanges(true);
                }
              }}
              inputRef={textareaRef}
              placeholder="Story content…"
              InputProps={{ readOnly: isReadOnly }}
              sx={{
                position: "absolute",
                inset: 0,
                ...readOnlyInputSx,
                "& .MuiOutlinedInput-root": {
                  height: "100%",
                  alignItems: "stretch",
                  boxSizing: "border-box",
                },
                "& .MuiInputBase-inputMultiline": {
                  height: "100% !important",
                  overflow: "auto !important",
                  resize: "none",
                  boxSizing: "border-box",
                },
              }}
            />
          </Box>

          {/* Pinned action bar (bottom of story zone) */}
          <Box
            sx={{
              flexShrink: 0,
              pt: 2,
              mt: "auto",
              borderTop: `1px solid ${COLORS.border}`,
            }}
          >
            {story.status !== "archived" && (
              <>
                {story.status === "approved" ? (
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                    <Button variant="outlined" onClick={handleReopen}>
                      Reopen for editing
                    </Button>
                    <Chip
                      icon={<CheckCircleIcon />}
                      label={
                        story.approvedAt
                          ? `Approved ${new Date(story.approvedAt).toLocaleDateString()}`
                          : "Approved"
                      }
                      color="success"
                      sx={{ fontWeight: 600 }}
                    />
                  </Stack>
                ) : (
                  <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    flexWrap="wrap"
                    sx={{ mb: 1 }}
                  >
                    <Button
                      variant="contained"
                      disabled={!hasUnsavedChanges}
                      onClick={handleSave}
                    >
                      Save edits
                    </Button>

                    <Tooltip
                      title={
                        maxRegenReached
                          ? "Maximum regenerations reached. Consider opening a new revision."
                          : ""
                      }
                    >
                      <span>
                        <Button
                          variant="outlined"
                          disabled={maxRegenReached}
                          onClick={openRegenDialog}
                        >
                          Regenerate with feedback
                        </Button>
                      </span>
                    </Tooltip>

                    <Tooltip
                      title={
                        hasUnsavedChanges
                          ? "Save your edits first"
                          : hasUndismissedFlags
                            ? "Review all safety flags before approving"
                            : ""
                      }
                    >
                      <span>
                        <Button
                          variant="contained"
                          disabled={hasUnsavedChanges || hasUndismissedFlags}
                          onClick={handleApprove}
                          sx={{
                            bgcolor: COLORS.success,
                            "&:hover": { bgcolor: "#388E3C" },
                          }}
                        >
                          Mark approved
                        </Button>
                      </span>
                    </Tooltip>
                  </Stack>
                )}

                {story.status !== "approved" && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                    This story has been regenerated {regenCount} time
                    {regenCount !== 1 ? "s" : ""}.{" "}
                    {regenRemaining > 0
                      ? `${regenRemaining} regeneration${regenRemaining !== 1 ? "s" : ""} remaining.`
                      : "No regenerations remaining."}
                  </Typography>
                )}
              </>
            )}
          </Box>
        </Box>

        {/* ── Right: evidence panel ─────────────────────────────────────────── */}
        <Box
          sx={{
            flex: { xs: "1 1 auto", md: "0 0 40%" },
            width: { xs: "100%", md: "40%" },
            minWidth: 0,
            borderLeft: { md: `1px solid ${COLORS.border}` },
            pl: { md: 2 },
          }}
        >
          <EvidencePanel
            story={story}
            displayedResult={displayedResult}
            dismissedFlags={dismissedFlags}
            onToggleFlag={handleToggleFlag}
            onFeedback={handleFeedback}
            hideButtons={isReadOnly}
            textareaRef={textareaRef}
            editorBody={editorBody}
            onEditorBodyChange={(body) => {
              setEditorBody(body);
              setHasUnsavedChanges(true);
            }}
            onNavigateToTab={onNavigateToTab}
          />
        </Box>
      </Box>

      {/* ── Version switch confirmation dialog ─────────────────────────────── */}
      <Dialog
        open={pendingVersionIndex !== null}
        onClose={handleCancelVersionSwitch}
        maxWidth="xs"
      >
        <DialogTitle>Discard unsaved changes?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            You have unsaved edits. Switching versions will discard them.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelVersionSwitch}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleConfirmVersionSwitch}
          >
            Discard and switch
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Regenerate with feedback dialog ───────────────────────────────── */}
      <Dialog
        open={regenDialogOpen}
        onClose={() => setRegenDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Regenerate with feedback</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            multiline
            minRows={4}
            fullWidth
            label="What should be different?"
            value={regenFeedback}
            onChange={(e) => setRegenFeedback(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegenDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleRegenerate}>
            Regenerate
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Error snackbar ─────────────────────────────────────────────────── */}
      <Snackbar
        open={snackbar !== null}
        autoHideDuration={6000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="error"
          onClose={() => setSnackbar(null)}
          sx={{ width: "100%" }}
        >
          {snackbar}
        </Alert>
      </Snackbar>
    </Paper>
  );
}
