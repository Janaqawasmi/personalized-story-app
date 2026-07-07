import React, { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import { useSpecialistDeskUi } from "../../i18n/specialistDeskUi";
import type { SpecialistDeskUi } from "../../i18n/specialistDeskUi.types";
import { Story, StoryStatus } from "../../types/story";
import { COLORS } from "../../theme";
import { STATUS_CHIP_COLORS, ACTION_BUCKET_COLORS } from "./statusColors";
import {
  ACTION_BUCKET_STATUSES,
  countByBucket,
  type ActionBucket,
} from "../utils/actionBucket";

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
  status: StoryStatus;
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

/** Detailed, single-status chips — secondary/collapsed by default so they
 *  never crowd the primary bucket nav (see PRIMARY_BUCKETS below). */
function buildSecondaryChipConfigs(desk: SpecialistDeskUi): ChipConfig[] {
  return [
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
      label: desk.chipIllustrationWorkspace,
      status: "illustration_workspace",
      color: STATUS_CHIP_COLORS.illustration_workspace,
    },
    {
      label: desk.chipIllustrationReady,
      status: "illustration_ready",
      color: STATUS_CHIP_COLORS.illustration_ready,
    },
  ];
}

/** Primary filter nav — the default, always-visible way to slice the table.
 *  Order mirrors the specialist's priority: needs you now → in progress →
 *  ready → done → archive. */
