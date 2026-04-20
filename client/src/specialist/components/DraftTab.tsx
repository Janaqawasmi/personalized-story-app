// client/src/specialist/components/DraftTab.tsx
//
// Agent 1 review section: emotional truth card, blueprint card,
// conditional cards (compression, inferred intention, post-validation flags),
// alignment note, versions dropdown, and editor placeholder.
// The story editor and action bar are deferred to D2.5e-2.

import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

import type { Story } from "../../types/story";
import type {
  Agent1Result,
  PostValidationFlag,
} from "../../types/agent1Result";
import { COLORS } from "../../theme";
import { draftStore } from "../storage";
import { formatRelativeTime } from "./StoryRow";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DraftTabProps {
  story: Story;
  onStoryUpdate: (story: Story) => void;
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
// Post-Validation Flags Card (conditional)
// ---------------------------------------------------------------------------

function PostValidationFlagsCard({ result }: { result: Agent1Result }) {
  const flags = result.postValidationFlags;
  const [dismissedFlags, setDismissedFlags] = useState<Set<number>>(new Set());

  if (!flags || flags.length === 0) return null;

  function handleDismiss(index: number) {
    setDismissedFlags((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

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
                    onClick={() => handleDismiss(index)}
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
          onChange={(e) => {
            // TODO D2.5e-2: warn if unsaved edits
            onVersionChange(e.target.value as number);
          }}
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
// Editor Placeholder
// ---------------------------------------------------------------------------

function PlaceholderEditor({ result }: { result: Agent1Result }) {
  const preview = result.story ? result.story.slice(0, 100) + "…" : "";

  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 2,
        textAlign: "center",
        bgcolor: COLORS.surface,
      }}
    >
      <Typography variant="h6" sx={{ mb: 1, color: COLORS.textSecondary }}>
        Story editor — coming in D2.5e-2
      </Typography>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {result.title}
      </Typography>
      {preview && (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
          {preview}
        </Typography>
      )}
    </Paper>
  );
}

// ---------------------------------------------------------------------------
// Review Section (combines all cards)
// ---------------------------------------------------------------------------

function ReviewSection({
  result,
  story,
  onFeedback,
}: {
  result: Agent1Result;
  story: Story;
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
      <PostValidationFlagsCard result={result} />
      <AlignmentNote result={result} />
    </Box>
  );
}

// ---------------------------------------------------------------------------
// DraftTab
// ---------------------------------------------------------------------------

export default function DraftTab({ story, onStoryUpdate: _onStoryUpdate }: DraftTabProps) {
  const versions = story.agent1Versions;
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(
    versions.length - 1,
  );

  // Feedback stored locally for "Regenerate with feedback" in D2.5e-2
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  function handleFeedback(card: string, text: string) {
    setFeedback((prev) => ({ ...prev, [card]: text }));
  }

  // Defensive guard
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

  void feedback; // Will be consumed by "Regenerate with feedback" in D2.5e-2

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
        onFeedback={handleFeedback}
      />

      {versions.length > 0 && (
        <VersionsBar
          story={story}
          selectedVersionIndex={selectedVersionIndex}
          onVersionChange={setSelectedVersionIndex}
          displayedResult={displayedResult}
        />
      )}

      <PlaceholderEditor result={displayedResult} />
    </Paper>
  );
}
