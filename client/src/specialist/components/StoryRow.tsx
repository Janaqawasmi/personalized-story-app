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
import AutoFixHighOutlinedIcon from "@mui/icons-material/AutoFixHighOutlined";
import CollectionsOutlinedIcon from "@mui/icons-material/CollectionsOutlined";
import EditNoteOutlinedIcon from "@mui/icons-material/EditNoteOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PublishOutlinedIcon from "@mui/icons-material/PublishOutlined";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";

import type { AgeRange, StoryType } from "../../types/storyBrief";
import type { EditHistoryEvent, Story, StoryStatus } from "../../types/story";
import { COLORS } from "../../theme";
import { getPipelineListLabel, getPipelineListStepIndex } from "../utils/storyPipeline";
import { STATUS_CHIP_COLORS } from "./statusColors";

const PIPELINE_LIST_ICONS = [
  EditNoteOutlinedIcon,
  AutoFixHighOutlinedIcon,
  RateReviewOutlinedIcon,
  VerifiedOutlinedIcon,
  CollectionsOutlinedIcon,
  PublishOutlinedIcon,
] as const;

// ---------------------------------------------------------------------------
// Display maps
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Last edit column (editHistory + compact time)
// ---------------------------------------------------------------------------

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
      return event.succeeded ? "Generated" : "Generation failed";
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

/** Relative for events within the last 7 days ("2h ago", "1d ago"); month + day (and year if needed) for older. */
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
  if (diffDay >= 1) return `${diffDay}d ago`;
  if (diffHr >= 1) return `${diffHr}h ago`;
  if (diffMin >= 1) return `${diffMin}m ago`;
  return "Just now";
}

function formatLastEditSummary(story: Story): string {
  const hist = story.editHistory;
  const last =
    hist && hist.length > 0 ? hist[hist.length - 1] : undefined;
  if (!last) {
    return `Created · ${formatListEventTime(story.createdAt)}`;
  }
  return `${editEventVerb(last.event)} · ${formatListEventTime(last.at)}`;
}

// ---------------------------------------------------------------------------
// Relative time helper (shared with BriefTab / DraftTab)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Pipeline column (icon + label aligned with StoryPipelineStepper)
// ---------------------------------------------------------------------------

function PipelineStageCell({ story }: { story: Story }) {
  const label = getPipelineListLabel(story.status);
  const step = getPipelineListStepIndex(story.status);
  const Icon =
    step === null ? ArchiveOutlinedIcon : PIPELINE_LIST_ICONS[step];

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        minWidth: 0,
      }}
    >
      <Icon
        sx={{
          fontSize: 18,
          color: step === null ? COLORS.textSecondary : COLORS.primary,
          opacity: step === null ? 0.65 : 0.9,
          flexShrink: 0,
        }}
        aria-hidden
      />
      <Typography
        variant="body2"
        sx={{
          fontSize: "0.8rem",
          fontWeight: 600,
          color: COLORS.textPrimary,
          lineHeight: 1.3,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface StoryRowProps {
  story: Story;
  onArchive: (storyId: string) => void;
  onRestore: (storyId: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StoryRow({
  story,
  onArchive,
  onRestore,
}: StoryRowProps) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const storyPath = `/${lang ?? "he"}/specialist/stories/${story.id}`;

  const isArchived = story.status === "archived";
  const displayTitle =
    story.title.trim() === "" ? null : story.title;

  const col = STATUS_CHIP_COLORS[story.status];

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

  return (
    <TableRow
      hover
      onClick={handleRowClick}
      sx={{
        cursor: "pointer",
        opacity: isArchived ? 0.6 : 1,
        transition: "background-color 0.15s ease, opacity 0.15s ease",
        "&:last-child td": { borderBottom: 0 },
        "&:hover": {
          bgcolor: (theme) => theme.palette.action.hover,
        },
        "&:hover .story-row-title-link": {
          color: COLORS.primary,
          textDecoration: "underline",
          textUnderlineOffset: 3,
        },
      }}
    >
      {/* ---- Title (real URL for new tab / copy link; click does not double-fire row) ---- */}
      <TableCell sx={{ maxWidth: 280, py: 1.5 }}>
        <Link
          component={RouterLink}
          to={storyPath}
          className="story-row-title-link"
          underline="none"
          onClick={(e) => e.stopPropagation()}
          sx={{
            fontWeight: 600,
            fontSize: "0.875rem",
            lineHeight: 1.43,
            color: displayTitle ? COLORS.textPrimary : COLORS.textSecondary,
            fontStyle: displayTitle ? "normal" : "italic",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 260,
            display: "block",
          }}
        >
          {displayTitle ?? "Untitled story"}
        </Link>
      </TableCell>

      {/* ---- Pipeline (coarse stage — matches workspace stepper) ---- */}
      <TableCell sx={{ py: 1.5, maxWidth: 140 }}>
        <PipelineStageCell story={story} />
      </TableCell>

      {/* ---- Type / age ---- */}
      <TableCell sx={{ py: 1.5 }}>
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
                height: 22,
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
                color: COLORS.textSecondary,
                height: 22,
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

      {/* ---- Status ---- */}
      <TableCell sx={{ py: 1.5 }}>
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
              STATUS_LABELS[story.status]
            )
          }
          size="small"
          sx={{
            fontSize: "0.72rem",
            height: 22,
            bgcolor: col.filledBg,
            color: col.filledText,
            border: "none",
            "& .MuiChip-label": {
              color: col.filledText,
              px: story.status === "generating" ? 0.75 : undefined,
            },
          }}
        />
      </TableCell>

      {/* ---- Last event (from edit history) ---- */}
      <TableCell sx={{ py: 1.5, maxWidth: 240 }}>
        <Typography
          variant="body2"
          color="text.secondary"
          fontSize="0.8rem"
          sx={{ lineHeight: 1.35 }}
        >
          {formatLastEditSummary(story)}
        </Typography>
      </TableCell>

      {/* ---- Actions ---- */}
      <TableCell sx={{ py: 1.5, width: 48 }} onClick={handleMenuOpen_e}>
        <IconButton
          size="small"
          onClick={handleMenuOpen}
          aria-label="Story actions"
          sx={{ color: COLORS.textSecondary }}
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
