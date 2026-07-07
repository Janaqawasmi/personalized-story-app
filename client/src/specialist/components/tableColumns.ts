// Percentage column widths shared by StoriesTable's header row and StoryRow's
// body cells. Percentages (rather than fixed px) + `tableLayout: "fixed"`
// guarantee the table always fits its container — no column combination can
// force horizontal overflow, on any screen width or RTL/LTR direction.
export const TABLE_COLUMN_WIDTHS = {
  story: "27%",
  progress: "15%",
  topicAge: "13%",
  status: "12%",
  lastUpdate: "13%",
  action: "16%",
  menu: "4%",
} as const;
