import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import EastIcon from "@mui/icons-material/East";

import { draftStore, hybridStore } from "../storage";
import type { Story, StoryStatus } from "../../types/story";
import { COLORS } from "../../theme";
import StoriesFilterBar from "../components/StoriesFilterBar";
import StoriesTable from "../components/StoriesTable";
import { storyMatchesSearchQuery } from "../utils/storySearchMatch";

const SERIF =
  "'Lora', 'Iowan Old Style', Georgia, 'Times New Roman', serif";
const SANS =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";

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

  const parts: string[] = [
    `${total} ${total === 1 ? "manuscript" : "manuscripts"} in care`,
  ];

  for (const { status, label } of SUMMARY_STATUSES) {
    const count = nonArchived.filter((s) => s.status === status).length;
    if (count > 0) parts.push(`${count} ${label}`);
  }

  return parts.join(" · ");
}

function firstWord(title: string | undefined): string {
  if (!title) return "";
  const w = title.trim().split(/\s+/)[0] ?? "";
  return w.length > 14 ? `${w.slice(0, 14)}…` : w;
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

  if (activeStatuses.length === 0) {
    result = result.filter((s) => s.status !== "archived");
  } else {
    result = result.filter((s) => activeStatuses.includes(s.status));
  }

  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    result = result.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        storyMatchesSearchQuery(s, searchQuery)
    );
  }

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

