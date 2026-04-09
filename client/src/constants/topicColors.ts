/** Dot colors for filters and dropdowns (catalog, results pages). */
export const TOPIC_COLORS: Record<string, string> = {
  fear: "#7AB534",
  anxiety: "#6E56F0",
  confidence: "#93C11D",
  grief: "#5185FA",
  change: "#B854F0",
  anger: "#A32D2D",
  loneliness: "#D85A30",
  jealousy: "#D4537E",
  shyness: "#378ADD",
  bullying: "#E24B4A",
  friendship: "#1D9E75",
  new_sibling: "#BA7517",
  divorce: "#534AB7",
  moving_home: "#993C1D",
  hospital_visit: "#0F6E56",
  potty_training: "#639922",
  starting_school: "#854F0B",
};

export function getTopicColor(key: string | undefined): string | undefined {
  if (!key) return undefined;
  return TOPIC_COLORS[key.toLowerCase().replace(/[\s-]/g, "_")];
}

export type StoryTopic =
  | "fear"
  | "anxiety"
  | "confidence"
  | "grief"
  | "change"
  | "anger";

export interface TopicColorConfig {
  bg: string;
  color: string;
  dot: string;
  border: string;
}

/** Chip styling on featured / story grid cards (home featured section). */
export const STORY_TOPIC_TAG_STYLES: Record<StoryTopic, TopicColorConfig> = {
  fear: {
    bg: "rgba(171,117,52,0.1)",
    color: "#7a5222",
    dot: "#AB7534",
    border: "rgba(171,117,52,0.2)",
  },
  anxiety: {
    bg: "rgba(200,180,26,0.12)",
    color: "#6b5c08",
    dot: "#c9b41a",
    border: "rgba(200,180,26,0.25)",
  },
  confidence: {
    bg: "rgba(77,153,40,0.1)",
    color: "#2e5e12",
    dot: "#4d9928",
    border: "rgba(77,153,40,0.2)",
  },
  grief: {
    bg: "rgba(250,81,133,0.1)",
    color: "#8a1c42",
    dot: "#FA5185",
    border: "rgba(250,81,133,0.2)",
  },
  change: {
    bg: "rgba(214,140,26,0.12)",
    color: "#6b4408",
    dot: "#d68c1a",
    border: "rgba(214,140,26,0.25)",
  },
  anger: {
    bg: "rgba(163,45,45,0.1)",
    color: "#6b1414",
    dot: "#A32D2D",
    border: "rgba(163,45,45,0.2)",
  },
};
