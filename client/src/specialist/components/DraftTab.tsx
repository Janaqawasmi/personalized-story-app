// client/src/specialist/components/DraftTab.tsx
//
// Agent 1 review section: emotional truth card, blueprint card,
// conditional cards (compression, inferred intention, post-validation flags),
// alignment note, versions dropdown, story editor (two-column layout),
// side panel, and action bar.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

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
}: {
  result: Agent1Result;
  onFeedback: (feedback: string) => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Emotional truth
          </Typography>
          <Stack direction="row" spacing={1}>
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
        </Stack>
        <Typography variant="body2">{result.emotionalTruth}</Typography>
      </CardContent>
      <FeedbackDialog
        open={dialogOpen}
        title="What did the emotional truth miss?"
        onClose={() => setDialogOpen(false)}
        onSubmit={onFeedback}
      />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Blueprint Card
// ---------------------------------------------------------------------------

function BlueprintCard({
  result,
  onFeedback,
}: {
  result: Agent1Result;
  onFeedback: (feedback: string) => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Narrative blueprint
          </Typography>
          <Stack direction="row" spacing={1}>
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
      <FeedbackDialog
        open={dialogOpen}
        title="What's wrong with the blueprint direction?"
        onClose={() => setDialogOpen(false)}
        onSubmit={onFeedback}
      />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Compression Metadata Card (conditional)
// ---------------------------------------------------------------------------

function CompressionMetadataCard({ result }: { result: Agent1Result }) {
  const meta = result.compressionMetadata;
  if (!meta) return null;

  return (
    <Card
      variant="outlined"
      sx={{ mb: 2, borderLeft: `4px solid ${COLORS.warning}` }}
    >
      <CardContent>
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
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Inferred Intention Card (conditional)
// ---------------------------------------------------------------------------

function InferredIntentionCard({
  result,
  story,
}: {
  result: Agent1Result;
  story: Story;
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

  return (
    <Card
      variant="outlined"
      sx={{ mb: 2, borderLeft: "4px solid #FFA000" }}
    >
      <CardContent>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
          ⚠ Inferred intention
        </Typography>

        <Typography variant="body2" sx={{ mb: 0.25 }}>
          <strong>Feel:</strong> {intention.feel}
        </Typography>
        <Typography variant="body2" sx={{ mb: 0.25 }}>
          <strong>Because:</strong> {intention.because}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          <strong>Reason:</strong> {intention.reason}
        </Typography>

        <Stack direction="row" spacing={1}>
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
      </CardContent>
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
}: {
  result: Agent1Result;
  dismissedFlags: Set<number>;
  onToggleFlag: (index: number) => void;
}) {
  const flags = result.postValidationFlags;
  if (!flags || flags.length === 0) return null;

  return (
    <Card
      variant="outlined"
      sx={{ mb: 2, borderLeft: `4px solid ${COLORS.error}` }}
    >
      <CardContent>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
          ⚠ Safety flags ({flags.length})
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
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => onToggleFlag(index)}
                    sx={{ ml: 1, whiteSpace: "nowrap" }}
                  >
                    {isDismissed ? "Restore" : "Dismiss"}
                  </Button>
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
// Alignment Note
// ---------------------------------------------------------------------------

function AlignmentNote({ result }: { result: Agent1Result }) {
  if (!result.alignmentNote) return null;

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: "block" }}>
        Alignment note
      </Typography>
      <Typography variant="body2">{result.alignmentNote}</Typography>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Versions Bar
// ---------------------------------------------------------------------------

function VersionsBar({
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
      sx={{
        py: 1.5,
        px: 2,
        mb: 2,
        bgcolor: "grey.50",
        borderRadius: 1,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      <FormControl size="small" sx={{ minWidth: 240 }}>
        <Select
          value={selectedVersionIndex}
          onChange={(e) => onVersionChange(e.target.value as number)}
        >
          {versions.map((version, i) => {
            const relTime = formatRelativeTime(new Date(version.generatedAt).getTime());
            const label = `v${i + 1} — generated ${relTime}${i === versions.length - 1 ? " (current)" : ""}`;
            return (
              <MenuItem key={version.generationId ?? i} value={i}>
                {label}
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>

      <Typography variant="body2" sx={{ color: wordCountColor, fontWeight: 500 }}>
        {displayedResult.wordCount} words / target {displayedResult.targetWordRange[0]}–
        {displayedResult.targetWordRange[1]}
        {!isLatest && (
          <Chip label="Viewing older version" size="small" sx={{ ml: 1 }} />
        )}
      </Typography>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Review Section (combines all cards)
// ---------------------------------------------------------------------------

function ReviewSection({
  result,
  story,
  dismissedFlags,
  onToggleFlag,
  onFeedback,
}: {
  result: Agent1Result;
  story: Story;
  dismissedFlags: Set<number>;
  onToggleFlag: (index: number) => void;
  onFeedback: (card: string, feedback: string) => void;
}) {
  return (
    <Box sx={{ mb: 3 }}>
      <EmotionalTruthCard
        result={result}
        onFeedback={(fb) => onFeedback("emotionalTruth", fb)}
      />
      <BlueprintCard
        result={result}
        onFeedback={(fb) => onFeedback("blueprint", fb)}
      />
      <CompressionMetadataCard result={result} />
      <InferredIntentionCard result={result} story={story} />
      <PostValidationFlagsCard
        result={result}
        dismissedFlags={dismissedFlags}
        onToggleFlag={onToggleFlag}
      />
      <AlignmentNote result={result} />
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Side Panel
// ---------------------------------------------------------------------------

function SidePanel({
  story,
  displayedResult,
  textareaRef,
  collapsed,
  onToggleCollapse,
  editorBody,
  onEditorBodyChange,
  onNavigateToTab,
}: {
  story: Story;
  displayedResult: Agent1Result;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  collapsed: boolean;
  onToggleCollapse: () => void;
  editorBody: string;
  onEditorBodyChange: (body: string) => void;
  onNavigateToTab?: (tab: "brief" | "history") => void;
}) {
  const mustNeverList = story.brief.section3?.mustNeverList ?? [];
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
    // Restore cursor after React re-renders with new value
    requestAnimationFrame(() => {
      ta.setSelectionRange(
        start + placeholder.length,
        start + placeholder.length,
      );
      ta.focus();
    });
  }

  return (
    <Box
      sx={{
        width: collapsed ? 40 : 280,
        minWidth: collapsed ? 40 : 240,
        flexShrink: 0,
        transition: "width 0.2s ease, min-width 0.2s ease",
      }}
    >
      {/* Spec suggests localStorage for collapse state; using useState
          for pilot simplicity. Can upgrade later. */}
      <Stack direction="row" alignItems="center" justifyContent="flex-end" sx={{ mb: 1 }}>
        <Tooltip title={collapsed ? "Expand side panel" : "Collapse side panel"}>
          <IconButton size="small" onClick={onToggleCollapse}>
            {collapsed ? (
              <ChevronLeftIcon fontSize="small" />
            ) : (
              <ChevronRightIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
      </Stack>

      {!collapsed && (
        <Stack spacing={2}>
          {/* Must-never list — shows story.brief.section3.mustNeverList ONLY */}
          <Card variant="outlined">
            <CardContent sx={{ pb: "12px !important" }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                Must-never list
              </Typography>
              {mustNeverList.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No must-never items defined.
                </Typography>
              ) : (
                <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                  {mustNeverList.map((item, i) => (
                    <Typography
                      key={i}
                      component="li"
                      variant="body2"
                      sx={{ mb: 0.5 }}
                    >
                      {item}
                    </Typography>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Personalization placeholders */}
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

          {/* Coping tool reminder */}
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
      )}
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

  // Spec suggests localStorage for collapse state; using useState
  // for pilot simplicity. Can upgrade later.
  const [sidePanelCollapsed, setSidePanelCollapsed] = useState(false);

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
      // Note: DraftStore.transitionStatus interface does not accept metadata.
      // Feedback is captured locally; future upgrade can wire it to the API.
      const updatedStory = await draftStore.transitionStatus(
        story.id,
        "needs_revision",
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

  // ── Render ────────────────────────────────────────────────────────────────

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
      <ReviewSection
        result={displayedResult}
        story={story}
        dismissedFlags={dismissedFlags}
        onToggleFlag={handleToggleFlag}
        onFeedback={handleFeedback}
      />

      {versions.length > 0 && (
        <VersionsBar
          story={story}
          selectedVersionIndex={selectedVersionIndex}
          onVersionChange={handleVersionChange}
          displayedResult={displayedResult}
        />
      )}

      {/* Two-column layout: editor (left) + side panel (right) */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 2,
          alignItems: "flex-start",
        }}
      >
        {/* ── Left column: editor ─────────────────────────────────────────── */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Title + save indicator row */}
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
                setEditorTitle(e.target.value);
                setHasUnsavedChanges(true);
              }}
              sx={{ mr: 2 }}
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

          {/* Word count (live, colored red when out of range) */}
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 0.5 }}>
            <Typography
              variant="caption"
              sx={{
                color: wordCountOutOfRange ? COLORS.error : "text.secondary",
                fontWeight: wordCountOutOfRange ? 600 : 400,
              }}
            >
              {currentWordCount} words / target {targetMin}–{targetMax}
            </Typography>
          </Stack>

          {/* Story body — plain textarea via MUI TextField multiline */}
          <TextField
            multiline
            minRows={16}
            fullWidth
            value={editorBody}
            onChange={(e) => {
              setEditorBody(e.target.value);
              setHasUnsavedChanges(true);
            }}
            inputRef={textareaRef}
            placeholder="Story content…"
            sx={{
              mb: 2,
              "& .MuiInputBase-inputMultiline": {
                minHeight: 400,
                resize: "vertical",
                overflow: "auto",
              },
            }}
          />

          {/* Action Bar */}
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
            {/* Save edits */}
            <Button
              variant="contained"
              disabled={!hasUnsavedChanges}
              onClick={handleSave}
            >
              Save edits
            </Button>

            {/* Regenerate with feedback */}
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

            {/* Mark approved */}
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

          {/* Regeneration count */}
          <Typography variant="caption" color="text.secondary">
            This story has been regenerated {regenCount} time
            {regenCount !== 1 ? "s" : ""}.{" "}
            {regenRemaining > 0
              ? `${regenRemaining} regeneration${regenRemaining !== 1 ? "s" : ""} remaining.`
              : "No regenerations remaining."}
          </Typography>
        </Box>

        {/* ── Right column: side panel ─────────────────────────────────────── */}
        <SidePanel
          story={story}
          displayedResult={displayedResult}
          textareaRef={textareaRef}
          collapsed={sidePanelCollapsed}
          onToggleCollapse={() => setSidePanelCollapsed((c) => !c)}
          editorBody={editorBody}
          onEditorBodyChange={(body) => {
            setEditorBody(body);
            setHasUnsavedChanges(true);
          }}
          onNavigateToTab={onNavigateToTab}
        />
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
