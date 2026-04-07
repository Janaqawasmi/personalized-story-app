import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { fetchDammaStoryBrief } from "../api/dammaStoryBrief";
import { COLORS } from "../theme";
import { useStoryBriefUi, useBriefDateLocale, formatBriefSavedAt } from "../i18n/storyBriefUi";
import type { StoryType } from "../types/storyBrief";

const pageSx = {
  py: { xs: 3, sm: 5 },
  px: { xs: 2, sm: 3 },
  maxWidth: 900,
  mx: "auto",
};

/**
 * Read-only view of a submitted brief (loaded from the server).
 */
export default function SpecialistBriefReviewPage() {
  const { lang, briefId } = useParams<{ lang: string; briefId: string }>();
  const navigate = useNavigate();
  const ui = useStoryBriefUi();
  const dateLocale = useBriefDateLocale();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState<Awaited<ReturnType<typeof fetchDammaStoryBrief>> | null>(
    null,
  );

  const load = useCallback(async () => {
    if (!briefId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDammaStoryBrief(briefId);
      setRecord(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load brief");
      setRecord(null);
    } finally {
      setLoading(false);
    }
  }, [briefId]);

  useEffect(() => {
    void load();
  }, [load]);

  const briefPayload = record?.brief as { storyType?: StoryType } | null | undefined;
  const storyType = briefPayload?.storyType;

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

  return (
    <Box sx={pageSx}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(`/${lang ?? "he"}/specialist/briefs`)}
        sx={{ mb: 2, textTransform: "none" }}
      >
        Back to briefs
      </Button>

      {loading && (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      )}

      {!loading && error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && record && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 2,
            backgroundColor: COLORS.surface,
          }}
        >
          <Typography variant="overline" color={COLORS.textSecondary}>
            Submitted brief
          </Typography>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            {ui.successBriefId}: {record.id}
          </Typography>
          {record.submittedAt && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {ui.savedPrefix} {formatBriefSavedAt(Date.parse(record.submittedAt), dateLocale)}
            </Typography>
          )}
          {storyType && (
            <Typography variant="body2" sx={{ mb: 2 }}>
              {ui.STORY_TYPE_LABELS[storyType]}
            </Typography>
          )}

          <Button variant="contained" onClick={handleDownloadJson} sx={{ textTransform: "none", mb: 2 }}>
            {ui.successDownload}
          </Button>

          <Box
            component="pre"
            sx={{
              p: 2,
              borderRadius: 1,
              bgcolor: "rgba(0,0,0,0.04)",
              overflow: "auto",
              maxHeight: 480,
              fontSize: "0.75rem",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {JSON.stringify(record.brief, null, 2)}
          </Box>

          <Button component={RouterLink} to={`/${lang ?? "he"}/specialist/briefs`} sx={{ mt: 2, textTransform: "none" }}>
            Back to all briefs
          </Button>
        </Paper>
      )}
    </Box>
  );
}
