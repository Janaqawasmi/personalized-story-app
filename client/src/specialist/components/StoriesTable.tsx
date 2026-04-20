import React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import { useNavigate, useParams } from "react-router-dom";

import type { Story } from "../../types/story";
import { COLORS } from "../../theme";
import StoryRow from "./StoryRow";

// ---------------------------------------------------------------------------
// Empty states
// ---------------------------------------------------------------------------

function EmptyFirstTime() {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
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
      }}
    >
      <Typography
        variant="h5"
        sx={{ fontWeight: 700, color: COLORS.textPrimary }}
      >
        Start your first story
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ maxWidth: 400 }}
      >
        Create a story brief to begin generating therapeutic stories with Agent
        1.
      </Typography>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => navigate(`${base}/stories/new`)}
        sx={{
          mt: 1,
          px: 3,
          py: 1.25,
          fontWeight: 700,
          bgcolor: COLORS.primary,
          boxShadow: "0 8px 24px -8px rgba(97, 120, 145, 0.45)",
          "&:hover": { bgcolor: COLORS.primary, opacity: 0.9 },
        }}
      >
        New Story
      </Button>
    </Box>
  );
}

interface EmptyFilteredProps {
  onClearFilters?: () => void;
}

function EmptyFiltered({ onClearFilters }: EmptyFilteredProps) {
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
      }}
    >
      <Typography
        variant="body1"
        sx={{ color: COLORS.textSecondary, fontWeight: 500 }}
      >
        No stories match these filters
      </Typography>
      {onClearFilters && (
        <Button
          variant="text"
          size="small"
          onClick={onClearFilters}
          sx={{
            color: COLORS.primary,
            fontWeight: 600,
            textDecoration: "underline",
            textUnderlineOffset: 2,
            "&:hover": { bgcolor: "transparent", opacity: 0.75 },
          }}
        >
          Clear all filters
        </Button>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface StoriesTableProps {
  stories: Story[];
  loading: boolean;
  /** True when there are stories in the store (before filters are applied). */
  hasAnyStories: boolean;
  onArchive: (storyId: string) => void;
  onRestore: (storyId: string) => void;
  onClearFilters?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const COLUMN_HEADERS = [
  { label: "Title", width: "auto" },
  { label: "Pipeline", width: 128 },
  { label: "Type / age", width: 200 },
  { label: "Status", width: 150 },
  { label: "Last event", width: 200 },
  { label: "", width: 56 },
];

export default function StoriesTable({
  stories,
  loading,
  hasAnyStories,
  onArchive,
  onRestore,
  onClearFilters,
}: StoriesTableProps) {
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
    <TableContainer
      sx={{
        borderRadius: 2,
        border: `1px solid ${COLORS.border}`,
        bgcolor: COLORS.surface,
        overflowX: "auto",
      }}
    >
      <Table size="small" sx={{ minWidth: 780 }}>
        <TableHead>
          <TableRow sx={{ bgcolor: "#F5F1EE" }}>
            {COLUMN_HEADERS.map((col) => (
              <TableCell
                key={col.label}
                width={col.width}
                sx={{
                  py: 1.25,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  color: COLORS.textSecondary,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  borderBottom: `1px solid ${COLORS.border}`,
                  whiteSpace: "nowrap",
                }}
              >
                {col.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {stories.map((story) => (
            <StoryRow
              key={story.id}
              story={story}
              onArchive={onArchive}
              onRestore={onRestore}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
