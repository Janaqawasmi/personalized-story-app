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
