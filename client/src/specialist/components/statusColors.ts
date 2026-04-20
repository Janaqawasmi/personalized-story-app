/**
 * Shared status → color mapping used by StoriesFilterBar chips and StoryRow
 * status chips. Centralised here to prevent color drift between the two.
 */
import type { StoryStatus } from "../../types/story";
import { COLORS } from "../../theme";

export interface StatusColor {
  filledBg: string;
  filledText: string;
  outlinedBorder: string;
  outlinedText: string;
}

export const STATUS_CHIP_COLORS: Record<StoryStatus | "all", StatusColor> = {
  all: {
    filledBg: COLORS.primary,
    filledText: " #fff",
    outlinedBorder: COLORS.border,
    outlinedText: COLORS.textSecondary,
  },
  draft_brief: {
    filledBg: " #9E9E9E",
    filledText: " #fff",
    outlinedBorder: "#BDBDBD",
    outlinedText: "#757575",
  },
  generating: {
    filledBg: " #42A5F5",
    filledText: "#fff",
    outlinedBorder: "#90CAF9",
    outlinedText: "#1565C0",
  },
  awaiting_review: {
    filledBg: " #ED9B40",
    filledText: "#fff",
    outlinedBorder: "#FFCC80",
    outlinedText: "#E65100",
  },
  in_review: {
    filledBg: "# 5C8FC4",
    filledText: "#fff",
    outlinedBorder: "#90CAF9",
    outlinedText: "#1565C0",
  },
  needs_revision: {
    filledBg: " #EF9A9A",
    filledText: "#fff",
    outlinedBorder: "#FFCDD2",
    outlinedText: "#C62828",
  },
  approved: {
    filledBg: " #66BB6A",
    filledText: "#fff",
    outlinedBorder: "#A5D6A7",
    outlinedText: "#2E7D32",
  },
  published: {
    filledBg: " #26A69A",
    filledText: "#fff",
    outlinedBorder: "#80CBC4",
    outlinedText: "#00695C",
  },
  archived: {
    filledBg: " #BDBDBD",
    filledText: "#fff",
    outlinedBorder: "#E0E0E0",
    outlinedText: "#9E9E9E",
  },
};
