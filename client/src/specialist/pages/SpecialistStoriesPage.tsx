import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";

import { draftStore } from "../storage";
import type { Story, StoryStatus } from "../../types/story";
import { COLORS } from "../../theme";
import StoriesFilterBar from "../components/StoriesFilterBar";
import StoriesTable from "../components/StoriesTable";
import { storyMatchesSearchQuery } from "../utils/storySearchMatch";

// ---------------------------------------------------------------------------
// Header count summary helpers
// ---------------------------------------------------------------------------

const SUMMARY_STATUSES: { status: StoryStatus; label: string }[] = [
  { status: "in_review", label: "in review" },
  { status: "awaiting_review", label: "awaiting review" },
  { status: "generating", label: "generating" },
  { status: "needs_revision", label: "needs revision" },
];

function buildCountSummary(stories: Story[]): string {
  const nonArchived = stories.filter((s) => s.status !== "archived");
  const total = nonArchived.length;

  const parts: string[] = [`${total} ${total === 1 ? "story" : "stories"}`];

  for (const { status, label } of SUMMARY_STATUSES) {
    const count = nonArchived.filter((s) => s.status === status).length;
    if (count > 0) parts.push(`${count} ${label}`);
  }

  return parts.join(" · ");
}

// ---------------------------------------------------------------------------
// Filtering + sorting (pure function, memoised in the component)
// ---------------------------------------------------------------------------

