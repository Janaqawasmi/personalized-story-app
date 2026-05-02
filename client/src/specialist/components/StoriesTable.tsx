import React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Link from "@mui/material/Link";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import { useNavigate, useParams } from "react-router-dom";

import { useSpecialistDeskUi } from "../../i18n/specialistDeskUi";
import type { Story } from "../../types/story";
import { COLORS } from "../../theme";
import StoryRow from "./StoryRow";

function EmptyFirstTime() {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const desk = useSpecialistDeskUi();
  const base = `/${lang ?? "he"}/specialist`;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 10,
        gap: 2,
        textAlign: "center",
        px: 2,
      }}
    >
      <Typography
        sx={{
          fontFamily: "'Lora', Georgia, serif",
          fontWeight: 600,
          fontSize: "1.35rem",
          color: COLORS.textPrimary,
        }}
      >
        {desk.emptyFirstTimeTitle}
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ maxWidth: 440, lineHeight: 1.6, fontSize: "0.95rem" }}
      >
        {desk.emptyFirstTimeBody}
      </Typography>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => navigate(`${base}/stories/new`)}
        sx={{
          mt: 1,
          px: 3,
          py: 1.25,
          fontWeight: 600,
          bgcolor: COLORS.primary,
          borderRadius: "8px",
          boxShadow: "0 8px 24px -8px rgba(97, 120, 145, 0.45)",
          textTransform: "none",
          "&:hover": { bgcolor: COLORS.primaryDark },
        }}
      >
        {desk.newStory}
      </Button>
    </Box>
  );
}

interface EmptyFilteredProps {
  onClearFilters?: () => void;
}

function EmptyFiltered({ onClearFilters }: EmptyFilteredProps) {
  const desk = useSpecialistDeskUi();
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 10,
        gap: 1.5,
        textAlign: "center",
        px: 2,
      }}
    >
      <Typography
        sx={{
          color: COLORS.textSecondary,
          fontWeight: 500,
          fontFamily: "'Lora', Georgia, serif",
          fontStyle: "italic",
          fontSize: "1rem",
        }}
      >
        {desk.emptyFiltered}
      </Typography>
      {onClearFilters && (
        <Button
          variant="outlined"
          size="small"
          onClick={onClearFilters}
          sx={{
            color: COLORS.primary,
            fontWeight: 600,
            textTransform: "none",
            borderColor: COLORS.border,
            borderRadius: "8px",
            "&:hover": { borderColor: COLORS.primary, bgcolor: "transparent" },
          }}
        >
          {desk.clearAllFilters}
        </Button>
      )}
    </Box>
  );
}

export interface StoriesTableProps {
  stories: Story[];
  loading: boolean;
  hasAnyStories: boolean;
  onArchive: (storyId: string) => void;
  onRestore: (storyId: string) => void;
  onClearFilters?: () => void;
  /** Left footer caption, e.g. “Showing 1–6 of 8 active manuscripts”. */
  footerLeft: string;
  archivedCount: number;
  onViewArchived?: () => void;
}

export default function StoriesTable({
  stories,
  loading,
  hasAnyStories,
  onArchive,
  onRestore,
  onClearFilters,
  footerLeft,
  archivedCount,
  onViewArchived,
}: StoriesTableProps) {
  const desk = useSpecialistDeskUi();
  const columnHeaders: { label: string; width: string | number }[] = [
    { label: desk.colNumber, width: 44 },
    { label: desk.colManuscript, width: "auto" },
    { label: desk.colStage, width: 148 },
    { label: desk.colPopulationAge, width: 200 },
    { label: desk.colStatus, width: 152 },
    { label: desk.colLastEvent, width: 188 },
    { label: "", width: 48 },
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress sx={{ color: COLORS.primary }} />
      </Box>
    );
  }

  if (stories.length === 0) {
    return !hasAnyStories ? (
      <EmptyFirstTime />
    ) : (
      <EmptyFiltered onClearFilters={onClearFilters} />
    );
  }

  return (
    <Box
      sx={{
        mt: 2.25,
        borderRadius: "12px",
        border: `1px solid ${COLORS.border}`,
        overflow: "hidden",
        boxShadow:
          "0 1px 2px rgba(60,50,40,0.04), 0 12px 36px -22px rgba(60,50,40,0.16)",
      }}
    >
      <TableContainer
        sx={{
          bgcolor: "#fffdf9",
          overflowX: "auto",
          borderRadius: 0,
        }}
      >
        <Table size="small" sx={{ minWidth: 920 }}>
          <TableHead>
            <TableRow
              sx={{
                bgcolor: COLORS.cream,
                "& th": { borderBottom: `1px solid ${COLORS.border}` },
              }}
            >
              {columnHeaders.map((col, hi) => (
                <TableCell
                  key={`${col.label}-${hi}`}
                  width={col.width}
                  sx={{
                    py: 1.5,
                    px: col.label === desk.colNumber ? 1.5 : 2,
                    fontWeight: 700,
                    fontSize: "0.6875rem",
                    color: COLORS.textMuted,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    fontFamily:
                      "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                    whiteSpace: "nowrap",
                  }}
                >
                  {col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {stories.map((story, index) => (
              <StoryRow
                key={story.id}
                rowIndex={index}
                story={story}
                onArchive={onArchive}
                onRestore={onRestore}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 1.5,
          px: 2.75,
          py: 1.5,
          borderTop: `1px solid ${COLORS.border}`,
          bgcolor: COLORS.cream,
          fontSize: "0.8125rem",
          color: COLORS.textSecondary,
        }}
      >
        <Typography component="div" sx={{ fontSize: "inherit", lineHeight: 1.45 }}>
          {footerLeft}
        </Typography>
        {archivedCount > 0 && onViewArchived && (
          <Link
            component="button"
            type="button"
            onClick={onViewArchived}
            sx={{
              color: COLORS.primary,
              fontWeight: 600,
              textDecoration: "none",
              cursor: "pointer",
              border: "none",
              background: "none",
              font: "inherit",
              p: 0,
              "&:hover": { textDecoration: "underline" },
            }}
          >
            {desk.viewArchivedLink(archivedCount)}
          </Link>
        )}
      </Box>
    </Box>
  );
}

