import React, { useState } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";

import { useLanguage } from "../../i18n/context/useLanguage";
import {
  dateLocaleForLang,
  formatListEventTimeMs,
} from "../../i18n/specialistRelativeTime";
import { useSpecialistDeskUi } from "../../i18n/specialistDeskUi";
import { useStoryBriefUi } from "../../i18n/storyBriefUi";
import type { SpecialistDeskUi } from "../../i18n/specialistDeskUi.types";
import type { StoryType } from "../../types/storyBrief";
import type { EditHistoryEvent, Story, StoryStatus } from "../../types/story";
import { COLORS } from "../../theme";
import {
  getPipelineListLabelTranslated,
  getStoryPipelineUiState,
} from "../utils/storyPipeline";
import { STATUS_CHIP_COLORS } from "./statusColors";

const SERIF =
  "'Lora', 'Iowan Old Style', Georgia, 'Times New Roman', serif";

function editEventVerb(event: EditHistoryEvent, desk: SpecialistDeskUi): string {
  switch (event.kind) {
    case "draft_created":
      return desk.editEventCreated;
    case "draft_edited":
      return desk.editEventStoryEdited;
    case "status_changed":
      return desk.editEventUpdated;
    case "brief_submitted":
      return desk.editEventSubmitted;
    case "agent1_generated":
      return event.succeeded
        ? desk.editEventDraftGenerated
        : desk.editEventGenerationFailed;
    case "regeneration_requested":
      return desk.editEventRegenerationRequested;
    case "archived":
      return desk.editEventArchived;
    case "restored":
      return desk.editEventRestored;
    default:
      return desk.editEventUpdated;
  }
}

function lastEventLines(
  story: Story,
  desk: SpecialistDeskUi,
  dateLocale: string,
): { what: string; when: string } {
  const hist = story.editHistory;
  const last =
    hist && hist.length > 0 ? hist[hist.length - 1] : undefined;
  if (!last) {
    return {
      what: desk.editEventCreated,
      when: formatListEventTimeMs(story.createdAt, desk, dateLocale),
    };
  }
  return {
    what: editEventVerb(last.event, desk),
    when: formatListEventTimeMs(last.at, desk, dateLocale),
  };
}

function toRomanLower(n: number): string {
  const map: [number, string][] = [
    [1000, "m"],
    [900, "cm"],
    [500, "d"],
    [400, "cd"],
    [100, "c"],
    [90, "xc"],
    [50, "l"],
    [40, "xl"],
    [10, "x"],
    [9, "ix"],
    [5, "v"],
    [4, "iv"],
    [1, "i"],
  ];
  let out = "";
  let x = n;
  for (const [v, s] of map) {
    while (x >= v) {
      out += s;
      x -= v;
    }
  }
  return out;
}

function PipelineDots({
  status,
  dotCount,
}: {
  status: StoryStatus;
  dotCount: number;
}) {
  const n = dotCount;
  const ui = getStoryPipelineUiState(status);

  if (ui.kind === "archived") {
    return (
      <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
        {Array.from({ length: n }).map((_, i) => (
          <Box
            key={i}
            sx={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              bgcolor: COLORS.border,
              flexShrink: 0,
            }}
          />
        ))}
      </Box>
    );
  }

  const cur = ui.emphasisStepIndex;
  const isPublished = status === "published";

  return (
    <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
      {Array.from({ length: n }).map((_, i) => {
        let bg = COLORS.border;
        let shadow: string | undefined;
        if (isPublished) {
          bg = COLORS.success;
        } else if (i < cur) {
          bg = COLORS.primary;
        } else if (i === cur) {
          bg =
            status === "awaiting_review" ? COLORS.warning : COLORS.primary;
          shadow =
            status === "awaiting_review"
              ? "0 0 0 3px rgba(176,132,51,0.18)"
              : "0 0 0 3px rgba(97,120,145,0.2)";
        }
        return (
          <Box
            key={i}
            sx={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              bgcolor: bg,
              boxShadow: shadow,
              flexShrink: 0,
            }}
          />
        );
      })}
    </Box>
  );
}

export interface StoryRowProps {
  rowIndex: number;
  story: Story;
  onArchive: (storyId: string) => void;
  onRestore: (storyId: string) => void;
}

