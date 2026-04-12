import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import { fetchDammaStoryBrief } from "../api/dammaStoryBrief";
import { COLORS } from "../theme";
import SpecialistPortalShell, { specialistMainPaperSx } from "../components/specialist/SpecialistPortalShell";
import SubmittedBriefReadView from "../components/specialist/SubmittedBriefReadView";
import { useStoryBriefUi, useBriefDateLocale, formatBriefSavedAt } from "../i18n/storyBriefUi";
import { useSpecialistUi } from "../i18n/specialistUi";
import type { StoryType } from "../types/storyBrief";
import { parseStoredBrief } from "../utils/parseStoredBrief";

const jsonPreSx = {
  p: 2.5,
  borderRadius: 2,
  bgcolor: "rgba(97, 120, 145, 0.06)",
  border: `1px solid ${COLORS.border}`,
  overflow: "auto",
  maxHeight: { xs: 360, sm: 560 },
  fontSize: "0.75rem",
  lineHeight: 1.55,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  m: 0,
};

function TabPanel({
  children,
  value,
  index,
  idPrefix,
}: {
  children: React.ReactNode;
  value: number;
  index: number;
  idPrefix: string;
}) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`${idPrefix}-panel-${index}`}
      aria-labelledby={`${idPrefix}-tab-${index}`}
    >
      <Box sx={{ pt: 2, display: value === index ? "block" : "none" }}>{children}</Box>
    </div>
  );
}

