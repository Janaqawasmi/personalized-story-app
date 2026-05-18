// client/src/specialist/pages/StoryWorkspacePage.tsx
//
// Story Workspace: story loading, header, tab bar, and placeholder tab content.
// Full tab content is implemented in subsequent prompts (D2.5b–e).

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { useSpecialistDeskUi } from "../../i18n/specialistDeskUi";
import { draftStore } from "../storage";
import type { Story, StoryStatus } from "../../types/story";
import { COLORS } from "../../theme";
import WorkspaceHeader from "../components/WorkspaceHeader";
import StoryPipelineStepper from "../components/StoryPipelineStepper";
import WorkspaceTabs, { type WorkspaceTabValue } from "../components/WorkspaceTabs";
import BriefTab from "../components/BriefTab";
import DraftTabB from "../components/draftB/DraftTabB";
import HistoryTab from "../components/HistoryTab";
import IllustrationsTab from "../components/IllustrationsTab";

// ---------------------------------------------------------------------------
// Default tab lookup
// ---------------------------------------------------------------------------

const DEFAULT_TAB: Record<StoryStatus, WorkspaceTabValue> = {
  draft_brief: "brief",
  generating: "brief",
  awaiting_review: "draft",
  in_review: "draft",
  needs_revision: "draft",
  approved: "illustrations",
  illustration_workspace: "illustrations",
  illustration_ready: "illustrations",
  published: "illustrations",
  archived: "brief",
};

function isValidTab(tab: string | undefined): tab is WorkspaceTabValue {
  return tab === "brief" || tab === "draft" || tab === "history" || tab === "illustrations";
}

type PendingLeaveNavigation =
  | null
  | { kind: "tab"; tab: WorkspaceTabValue }
  | { kind: "stories" };

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function WorkspaceSkeleton({ slowLoading }: { slowLoading: boolean }) {
  const desk = useSpecialistDeskUi();
  const skTabs = desk.workspaceSkeletonTabs;
  return (
    <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, pt: 2.5 }}>
      {/* Back link */}
      <Skeleton width={72} height={18} sx={{ mb: 1.75 }} />

      {/* Title row */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
        <Skeleton height={36} sx={{ flex: 1, maxWidth: 380, borderRadius: 1 }} />
        <Skeleton width={96} height={24} sx={{ borderRadius: 4 }} />
        <Skeleton width={32} height={32} variant="circular" />
      </Stack>

      {/* Type / age chips */}
      <Stack direction="row" spacing={0.75} sx={{ mb: 2 }}>
        <Skeleton width={108} height={22} sx={{ borderRadius: 4 }} />
        <Skeleton width={70} height={22} sx={{ borderRadius: 4 }} />
      </Stack>

      {/* Pipeline stepper */}
      <Skeleton variant="rectangular" height={52} sx={{ borderRadius: 1, mb: 2.5 }} />

      {/* Tabs */}
      <Stack
        direction="row"
        sx={{ borderBottom: `1px solid ${COLORS.border}`, mb: 2.5 }}
      >
        {skTabs.map((label) => (
          <Skeleton
            key={label}
            width={68}
            height={42}
            sx={{ borderRadius: 0, mr: 0.5 }}
          />
        ))}
      </Stack>

      {/* Content placeholders */}
      <Stack spacing={1.5}>
        <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2 }} />
      </Stack>

      {slowLoading && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 2.5, textAlign: "center" }}
        >
          {desk.workspaceStillLoading}
        </Typography>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Not-found state
// ---------------------------------------------------------------------------

