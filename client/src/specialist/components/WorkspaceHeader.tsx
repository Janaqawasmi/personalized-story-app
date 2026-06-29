// client/src/specialist/components/WorkspaceHeader.tsx
//
// Header bar for the Story Workspace page.
// Rows: back link / editable title + status chip + actions / story-type · age chips.

import React, { useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useNavigate, useParams } from "react-router-dom";

import { useSpecialistDeskUi } from "../../i18n/specialistDeskUi";
import { useStoryBriefUi } from "../../i18n/storyBriefUi";
import type { Story, StoryStatus } from "../../types/story";
import type { StoryType } from "../../types/storyBrief";
import { normalizeStoryStatusForDisplay } from "../utils/storyPipeline";
import { DRAFT_B, FONTS } from "./draftB/tokens";
import { STATUS_CHIP_COLORS } from "./statusColors";
import StoryBookPreviewButton from "./StoryBookPreviewButton";

/** Vertical rhythm tuned to Direction B editorial header mock */
const HEADER_PAD_TOP = "10px";
const HEADER_PAD_BOTTOM = "10px";
/** ~1.75× back-link line (~13px) → clear separation before title */
const SPACE_BACK_TO_TITLE = "0px";
/** Tighter band between title and meta chips (~½ title cap-height) */
const SPACE_TITLE_TO_META = "5px";

