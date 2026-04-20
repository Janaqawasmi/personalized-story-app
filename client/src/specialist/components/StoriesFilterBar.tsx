import React, { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";

import { Story, StoryStatus } from "../../types/story";
import { COLORS } from "../../theme";
import { STATUS_CHIP_COLORS } from "./statusColors";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StoriesFilterBarProps {
  /** All stories (unfiltered) — used to compute per-status counts. */
  allStories: Story[];
  /** Currently active status filters. Empty = "All" chip active. */
  activeStatuses: StoryStatus[];
  onStatusChange: (statuses: StoryStatus[]) => void;
  /** Current search query (controlled). */
  searchQuery: string;
  onSearchChange: (query: string) => void;
  /** Current sort selection. */
  sortBy: "lastOpenedAt" | "createdAt" | "title";
  sortDir: "asc" | "desc";
  onSortChange: (sortBy: string, sortDir: "asc" | "desc") => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type SortValue =
  | "lastOpenedAt_desc"
  | "createdAt_desc"
  | "createdAt_asc"
  | "title_asc";

const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: "lastOpenedAt_desc", label: "Last activity" },
  { value: "createdAt_desc", label: "Newest first" },
  { value: "createdAt_asc", label: "Oldest first" },
  { value: "title_asc", label: "Title (A–Z)" },
];

function encodeSortValue(
  sortBy: string,
  sortDir: "asc" | "desc"
): SortValue {
  return `${sortBy}_${sortDir}` as SortValue;
}

function decodeSortValue(value: SortValue): {
  sortBy: "lastOpenedAt" | "createdAt" | "title";
  sortDir: "asc" | "desc";
} {
  const lastUnderscore = value.lastIndexOf("_");
  return {
    sortBy: value.slice(0, lastUnderscore) as
      | "lastOpenedAt"
      | "createdAt"
      | "title",
    sortDir: value.slice(lastUnderscore + 1) as "asc" | "desc",
  };
}

interface ChipConfig {
  label: string;
  status: StoryStatus | null; // null = "All"
  color: {
    filledBg: string;
    filledText: string;
    outlinedBorder: string;
    outlinedText: string;
  };
}

/** Actionable statuses where a count badge helps prioritization (not Generating / Approved / Archived). */
const STATUSES_WITH_COUNT_BADGE: ReadonlySet<StoryStatus> = new Set<StoryStatus>([
  "awaiting_review",
  "in_review",
  "draft_brief",
  "needs_revision",
]);

function showCountBadge(status: StoryStatus | null): boolean {
  return status !== null && STATUSES_WITH_COUNT_BADGE.has(status);
}

/** Specialist-priority order: needs you now → soon → in progress → system → done → archive. */
const CHIP_CONFIGS: ChipConfig[] = [
  { label: "All", status: null, color: STATUS_CHIP_COLORS.all },
  {
    label: "Awaiting review",
    status: "awaiting_review",
    color: STATUS_CHIP_COLORS.awaiting_review,
  },
  {
    label: "In review",
    status: "in_review",
    color: STATUS_CHIP_COLORS.in_review,
  },
  {
    label: "Brief in progress",
    status: "draft_brief",
    color: STATUS_CHIP_COLORS.draft_brief,
  },
  {
    label: "Generating",
    status: "generating",
    color: STATUS_CHIP_COLORS.generating,
  },
  {
    label: "Needs revision",
    status: "needs_revision",
    color: STATUS_CHIP_COLORS.needs_revision,
  },
  {
    label: "Approved",
    status: "approved",
    color: STATUS_CHIP_COLORS.approved,
  },
  {
    label: "Archived",
    status: "archived",
    color: STATUS_CHIP_COLORS.archived,
  },
];

