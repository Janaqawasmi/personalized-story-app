// client/src/specialist/pages/StoryWorkspacePage.tsx
//
// Story Workspace: story loading, header, tab bar, and placeholder tab content.
// Full tab content is implemented in subsequent prompts (D2.5b–e).

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { draftStore } from "../storage";
import type { Story, StoryStatus } from "../../types/story";
import { COLORS } from "../../theme";
import WorkspaceHeader from "../components/WorkspaceHeader";
import WorkspaceTabs, { type WorkspaceTabValue } from "../components/WorkspaceTabs";
import BriefTab from "../components/BriefTab";

// ---------------------------------------------------------------------------
// Default tab lookup
// ---------------------------------------------------------------------------

const DEFAULT_TAB: Record<StoryStatus, WorkspaceTabValue> = {
  draft_brief: "brief",
  generating: "brief",
  awaiting_review: "draft",
  in_review: "draft",
  needs_revision: "draft",
  approved: "draft",
  published: "draft",
  archived: "brief",
};

function isValidTab(tab: string | undefined): tab is WorkspaceTabValue {
  return tab === "brief" || tab === "draft" || tab === "history";
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function WorkspaceSkeleton({ slowLoading }: { slowLoading: boolean }) {
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
      <Stack direction="row" spacing={0.75} sx={{ mb: 2.5 }}>
        <Skeleton width={108} height={22} sx={{ borderRadius: 4 }} />
        <Skeleton width={70} height={22} sx={{ borderRadius: 4 }} />
      </Stack>

      {/* Tabs */}
      <Stack
        direction="row"
        sx={{ borderBottom: `1px solid ${COLORS.border}`, mb: 2.5 }}
      >
        {["Brief", "Draft", "History"].map((label) => (
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
          Still loading…
        </Typography>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Not-found state
// ---------------------------------------------------------------------------

function NotFoundState({ onBack }: { onBack: () => void }) {
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
        This story doesn't exist or was deleted.
      </Typography>
      <Button variant="outlined" onClick={onBack}>
        Back to stories
      </Button>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Placeholder tab content (replaced in D2.5b–e)
// ---------------------------------------------------------------------------

function PlaceholderTab({
  label,
  storyId,
}: {
  label: string;
  storyId: string;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        mt: 2,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 2,
        bgcolor: COLORS.surface,
      }}
    >
      <Typography
        variant="h6"
        sx={{ fontWeight: 700, color: COLORS.textPrimary, mb: 0.5 }}
      >
        {label}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Story: {storyId}
      </Typography>
    </Paper>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function StoryWorkspacePage() {
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

  // ---- Active tab (for rendering; URL is the source of truth) ----
  const activeTab: WorkspaceTabValue = isValidTab(tab) ? tab : "brief";

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
      setError(e instanceof Error ? e.message : "Failed to load story.");
    } finally {
      setLoading(false);
    }
  }, [resolvedStoryId]);

  // Initial fetch + real-time subscription
  useEffect(() => {
    fetchStory();
    const unsub = draftStore.subscribeToStory(resolvedStoryId, (updated) => {
      setStory(updated);
    });
    return unsub;
  }, [resolvedStoryId, fetchStory]);

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

  // ---- Tab switching ----
  function handleTabChange(newTab: WorkspaceTabValue) {
    navigate(`${base}/stories/${resolvedStoryId}/${newTab}`, { replace: true });
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
      setError(e instanceof Error ? e.message : "Failed to archive story.");
    }
  }

  async function handleRestore() {
    try {
      await draftStore.transitionStatus(resolvedStoryId, "draft_brief");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to restore story.");
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
      setError(e instanceof Error ? e.message : "Failed to create revision.");
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
    <Box sx={{ maxWidth: 1100, mx: "auto", pb: 6 }}>
      {/* Error banner — shown above header so it's always visible */}
      {error && (
        <Alert
          severity="error"
          sx={{ mx: { xs: 2, sm: 3, md: 4 }, mt: 2, borderRadius: 2 }}
          action={
            <Button color="inherit" size="small" onClick={fetchStory}>
              Try again
            </Button>
          }
        >
          We had trouble loading this story.
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
          />

          <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, pt: 0 }}>
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
                <BriefTab
                  story={story}
                  onStoryUpdate={setStory}
                  onNavigateToTab={handleTabChange}
                />
              )}
              {activeTab === "draft" && (
                <PlaceholderTab label="Draft" storyId={resolvedStoryId} />
              )}
              {activeTab === "history" && (
                <PlaceholderTab label="History" storyId={resolvedStoryId} />
              )}
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}
