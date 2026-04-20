import React, { useState } from "react";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import MoreVertIcon from "@mui/icons-material/MoreVert";

import type { AgeRange, StoryType } from "../../types/storyBrief";
import type { Story, StoryStatus } from "../../types/story";
import { COLORS } from "../../theme";
import { STATUS_CHIP_COLORS } from "./statusColors";

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
  draft_brief: "Draft",
  generating: "Generating",
  awaiting_review: "Awaiting review",
  in_review: "In review",
  needs_revision: "Needs revision",
  approved: "Approved",
  published: "Published",
  archived: "Archived",
};

// ---------------------------------------------------------------------------
// Relative time helper
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
// Props
// ---------------------------------------------------------------------------

export interface StoryRowProps {
  story: Story;
  onOpen: (storyId: string) => void;
  onArchive: (storyId: string) => void;
  onRestore: (storyId: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StoryRow({
  story,
  onOpen,
  onArchive,
  onRestore,
}: StoryRowProps) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const isArchived = story.status === "archived";
  const displayTitle =
    story.title.trim() === "" ? null : story.title;

  const lastActivity = story.lastOpenedAt || story.updatedAt;
  const col = STATUS_CHIP_COLORS[story.status];

  function handleRowClick() {
    onOpen(story.id);
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

  function handleOpen() {
    handleMenuClose();
    onOpen(story.id);
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
        transition: "opacity 0.15s ease",
        "&:last-child td": { borderBottom: 0 },
      }}
    >
      {/* ---- Title ---- */}
      <TableCell sx={{ maxWidth: 280, py: 1.5 }}>
        {displayTitle ? (
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: COLORS.textPrimary,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 260,
            }}
          >
            {displayTitle}
          </Typography>
        ) : (
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: COLORS.textSecondary,
              fontStyle: "italic",
            }}
          >
            Untitled story
          </Typography>
        )}
      </TableCell>

      {/* ---- Story type ---- */}
      <TableCell sx={{ py: 1.5 }}>
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
        ) : (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        )}
      </TableCell>

      {/* ---- Age ---- */}
      <TableCell sx={{ py: 1.5 }}>
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
        ) : (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        )}
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

      {/* ---- Last activity ---- */}
      <TableCell sx={{ py: 1.5, whiteSpace: "nowrap" }}>
        <Typography variant="body2" color="text.secondary" fontSize="0.8rem">
          {formatRelativeTime(lastActivity)}
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
          <MenuItem onClick={handleOpen} sx={{ fontSize: "0.875rem" }}>
            Open
          </MenuItem>
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