export default function SpecialistBriefReviewPage() {
  const { lang, briefId } = useParams<{ lang: string; briefId: string }>();
  const ui = useStoryBriefUi();
  const sp = useSpecialistUi();
  const dateLocale = useBriefDateLocale();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState<Awaited<ReturnType<typeof fetchDammaStoryBrief>> | null>(
    null,
  );
  const [copyHint, setCopyHint] = useState<string | null>(null);
  const [tab, setTab] = useState(0);

  const load = useCallback(async () => {
    if (!briefId) {
      setRecord(null);
      setError(sp.reviewMissingBriefId);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDammaStoryBrief(briefId);
      setRecord(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : sp.loadBriefError);
      setRecord(null);
    } finally {
      setLoading(false);
    }
  }, [briefId, sp.loadBriefError, sp.reviewMissingBriefId]);

  useEffect(() => {
    void load();
  }, [load]);

  const briefPayload = record?.brief as { storyType?: StoryType } | null | undefined;
  const storyType = briefPayload?.storyType;

  const jsonText = record?.brief != null ? JSON.stringify(record.brief, null, 2) : "";

  const parsed = record?.brief != null ? parseStoredBrief(record.brief) : { brief: null, issues: [] as string[] };
  const displayBrief = parsed.brief;
  const parseIssues = parsed.issues;

  function handleDownloadJson() {
    if (!record?.brief) return;
    const text = JSON.stringify(record.brief, null, 2);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `story-brief-${briefId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCopyJson() {
    if (!jsonText) return;
    try {
      await navigator.clipboard.writeText(jsonText);
      setCopyHint(sp.copyJsonSuccess);
      setTimeout(() => setCopyHint(null), 2400);
    } catch {
      setCopyHint(sp.copyJsonFail);
      setTimeout(() => setCopyHint(null), 3200);
    }
  }

  const briefsHref = `/${lang ?? "he"}/specialist/briefs`;
  const tabPrefix = "specialist-brief-review";

  return (
    <SpecialistPortalShell maxWidth={900}>
      <Button
        component={RouterLink}
        to={briefsHref}
        startIcon={<ArrowBackIcon />}
        sx={{
          mb: 2.5,
          textTransform: "none",
          fontWeight: 600,
          color: COLORS.textSecondary,
          "&:hover": { color: COLORS.primary, bgcolor: "rgba(97, 120, 145, 0.06)" },
        }}
      >
        {sp.reviewAllBriefsLink}
      </Button>

      {loading && (
        <Paper elevation={0} sx={specialistMainPaperSx}>
          <Skeleton variant="text" width="40%" height={28} sx={{ mb: 2 }} />
          <Skeleton variant="text" width="70%" height={22} />
          <Skeleton variant="text" width="50%" height={22} sx={{ mb: 3 }} />
          <Skeleton variant="rounded" height={280} sx={{ borderRadius: 2 }} />
        </Paper>
      )}

      {!loading && error && (
        <Alert severity="error" sx={{ borderRadius: 2, mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && record && (
        <Paper elevation={0} sx={specialistMainPaperSx}>
          <Typography
            variant="overline"
            sx={{ letterSpacing: "0.14em", fontWeight: 700, color: COLORS.primary, display: "block", mb: 1 }}
          >
            {sp.reviewSubmittedOverline}
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h5" component="h1" sx={{ fontWeight: 800, letterSpacing: "-0.02em", mb: 1 }}>
                {sp.reviewPageTitle}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {ui.successBriefId}
                </Typography>
                <Tooltip title={record.id}>
                  <Typography
                    component="code"
                    sx={{
                      fontSize: "0.8rem",
                      bgcolor: "rgba(0,0,0,0.04)",
                      px: 1,
                      py: 0.25,
                      borderRadius: 1,
                      wordBreak: "break-all",
                    }}
                  >
                    {record.id}
                  </Typography>
                </Tooltip>
              </Stack>
            </Box>
            {storyType && (
              <Chip
                label={ui.STORY_TYPE_LABELS[storyType]}
                sx={{
                  fontWeight: 700,
                  bgcolor: "rgba(97, 120, 145, 0.12)",
                  color: COLORS.primary,
                  border: "none",
                }}
              />
            )}
          </Stack>

          {record.submittedAt && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {ui.savedPrefix}{" "}
              <strong style={{ color: COLORS.textPrimary, fontWeight: 600 }}>
                {formatBriefSavedAt(Date.parse(record.submittedAt), dateLocale)}
              </strong>
            </Typography>
          )}

          <Divider sx={{ my: 2, borderColor: COLORS.border }} />

          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            aria-label={sp.reviewTabsAriaLabel}
            sx={{
              borderBottom: 1,
              borderColor: COLORS.border,
              "& .MuiTab-root": { textTransform: "none", fontWeight: 700, minHeight: 48 },
            }}
          >
            <Tab label={sp.reviewTabBrief} id={`${tabPrefix}-tab-0`} aria-controls={`${tabPrefix}-panel-0`} />
            <Tab label={sp.reviewTabJson} id={`${tabPrefix}-tab-1`} aria-controls={`${tabPrefix}-panel-1`} />
          </Tabs>

          <TabPanel value={tab} index={0} idPrefix={tabPrefix}>
            {parseIssues.length > 0 && (
              <Alert severity="warning" sx={{ borderRadius: 2, mb: 2 }}>
                {sp.reviewParseWarning}
              </Alert>
            )}
            {displayBrief ? (
              <SubmittedBriefReadView brief={displayBrief} emptyLabel={sp.reviewFieldEmpty} specialistUi={sp} />
            ) : (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                {sp.reviewParseWarning}
              </Alert>
            )}
          </TabPanel>

          <TabPanel value={tab} index={1} idPrefix={tabPrefix}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              sx={{ mb: 2 }}
              alignItems={{ xs: "stretch", sm: "center" }}
            >
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadJson}
                sx={{ fontWeight: 700, boxShadow: "0 8px 24px -8px rgba(97, 120, 145, 0.45)" }}
              >
                {ui.successDownload}
              </Button>
              <Tooltip title={sp.copyJsonTooltip}>
                <Button
                  variant="outlined"
                  startIcon={<ContentCopyIcon />}
                  onClick={() => void handleCopyJson()}
                  sx={{ borderColor: COLORS.border }}
                >
                  {sp.copyJsonButton}
                </Button>
              </Tooltip>
            </Stack>
            {copyHint && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                {copyHint}
              </Typography>
            )}

            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                {sp.payloadReadOnly}
              </Typography>
              <Tooltip title={sp.copyTooltip}>
                <IconButton size="small" aria-label={sp.copyJsonAria} onClick={() => void handleCopyJson()}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>

            <Box component="pre" sx={jsonPreSx}>
              {jsonText}
            </Box>
          </TabPanel>

          <Button
            component={RouterLink}
            to={briefsHref}
            sx={{ mt: 3, textTransform: "none", fontWeight: 600 }}
          >
            {sp.reviewBackBottom}
          </Button>
        </Paper>
      )}

    </SpecialistPortalShell>
  );
}
