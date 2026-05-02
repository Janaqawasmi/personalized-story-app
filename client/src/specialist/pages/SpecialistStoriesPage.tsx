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

import { useLanguage } from "../../i18n/context/useLanguage";
import { useSpecialistDeskUi } from "../../i18n/specialistDeskUi";
import type { SpecialistDeskUi } from "../../i18n/specialistDeskUi.types";
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

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function SpecialistStoriesPage() {
  const desk = useSpecialistDeskUi();
  const { language } = useLanguage();
  const isArabic = language === "ar";
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
        setError(
          e instanceof Error ? e.message : desk.loadStoriesFailed,
        );
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
      setSnackbar(
        e instanceof Error ? e.message : desk.archiveStoryFailed,
      );
    }
  }

  async function handleRestore(storyId: string) {
    try {
      await draftStore.transitionStatus(storyId, "draft_brief");
    } catch (e: unknown) {
      setSnackbar(
        e instanceof Error ? e.message : desk.restoreStoryFailed,
      );
    }
  }

  const handleClearFilters = useCallback(() => {
    setActiveStatuses([]);
    setSearchQuery("");
  }, []);

  const countSummary = useMemo(
    () => desk.formatCountSummary(allStories),
    [desk, allStories],
  );

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
      desk.formatTableFooter(
        filteredStories.length,
        allStories,
        activeStatuses,
      ),
    [desk, filteredStories.length, allStories, activeStatuses],
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
              {desk.deskOverline}
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
              {desk.deskTitlePrefix ? `${desk.deskTitlePrefix} ` : null}
              <Box
                component="em"
                sx={{
                  fontStyle: "italic",
                  fontWeight: 500,
                  color: COLORS.textSecondary,
                }}
              >
                {desk.deskTitleEmphasis}
              </Box>
            </Typography>

            {!loading && !error && (
              <Typography
                sx={{
                  fontFamily: SERIF,
                  fontStyle: isArabic ? "normal" : "italic",
                  fontSize: 17,
                  color: COLORS.textSecondary,
                  mt: 1.5,
                  maxWidth: 560,
                  lineHeight: 1.65,
                  letterSpacing: isArabic ? "normal" : undefined,
                  wordSpacing: isArabic ? "normal" : undefined,
                }}
                lang={isArabic ? "ar" : undefined}
              >
                {countSummary || desk.deskSummaryFallback}
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
                label={desk.statInCare}
                serif={SERIF}
                isArabic={isArabic}
              />
              <StatBlock
                value={awaitingReviewCount}
                label={desk.statAwaitsYou}
                serif={SERIF}
                accent={
                  awaitingReviewCount > 0 ? COLORS.warning : undefined
                }
                isArabic={isArabic}
              />
              <StatBlock
                value={approvedCount}
                label={desk.statApproved}
                serif={SERIF}
                accent={approvedCount > 0 ? COLORS.success : undefined}
                isArabic={isArabic}
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
              {desk.newStory}
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
                        e instanceof Error ? e.message : desk.loadStoriesFailed,
                      );
                      setLoading(false);
                    });
                }}
              >
                {desk.retry}
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
            <strong>{desk.serverWarningBold}</strong> {desk.serverWarningRest}
            <Box
              component="span"
              sx={{ display: "block", fontSize: "0.82em", opacity: 0.88, mt: 0.5 }}
            >
              {desk.serverWarningReasonPrefix} {serverWarning}
            </Box>
          </Alert>
        )}

        {/* Review queue callout */}
        {!error && firstAwaiting && (
          <ReviewQueueCard
            desk={desk}
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
            desk={desk}
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

        <Footband desk={desk} serif={SERIF} sans={SANS} />

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
  isArabic?: boolean;
}) {
  const { value, label, serif, accent, isArabic } = props;
  /** Logical alignment + centered stacks in Arabic so digits sit cleanly above labels. */
  return (
    <Box
      sx={
        isArabic
          ? { textAlign: "center", minWidth: 72 }
          : { textAlign: { xs: "start", md: "end" } }
      }
    >
      <Typography
        component="div"
        dir="ltr"
        sx={{
          direction: "ltr",
          unicodeBidi: "embed",
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
          fontSize: isArabic ? 11 : 10.5,
          letterSpacing: isArabic ? "normal" : "0.14em",
          textTransform: isArabic ? "none" : "uppercase",
          color: COLORS.textMuted,
          mt: isArabic ? 0.5 : 0.75,
          fontWeight: 700,
          fontFamily: SANS,
          lineHeight: 1.35,
        }}
        lang={isArabic ? "ar" : undefined}
      >
        {label}
      </Typography>
    </Box>
  );
}

function ReviewQueueCard(props: {
  desk: SpecialistDeskUi;
  serif: string;
  sans: string;
  count: number;
  story: Story;
  onSkim: () => void;
  onOpen: () => void;
}) {
  const { desk, serif, sans, count, story, onSkim, onOpen } = props;

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
            {desk.reviewQueueOverline}
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
            {count === 1
              ? desk.reviewQueueTitleOne
              : desk.reviewQueueTitleMany(count)}
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
            {desk.reviewQueueBodyLine(
              story.title?.trim() || desk.untitledStory,
            )}
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
          {desk.skimQueue}
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
          {desk.openNamedStory(
            firstWord(story.title) || desk.openStoryShort,
          )}
        </Button>
      </Stack>
    </Box>
  );
}

function RevisionQueueCard(props: {
  desk: SpecialistDeskUi;
  serif: string;
  sans: string;
  count: number;
  story: Story;
  onSkim: () => void;
  onOpen: () => void;
}) {
  const { desk, serif, sans, count, story, onSkim, onOpen } = props;

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
            {desk.revisionOverline}
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
            {count === 1
              ? desk.revisionTitleOne
              : desk.revisionTitleMany(count)}
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
            {desk.revisionBodyLine(
              story.title?.trim() || desk.untitledStory,
            )}
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
          {desk.showQueue}
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
          {desk.openNamedStory(
            firstWord(story.title) || desk.openStoryShort,
          )}
        </Button>
      </Stack>
    </Box>
  );
}

function Footband(props: {
  desk: SpecialistDeskUi;
  serif: string;
  sans: string;
}) {
  const { desk, serif, sans } = props;
  const workflowLines = [desk.footWorkflow1, desk.footWorkflow2, desk.footWorkflow3];
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
        <FootColLabel label={desk.footCareTitle} sans={sans} />
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
          {desk.footCareBody}
        </Typography>
      </Box>

      <Box>
        <FootColLabel label={desk.footWorkflowTitle} sans={sans} />
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
          {workflowLines.map((line, i, arr) => (
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
        <FootColLabel label={desk.footTipsTitle} sans={sans} />
        <Typography
          sx={{
            fontFamily: sans,
            fontSize: "0.78rem",
            color: COLORS.textSecondary,
            lineHeight: 1.55,
          }}
        >
          {desk.footTipsBody}
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
