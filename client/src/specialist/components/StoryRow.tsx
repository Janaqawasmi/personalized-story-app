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

import type { AgeRange, StoryType } from "../../types/storyBrief";
import type { EditHistoryEvent, Story, StoryStatus } from "../../types/story";
import { COLORS } from "../../theme";
import {
  PIPELINE_STEP_LABELS,
  getPipelineListLabel,
  getStoryPipelineUiState,
} from "../utils/storyPipeline";
import { STATUS_CHIP_COLORS } from "./statusColors";

const SERIF =
  "'Lora', 'Iowan Old Style', Georgia, 'Times New Roman', serif";

const STORY_TYPE_LABELS: Partial<Record<StoryType, string>> = {
  fear_anxiety: "Fear & Anxiety",
  big_emotions: "Big Emotions",
  loss_grief: "Loss & Grief",
  identity_self_worth: "Identity & Self-Worth",
  life_transitions: "Life Transitions",
};

const AGE_RANGE_LABELS: Record<AgeRange, string> = {
  "3-5": "3–5",
  "5-7": "5–7",
  "7-9": "7–9",
  "9-12": "9–12",
};

const STATUS_LABELS: Record<StoryStatus, string> = {
  draft_brief: "Brief in progress",
  generating: "Generating",
  awaiting_review: "Awaiting review",
  in_review: "In review",
  needs_revision: "Needs revision",
  approved: "Approved",
  prompt_review: "Image prompt review",
  illustrating: "Illustrating",
  illustration_review: "Illustration review",
  illustration_ready: "Illustration ready",
  published: "Published",
  archived: "Archived",
};

function editEventVerb(event: EditHistoryEvent): string {
  switch (event.kind) {
    case "draft_created":
      return "Created";
    case "draft_edited":
      return "Story edited";
    case "status_changed":
      return "Updated";
    case "brief_submitted":
      return "Submitted";
    case "agent1_generated":
      return event.succeeded ? "Draft generated" : "Generation failed";
    case "regeneration_requested":
      return "Regeneration requested";
    case "archived":
      return "Archived";
    case "restored":
      return "Restored";
    default:
      return "Updated";
  }
}

function formatListEventTime(at: number): string {
  const now = Date.now();
  const diffMs = Math.max(0, now - at);
  const dayMs = 24 * 60 * 60 * 1000;
  if (diffMs >= 7 * dayMs) {
    const d = new Date(at);
    const yNow = new Date(now).getFullYear();
    const month = d.toLocaleString("en-US", { month: "short" });
    const day = d.getDate();
    if (d.getFullYear() !== yNow) return `${month} ${day}, ${d.getFullYear()}`;
    return `${month} ${day}`;
  }
  const diffMin = Math.floor(diffMs / (60 * 1000));
  const diffHr = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDay = Math.floor(diffMs / dayMs);
  if (diffDay >= 1) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  if (diffHr >= 1) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  if (diffMin >= 1) return `${diffMin} min ago`;
  return "Just now";
}

/** Relative time helper (shared with BriefTab / DraftTab). */
export function formatRelativeTime(ms: number): string {
  const now = Date.now();
  const diffMs = now - ms;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  if (diffDay === 1) return "Yesterday";

  const date = new Date(ms);
  const nowDate = new Date(now);

  const month = date.toLocaleString("en", { month: "short" });
  const day = date.getDate();

  if (date.getFullYear() === nowDate.getFullYear()) {
    return `${month} ${day}`;
  }
  return `${month} ${day}, ${date.getFullYear()}`;
}

function lastEventLines(story: Story): { what: string; when: string } {
  const hist = story.editHistory;
  const last =
    hist && hist.length > 0 ? hist[hist.length - 1] : undefined;
  if (!last) {
    return {
      what: "Created",
      when: formatListEventTime(story.createdAt),
    };
  }
  return {
    what: editEventVerb(last.event),
    when: formatListEventTime(last.at),
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

function PipelineDots({ status }: { status: StoryStatus }) {
  const n = PIPELINE_STEP_LABELS.length;
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
  const storyPath = `/${lang ?? "he"}/specialist/stories/${story.id}`;

  const isArchived = story.status === "archived";
  const isAttention = story.status === "awaiting_review";
  const displayTitle =
    story.title.trim() === "" ? null : story.title;

  const col = STATUS_CHIP_COLORS[story.status];
  const pipelineLabel = getPipelineListLabel(story.status);
  const evt = lastEventLines(story);

  const briefRev =
    story.parentStoryId || /revision/i.test(story.title ?? "")
      ? "REV. 2"
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
            {displayTitle ?? "Untitled story"}
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
          <PipelineDots status={story.status} />
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
              label={STORY_TYPE_LABELS[story.storyType] ?? story.storyType}
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
              label={AGE_RANGE_LABELS[story.ageRange]}
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
                {STATUS_LABELS[story.status]}
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
                {STATUS_LABELS[story.status]}
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
          aria-label="Story actions"
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
              Archive
            </MenuItem>
          )}
          {isArchived && (
            <MenuItem onClick={handleRestore} sx={{ fontSize: "0.875rem" }}>
              Restore
            </MenuItem>
          )}
        </Menu>
      </TableCell>
    </TableRow>
  );
}
