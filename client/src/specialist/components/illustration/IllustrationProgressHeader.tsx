import { Box, Button, Chip, LinearProgress, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import type { StoryStatus } from "../../../types/story";
import { useSpecialistDeskUi } from "../../../i18n/specialistDeskUi";
import { COLORS } from "../../../theme";
import { DRAFT_B, FONTS } from "../draftB/tokens";

interface Props {
  approvedCount: number;
  totalCount: number;
  /** Live status from useIllustrationWorkspaceState — see WorkspacePreview's `liveStatus` prop. */
  liveStatus: StoryStatus;
  /** Preview/publish/reopen CTAs — only rendered once the story is
   *  `illustration_ready` or `published`, so this card is the single
   *  status/action point (no duplicate card lower on the page). */
  canPreview?: boolean;
  showPublish?: boolean;
  onPreviewClick?: () => void;
  onPublishClick?: () => void;
  /** Public catalog link, shown once published. */
  publicCatalogUrl?: string | null;
  /** "Reopen for edits" link back to the story tab, shown once published. */
  reopenHref?: string | null;
}

/**
 * Top-level "N of M illustrations approved" progress indicator for the
 * Illustration Workspace — visible regardless of scroll position, not just
 * inside individual page cards. Purely a read-out of the same live state
 * useIllustrationWorkspaceState already drives (`pages`/`liveStatus`); it
 * does not gate, auto-advance, or change the approve/mark-ready/publish flow.
 */
export default function IllustrationProgressHeader({
  approvedCount,
  totalCount,
  liveStatus,
  canPreview = false,
  showPublish = false,
  onPreviewClick,
  onPublishClick,
  publicCatalogUrl = null,
  reopenHref = null,
}: Props) {
  const desk = useSpecialistDeskUi();
  const pct = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;
  const allApproved = totalCount > 0 && approvedCount === totalCount;
  const isReady = liveStatus === "illustration_ready";
  const isPublished = liveStatus === "published";

  const statusLabel =
    liveStatus === "published"
      ? desk.illProgressStatusPublished
      : liveStatus === "illustration_ready"
        ? desk.illProgressStatusReady
        : desk.illProgressStatusWorkspace;

  const isDone = liveStatus === "illustration_ready" || liveStatus === "published";
  const statusColors = isDone
    ? { bg: COLORS.successSoft, text: COLORS.success }
    : { bg: COLORS.primarySoft, text: COLORS.primaryDark };

  return (
    <Box
      sx={{
        border: `1px solid ${allApproved ? COLORS.success : DRAFT_B.border}`,
        borderRadius: "12px",
        bgcolor: allApproved ? COLORS.successSoft : "#fff",
        px: 2.25,
        py: 1.75,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        rowGap={0.75}
        sx={{ mb: 1 }}
      >
        <Typography
          sx={{
            fontFamily: FONTS.sans,
            fontWeight: 700,
            fontSize: 14,
            color: DRAFT_B.ink,
          }}
        >
          {desk.illProgressApprovedCount(approvedCount, totalCount)}
        </Typography>
        <Chip
          label={statusLabel}
          size="small"
          sx={{
            bgcolor: statusColors.bg,
            color: statusColors.text,
            fontSize: "0.72rem",
            height: 24,
            fontWeight: 600,
            letterSpacing: "0.01em",
            "& .MuiChip-label": { px: 1.125 },
          }}
        />
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 8,
          borderRadius: 999,
          bgcolor: DRAFT_B.border,
          "& .MuiLinearProgress-bar": {
            borderRadius: 999,
            bgcolor: allApproved ? COLORS.success : COLORS.primary,
          },
        }}
      />

      {isReady || isPublished ? (
        <Stack spacing={1.25} sx={{ mt: 1.5 }}>
          <Typography sx={{ fontFamily: FONTS.sans, fontSize: 13, color: DRAFT_B.inkSoft }}>
            {isReady ? desk.illProgressReadyHelper : desk.illGalPublishedSub}
          </Typography>
          <Stack direction="row" spacing={1.25} flexWrap="wrap" alignItems="center">
            {onPreviewClick ? (
              <Button
                variant="outlined"
                size="small"
                disabled={!canPreview}
                onClick={onPreviewClick}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                {desk.illGalPreview}
              </Button>
            ) : null}
            {isReady && showPublish && onPublishClick ? (
              <Button
                variant="contained"
                size="small"
                color="success"
                onClick={onPublishClick}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                {desk.illGalPublish}
              </Button>
            ) : null}
            {isPublished && publicCatalogUrl ? (
              <Button
                variant="text"
                size="small"
                component={RouterLink}
                to={publicCatalogUrl}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                {desk.illViewOnPublicSite}
              </Button>
            ) : null}
            {isPublished && reopenHref ? (
              <Button
                variant="text"
                size="small"
                component={RouterLink}
                to={reopenHref}
                sx={{ textTransform: "none", fontWeight: 600, color: DRAFT_B.inkSoft }}
              >
                {desk.illGalReopen}
              </Button>
            ) : null}
          </Stack>
        </Stack>
      ) : null}
    </Box>
  );
}