export default function StoryRow({
  rowIndex,
  story,
  onArchive,
  onRestore,
}: StoryRowProps) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const { language } = useLanguage();
  const desk = useSpecialistDeskUi();
  const briefUi = useStoryBriefUi();
  const storyPath = `/${lang ?? "he"}/specialist/stories/${story.id}`;
  const dateLocale = dateLocaleForLang(language);

  const isArchived = story.status === "archived";
  const isAttention = story.status === "awaiting_review";
  const displayTitle =
    story.title.trim() === "" ? null : story.title;

  const col = STATUS_CHIP_COLORS[story.status];
  const pipelineLabel = getPipelineListLabelTranslated(story.status, desk);
  const evt = lastEventLines(story, desk, dateLocale);
  const statusLabels = desk.statusLabels;
  const storyTypeLabels = briefUi.STORY_TYPE_LABELS;
  const ageRangeLabels = briefUi.AGE_RANGE_LABELS;

  const briefRev =
    story.parentStoryId || /revision/i.test(story.title ?? "")
      ? desk.revisionBadge
      : null;

  function handleRowClick() {
    navigate(storyPath);
  }

  function handleMenuOpen(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
  }

  function handleMenuClose() {
    setMenuAnchor(null);
  }

  function handleMenuOpen_e(e: React.MouseEvent) {
    e.stopPropagation();
  }

  function handleArchive() {
    handleMenuClose();
    onArchive(story.id);
  }

  function handleRestore() {
    handleMenuClose();
    onRestore(story.id);
  }

  const rowBg = isAttention
    ? "linear-gradient(90deg, rgba(245,236,215,0.55), rgba(245,236,215,0) 58%)"
    : "transparent";

  return (
    <TableRow
      hover
      onClick={handleRowClick}
      sx={{
        cursor: "pointer",
        opacity: isArchived ? 0.6 : 1,
        transition: "background-color 0.15s ease, opacity 0.15s ease",
        position: "relative",
        background: isAttention ? rowBg : undefined,
        "&:last-child td": { borderBottom: 0 },
        "&:hover": {
          bgcolor: `${COLORS.cream} !important`,
        },
        "&:hover .story-row-title-link": {
          color: COLORS.primary,
        },
      }}
    >
      {isAttention && (
        <Box
          sx={{
            position: "absolute",
            left: 0,
            top: 10,
            bottom: 10,
            width: 3,
            bgcolor: COLORS.warning,
            borderRadius: "0 2px 2px 0",
            pointerEvents: "none",
          }}
        />
      )}

      <TableCell
        sx={{
          py: 2,
          px: 1.5,
          verticalAlign: "middle",
          borderBottom: `1px solid ${COLORS.borderSoft}`,
        }}
      >
        <Typography
          sx={{
            fontFamily: SERIF,
            fontStyle: "italic",
            fontWeight: 500,
            color: COLORS.textMuted,
            fontSize: "0.875rem",
          }}
        >
          {toRomanLower(rowIndex + 1)}.
        </Typography>
      </TableCell>

      <TableCell
        sx={{
          py: 2,
          maxWidth: 280,
          verticalAlign: "middle",
          borderBottom: `1px solid ${COLORS.borderSoft}`,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.25, minWidth: 0 }}>
          <Link
            component={RouterLink}
            to={storyPath}
            className="story-row-title-link"
            underline="none"
            onClick={(e) => e.stopPropagation()}
            sx={{
              fontFamily: SERIF,
              fontWeight: 600,
              fontSize: "1.125rem",
              lineHeight: 1.25,
              color: displayTitle ? COLORS.textPrimary : COLORS.textMuted,
              fontStyle: displayTitle ? "normal" : "italic",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 260,
              display: "block",
              transition: "color 0.12s ease",
            }}
          >
            {displayTitle ?? desk.untitledStory}
          </Link>
          {briefRev && (
            <Typography
              component="span"
              sx={{
                fontSize: "0.625rem",
                color: COLORS.textMuted,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                border: `1px solid ${COLORS.border}`,
                bgcolor: COLORS.surface,
                px: 0.75,
                py: 0.125,
                borderRadius: "4px",
                flexShrink: 0,
                fontWeight: 600,
              }}
            >
              {briefRev}
            </Typography>
          )}
        </Box>
      </TableCell>

      <TableCell
        sx={{
          py: 2,
          borderBottom: `1px solid ${COLORS.borderSoft}`,
          verticalAlign: "middle",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
          <PipelineDots
            status={story.status}
            dotCount={desk.pipelineSteps.length}
          />
          <Typography
            sx={{
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: COLORS.textPrimary,
              lineHeight: 1.3,
            }}
          >
            {pipelineLabel}
          </Typography>
        </Box>
      </TableCell>

      <TableCell
        sx={{
          py: 2,
          borderBottom: `1px solid ${COLORS.borderSoft}`,
          verticalAlign: "middle",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 0.75,
          }}
        >
          {story.storyType ? (
            <Chip
              label={
                storyTypeLabels[story.storyType as StoryType] ??
                story.storyType
              }
              size="small"
              variant="outlined"
              sx={{
                fontSize: "0.72rem",
                borderColor: COLORS.border,
                color: COLORS.textSecondary,
                height: 24,
                borderRadius: "999px",
              }}
            />
          ) : null}
          {story.ageRange ? (
            <Chip
              label={ageRangeLabels[story.ageRange]}
              size="small"
              variant="outlined"
              sx={{
                fontSize: "0.72rem",
                borderColor: COLORS.border,
                color: COLORS.textMuted,
                height: 24,
                borderRadius: "999px",
              }}
            />
          ) : null}
          {!story.storyType && !story.ageRange && (
            <Typography variant="body2" color="text.secondary">
              —
            </Typography>
          )}
        </Box>
      </TableCell>

      <TableCell
        sx={{
          py: 2,
          borderBottom: `1px solid ${COLORS.borderSoft}`,
          verticalAlign: "middle",
        }}
      >
        <Chip
          label={
            story.status === "generating" ? (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <CircularProgress
                  size={10}
                  thickness={5}
                  sx={{ color: col.filledText }}
                />
                {statusLabels[story.status]}
              </span>
            ) : (
              <Box
                component="span"
                sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}
              >
                <Box
                  component="span"
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    bgcolor: col.dot ?? col.filledText,
                    flexShrink: 0,
                  }}
                />
                {statusLabels[story.status]}
              </Box>
            )
          }
          size="small"
          sx={{
            fontSize: "0.75rem",
            height: 26,
            borderRadius: "999px",
            bgcolor: col.filledBg,
            color: col.filledText,
            border: "none",
            fontWeight: 600,
            "& .MuiChip-label": {
              color: col.filledText,
              px: story.status === "generating" ? 0.75 : 1,
            },
          }}
        />
      </TableCell>

      <TableCell
        sx={{
          py: 2,
          maxWidth: 200,
          borderBottom: `1px solid ${COLORS.borderSoft}`,
          verticalAlign: "middle",
        }}
      >
        <Typography
          sx={{
            fontSize: "0.8125rem",
            color: COLORS.textSecondary,
            lineHeight: 1.35,
          }}
        >
          {evt.what}
        </Typography>
        <Typography
          sx={{
            display: "block",
            fontSize: "0.6875rem",
            color: COLORS.textMuted,
            mt: 0.25,
            fontWeight: 500,
          }}
        >
          {evt.when}
        </Typography>
      </TableCell>

      <TableCell
        sx={{
          py: 2,
          width: 48,
          verticalAlign: "middle",
          borderBottom: `1px solid ${COLORS.borderSoft}`,
        }}
        onClick={handleMenuOpen_e}
      >
        <IconButton
          size="small"
          onClick={handleMenuOpen}
          aria-label={desk.rowAriaStoryActions}
          className="dammah-more"
          sx={{
            color: COLORS.textMuted,
            opacity: 0,
            transition: "opacity 0.12s ease",
            ".MuiTableRow-root:hover &": { opacity: 1 },
          }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
          onClick={(e) => e.stopPropagation()}
          PaperProps={{
            sx: {
              borderRadius: 2,
              boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
              minWidth: 140,
            },
          }}
        >
          {!isArchived && (
            <MenuItem
              onClick={handleArchive}
              sx={{ fontSize: "0.875rem", color: COLORS.textSecondary }}
            >
              <ArchiveOutlinedIcon
                sx={{ fontSize: 18, mr: 1, opacity: 0.75 }}
              />
              {desk.rowMenuArchive}
            </MenuItem>
          )}
          {isArchived && (
            <MenuItem onClick={handleRestore} sx={{ fontSize: "0.875rem" }}>
              {desk.rowMenuRestore}
            </MenuItem>
          )}
        </Menu>
      </TableCell>
    </TableRow>
  );
}