const NEW_REVISION_ENABLED_STATUSES = new Set<StoryStatus>([
  "awaiting_review",
  "in_review",
  "needs_revision",
  "approved",
  "published",
]);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface WorkspaceHeaderProps {
  story: Story;
  onTitleChange: (title: string) => void;
  onArchive: () => void;
  onRestore: () => void;
  onNewRevision: () => void;
  /** When set, called instead of navigating to the stories list (e.g. unsaved-draft guard). */
  onStoriesClick?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WorkspaceHeader({
  story,
  onTitleChange,
  onArchive,
  onRestore,
  onNewRevision,
  onStoriesClick,
}: WorkspaceHeaderProps) {
  const desk = useSpecialistDeskUi();
  const briefUi = useStoryBriefUi();
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const base = `/${lang ?? "he"}/specialist`;
  const statusLabels = desk.statusLabels;
  const storyTypeLabels = briefUi.STORY_TYPE_LABELS;
  const ageRangeLabels = briefUi.AGE_RANGE_LABELS;
  const outputLanguageLabels = briefUi.LANGUAGE_LABELS;
  const outputLanguage = story.brief?.outputLanguage;

  // ---- Title editing ----
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(story.title);

  // ---- Actions menu ----
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  // ---- Archive confirmation dialog ----
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  // ---- Snackbars ----
  const [copiedSnackbar, setCopiedSnackbar] = useState(false);

  // ---- Derived ----
  const statusForUi = normalizeStoryStatusForDisplay(story.status);
  const statusColors = STATUS_CHIP_COLORS[statusForUi];
  const showSpinner =
    story.status === "generating" || story.status === "needs_revision";
  const isArchived = story.status === "archived";
  const canNewRevision =
    story.briefStatus === "submitted" &&
    NEW_REVISION_ENABLED_STATUSES.has(story.status);

  // ---- Title handlers ----
  function handleTitleClick() {
    setTitleDraft(story.title);
    setEditing(true);
  }

  function commitTitle() {
    const trimmed = titleDraft.trim() || desk.untitledStory;
    setEditing(false);
    if (trimmed !== story.title) {
      onTitleChange(trimmed);
    }
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitTitle();
    } else if (e.key === "Escape") {
      setEditing(false);
      setTitleDraft(story.title);
    }
  }

  // ---- Actions handlers ----
  function closeMenu() {
    setMenuAnchor(null);
  }

  function handleCopyId() {
    closeMenu();
    navigator.clipboard.writeText(story.id).then(
      () => setCopiedSnackbar(true),
      () => {/* silently ignore clipboard failures */}
    );
  }

  function handleArchiveClick() {
    closeMenu();
    setArchiveDialogOpen(true);
  }

  function handleArchiveConfirm() {
    setArchiveDialogOpen(false);
    onArchive();
  }

  function handleRestoreClick() {
    closeMenu();
    onRestore();
  }

  function handleNewRevisionClick() {
    closeMenu();
    onNewRevision();
  }

  // ---- Render ----
  return (
    <Box
      sx={{
        px: { xs: 2, sm: 3, md: 5 },
        pt: HEADER_PAD_TOP,
        pb: HEADER_PAD_BOTTOM,
        borderBottom: `1px solid ${DRAFT_B.border}`,
        bgcolor: DRAFT_B.cream,
        fontFamily: FONTS.sans,
      }}
    >
      {/* Row 1: Back link */}
      <Button
        startIcon={<ArrowBackIcon sx={{ fontSize: "1rem !important" }} />}
        size="small"
        onClick={() =>
          onStoriesClick ? onStoriesClick() : navigate(`${base}/stories`)
        }
        sx={{
          mb: SPACE_BACK_TO_TITLE,
          px: 0,
          minWidth: 0,
          color: DRAFT_B.inkMuted,
          textTransform: "none",
          fontWeight: 500,
          fontSize: "0.8125rem",
          "&:hover": {
            bgcolor: "transparent",
            color: DRAFT_B.ink,
          },
        }}
      >
        {desk.headerBackToStories}
      </Button>

      {/* Row 2: Title + status chip + actions */}
      <Stack
        direction="row"
        alignItems="flex-start"
        spacing={1.5}
        sx={{ mb: SPACE_TITLE_TO_META }}
      >
        {/* Editable title */}
        {editing ? (
          <TextField
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value.slice(0, 120))}
            onBlur={commitTitle}
            onKeyDown={handleTitleKeyDown}
            variant="standard"
            inputProps={{
              maxLength: 120,
              "aria-label": desk.headerStoryTitleAria,
            }}
            sx={{
              flex: 1,
              "& .MuiInput-input": {
                fontSize: "1.625rem",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                color: DRAFT_B.ink,
                py: 0.25,
              },
            }}
          />
        ) : (
          <Typography
            variant="h5"
            component="h1"
            onClick={handleTitleClick}
            title={desk.headerClickToEditTitle}
            sx={{
              flex: 1,
              fontSize: "1.625rem",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: DRAFT_B.ink,
              cursor: "text",
              lineHeight: 1.2,
              "&:hover": {
                textDecoration: "underline",
                textDecorationStyle: "dotted",
                textUnderlineOffset: "3px",
              },
            }}
          >
            {story.title}
          </Typography>
        )}

        {/* Status chip + actions — right-aligned, don't shrink */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.75}
          sx={{ flexShrink: 0 }}
        >
          <Chip
            label={
              <Stack
                direction="row"
                alignItems="center"
                spacing={0.75}
                component="span"
              >
                {showSpinner ? (
                  <CircularProgress
                    size={11}
                    sx={{ color: "inherit", flexShrink: 0 }}
                  />
                ) : statusColors.dot ? (
                  <Box
                    component="span"
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      bgcolor: statusColors.dot,
                      flexShrink: 0,
                    }}
                  />
                ) : null}
                <span>{statusLabels[statusForUi]}</span>
              </Stack>
            }
            size="small"
            aria-label={desk.headerStatusAria(statusLabels[statusForUi])}
            sx={{
              bgcolor: statusColors.filledBg,
              color: statusColors.filledText,
              fontWeight: 600,
              fontSize: "0.75rem",
              height: 26,
              borderRadius: 999,
              "& .MuiChip-label": { px: 1.125 },
            }}
          />

          <StoryBookPreviewButton story={story} />

          <IconButton
            size="small"
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            aria-label={desk.headerStoryActionsAria}
            aria-haspopup="true"
            aria-expanded={Boolean(menuAnchor)}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>

          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={closeMenu}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            {/* Archive — hidden when already archived */}
            {!isArchived && (
              <MenuItem onClick={handleArchiveClick}>
                {desk.headerMenuArchive}
              </MenuItem>
            )}

            {/* Restore — only visible when archived */}
            {isArchived && (
              <MenuItem onClick={handleRestoreClick}>
                {desk.headerMenuRestore}
              </MenuItem>
            )}

            {/* Open new revision — conditionally enabled */}
            <Tooltip
              title={
                !canNewRevision
                  ? desk.headerMenuNewRevisionTooltip
                  : ""
              }
              placement="left"
            >
              {/* span needed so Tooltip fires on disabled MenuItem */}
              <span>
                <MenuItem
                  onClick={handleNewRevisionClick}
                  disabled={!canNewRevision}
                >
                  {desk.headerMenuNewRevision}
                </MenuItem>
              </span>
            </Tooltip>

            <MenuItem onClick={handleCopyId}>{desk.headerMenuCopyId}</MenuItem>
          </Menu>
        </Stack>
      </Stack>

      {/* Row 3: Story type · age range chips */}
      <Stack direction="row" alignItems="center" spacing={0.75}>
        {story.storyType && (
          <Chip
            label={
              storyTypeLabels[story.storyType as StoryType] ?? story.storyType
            }
            size="small"
            variant="outlined"
            sx={{
              borderColor: DRAFT_B.border,
              color: DRAFT_B.inkSoft,
              fontSize: "0.72rem",
              height: 24,
              fontWeight: 500,
              letterSpacing: "0.01em",
              "& .MuiChip-label": { px: 1.125 },
            }}
          />
        )}
        {outputLanguage ? (
          <Chip
            label={outputLanguageLabels[outputLanguage]}
            size="small"
            variant="outlined"
            sx={{
              borderColor: DRAFT_B.border,
              color: DRAFT_B.inkSoft,
              fontSize: "0.72rem",
              height: 24,
              fontWeight: 500,
              letterSpacing: "0.01em",
              "& .MuiChip-label": { px: 1.125 },
            }}
          />
        ) : null}
        {story.ageRange ? (
          <Chip
            label={`${desk.agesChipPrefix} ${ageRangeLabels[story.ageRange]}`}
            size="small"
            variant="outlined"
            sx={{
              borderColor: DRAFT_B.border,
              color: DRAFT_B.inkSoft,
              fontSize: "0.72rem",
              height: 24,
              fontWeight: 500,
              letterSpacing: "0.01em",
              "& .MuiChip-label": { px: 1.125 },
            }}
          />
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8rem" }}>
            —
          </Typography>
        )}
      </Stack>

      {/* Archive confirmation dialog */}
      <Dialog
        open={archiveDialogOpen}
        onClose={() => setArchiveDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{desk.headerArchiveDialogTitle}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">{desk.headerArchiveDialogBody}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArchiveDialogOpen(false)}>
            {desk.headerCancel}
          </Button>
          <Button onClick={handleArchiveConfirm} color="error" variant="contained">
            {desk.headerArchiveConfirm}
          </Button>
        </DialogActions>
      </Dialog>

      {/* "Copied!" snackbar */}
      <Snackbar
        open={copiedSnackbar}
        autoHideDuration={2500}
        onClose={() => setCopiedSnackbar(false)}
        message={desk.headerCopiedSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
}
