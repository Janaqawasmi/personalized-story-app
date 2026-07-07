import React, { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
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
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";

import { useLanguage } from "../../i18n/context/useLanguage";
import { DEFAULT_LANGUAGE } from "../../i18n/context/LanguageContext";
import { dateLocaleForLang } from "../../i18n/specialistRelativeTime";
import { useSpecialistDeskUi } from "../../i18n/specialistDeskUi";
import { useStoryBriefUi } from "../../i18n/storyBriefUi";
import type { Story } from "../../types/story";
import { COLORS } from "../../theme";
import { buildStoryRowViewModel } from "../utils/storyRowViewModel";
import PipelineDots from "./PipelineDots";
import { TABLE_COLUMN_WIDTHS } from "./tableColumns";

const SERIF =
  "'Lora', 'Iowan Old Style', Georgia, 'Times New Roman', serif";

export interface StoryRowProps {
  story: Story;
  onArchive: (storyId: string) => void;
  onRestore: (storyId: string) => void;
}

export default function StoryRow({ story, onArchive, onRestore }: StoryRowProps) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const { language } = useLanguage();
  const desk = useSpecialistDeskUi();
  const briefUi = useStoryBriefUi();
  const dateLocale = dateLocaleForLang(language);

  const vm = buildStoryRowViewModel(story, desk, briefUi, dateLocale, lang ?? DEFAULT_LANGUAGE);

  function handleActionClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (vm.actionExternal) {
      window.open(vm.actionHref, "_blank", "noopener,noreferrer");
    } else {
      navigate(vm.actionHref);
    }
  }

  function handleRowClick() {
    navigate(vm.storyPath);
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

  const rowBg = vm.isAttention
    ? "linear-gradient(90deg, rgba(245,236,215,0.55), rgba(245,236,215,0) 58%)"
    : "transparent";

  return (
    <TableRow
      hover
      onClick={handleRowClick}
      sx={{
        cursor: "pointer",
        opacity: vm.isArchived ? 0.6 : 1,
        transition: "background-color 0.15s ease, opacity 0.15s ease",
        position: "relative",
        background: vm.isAttention ? rowBg : undefined,
        "&:last-child td": { borderBottom: 0 },
        "&:hover": {
          bgcolor: `${COLORS.cream} !important`,
        },
        "&:hover .story-row-title-link": {
          color: COLORS.primary,
        },
      }}
    >
      {vm.isAttention && (
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
          width: TABLE_COLUMN_WIDTHS.story,
          verticalAlign: "middle",
          borderBottom: `1px solid ${COLORS.borderSoft}`,
          overflow: "hidden",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, minWidth: 0 }}>
          <Link
            component={RouterLink}
            to={vm.storyPath}
            className="story-row-title-link"
            underline="none"
            onClick={(e) => e.stopPropagation()}
            sx={{
              fontFamily: SERIF,
              fontWeight: 600,
              fontSize: "1.0625rem",
              lineHeight: 1.25,
              color: vm.displayTitle ? COLORS.textPrimary : COLORS.textMuted,
              fontStyle: vm.displayTitle ? "normal" : "italic",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
              flexShrink: 1,
              display: "block",
              transition: "color 0.12s ease",
            }}
          >
            {vm.displayTitle ?? desk.untitledStory}
          </Link>
          {vm.briefRevBadge && (
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
              {vm.briefRevBadge}
            </Typography>
          )}
        </Box>
      </TableCell>

      <TableCell
        sx={{
          py: 2,
          px: 1.25,
          width: TABLE_COLUMN_WIDTHS.progress,
          borderBottom: `1px solid ${COLORS.borderSoft}`,
          verticalAlign: "middle",
          overflow: "hidden",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
          <PipelineDots status={story.status} dotCount={desk.pipelineSteps.length} />
          <Typography
            sx={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: COLORS.textPrimary,
              lineHeight: 1.3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
            }}
          >
            {vm.progressText}
          </Typography>
        </Box>
      </TableCell>

      <TableCell
        sx={{
          py: 2,
          px: 1.25,
          width: TABLE_COLUMN_WIDTHS.topicAge,
          borderBottom: `1px solid ${COLORS.borderSoft}`,
          verticalAlign: "middle",
          overflow: "hidden",
        }}
      >
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.5 }}>
          {vm.topicLabel ? (
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
                maxWidth: "100%",
                "& .MuiChip-label": {
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  px: 0.9,
                },
              }}
            />
          ) : null}
          {vm.ageLabel ? (
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
                "& .MuiChip-label": { px: 0.9 },
              }}
            />
          ) : null}
          {!vm.topicLabel && !vm.ageLabel && (
            <Typography variant="body2" color="text.secondary">
              —
            </Typography>
          )}
        </Box>
      </TableCell>

      <TableCell
        sx={{
          py: 2,
          px: 1.25,
          width: TABLE_COLUMN_WIDTHS.status,
          borderBottom: `1px solid ${COLORS.borderSoft}`,
          verticalAlign: "middle",
          overflow: "hidden",
        }}
      >
        <Chip
          label={
            vm.isGenerating ? (
              <span style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
                <CircularProgress
                  size={10}
                  thickness={5}
                  sx={{ color: vm.statusColor.filledText, flexShrink: 0 }}
                />
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {vm.statusLabel}
                </span>
              </span>
            ) : (
              vm.statusLabel
            )
          }
          size="small"
          sx={{
            fontSize: "0.72rem",
            height: 25,
            maxWidth: "100%",
            borderRadius: "999px",
            bgcolor: vm.statusColor.filledBg,
            color: vm.statusColor.filledText,
            border: "none",
            fontWeight: 600,
            "& .MuiChip-label": {
              color: vm.statusColor.filledText,
              px: vm.isGenerating ? 0.75 : 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            },
          }}
        />
      </TableCell>

      <TableCell
        sx={{
          py: 2,
          px: 1.25,
          width: TABLE_COLUMN_WIDTHS.lastUpdate,
          borderBottom: `1px solid ${COLORS.borderSoft}`,
          verticalAlign: "middle",
          overflow: "hidden",
        }}
      >
        <Typography
          sx={{
            fontSize: "0.78rem",
            color: COLORS.textSecondary,
            lineHeight: 1.35,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {vm.lastEventWhat}
        </Typography>
        <Typography
          sx={{
            display: "block",
            fontSize: "0.6875rem",
            color: COLORS.textMuted,
            mt: 0.25,
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {vm.lastEventWhen}
        </Typography>
      </TableCell>

      <TableCell
        sx={{
          py: 2,
          px: 1.25,
          width: TABLE_COLUMN_WIDTHS.action,
          borderBottom: `1px solid ${COLORS.borderSoft}`,
          verticalAlign: "middle",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          size="small"
          variant="outlined"
          onClick={handleActionClick}
          endIcon={vm.actionExternal ? <OpenInNewIcon sx={{ fontSize: 13 }} /> : undefined}
          sx={{
            borderColor: COLORS.border,
            color: COLORS.primary,
            fontWeight: 600,
            fontSize: "0.71rem",
            textTransform: "none",
            borderRadius: "8px",
            height: 29,
            px: 1,
            width: "100%",
            minWidth: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            "& .MuiButton-endIcon": { flexShrink: 0 },
            "&:hover": { borderColor: COLORS.primary, bgcolor: `${COLORS.primary}0f` },
          }}
        >
          <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {vm.actionLabel}
          </Box>
        </Button>
      </TableCell>

      <TableCell
        sx={{
          py: 2,
          width: TABLE_COLUMN_WIDTHS.menu,
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
      </TableCell>
    </TableRow>
  );
}