const DEBOUNCE_MS = 200;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StoriesFilterBar({
  allStories,
  activeStatuses,
  onStatusChange,
  searchQuery,
  onSearchChange,
  sortBy,
  sortDir,
  onSortChange,
}: StoriesFilterBarProps) {
  // ---- local search input value (debounced before calling onSearchChange) --
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local value in sync when parent resets the query externally.
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearchChange(localSearch);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [localSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- counts ---------------------------------------------------------------
  const countsByStatus = React.useMemo(() => {
    const map: Partial<Record<StoryStatus, number>> = {};
    for (const story of allStories) {
      map[story.status] = (map[story.status] ?? 0) + 1;
    }
    return map;
  }, [allStories]);

  const totalExcludingArchived = React.useMemo(
    () => allStories.filter((s) => s.status !== "archived").length,
    [allStories]
  );

  function chipCount(status: StoryStatus | null): number {
    if (status === null) return totalExcludingArchived;
    return countsByStatus[status] ?? 0;
  }

  // ---- chip toggle logic ----------------------------------------------------
  function handleChipClick(status: StoryStatus | null) {
    if (status === null) {
      // "All" chip — clear all filters
      onStatusChange([]);
      return;
    }
    const already = activeStatuses.includes(status);
    const next = already
      ? activeStatuses.filter((s) => s !== status)
      : [...activeStatuses, status];
    onStatusChange(next);
  }

  function isChipActive(status: StoryStatus | null): boolean {
    if (status === null) return activeStatuses.length === 0;
    return activeStatuses.includes(status);
  }

  // ---- sort -----------------------------------------------------------------
  const currentSortValue = encodeSortValue(sortBy, sortDir);

  function handleSortChange(event: SelectChangeEvent<string>) {
    const { sortBy: sb, sortDir: sd } = decodeSortValue(
      event.target.value as SortValue
    );
    onSortChange(sb, sd);
  }

  // ---- search ---------------------------------------------------------------
  function handleSearchInput(e: React.ChangeEvent<HTMLInputElement>) {
    setLocalSearch(e.target.value);
  }

  function handleClearSearch() {
    setLocalSearch("");
    onSearchChange("");
  }

  // ---- render ---------------------------------------------------------------
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        alignItems: { md: "center" },
        gap: 2,
        width: "100%",
      }}
    >
      {/* ---- Chip row ---- */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "nowrap",
          gap: 1,
          overflowX: "auto",
          flex: { md: 1 },
          // Hide scrollbar while still allowing scroll
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
          pb: { xs: 0.5, md: 0 },
        }}
      >
        {CHIP_CONFIGS.map((cfg) => {
          const active = isChipActive(cfg.status);
          const count = chipCount(cfg.status);
          /** Filled blue when there is a queue and this chip is not the active filter. */
          const awaitingReviewBlueHighlight =
            cfg.status === "awaiting_review" && count > 0 && !active;
          const needsRevisionBlueHighlight =
            cfg.status === "needs_revision" && count > 0 && !active;
          const attentionBlueHighlight =
            awaitingReviewBlueHighlight || needsRevisionBlueHighlight;
          const useFilledAppearance = active || attentionBlueHighlight;
          const dimmed = count === 0 && cfg.status !== null;
          const col = cfg.color;
          const label = showCountBadge(cfg.status)
            ? `${cfg.label} (${count})`
            : cfg.label;

          const filledSx = attentionBlueHighlight
            ? {
                bgcolor: "#1976d2",
                color: "#fff",
                border: "none",
                "&:hover": {
                  bgcolor: "#1565c0",
                },
                "& .MuiChip-label": { color: "#fff" },
              }
            : {
                bgcolor: col.filledBg.trim(),
                color: col.filledText.trim(),
                border: "none",
                "&:hover": {
                  bgcolor: col.filledBg.trim(),
                  opacity: 0.88,
                },
                "& .MuiChip-label": { color: col.filledText.trim() },
              };

          return (
            <Chip
              key={cfg.label}
              label={label}
              variant={useFilledAppearance ? "filled" : "outlined"}
              onClick={() => handleChipClick(cfg.status)}
              size="small"
              sx={{
                flexShrink: 0,
                fontWeight: active ? 700 : 500,
                fontSize: "0.78rem",
                opacity: dimmed ? 0.45 : 1,
                cursor: "pointer",
                borderRadius: "16px",
                transition: "all 0.15s ease",
                ...(useFilledAppearance
                  ? filledSx
                  : {
                      bgcolor: "transparent",
                      borderColor: col.outlinedBorder,
                      color: col.outlinedText,
                      "&:hover": {
                        bgcolor: `${col.filledBg}14`,
                      },
                      "& .MuiChip-label": { color: col.outlinedText },
                    }),
              }}
            />
          );
        })}
      </Box>

      {/* ---- Search + sort row ---- */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 1,
          flexShrink: 0,
        }}
      >
        {/* Search box */}
        <TextField
          size="small"
          placeholder="Search by title, population, or trigger..."
          value={localSearch}
          onChange={handleSearchInput}
          sx={{
            width: { xs: "100%", sm: 220, md: 240 },
            "& .MuiOutlinedInput-root": {
              borderRadius: "10px",
              bgcolor: COLORS.surface,
              "& fieldset": { borderColor: COLORS.border },
              "&:hover fieldset": { borderColor: COLORS.primary },
              "&.Mui-focused fieldset": { borderColor: COLORS.primary },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon
                  fontSize="small"
                  sx={{ color: COLORS.textSecondary }}
                />
              </InputAdornment>
            ),
            endAdornment: localSearch ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={handleClearSearch}
                  edge="end"
                  aria-label="Clear search"
                  sx={{ color: COLORS.textSecondary }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />

        {/* Sort dropdown */}
        <Select
          size="small"
          value={currentSortValue}
          onChange={handleSortChange}
          displayEmpty
          sx={{
            minWidth: 150,
            borderRadius: "10px",
            bgcolor: COLORS.surface,
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: COLORS.border,
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: COLORS.primary,
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: COLORS.primary,
            },
            fontSize: "0.875rem",
          }}
        >
          {SORT_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: "0.875rem" }}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </Box>
    </Box>
  );
}
