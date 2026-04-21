/**
 * Shared status → color mapping used by StoriesFilterBar chips and StoryRow
 * status chips. Aligned with Direction B workspace STATUS_META / BRAND tokens.
 */
import type { StoryStatus } from "../../types/story";
import { COLORS } from "../../theme";

export interface StatusColor {
  filledBg: string;
  filledText: string;
  outlinedBorder: string;
  outlinedText: string;
  /** Leading dot color for workspace status pill (optional). */
  dot?: string;
}

export const STATUS_CHIP_COLORS: Record<StoryStatus | "all", StatusColor> = {
  all: {
    filledBg: COLORS.primary,
    filledText: "#fff",
    outlinedBorder: COLORS.border,
    outlinedText: COLORS.textSecondary,
    dot: COLORS.primary,
  },
  draft_brief: {
    filledBg: "#ebe6de",
    filledText: "#5c534a",
    outlinedBorder: COLORS.border,
    outlinedText: COLORS.textSecondary,
    dot: "#8a7f72",
  },
  generating: {
    filledBg: "#ebe6de",
    filledText: "#5c534a",
    outlinedBorder: COLORS.border,
    outlinedText: COLORS.textSecondary,
    dot: "#8a7f72",
  },
  awaiting_review: {
    filledBg: "#f5ecd7",
    filledText: "#7a5a1e",
    outlinedBorder: COLORS.warning,
    outlinedText: "#7a5a1e",
    dot: "#c79536",
  },
  in_review: {
    filledBg: "#e7ecf1",
    filledText: "#3d526a",
    outlinedBorder: COLORS.primary,
    outlinedText: "#3d526a",
    dot: COLORS.primary,
  },
  needs_revision: {
    filledBg: "#f0e4e8",
    filledText: COLORS.secondary,
    outlinedBorder: COLORS.secondary,
    outlinedText: COLORS.secondary,
    dot: COLORS.secondary,
  },
  approved: {
    filledBg: "#eaf0e4",
    filledText: "#4a5f3f",
    outlinedBorder: COLORS.success,
    outlinedText: "#4a5f3f",
    dot: COLORS.success,
  },
  published: {
    filledBg: "#eaf0e4",
    filledText: "#4a5f3f",
    outlinedBorder: COLORS.success,
    outlinedText: "#4a5f3f",
    dot: COLORS.success,
  },
  archived: {
    filledBg: "#e0dbd3",
    filledText: "#6c655e",
    outlinedBorder: COLORS.border,
    outlinedText: "#6c655e",
    dot: "#8a8178",
  },
};
