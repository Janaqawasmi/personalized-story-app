import React, { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useNavigate, useParams } from "react-router-dom";

import { useLanguage } from "../../i18n/context/useLanguage";
import { DEFAULT_LANGUAGE } from "../../i18n/context/LanguageContext";
import { dateLocaleForLang } from "../../i18n/specialistRelativeTime";
import { useSpecialistDeskUi } from "../../i18n/specialistDeskUi";
import { useStoryBriefUi } from "../../i18n/storyBriefUi";
import type { Story } from "../../types/story";
import { COLORS } from "../../theme";
import { buildStoryRowViewModel } from "../utils/storyRowViewModel";
import PipelineDots from "./PipelineDots";

const SERIF = "'Lora', 'Iowan Old Style', Georgia, 'Times New Roman', serif";

export interface StoryCardProps {
  story: Story;
  onArchive: (storyId: string) => void;
  onRestore: (storyId: string) => void;
}

/** Narrow-screen replacement for a table row — same data, stacked instead of
 *  columned, so nothing needs to shrink past readability or scroll sideways. */
export default function StoryCard({ story, onArchive, onRestore }: StoryCardProps) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const { language } = useLanguage();
  const desk = useSpecialistDeskUi();
  const briefUi = useStoryBriefUi();
  const dateLocale = dateLocaleForLang(language);

  const vm = buildStoryRowViewModel(story, desk, briefUi, dateLocale, lang ?? DEFAULT_LANGUAGE);

  function handleCardClick() {
    navigate(vm.storyPath);
  }

  function handleActionClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (vm.actionExternal) {
      window.open(vm.actionHref, "_blank", "noopener,noreferrer");
    } else {
      navigate(vm.actionHref);
    }
  }

  function handleMenuOpen(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
  }

  function handleMenuClose() {
    setMenuAnchor(null);
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
    <Box
      onClick={handleCardClick}
      sx={{
        cursor: "pointer",
        border: `1px solid ${COLORS.border}`,
        borderRadius: "10px",
        p: 1.75,
        bgcolor: vm.isAttention ? "#fdf9ef" : "#fffdf9",
        opacity: vm.isArchived ? 0.6 : 1,
        transition: "border-color 0.15s ease",
        "&:hover": { borderColor: COLORS.primary },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
        <Typography
          sx={{
            flex: 1,
            minWidth: 0,
            fontFamily: SERIF,
            fontWeight: 600,
            fontSize: "1.0625rem",
            lineHeight: 1.3,
            color: vm.displayTitle ? COLORS.textPrimary : COLORS.textMuted,
            fontStyle: vm.displayTitle ? "normal" : "italic",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {vm.displayTitle ?? desk.untitledStory}
          {vm.briefRevBadge && (
            <Typography
              component="span"
              sx={{
                ml: 1,
                fontSize: "0.6rem",
                color: COLORS.textMuted,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                border: `1px solid ${COLORS.border}`,
                bgcolor: COLORS.surface,
                px: 0.75,
                py: 0.125,
                borderRadius: "4px",
                fontWeight: 600,
              }}
            >
              {vm.briefRevBadge}
            </Typography>
          )}
        </Typography>

        <IconButton
          size="small"
          onClick={handleMenuOpen}
          aria-label={desk.rowAriaStoryActions}
          sx={{ color: COLORS.textMuted, flexShrink: 0, mt: -0.5, mr: -0.5 }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
          onClick={(e) => e.stopPropagation()}
          PaperProps={{
            sx: { borderRadius: 2, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", minWidth: 140 },
          }}
        >
          {!vm.isArchived && (
            <MenuItem
              onClick={handleArchive}
              sx={{ fontSize: "0.875rem", color: COLORS.textSecondary }}
            >
              <ArchiveOutlinedIcon sx={{ fontSize: 18, mr: 1, opacity: 0.75 }} />
              {desk.rowMenuArchive}
            </MenuItem>
          )}
          {vm.isArchived && (
            <MenuItem onClick={handleRestore} sx={{ fontSize: "0.875rem" }}>
              {desk.rowMenuRestore}
            </MenuItem>
          )}
        </Menu>
      </Box>

      <Stack direction="row" flexWrap="wrap" alignItems="center" gap={0.75} sx={{ mt: 1 }}>
        <Chip
          label={
            vm.isGenerating ? (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <CircularProgress size={10} thickness={5} sx={{ color: vm.statusColor.filledText }} />
                {vm.statusLabel}
              </span>
            ) : (
              vm.statusLabel
            )
          }
          size="small"
          sx={{
            fontSize: "0.72rem",
            height: 24,
            borderRadius: "999px",
            bgcolor: vm.statusColor.filledBg,
            color: vm.statusColor.filledText,
            border: "none",
            fontWeight: 600,
            "& .MuiChip-label": { color: vm.statusColor.filledText, px: 1 },
          }}
        />
        {vm.topicLabel && (
          <Chip
            label={vm.topicLabel}
            size="small"
            variant="outlined"
            sx={{
              fontSize: "0.68rem",
              borderColor: COLORS.border,
              color: COLORS.textSecondary,
              height: 22,
              borderRadius: "999px",
            }}
          />
        )}
        {vm.ageLabel && (
          <Chip
            label={vm.ageLabel}
            size="small"
            variant="outlined"
            sx={{
              fontSize: "0.68rem",
              borderColor: COLORS.border,
              color: COLORS.textMuted,
              height: 22,
              borderRadius: "999px",
            }}
          />
        )}
      </Stack>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1.25, minWidth: 0 }}>
        <PipelineDots status={story.status} dotCount={desk.pipelineSteps.length} />
        <Typography
          sx={{
            fontSize: "0.78rem",
            fontWeight: 600,
            color: COLORS.textPrimary,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
          }}
        >
          {vm.progressText}
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
          mt: 1.5,
          pt: 1.25,
          borderTop: `1px dashed ${COLORS.borderSoft}`,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: "0.75rem",
              color: COLORS.textSecondary,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {vm.lastEventWhat}
          </Typography>
          <Typography sx={{ fontSize: "0.6875rem", color: COLORS.textMuted, fontWeight: 500 }}>
            {vm.lastEventWhen}
          </Typography>
        </Box>

        <Button
          size="small"
          variant="outlined"
          onClick={handleActionClick}
          endIcon={vm.actionExternal ? <OpenInNewIcon sx={{ fontSize: 13 }} /> : undefined}
          sx={{
            flexShrink: 0,
            borderColor: COLORS.border,
            color: COLORS.primary,
            fontWeight: 600,
            fontSize: "0.75rem",
            textTransform: "none",
            borderRadius: "8px",
            height: 32,
            px: 1.5,
            whiteSpace: "nowrap",
            "&:hover": { borderColor: COLORS.primary, bgcolor: `${COLORS.primary}0f` },
          }}
        >
          {vm.actionLabel}
        </Button>
      </Box>
    </Box>
  );
}