function NotFoundState({ onBack }: { onBack: () => void }) {
  const desk = useSpecialistDeskUi();
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 320,
        gap: 2,
        px: 2,
      }}
    >
      <Typography variant="h6" color="text.secondary" textAlign="center">
        {desk.workspaceStoryNotFound}
      </Typography>
      <Button variant="outlined" onClick={onBack}>
        {desk.workspaceBackToStories}
      </Button>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function StoryWorkspacePage() {
  const desk = useSpecialistDeskUi();
  const { lang, storyId, tab } = useParams<{
    lang: string;
    storyId: string;
    tab?: string;
  }>();
  const navigate = useNavigate();

  const resolvedStoryId = storyId ?? "";
  const base = `/${lang ?? "he"}/specialist`;

  // ---- Data state ----
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slowLoading, setSlowLoading] = useState(false);

  const [draftHasUnsaved, setDraftHasUnsaved] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [pendingLeave, setPendingLeave] = useState<PendingLeaveNavigation>(null);

  // ---- Active tab (for rendering; URL is the source of truth) ----
  const activeTab: WorkspaceTabValue = isValidTab(tab) ? tab : "brief";

  useEffect(() => {
    if (activeTab !== "draft") {
      setDraftHasUnsaved(false);
    }
  }, [activeTab]);

  // ---- Fetch ----
  const fetchStory = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const loaded = await draftStore.getStory(resolvedStoryId);
      if (loaded === null) {
        setNotFound(true);
      } else {
        setStory(loaded);
      }
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : desk.workspaceLoadStoryFailed,
      );
    } finally {
      setLoading(false);
    }
  }, [resolvedStoryId, desk]);

  // Initial fetch + real-time subscription
  useEffect(() => {
    fetchStory();
    const unsub = draftStore.subscribeToStory(resolvedStoryId, (updated) => {
      setStory(updated);
    });
    return unsub;
  }, [resolvedStoryId, fetchStory]);

  // Opening the workspace while an unread generated draft exists moves the story to `in_review`
  // (sets lastOpenedAt server-side). Approve/regenerate require `in_review`, not `awaiting_review`.
  const shouldOpenReviewOnLoad = story?.status === "awaiting_review";

  useEffect(() => {
    if (!shouldOpenReviewOnLoad) return;

    let cancelled = false;

    void (async () => {
      try {
        const updated = await draftStore.transitionStatus(resolvedStoryId, "in_review");
        if (!cancelled) {
          setError(null);
          setStory(updated);
        }
      } catch (e: unknown) {
        try {
          const recovered = await draftStore.getStory(resolvedStoryId);
          if (!cancelled && recovered?.status === "in_review") {
            setError(null);
            setStory(recovered);
          } else if (!cancelled) {
            setError(
              e instanceof Error
                ? e.message
                : desk.workspaceCouldNotOpenReview,
            );
          }
        } catch {
          if (!cancelled) {
            setError(
              e instanceof Error
                ? e.message
                : desk.workspaceCouldNotOpenReview,
            );
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [shouldOpenReviewOnLoad, resolvedStoryId, desk]);

  // Slow-loading indicator (fires after 3 s if still loading)
  useEffect(() => {
    if (!loading) {
      setSlowLoading(false);
      return;
    }
    const timer = setTimeout(() => setSlowLoading(true), 3000);
    return () => clearTimeout(timer);
  }, [loading]);

  // ---- Default tab redirect (runs once, after story first loads) ----
  const didRedirect = useRef(false);

  useEffect(() => {
    if (!story || didRedirect.current) return;

    if (isValidTab(tab)) {
      // URL already has a valid tab — no redirect needed
      didRedirect.current = true;
      return;
    }

    // No tab (or invalid tab) in URL — resolve default and replace
    const defaultTab = DEFAULT_TAB[story.status];
    didRedirect.current = true;
    navigate(`${base}/stories/${resolvedStoryId}/${defaultTab}`, {
      replace: true,
    });
  }, [story, tab, base, resolvedStoryId, navigate]);

  // ---- Tab switching (guards Story tab when there are unsaved edits) ----
  function navigateToTab(newTab: WorkspaceTabValue) {
    navigate(`${base}/stories/${resolvedStoryId}/${newTab}`, { replace: true });
  }

  function handleTabChange(newTab: WorkspaceTabValue) {
    if (activeTab === "draft" && draftHasUnsaved && newTab !== activeTab) {
      setPendingLeave({ kind: "tab", tab: newTab });
      setLeaveDialogOpen(true);
      return;
    }
    navigateToTab(newTab);
  }

  function handleStoriesClick() {
    if (activeTab === "draft" && draftHasUnsaved) {
      setPendingLeave({ kind: "stories" });
      setLeaveDialogOpen(true);
      return;
    }
    navigate(`${base}/stories`);
  }

  function handleLeaveConfirm() {
    if (!pendingLeave) return;
    if (pendingLeave.kind === "stories") {
      navigate(`${base}/stories`);
    } else {
      navigateToTab(pendingLeave.tab);
    }
    setDraftHasUnsaved(false);
    setPendingLeave(null);
    setLeaveDialogOpen(false);
  }

  function handleLeaveCancel() {
    setPendingLeave(null);
    setLeaveDialogOpen(false);
  }

  // ---- Action handlers ----
  async function handleTitleChange(title: string) {
    try {
      await draftStore.updateStory(resolvedStoryId, { title });
    } catch {
      // Subscription will keep the displayed title consistent with store state
    }
  }

  async function handleArchive() {
    try {
      await draftStore.transitionStatus(resolvedStoryId, "archived");
      navigate(`${base}/stories`, { replace: true });
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : desk.workspaceArchiveFailed,
      );
    }
  }

  async function handleRestore() {
    try {
      await draftStore.transitionStatus(resolvedStoryId, "draft_brief");
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : desk.workspaceRestoreFailed,
      );
    }
  }

  async function handleNewRevision() {
    if (!story) return;
    try {
      const newStory = await draftStore.createStory({
        title: `${story.title} (revision)`,
      });
      await draftStore.updateBrief(newStory.id, story.brief);
      await draftStore.updateStory(newStory.id, { parentStoryId: story.id });
      navigate(`${base}/stories/${newStory.id}/brief`);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : desk.workspaceCreateRevisionFailed,
      );
    }
  }

  // ---- Render ----

  if (loading) {
    return <WorkspaceSkeleton slowLoading={slowLoading} />;
  }

  if (notFound) {
    return (
      <NotFoundState
        onBack={() => navigate(`${base}/stories`, { replace: true })}
      />
    );
  }

  return (
    <Box sx={{ bgcolor: COLORS.background, minHeight: "100vh" }}>
      {/* Error banner */}
      {error && (
        <Alert
          severity="error"
          sx={{ mx: { xs: 2, sm: 3, md: 5 }, mt: 2, borderRadius: 2 }}
          action={
            <Button color="inherit" size="small" onClick={fetchStory}>
              {desk.workspaceTryAgain}
            </Button>
          }
        >
          {desk.workspaceErrorBanner}
        </Alert>
      )}

      {story && (
        <>
          <WorkspaceHeader
            story={story}
            onTitleChange={handleTitleChange}
            onArchive={handleArchive}
            onRestore={handleRestore}
            onNewRevision={handleNewRevision}
            onStoriesClick={handleStoriesClick}
          />

          {/* Pipeline + tabs are full-width cream bands with own internal padding */}
          <StoryPipelineStepper story={story} />
          <WorkspaceTabs
            story={story}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />

          <Box
            role="tabpanel"
            id={`tabpanel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
          >
            {activeTab === "brief" && (
              <Box sx={{ px: { xs: 2, sm: 3, md: 5 }, pt: 3, pb: 6 }}>
                <BriefTab
                  story={story}
                  onStoryUpdate={setStory}
                  onNavigateToTab={handleTabChange}
                />
              </Box>
            )}
            {activeTab === "draft" && (
              /* DraftTabB is full-width — manages its own internal layout */
              <DraftTabB
                story={story}
                onStoryUpdate={setStory}
                onNavigateToTab={handleTabChange}
                onUnsavedDraftChange={setDraftHasUnsaved}
              />
            )}
            {activeTab === "history" && (
              <Box sx={{ px: { xs: 2, sm: 3, md: 5 }, pt: 3, pb: 6 }}>
                <HistoryTab story={story} />
              </Box>
            )}
            {activeTab === "illustrations" && (
              <IllustrationsTab story={story} onStoryUpdate={setStory} />
            )}
          </Box>
        </>
      )}

      <Dialog
        open={leaveDialogOpen}
        onClose={handleLeaveCancel}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{desk.unsavedDialogTitle}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">{desk.unsavedDialogBody}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={handleLeaveConfirm}>
            {desk.unsavedLeave}
          </Button>
          <Button variant="contained" onClick={handleLeaveCancel}>
            {desk.unsavedStay}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
