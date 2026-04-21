import React, { useCallback, useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Paper from "@mui/material/Paper";
import Snackbar from "@mui/material/Snackbar";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import type { StoryDraft } from "../../../types/story";
import type { Agent1Result } from "../../../types/agent1Result";
import type { StoryType } from "../../../types/storyBrief";
import { AGE_RANGE_LABELS, COPING_TOOL_LABELS } from "../../../types/storyBrief";
import { useNavigate, useParams } from "react-router-dom";

import { draftStore } from "../../storage";
import ApproveBar from "./ApproveBar";
import EvidenceRail from "./EvidenceRail";
import ManuscriptEditor from "./ManuscriptEditor";
import SaveStatusBar from "./SaveStatusBar";
import VersionTimeline from "./VersionTimeline";
import {
  type DraftTabProps,
  GeneratingState,
  MAX_VERSIONS,
  countUndismissedFlags,
  mustNeverFlaggedForIndex,
} from "./shared";
import { DRAFT_B, RAIL_WIDTH_DEFAULT } from "./tokens";

const STORY_TYPE_LABELS: Partial<Record<StoryType, string>> = {
  fear_anxiety: "Fear & Anxiety",
  big_emotions: "Big Emotions",
  loss_grief: "Loss & Grief",
  identity_self_worth: "Identity & Self-Worth",
  life_transitions: "Life Transitions",
};

const FONT_STORAGE_KEY = "dammah.draftB.storyFont";
const RAIL_TAB_STORAGE_KEY = "dammah.draftB.activeRailTab";

export default function DraftTabB({
  story,
  onStoryUpdate,
  onNavigateToTab,
  onUnsavedDraftChange,
}: DraftTabProps) {
  const versions = story.agent1Versions;

  const [selectedVersionIndex, setSelectedVersionIndex] = useState(
    versions.length - 1,
  );
  const [editorTitle, setEditorTitle] = useState(
    story.currentDraft?.title ?? story.agent1Result?.title ?? "",
  );
  const [editorBody, setEditorBody] = useState(
    story.currentDraft?.body ?? story.agent1Result?.story ?? "",
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dismissedFlags, setDismissedFlags] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [pendingVersionIndex, setPendingVersionIndex] = useState<number | null>(null);
  const [regenDialogOpen, setRegenDialogOpen] = useState(false);
  const [regenFeedback, setRegenFeedback] = useState("");
  const [regenSubmitting, setRegenSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const [activeRailTab, setActiveRailTab] = useState<"safety" | "reasoning" | "tools">(() => {
    try {
      const v = sessionStorage.getItem(RAIL_TAB_STORAGE_KEY);
      if (v === "reasoning" || v === "tools" || v === "safety") return v;
    } catch {
      /* ignore */
    }
    return "safety";
  });

  const [hoveredFlagIndex, setHoveredFlagIndex] = useState<number | null>(null);

  const [storyFont, setStoryFont] = useState<"serif" | "sans">(() => {
    try {
      const v = sessionStorage.getItem(FONT_STORAGE_KEY);
      if (v === "sans" || v === "serif") return v;
    } catch {
      /* ignore */
    }
    return "serif";
  });

  const [editorMode, setEditorMode] = useState<"read" | "edit">("read");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const railScrollRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const { lang } = useParams<{ lang?: string }>();
  const base = `/${lang ?? "he"}/specialist`;

  useEffect(() => {
    try {
      sessionStorage.setItem(FONT_STORAGE_KEY, storyFont);
    } catch {
      /* ignore */
    }
  }, [storyFont]);

  useEffect(() => {
    try {
      sessionStorage.setItem(RAIL_TAB_STORAGE_KEY, activeRailTab);
    } catch {
      /* ignore */
    }
  }, [activeRailTab]);

  useEffect(() => {
    setHoveredFlagIndex(null);
  }, [activeRailTab]);

  const currentWordCount = editorBody
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const handleSave = useCallback(async () => {
    const draft: StoryDraft = {
      title: editorTitle,
      body: editorBody,
      wordCount: currentWordCount,
      updatedAt: Date.now(),
    };
    setIsSaving(true);
    try {
      const updatedStory = await draftStore.updateStory(story.id, {
        currentDraft: draft,
      });
      setHasUnsavedChanges(false);
      setLastSavedAt(Date.now());
      onStoryUpdate(updatedStory);
    } catch (err) {
      setSnackbar(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setIsSaving(false);
    }
  }, [story.id, editorTitle, editorBody, currentWordCount, onStoryUpdate]);

  useEffect(() => {
    onUnsavedDraftChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onUnsavedDraftChange]);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (!isSaving) {
          void handleSave();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, isSaving]);

  useEffect(() => {
    const result = versions[selectedVersionIndex] ?? story.agent1Result;
    if (!result) return;
    setEditorTitle(story.currentDraft?.title ?? result.title);
    setEditorBody(story.currentDraft?.body ?? result.story);
    setHasUnsavedChanges(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset when switching version index
  }, [selectedVersionIndex]);

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

  function handleRegenDialogClose() {
    setRegenDialogOpen(false);
    setRegenFeedback("");
  }

  async function handleRegenerate() {
    const trimmed = regenFeedback.trim();
    if (!trimmed) return;
    setRegenSubmitting(true);
    try {
      if (hasUnsavedChanges) {
        await handleSave();
      }
      if (story.status === "awaiting_review") {
        const opened = await draftStore.transitionStatus(story.id, "in_review");
        onStoryUpdate(opened);
      }
      const updatedStory = await draftStore.transitionStatus(
        story.id,
        "needs_revision",
        { feedback: trimmed },
      );
      onStoryUpdate(updatedStory);
      handleRegenDialogClose();
    } catch (err) {
      setSnackbar(
        err instanceof Error ? err.message : "Failed to request regeneration.",
      );
    } finally {
      setRegenSubmitting(false);
    }
  }

  async function handleApprove() {
    try {
      if (story.status === "awaiting_review") {
        const opened = await draftStore.transitionStatus(story.id, "in_review");
        onStoryUpdate(opened);
      }
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

  async function handleEditBrief() {
    try {
      const newStory = await draftStore.createStory({
        title: `${story.title} (revision)`,
      });
      await draftStore.updateBrief(newStory.id, story.brief);
      await draftStore.updateStory(newStory.id, { parentStoryId: story.id });
      navigate(`${base}/stories/${newStory.id}/brief`);
    } catch {
      /* silent — specialist can retry */
    }
  }

  function insertPlaceholder(placeholder: string) {
    const ta = textareaRef.current;
    if (!ta) {
      setEditorBody((prev) => prev + placeholder);
      setHasUnsavedChanges(true);
      return;
    }
    const start = ta.selectionStart ?? editorBody.length;
    const end = ta.selectionEnd ?? editorBody.length;
    const newBody =
      editorBody.slice(0, start) + placeholder + editorBody.slice(end);
    setEditorBody(newBody);
    setHasUnsavedChanges(true);
    requestAnimationFrame(() => {
      ta.setSelectionRange(
        start + placeholder.length,
        start + placeholder.length,
      );
      ta.focus();
    });
  }

  function handleFlagMarkerClick(flagIndex: number) {
    setActiveRailTab("safety");
    requestAnimationFrame(() => {
      const el = railScrollRef.current?.querySelector(`[data-flag="${flagIndex}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function handleGoToPassage(flagIndex: number) {
    const el = document.querySelector(`.flag-anchor-${flagIndex}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHoveredFlagIndex(flagIndex);
    setTimeout(() => setHoveredFlagIndex(null), 900);
  }

  function handleModeToggle() {
    setEditorMode((prev) => (prev === "read" ? "edit" : "read"));
  }

  if (story.status === "generating" || story.status === "needs_revision") {
    return <GeneratingState story={story} onStoryUpdate={onStoryUpdate} />;
  }

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

  const isReadOnly =
    story.status === "approved" || story.status === "archived";

  const [targetMin, targetMax] = displayedResult.targetWordRange;

  const flags = displayedResult.postValidationFlags ?? [];
  const undismissedFlagCount = countUndismissedFlags(flags, dismissedFlags);
  const mustNeverList = story.brief.section3?.mustNeverList ?? [];
  const mustNeverFlagCount = mustNeverList.filter((item, i) =>
    mustNeverFlaggedForIndex(i, item, flags),
  ).length;

  const wordCountOutOfRange =
    currentWordCount < targetMin || currentWordCount > targetMax;

  const checks = [
    { ok: !hasUnsavedChanges, label: "Edits saved" },
    {
      ok: undismissedFlagCount === 0,
      label:
        undismissedFlagCount > 0
          ? `Safety findings resolved (${undismissedFlagCount} left)`
          : "Safety findings resolved",
    },
    {
      ok: !wordCountOutOfRange,
      label: "Word count within target",
    },
    {
      ok: mustNeverFlagCount === 0,
      label: "Must-never list validated",
    },
  ];

  const canApprove =
    checks.every((c) => c.ok) && story.status !== "awaiting_review";

  const regenCount = versions.length - 1;
  const regenRemaining = MAX_VERSIONS - versions.length;

  const latestAgentOutput: Agent1Result | null =
    versions.length > 0 ? versions[versions.length - 1] : story.agent1Result;
  const willSnapshotEditsAsNewVersion =
    latestAgentOutput !== null &&
    (editorTitle.trim() !== latestAgentOutput.title.trim() ||
      editorBody.trim() !== latestAgentOutput.story.trim());
  const snapshotVersionNumber = willSnapshotEditsAsNewVersion
    ? versions.length + 1
    : Math.max(1, versions.length);

  const ageRangeLabel =
    story.ageRange != null ? AGE_RANGE_LABELS[story.ageRange] : "";
  const storyTypeLabelText =
    STORY_TYPE_LABELS[story.storyType] ?? "";

  return (
    <Box sx={{ background: DRAFT_B.paper, minHeight: "100vh", px: { xs: 2, md: 4 }, py: 3 }}>
      {story.status === "archived" && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={() => void handleRestore()}>
              Restore
            </Button>
          }
        >
          This story is archived.
        </Alert>
      )}

      <VersionTimeline
        versions={versions}
        selectedIndex={selectedVersionIndex}
        onSelect={handleVersionChange}
        wordCount={currentWordCount}
        targetRange={[targetMin, targetMax]}
        regenRemaining={regenRemaining}
      />

      <Box
        sx={{
          display: "flex",
          gap: 0,
          alignItems: "flex-start",
          opacity: story.status === "archived" ? 0.58 : 1,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <ManuscriptEditor
            title={editorTitle}
            body={editorBody}
            onTitleChange={(t) => {
              if (!isReadOnly) {
                setEditorTitle(t);
                setHasUnsavedChanges(true);
              }
            }}
            onBodyChange={(b) => {
              if (!isReadOnly) {
                setEditorBody(b);
                setHasUnsavedChanges(true);
              }
            }}
            textareaRef={textareaRef}
            readOnly={isReadOnly}
            storyFont={storyFont}
            meta={{
              ageRange: ageRangeLabel,
              storyTypeLabel: storyTypeLabelText || null,
              copingToolLabel:
                story.brief.section3?.copingTool != null
                  ? COPING_TOOL_LABELS[story.brief.section3.copingTool]
                  : null,
            }}
            versionNumber={selectedVersionIndex + 1}
            flags={flags}
            dismissedFlags={dismissedFlags}
            hoveredFlagIndex={hoveredFlagIndex}
            onFlagMarkerClick={handleFlagMarkerClick}
            onParagraphHover={setHoveredFlagIndex}
            mode={isReadOnly ? "read" : editorMode}
          />

          {!isReadOnly && (
            <SaveStatusBar
              unsaved={hasUnsavedChanges}
              isSaving={isSaving}
              lastSavedAt={lastSavedAt}
              onSave={() => void handleSave()}
              mode={editorMode}
              onModeToggle={handleModeToggle}
              readOnly={isReadOnly}
            />
          )}

          {story.status !== "archived" && (
            <ApproveBar
              checks={checks}
              canApprove={canApprove}
              status={story.status}
              regenCount={regenCount}
              regenRemaining={regenRemaining}
              onRegenerate={openRegenDialog}
              onApprove={() => void handleApprove()}
              onReopen={() => void handleReopen()}
              approvedAt={story.approvedAt ?? null}
            />
          )}
        </Box>

        <EvidenceRail
          story={story}
          result={displayedResult}
          dismissedFlags={dismissedFlags}
          onToggleFlag={handleToggleFlag}
          onFlagHover={setHoveredFlagIndex}
          onGoToPassage={handleGoToPassage}
          activeTab={activeRailTab}
          onTabChange={(t) => {
            setHoveredFlagIndex(null);
            setActiveRailTab(t);
          }}
          onFeedback={handleFeedback}
          onInsertPlaceholder={insertPlaceholder}
          onNavigateToBrief={() => onNavigateToTab?.("brief")}
          onEditBrief={handleEditBrief}
          readOnly={isReadOnly}
          scrollRef={railScrollRef}
          width={RAIL_WIDTH_DEFAULT}
          selectedVersionIndex={selectedVersionIndex}
          ageRangeLabel={ageRangeLabel}
          storyTypeLabel={storyTypeLabelText}
        />
      </Box>

      <Dialog open={pendingVersionIndex !== null} onClose={handleCancelVersionSwitch} maxWidth="xs">
        <DialogTitle>Discard unsaved changes?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            You have unsaved edits. Switching versions will discard them.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelVersionSwitch}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={handleConfirmVersionSwitch}>
            Discard and switch
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={regenDialogOpen} onClose={handleRegenDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Request a new version</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            AI will generate a new draft based on your feedback.
            {willSnapshotEditsAsNewVersion ? (
              <>
                {" "}
                Your current edits will be saved as Version {snapshotVersionNumber} before regeneration.
              </>
            ) : (
              <>
                {" "}
                Your draft matches the latest generated output, so there is no separate edited snapshot to store;
                the new AI run will replace the story on screen when it finishes.
              </>
            )}
          </Typography>
          <TextField
            autoFocus
            required
            multiline
            minRows={4}
            fullWidth
            label="What should be different in the next version?"
            value={regenFeedback}
            onChange={(e) => setRegenFeedback(e.target.value)}
            placeholder="Required — describe what the AI should change."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={handleRegenDialogClose}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!regenFeedback.trim() || regenSubmitting}
            onClick={() => void handleRegenerate()}
          >
            {regenSubmitting ? (
              <>
                <CircularProgress size={16} thickness={5} color="inherit" sx={{ mr: 1 }} />
                Working…
              </>
            ) : (
              "Regenerate"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar !== null}
        autoHideDuration={6000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="error" onClose={() => setSnackbar(null)} sx={{ width: "100%" }}>
          {snackbar}
        </Alert>
      </Snackbar>
    </Box>
  );
}