function buildPrimaryBuckets(
  desk: SpecialistDeskUi,
): { bucket: ActionBucket | "all"; label: string }[] {
  return [
    { bucket: "all", label: desk.chipAll },
    { bucket: "needs_action", label: desk.filterNeedsAction },
    { bucket: "in_progress", label: desk.filterInProgress },
    { bucket: "ready_to_publish", label: desk.filterReadyToPublish },
    { bucket: "published", label: desk.filterPublished },
    { bucket: "archived", label: desk.chipArchived },
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
  const PRIMARY_BUCKETS = useMemo(() => buildPrimaryBuckets(desk), [desk]);
  const SECONDARY_CHIP_CONFIGS = useMemo(
    () => buildSecondaryChipConfigs(desk),
    [desk],
  );
  const SORT_OPTIONS = useMemo(() => buildSortOptions(desk), [desk]);

  const [secondaryOpen, setSecondaryOpen] = useState(false);

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
  const statusList = useMemo(
    () => allStories.map((s) => s.status),
    [allStories],
  );

  const countsByStatus = React.useMemo(() => {
    const map: Partial<Record<StoryStatus, number>> = {};
    for (const status of statusList) {
      map[status] = (map[status] ?? 0) + 1;
    }
    return map;
  }, [statusList]);

  const totalExcludingArchived = React.useMemo(
    () => statusList.filter((s) => s !== "archived").length,
    [statusList],
  );

  function secondaryChipCount(status: StoryStatus): number {
    return countsByStatus[status] ?? 0;
  }

  function bucketCount(bucket: ActionBucket | "all"): number {
    if (bucket === "all") return totalExcludingArchived;
    return countByBucket(statusList, bucket);
  }

  // ---- primary bucket toggle logic ------------------------------------------
  function isBucketActive(bucket: ActionBucket | "all"): boolean {
    if (bucket === "all") return activeStatuses.length === 0;
    const bucketStatuses = ACTION_BUCKET_STATUSES[bucket];
    if (activeStatuses.length !== bucketStatuses.length) return false;
    const active = new Set(activeStatuses);
    return bucketStatuses.every((s) => active.has(s));
  }

  function handleBucketClick(bucket: ActionBucket | "all") {
    if (bucket === "all") {
      onStatusChange([]);
      return;
    }
    onStatusChange(ACTION_BUCKET_STATUSES[bucket]);
  }

  // ---- secondary chip toggle logic ------------------------------------------
  function handleSecondaryChipClick(status: StoryStatus) {
    const already = activeStatuses.includes(status);
    const next = already
      ? activeStatuses.filter((s) => s !== status)
      : [...activeStatuses, status];
    onStatusChange(next);
  }

  function isSecondaryChipActive(status: StoryStatus): boolean {
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
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { md: "center" },
          gap: 1.5,
          width: "100%",
        }}
      >
        {/* ---- Primary bucket nav ---- */}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 0.75,
            flex: { md: 1 },
          }}
        >
          {PRIMARY_BUCKETS.map(({ bucket, label }) => {
            const active = isBucketActive(bucket);
            const count = bucketCount(bucket);
            const col = ACTION_BUCKET_COLORS[bucket];
            const dimmed = count === 0 && bucket !== "all";

            return (
              <Chip
                key={bucket}
                label={chipLabelWithCount(label, count)}
                variant={active ? "filled" : "outlined"}
                onClick={() => handleBucketClick(bucket)}
                sx={{
                  flexShrink: 0,
                  height: 34,
                  fontWeight: active ? 700 : 600,
                  fontSize: "0.8125rem",
                  opacity: dimmed ? 0.5 : 1,
                  cursor: "pointer",
                  borderRadius: "17px",
                  transition: "all 0.15s ease",
                  ...(active
                    ? {
                        bgcolor: col.filledBg.trim(),
                        color: col.filledText.trim(),
                        border: "none",
                        "&:hover": { bgcolor: col.filledBg.trim(), opacity: 0.9 },
                        "& .MuiChip-label": { color: col.filledText.trim() },
                      }
                    : {
                        bgcolor: "transparent",
                        borderColor: col.outlinedBorder,
                        borderWidth: 1.5,
                        color: col.outlinedText,
                        "&:hover": { bgcolor: `${col.filledBg}14` },
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
              width: { xs: "100%", sm: 230, md: 260 },
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

      {/* ---- More filters toggle + secondary detailed chips ---- */}
      <Box sx={{ mt: 0.75 }}>
        <Link
          component="button"
          type="button"
          onClick={() => setSecondaryOpen((v) => !v)}
          underline="none"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.375,
            fontSize: "0.75rem",
            fontWeight: 600,
            color: COLORS.textMuted,
            cursor: "pointer",
            "&:hover": { color: COLORS.primary },
          }}
        >
          {secondaryOpen ? desk.moreFiltersHide : desk.moreFiltersShow}
          <ExpandMoreIcon
            sx={{
              fontSize: 16,
              transition: "transform 0.15s ease",
              transform: secondaryOpen ? "rotate(180deg)" : "none",
            }}
          />
        </Link>

        {secondaryOpen && (
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 0.75,
              mt: 1,
            }}
          >
            {SECONDARY_CHIP_CONFIGS.map((cfg) => {
              const status = cfg.status;
              const active = isSecondaryChipActive(status);
              const count = secondaryChipCount(status);
              const dimmed = count === 0;
              const col = cfg.color;

              return (
                <Chip
                  key={status}
                  label={chipLabelWithCount(cfg.label, count)}
                  variant={active ? "filled" : "outlined"}
                  onClick={() => handleSecondaryChipClick(status)}
                  size="small"
                  sx={{
                    flexShrink: 0,
                    fontWeight: active ? 700 : 500,
                    fontSize: "0.72rem",
                    opacity: dimmed ? 0.45 : 1,
                    cursor: "pointer",
                    borderRadius: "14px",
                    transition: "all 0.15s ease",
                    ...(active
                      ? {
                          bgcolor: col.filledBg.trim(),
                          color: col.filledText.trim(),
                          border: "none",
                          "&:hover": { bgcolor: col.filledBg.trim(), opacity: 0.9 },
                          "& .MuiChip-label": { color: col.filledText.trim() },
                        }
                      : {
                          bgcolor: "transparent",
                          borderColor: col.outlinedBorder,
                          color: col.outlinedText,
                          "&:hover": { bgcolor: `${col.filledBg}14` },
                          "& .MuiChip-label": { color: col.outlinedText },
                        }),
                  }}
                />
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
}