function tableFooterLeft(
  filteredLen: number,
  allStories: Story[],
  activeStatuses: StoryStatus[]
): string {
  const archivedOnly =
    activeStatuses.length === 1 && activeStatuses[0] === "archived";
  const showing =
    filteredLen === 0 ? "0" : `1–${filteredLen}`;

  if (archivedOnly) {
    const ac = allStories.filter((s) => s.status === "archived").length;
    return `Showing ${showing} of ${ac} archived manuscript${ac === 1 ? "" : "s"}`;
  }

  const liveTotal = allStories.filter((s) => s.status !== "archived").length;
  return `Showing ${showing} of ${liveTotal} active manuscript${liveTotal === 1 ? "" : "s"}`;
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function SpecialistStoriesPage() {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const base = `/${lang ?? "he"}/specialist`;

  const [allStories, setAllStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serverWarning, setServerWarning] = useState<string | null>(null);

  const [activeStatuses, setActiveStatuses] = useState<StoryStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"lastOpenedAt" | "createdAt" | "title">(
    "lastOpenedAt"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [snackbar, setSnackbar] = useState<string | null>(null);

  useEffect(() => {
    draftStore
      .listStories()
      .then((stories) => {
        setAllStories(stories);
        setLoading(false);
        setServerWarning(hybridStore.lastServerError);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to load stories.");
        setLoading(false);
      });

    const unsub = draftStore.subscribeToList((stories) => {
      setAllStories(stories);
      setServerWarning(hybridStore.lastServerError);
    });
    return unsub;
  }, []);

  const filteredStories = useMemo(
    () => applyFilters(allStories, activeStatuses, searchQuery, sortBy, sortDir),
    [allStories, activeStatuses, searchQuery, sortBy, sortDir]
  );

  function handleSortChange(newSortBy: string, newSortDir: "asc" | "desc") {
    setSortBy(newSortBy as "lastOpenedAt" | "createdAt" | "title");
    setSortDir(newSortDir);
  }

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

  const countSummary = useMemo(() => buildCountSummary(allStories), [allStories]);

  const liveStories = useMemo(
    () => allStories.filter((s) => s.status !== "archived"),
    [allStories]
  );

  const awaitingReviewCount = useMemo(
    () => allStories.filter((s) => s.status === "awaiting_review").length,
    [allStories]
  );

  const needsRevisionCount = useMemo(
    () => allStories.filter((s) => s.status === "needs_revision").length,
    [allStories]
  );

  const approvedCount = useMemo(() => {
    return allStories.filter(
      (s) => s.status === "approved" || s.status === "published"
    ).length;
  }, [allStories]);

  const archivedCount = useMemo(
    () => allStories.filter((s) => s.status === "archived").length,
    [allStories]
  );

  const firstAwaiting = useMemo(
    () => liveStories.find((s) => s.status === "awaiting_review"),
    [liveStories]
  );

  const firstNeedsRevision = useMemo(
    () => liveStories.find((s) => s.status === "needs_revision"),
    [liveStories]
  );

  const footerLeft = useMemo(
    () =>
      tableFooterLeft(filteredStories.length, allStories, activeStatuses),
    [filteredStories.length, allStories, activeStatuses]
  );

  const handleViewArchived = useCallback(() => {
    setActiveStatuses(["archived"]);
  }, []);

  return (
    <Box
      sx={{
        background: COLORS.background,
        minHeight: "100vh",
        fontFamily: SANS,
        color: COLORS.textPrimary,
        pb: 6,
      }}
    >
      <Box
        sx={{
          maxWidth: 1240,
          mx: "auto",
          px: { xs: 2, sm: 3, md: 5 },
          pt: { xs: 3, md: 4.5 },
          pb: 10,
        }}
      >
        {/* Masthead */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr auto" },
            alignItems: "end",
            gap: { xs: 3, md: 4 },
            pb: 2.75,
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          <Box>
            <Typography
              component="div"
              sx={{
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: COLORS.textMuted,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                mb: 1.75,
                fontFamily: SANS,
              }}
            >
              <Box
                component="span"
                sx={{
                  width: 18,
                  height: 18,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: "50%",
                  display: "inline-grid",
                  placeItems: "center",
                  fontSize: 10,
                  color: COLORS.textMuted,
                  background: COLORS.surface,
                  fontFamily: SERIF,
                  fontStyle: "italic",
                  fontWeight: 600,
                }}
              >
                d
              </Box>
              Specialist desk
            </Typography>

            <Typography
              component="h1"
              sx={{
                m: 0,
                fontFamily: SERIF,
                fontWeight: 600,
                fontSize: { xs: 40, sm: 52, md: 56 },
                lineHeight: 1,
                letterSpacing: "-0.02em",
                color: COLORS.textPrimary,
              }}
            >
              My{" "}
              <Box
                component="em"
                sx={{
                  fontStyle: "italic",
                  fontWeight: 500,
                  color: COLORS.textSecondary,
                }}
              >
                stories
              </Box>
            </Typography>

            {!loading && !error && (
              <Typography
                sx={{
                  fontFamily: SERIF,
                  fontStyle: "italic",
                  fontSize: 17,
                  color: COLORS.textSecondary,
                  mt: 1.5,
                  maxWidth: 560,
                  lineHeight: 1.5,
                }}
              >
                {countSummary || "Your manuscripts in care."}
              </Typography>
            )}
          </Box>

          <Stack
            spacing={1.75}
            alignItems={{ xs: "stretch", md: "flex-end" }}
            sx={{ width: { xs: "100%", md: "auto" } }}
          >
            <Stack
              direction="row"
              spacing={{ xs: 3, sm: 3.5 }}
              alignItems="baseline"
              justifyContent={{ xs: "space-between", md: "flex-end" }}
            >
              <StatBlock
                value={liveStories.length}
                label="In care"
                serif={SERIF}
              />
              <StatBlock
                value={awaitingReviewCount}
                label="Awaits you"
                serif={SERIF}
                accent={
                  awaitingReviewCount > 0 ? COLORS.warning : undefined
                }
              />
              <StatBlock
                value={approvedCount}
                label="Approved"
                serif={SERIF}
                accent={approvedCount > 0 ? COLORS.success : undefined}
              />
            </Stack>

            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={() => navigate(`${base}/stories/new`)}
              sx={{
                alignSelf: { xs: "stretch", md: "flex-end" },
                px: 2.25,
                py: 1.25,
                height: 42,
                fontWeight: 600,
                fontSize: "0.84rem",
                fontFamily: SANS,
                bgcolor: COLORS.primary,
                borderRadius: "8px",
                boxShadow: "0 8px 24px -10px rgba(97, 120, 145, 0.45)",
                "&:hover": { bgcolor: COLORS.primaryDark },
              }}
            >
              New story
            </Button>
          </Stack>
        </Box>

        {/* Error */}
        {error && !loading && (
          <Alert
            severity="error"
            sx={{
              mt: 2.5,
              borderRadius: "10px",
              bgcolor: COLORS.errorSoft,
              border: `1px solid rgba(161, 74, 74, 0.28)`,
              color: "#5c2a2a",
              "& .MuiAlert-icon": { color: COLORS.error },
            }}
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

        {/* Server warning */}
        {!error && serverWarning && (
          <Alert
            severity="warning"
            onClose={() => setServerWarning(null)}
            sx={{
              mt: 2.5,
              borderRadius: "10px",
              bgcolor: COLORS.warningSoft,
              border: `1px solid rgba(176, 132, 51, 0.35)`,
              color: "#5c4a2a",
            }}
          >
            <strong>Could not load stories from the server.</strong> Only
            locally saved drafts are shown.
            <Box
              component="span"
              sx={{ display: "block", fontSize: "0.82em", opacity: 0.88, mt: 0.5 }}
            >
              Reason: {serverWarning}
            </Box>
          </Alert>
        )}

        {/* Review queue callout */}
        {!error && firstAwaiting && (
          <ReviewQueueCard
            serif={SERIF}
            sans={SANS}
            count={awaitingReviewCount}
            story={firstAwaiting}
            onSkim={() => setActiveStatuses(["awaiting_review"])}
            onOpen={() => navigate(`${base}/stories/${firstAwaiting.id}`)}
          />
        )}

        {/* Needs revision callout */}
        {!error && needsRevisionCount > 0 && firstNeedsRevision && (
          <RevisionQueueCard
            serif={SERIF}
            sans={SANS}
            count={needsRevisionCount}
            story={firstNeedsRevision}
            onSkim={() => setActiveStatuses(["needs_revision"])}
            onOpen={() => navigate(`${base}/stories/${firstNeedsRevision.id}`)}
          />
        )}

        {/* Filter bar */}
        {!error && (
          <Box sx={{ mt: 3 }}>
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

        {/* Table */}
        {!error && (
          <StoriesTable
            stories={filteredStories}
            loading={loading}
            hasAnyStories={allStories.length > 0}
            onArchive={handleArchive}
            onRestore={handleRestore}
            onClearFilters={handleClearFilters}
            footerLeft={footerLeft}
            archivedCount={archivedCount}
            onViewArchived={handleViewArchived}
          />
        )}

        <Footband serif={SERIF} sans={SANS} />

        <Snackbar
          open={Boolean(snackbar)}
          autoHideDuration={5000}
          onClose={() => setSnackbar(null)}
          message={snackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        />
      </Box>
    </Box>
  );
}

function StatBlock(props: {
  value: number;
  label: string;
  serif: string;
  accent?: string;
}) {
  const { value, label, serif, accent } = props;
  return (
    <Box sx={{ textAlign: { xs: "left", md: "right" } }}>
      <Typography
        sx={{
          fontFamily: serif,
          fontWeight: 600,
          fontSize: { xs: 28, sm: 34 },
          lineHeight: 1,
          color: accent ?? COLORS.textPrimary,
          fontFeatureSettings: '"lnum","tnum"',
        }}
      >
        {value}
      </Typography>
      <Typography
        sx={{
          fontSize: 10.5,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: COLORS.textMuted,
          mt: 0.75,
          fontWeight: 700,
          fontFamily: SANS,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

function ReviewQueueCard(props: {
  serif: string;
  sans: string;
  count: number;
  story: Story;
  onSkim: () => void;
  onOpen: () => void;
}) {
  const { serif, sans, count, story, onSkim, onOpen } = props;

  return (
    <Box
      onClick={onSkim}
      sx={{
        mt: 3,
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr auto" },
        gap: 3,
        alignItems: "center",
        background: "#fffdf9",
        border: `1px solid ${COLORS.border}`,
        borderRadius: "12px",
        p: { xs: 2, sm: 2.25 },
        pr: { md: 3 },
        boxShadow:
          "0 1px 2px rgba(60,50,40,0.04), 0 8px 24px -16px rgba(60,50,40,0.18)",
        position: "relative",
        overflow: "hidden",
        cursor: "pointer",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          bgcolor: COLORS.warning,
        }}
      />
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <Typography
          sx={{
            fontFamily: serif,
            fontWeight: 600,
            fontSize: { xs: 36, sm: 44 },
            lineHeight: 0.9,
            color: COLORS.warning,
            flexShrink: 0,
            pt: 0.25,
          }}
        >
          ¶
        </Typography>
        <Box>
          <Typography
            sx={{
              fontSize: 10.5,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: COLORS.warning,
              fontWeight: 700,
              mb: 0.5,
              fontFamily: sans,
            }}
          >
            Your review queue
          </Typography>
          <Typography
            sx={{
              fontFamily: serif,
              fontWeight: 600,
              fontSize: { xs: 17, sm: 20 },
              color: COLORS.textPrimary,
              letterSpacing: "-0.005em",
              lineHeight: 1.25,
            }}
          >
            {count === 1 ? (
              <>
                <Box component="em" sx={{ fontStyle: "italic", fontWeight: 500 }}>
                  One story
                </Box>{" "}
                is awaiting your clinical review
              </>
            ) : (
              <>
                <Box component="em" sx={{ fontStyle: "italic", fontWeight: 500 }}>
                  {count} stories
                </Box>{" "}
                are awaiting your clinical review
              </>
            )}
          </Typography>
          <Typography
            sx={{
              fontSize: 13,
              color: COLORS.textSecondary,
              mt: 0.75,
              lineHeight: 1.55,
              fontFamily: sans,
            }}
          >
            &ldquo;{story.title?.trim() || "Untitled story"}&rdquo; — open the
            story workspace to complete your read and checklist.
          </Typography>
        </Box>
      </Stack>

      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent={{ xs: "flex-start", md: "flex-end" }}
        sx={{ flexShrink: 0 }}
      >
        <Button
          variant="outlined"
          onClick={(e) => {
            e.stopPropagation();
            onSkim();
          }}
          sx={{
            borderColor: COLORS.border,
            color: COLORS.primary,
            fontWeight: 600,
            fontSize: "0.8125rem",
            textTransform: "none",
            borderRadius: "8px",
            height: 36,
            fontFamily: sans,
          }}
        >
          Skim queue
        </Button>
        <Button
          variant="contained"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          endIcon={<EastIcon sx={{ fontSize: 16 }} />}
          sx={{
            bgcolor: COLORS.primary,
            fontWeight: 600,
            fontSize: "0.8125rem",
            textTransform: "none",
            borderRadius: "8px",
            height: 36,
            px: 2,
            fontFamily: sans,
            "&:hover": { bgcolor: COLORS.primaryDark },
          }}
        >
          Open {firstWord(story.title) || "story"}
        </Button>
      </Stack>
    </Box>
  );
}

function RevisionQueueCard(props: {
  serif: string;
  sans: string;
  count: number;
  story: Story;
  onSkim: () => void;
  onOpen: () => void;
}) {
  const { serif, sans, count, story, onSkim, onOpen } = props;

  return (
    <Box
      onClick={onSkim}
      sx={{
        mt: 2,
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr auto" },
        gap: 3,
        alignItems: "center",
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: "12px",
        p: { xs: 2, sm: 2.25 },
        pr: { md: 3 },
        boxShadow:
          "0 1px 2px rgba(60,50,40,0.04), 0 8px 24px -16px rgba(60,50,40,0.14)",
        position: "relative",
        overflow: "hidden",
        cursor: "pointer",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          bgcolor: COLORS.secondary,
        }}
      />
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <ArrowForwardIcon
          sx={{
            color: COLORS.secondary,
            mt: 0.5,
            fontSize: 28,
            flexShrink: 0,
          }}
        />
        <Box>
          <Typography
            sx={{
              fontSize: 10.5,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: COLORS.secondary,
              fontWeight: 700,
              mb: 0.5,
              fontFamily: sans,
            }}
          >
            Regeneration in progress
          </Typography>
          <Typography
            sx={{
              fontFamily: serif,
              fontWeight: 600,
              fontSize: { xs: 17, sm: 18 },
              color: COLORS.textPrimary,
              lineHeight: 1.25,
            }}
          >
            {count === 1 ? (
              <>
                <Box component="em" sx={{ fontStyle: "italic", fontWeight: 500 }}>
                  One story
                </Box>{" "}
                is updating from your feedback
              </>
            ) : (
              <>
                <Box component="em" sx={{ fontStyle: "italic", fontWeight: 500 }}>
                  {count} stories
                </Box>{" "}
                are updating from your feedback
              </>
            )}
          </Typography>
          <Typography
            sx={{
              fontSize: 13,
              color: COLORS.textSecondary,
              mt: 0.75,
              lineHeight: 1.55,
              fontFamily: sans,
            }}
          >
            &ldquo;{story.title?.trim() || "Untitled story"}&rdquo; — check back
            shortly, or open the workspace to watch progress.
          </Typography>
        </Box>
      </Stack>

      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent={{ xs: "flex-start", md: "flex-end" }}
      >
        <Button
          variant="outlined"
          onClick={(e) => {
            e.stopPropagation();
            onSkim();
          }}
          sx={{
            borderColor: COLORS.border,
            color: COLORS.secondary,
            fontWeight: 600,
            fontSize: "0.8125rem",
            textTransform: "none",
            borderRadius: "8px",
            height: 36,
            fontFamily: sans,
          }}
        >
          Show queue
        </Button>
        <Button
          variant="contained"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          endIcon={<EastIcon sx={{ fontSize: 16 }} />}
          sx={{
            bgcolor: COLORS.secondary,
            fontWeight: 600,
            fontSize: "0.8125rem",
            textTransform: "none",
            borderRadius: "8px",
            height: 36,
            px: 2,
            fontFamily: sans,
            "&:hover": { bgcolor: "#6a3d4a" },
          }}
        >
          Open {firstWord(story.title) || "story"}
        </Button>
      </Stack>
    </Box>
  );
}

function Footband(props: { serif: string; sans: string }) {
  const { serif, sans } = props;
  return (
    <Box
      sx={{
        mt: 4.5,
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
        gap: { xs: 3, md: 4.5 },
        pt: 3.5,
        borderTop: `1px solid ${COLORS.border}`,
      }}
    >
      <Box>
        <FootColLabel label="A note on care" sans={sans} />
        <Typography
          sx={{
            fontFamily: serif,
            fontStyle: "italic",
            fontSize: "0.9rem",
            lineHeight: 1.6,
            color: COLORS.textSecondary,
            m: 0,
          }}
        >
          Every manuscript here passes through your hands before any child reads
          it. The AI drafts.{" "}
          <Box component="strong" sx={{ color: COLORS.textPrimary, fontStyle: "normal", fontWeight: 600 }}>
            You judge.
          </Box>{" "}
          Take the time the work deserves.
        </Typography>
      </Box>

      <Box>
        <FootColLabel label="Workflow" sans={sans} />
        <Box
          component="ul"
          sx={{
            listStyle: "none",
            p: 0,
            m: 0,
            fontFamily: sans,
            fontSize: "0.78rem",
            color: COLORS.textSecondary,
          }}
        >
          {[
            "Complete the brief, then generate a first draft.",
            "Review with the checklist before approving for use.",
            "Archive stories you no longer need — restore them anytime.",
          ].map((line, i, arr) => (
            <Box
              component="li"
              key={line}
              sx={{
                display: "flex",
                gap: 1.5,
                py: 1,
                borderBottom:
                  i === arr.length - 1 ? "none" : `1px dashed ${COLORS.borderSoft}`,
                lineHeight: 1.45,
              }}
            >
              <Box
                component="span"
                sx={{
                  fontSize: 10.5,
                  color: COLORS.textMuted,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  minWidth: 28,
                  pt: 0.15,
                  fontWeight: 700,
                }}
              >
                {i + 1}
              </Box>
              <span>{line}</span>
            </Box>
          ))}
        </Box>
      </Box>

      <Box>
        <FootColLabel label="Tips" sans={sans} />
        <Typography
          sx={{
            fontFamily: sans,
            fontSize: "0.78rem",
            color: COLORS.textSecondary,
            lineHeight: 1.55,
          }}
        >
          Use the chips to triage by status. Search covers titles, clinical tags,
          population, and triggers. Sort by last activity to surface what moved
          recently.
        </Typography>
      </Box>
    </Box>
  );
}

function FootColLabel(props: { label: string; sans: string }) {
  return (
    <Typography
      sx={{
        fontSize: 10.5,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: COLORS.textMuted,
        display: "flex",
        alignItems: "center",
        gap: 1,
        mb: 1.5,
        fontWeight: 700,
        fontFamily: props.sans,
      }}
    >
      <Box
        component="span"
        sx={{ width: 14, height: 1, bgcolor: COLORS.textMuted, display: "inline-block" }}
      />
      {props.label}
    </Typography>
  );
}