function applyFilters(
  stories: Story[],
  activeStatuses: StoryStatus[],
  searchQuery: string,
  sortBy: "lastOpenedAt" | "createdAt" | "title",
  sortDir: "asc" | "desc"
): Story[] {
  let result = [...stories];

  // Status filter
  if (activeStatuses.length === 0) {
    result = result.filter((s) => s.status !== "archived");
  } else {
    result = result.filter((s) => activeStatuses.includes(s.status));
  }

  // Search filter (title, tags, population, trigger — see storySearchMatch)
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    result = result.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        storyMatchesSearchQuery(s, searchQuery)
    );
  }

  // Sort
  result.sort((a, b) => {
    let cmp = 0;
    if (sortBy === "title") {
      cmp = a.title.localeCompare(b.title);
    } else {
      const aVal = a[sortBy] ?? 0;
      const bVal = b[sortBy] ?? 0;
      cmp = aVal - bVal;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  return result;
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function SpecialistStoriesPage() {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const base = `/${lang ?? "he"}/specialist`;

  // ---- raw data ----
  const [allStories, setAllStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---- filter state ----
  const [activeStatuses, setActiveStatuses] = useState<StoryStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"lastOpenedAt" | "createdAt" | "title">(
    "lastOpenedAt"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // ---- snackbar for action errors ----
  const [snackbar, setSnackbar] = useState<string | null>(null);

  // ---- data loading ----
  useEffect(() => {
    draftStore
      .listStories()
      .then((stories) => {
        setAllStories(stories);
        setLoading(false);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to load stories.");
        setLoading(false);
      });

    const unsub = draftStore.subscribeToList(setAllStories);
    return unsub;
  }, []);

  // ---- derived: filtered + sorted ----
  const filteredStories = useMemo(
    () => applyFilters(allStories, activeStatuses, searchQuery, sortBy, sortDir),
    [allStories, activeStatuses, searchQuery, sortBy, sortDir]
  );

  // ---- sort change handler ----
  function handleSortChange(newSortBy: string, newSortDir: "asc" | "desc") {
    setSortBy(newSortBy as "lastOpenedAt" | "createdAt" | "title");
    setSortDir(newSortDir);
  }

  // ---- action handlers ----
  async function handleArchive(storyId: string) {
    try {
      await draftStore.transitionStatus(storyId, "archived");
    } catch (e: unknown) {
      setSnackbar(e instanceof Error ? e.message : "Failed to archive story.");
    }
  }

  async function handleRestore(storyId: string) {
    try {
      await draftStore.transitionStatus(storyId, "draft_brief");
    } catch (e: unknown) {
      setSnackbar(e instanceof Error ? e.message : "Failed to restore story.");
    }
  }

  const handleClearFilters = useCallback(() => {
    setActiveStatuses([]);
    setSearchQuery("");
  }, []);

  // ---- header ----
  const countSummary = useMemo(() => buildCountSummary(allStories), [allStories]);
  const awaitingReviewCount = useMemo(
    () => allStories.filter((s) => s.status === "awaiting_review").length,
    [allStories]
  );
  const needsRevisionCount = useMemo(
    () => allStories.filter((s) => s.status === "needs_revision").length,
    [allStories]
  );

  // ---- render ----
  return (
    <Box
      sx={{
        maxWidth: 1200,
        mx: "auto",
        px: { xs: 2, sm: 3, md: 4 },
        py: 4,
      }}
    >
      {/* Page header */}
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: COLORS.textPrimary,
              lineHeight: 1.1,
            }}
          >
            My stories
          </Typography>
          {!loading && !error && (
            <Typography
              variant="body2"
              sx={{ color: COLORS.textSecondary, mt: 0.5 }}
            >
              {countSummary}
            </Typography>
          )}
        </Box>

        <Button
          variant="contained"
          size="large"
          startIcon={<AddIcon />}
          onClick={() => navigate(`${base}/stories/new`)}
          sx={{
            px: 3,
            py: 1.25,
            fontWeight: 700,
            bgcolor: COLORS.primary,
            flexShrink: 0,
            boxShadow: "0 8px 24px -8px rgba(97, 120, 145, 0.45)",
            "&:hover": { bgcolor: COLORS.primary, opacity: 0.9 },
          }}
        >
          New Story
        </Button>
      </Stack>

      {/* Error state */}
      {error && !loading && (
        <Alert
          severity="error"
          sx={{ mb: 3, borderRadius: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                setError(null);
                setLoading(true);
                draftStore
                  .listStories()
                  .then((stories) => {
                    setAllStories(stories);
                    setLoading(false);
                  })
                  .catch((e: unknown) => {
                    setError(
                      e instanceof Error ? e.message : "Failed to load stories."
                    );
                    setLoading(false);
                  });
              }}
            >
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Awaiting review attention */}
      {!error && awaitingReviewCount > 0 && (
        <Alert
          severity="info"
          onClick={() => setActiveStatuses(["awaiting_review"])}
          sx={{
            mb: 2,
            borderRadius: 2,
            cursor: "pointer",
            "& .MuiAlert-message": { width: "100%" },
          }}
        >
          {awaitingReviewCount === 1
            ? "1 story is awaiting your review — click to filter."
            : `${awaitingReviewCount} stories are awaiting your review — click to filter.`}
        </Alert>
      )}

      {/* Regeneration in progress — same triage priority as awaiting review */}
      {!error && needsRevisionCount > 0 && (
        <Alert
          severity="info"
          onClick={() => setActiveStatuses(["needs_revision"])}
          sx={{
            mb: 2,
            borderRadius: 2,
            cursor: "pointer",
            "& .MuiAlert-message": { width: "100%" },
          }}
        >
          {needsRevisionCount === 1
            ? "1 story is regenerating from your feedback — click to filter."
            : `${needsRevisionCount} stories are regenerating from your feedback — click to filter.`}
        </Alert>
      )}

      {/* Filter bar */}
      {!error && (
        <Box sx={{ mb: 2.5 }}>
          <StoriesFilterBar
            allStories={allStories}
            activeStatuses={activeStatuses}
            onStatusChange={setActiveStatuses}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            sortDir={sortDir}
            onSortChange={handleSortChange}
          />
        </Box>
      )}

      {/* Stories table */}
      {!error && (
        <StoriesTable
          stories={filteredStories}
          loading={loading}
          hasAnyStories={allStories.length > 0}
          onArchive={handleArchive}
          onRestore={handleRestore}
          onClearFilters={handleClearFilters}
        />
      )}

      {/* Action error snackbar */}
      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={5000}
        onClose={() => setSnackbar(null)}
        message={snackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
}
