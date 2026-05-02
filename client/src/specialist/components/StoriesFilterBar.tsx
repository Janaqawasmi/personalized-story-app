import React, { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";

import { useSpecialistDeskUi } from "../../i18n/specialistDeskUi";
import type { SpecialistDeskUi } from "../../i18n/specialistDeskUi.types";
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

function buildSortOptions(desk: SpecialistDeskUi): {
  value: SortValue;
  label: string;
}[] {
  return [
    { value: "lastOpenedAt_desc", label: desk.sortLastActivity },
    { value: "createdAt_desc", label: desk.sortNewestFirst },
    { value: "createdAt_asc", label: desk.sortOldestFirst },
    { value: "title_asc", label: desk.sortTitleAZ },
  ];
}

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

/** Every chip shows a live count (design: “Awaiting review 1”, “All 8”). */
function chipLabelWithCount(label: string, count: number): string {
  return `${label} ${count}`;
}

/** Specialist-priority order: needs you now → soon → in progress → system → done → archive. */
function buildChipConfigs(desk: SpecialistDeskUi): ChipConfig[] {
  return [
    { label: desk.chipAll, status: null, color: STATUS_CHIP_COLORS.all },
    {
      label: desk.chipAwaitingReview,
      status: "awaiting_review",
      color: STATUS_CHIP_COLORS.awaiting_review,
    },
    {
      label: desk.chipInReview,
      status: "in_review",
      color: STATUS_CHIP_COLORS.in_review,
    },
    {
      label: desk.chipBriefInProgress,
      status: "draft_brief",
      color: STATUS_CHIP_COLORS.draft_brief,
    },
    {
      label: desk.chipGenerating,
      status: "generating",
      color: STATUS_CHIP_COLORS.generating,
    },
    {
      label: desk.chipNeedsRevision,
      status: "needs_revision",
      color: STATUS_CHIP_COLORS.needs_revision,
    },
    {
      label: desk.chipApproved,
      status: "approved",
      color: STATUS_CHIP_COLORS.approved,
    },
    {
      label: desk.chipPromptReview,
      status: "prompt_review",
      color: STATUS_CHIP_COLORS.prompt_review,
    },
    {
      label: desk.chipIllustrating,
      status: "illustrating",
      color: STATUS_CHIP_COLORS.illustrating,
    },
    {
      label: desk.chipIllustrationReview,
      status: "illustration_review",
      color: STATUS_CHIP_COLORS.illustration_review,
    },
    {
      label: desk.chipIllustrationReady,
      status: "illustration_ready",
      color: STATUS_CHIP_COLORS.illustration_ready,
    },
    {
      label: desk.chipArchived,
      status: "archived",
      color: STATUS_CHIP_COLORS.archived,
    },
  ];
}

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
  const desk = useSpecialistDeskUi();
  const CHIP_CONFIGS = useMemo(() => buildChipConfigs(desk), [desk]);
  const SORT_OPTIONS = useMemo(() => buildSortOptions(desk), [desk]);

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
          flexWrap: "wrap",
          gap: 1,
          flex: { md: 1 },
          pb: { xs: 0.5, md: 0 },
        }}
      >
        {CHIP_CONFIGS.map((cfg) => {
          const active = isChipActive(cfg.status);
          const count = chipCount(cfg.status);
          /** Warm highlight when a queue needs attention and this chip is not selected. */
          const awaitingGoldHighlight =
            cfg.status === "awaiting_review" && count > 0 && !active;
          const needsRoseHighlight =
            cfg.status === "needs_revision" && count > 0 && !active;
          const attentionHighlight =
            awaitingGoldHighlight || needsRoseHighlight;
          const useFilledAppearance = active || attentionHighlight;
          const dimmed = count === 0 && cfg.status !== null;
          const col = cfg.color;
          const label = chipLabelWithCount(cfg.label, count);

          const filledSx = awaitingGoldHighlight
            ? {
                bgcolor: COLORS.warningSoft,
                color: "#7a5a1e",
                border: "none",
                "&:hover": {
                  bgcolor: COLORS.warningSoft,
                  opacity: 0.92,
                },
                "& .MuiChip-label": { color: "#7a5a1e" },
              }
            : needsRoseHighlight
              ? {
                  bgcolor: STATUS_CHIP_COLORS.needs_revision.filledBg,
                  color: STATUS_CHIP_COLORS.needs_revision.filledText,
                  border: "none",
                  "&:hover": {
                    bgcolor: STATUS_CHIP_COLORS.needs_revision.filledBg,
                    opacity: 0.92,
                  },
                  "& .MuiChip-label": {
                    color: STATUS_CHIP_COLORS.needs_revision.filledText,
                  },
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
              key={cfg.status ?? "all"}
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
        component="section"
        aria-label={desk.filterAriaLabel}
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
          placeholder={desk.searchPlaceholder}
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
                  aria-label={desk.clearSearchAria}
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
          renderValue={(value) => {
            const opt = SORT_OPTIONS.find((o) => o.value === value);
            return opt ? `${desk.sortLabelPrefix}${opt.label}` : "";
          }}
          sx={{
            minWidth: 168,
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
            color: COLORS.textSecondary,
            fontWeight: 500,
          }}
        >
          {SORT_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: "0.875rem" }}>
              {desk.sortLabelPrefix}
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </Box>
    </Box>
  );
}
