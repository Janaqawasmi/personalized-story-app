// client/src/specialist/components/HistoryTab.tsx
//
// Renders the chronological event log from story.editHistory,
// grouped by day, most recent first.

import React from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

import type { EditHistoryEntry, Story, StoryStatus } from "../../types/story";
import { COLORS } from "../../theme";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface HistoryTabProps {
  story: Story;
}

// ---------------------------------------------------------------------------
// Status label map (mirrors StoryRow)
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<StoryStatus, string> = {
  draft_brief: "Brief in progress",
  generating: "Generating",
  awaiting_review: "Awaiting review",
  in_review: "In review",
  needs_revision: "Needs revision",
  approved: "Approved",
  prompt_review: "Image prompt review",
  illustrating: "Illustrating",
  illustration_review: "Illustration review",
  illustration_ready: "Illustration ready",
  published: "Published",
  archived: "Archived",
};

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function startOfDay(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(dateKey: string, todayKey: string, yesterdayKey: string): string {
  if (dateKey === todayKey) return "Today";
  if (dateKey === yesterdayKey) return "Yesterday";

  // Reconstruct a display date from the key (year-month0indexed-day)
  const [year, month0, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month0, day);
  const currentYear = new Date().getFullYear();
  const options: Intl.DateTimeFormatOptions =
    year !== currentYear
      ? { month: "short", day: "numeric", year: "numeric" }
      : { month: "short", day: "numeric" };
  return date.toLocaleDateString(undefined, options);
}

// ---------------------------------------------------------------------------
// Event description renderer
// ---------------------------------------------------------------------------

function EntryDescription({ entry }: { entry: EditHistoryEntry }) {
  const { event } = entry;

  const timeStr = new Date(entry.at).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  let mainLabel: string;
  let feedbackText: string | null = null;

  switch (event.kind) {
    case "draft_created":
      mainLabel = "Story created";
      break;

    case "brief_submitted":
      mainLabel = "Brief submitted";
      break;

    case "agent1_generated":
      mainLabel = `AI drafted story (v${event.version})${event.succeeded ? "" : " — failed"}`;
      break;

    case "regeneration_requested":
      mainLabel = "Regeneration requested";
      feedbackText = event.feedback;
      break;

    case "status_changed":
      mainLabel = `Status changed: ${STATUS_LABELS[event.from]} → ${STATUS_LABELS[event.to]}`;
      break;

    case "draft_edited":
      mainLabel = `Story edited (${event.snapshot.wordCount} words)`;
      break;

    case "archived":
      mainLabel = "Story archived";
      break;

    case "restored":
      mainLabel = "Story restored";
      break;

    default:
      mainLabel = "Unknown event";
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 2 }}>
        <Typography
          variant="body2"
          component="span"
          sx={{
            fontVariantNumeric: "tabular-nums",
            color: COLORS.textSecondary,
            minWidth: "3.5rem",
            flexShrink: 0,
          }}
        >
          {timeStr}
        </Typography>
        <Typography
          variant="body2"
          component="span"
          sx={{ color: COLORS.textPrimary }}
        >
          {mainLabel}
        </Typography>
      </Box>

      {feedbackText && (
        <Typography
          variant="caption"
          sx={{
            ml: "5.5rem",
            fontStyle: "italic",
            color: COLORS.textSecondary,
          }}
        >
          "{feedbackText}"
        </Typography>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function HistoryTab({ story }: HistoryTabProps) {
  const { editHistory } = story;

  // Empty state
  if (!editHistory || editHistory.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 4,
          mt: 2,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 2,
          bgcolor: COLORS.surface,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No activity yet.
        </Typography>
      </Paper>
    );
  }

  // Sort descending by `at`
  const sorted = [...editHistory].sort((a, b) => b.at - a.at);

  // Day key helpers
  const now = Date.now();
  const todayKey = startOfDay(now);
  const yesterdayKey = startOfDay(now - 86_400_000);

  // Group into ordered list of { dateKey, entries[] }
  const groups: { dateKey: string; entries: EditHistoryEntry[] }[] = [];
  const keyIndex: Record<string, number> = {};

  for (const entry of sorted) {
    const key = startOfDay(entry.at);
    if (keyIndex[key] === undefined) {
      keyIndex[key] = groups.length;
      groups.push({ dateKey: key, entries: [] });
    }
    groups[keyIndex[key]].entries.push(entry);
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        mt: 2,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 2,
        bgcolor: COLORS.surface,
      }}
    >
      {groups.map((group, groupIdx) => (
        <Box key={group.dateKey} sx={{ mt: groupIdx === 0 ? 0 : 3 }}>
          {/* Day header */}
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ mb: 1.5 }}
          >
            {dayLabel(group.dateKey, todayKey, yesterdayKey)}
          </Typography>

          {/* Entries */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
            {group.entries.map((entry) => (
              <EntryDescription key={entry.id} entry={entry} />
            ))}
          </Box>
        </Box>
      ))}
    </Paper>
  );
}
