import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import type { Agent1Result } from "../../../types/agent1Result";
import { COLORS } from "../../../theme";
import { formatRelativeTime } from "../StoryRow";
import { MAX_VERSIONS } from "./shared";
import { DRAFT_B } from "./tokens";

export interface VersionTimelineProps {
  versions: Agent1Result[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  wordCount: number;
  targetRange: readonly [number, number];
  regenRemaining: number;
}

export default function VersionTimeline({
  versions,
  selectedIndex,
  onSelect,
  wordCount,
  targetRange,
  regenRemaining: _regenRemaining,
}: VersionTimelineProps) {
  const [min, max] = targetRange;
  const outOfRange = wordCount < min || wordCount > max;

  return (
    <Box sx={{ mb: 2.5, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: "10px",
            fontWeight: 600,
            textTransform: "uppercase",
            color: DRAFT_B.inkMuted,
            letterSpacing: "0.5px",
            flexShrink: 0,
          }}
        >
          Versions
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
          {versions.map((version, i) => {
            const isLatest = i === versions.length - 1;
            const selected = i === selectedIndex;
            const subtitle = isLatest
              ? "current"
              : formatRelativeTime(new Date(version.generatedAt).getTime());
            const labelTop = i === 0 ? "First draft" : `Revision ${i}`;
            return (
              <button
                key={version.generationId ?? i}
                type="button"
                onClick={() => onSelect(i)}
                style={{
                  background: selected ? COLORS.primary : "transparent",
                  color: selected ? "#fff" : DRAFT_B.inkSoft,
                  border: selected ? "none" : `1px solid ${DRAFT_B.border}`,
                  borderRadius: "8px",
                  padding: "8px 14px",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "10px", fontWeight: 700 }}>v{i + 1}</div>
                <div style={{ fontSize: "11px", fontWeight: 600 }}>{labelTop}</div>
                <div style={{ fontSize: "10px", opacity: 0.85 }}>{subtitle}</div>
              </button>
            );
          })}
          {versions.length < MAX_VERSIONS && (
            <Box
              sx={{
                border: `1px dashed ${DRAFT_B.border}`,
                borderRadius: "8px",
                padding: "8px 14px",
                opacity: 0.5,
                cursor: "default",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "10px", fontWeight: 700, color: DRAFT_B.inkSoft }}>
                v{versions.length + 1}
              </div>
              <div style={{ fontSize: "11px", color: DRAFT_B.inkMuted }}>via Regenerate</div>
            </Box>
          )}
        </Box>
      </Box>

      <Typography
        sx={{
          fontSize: "12px",
          color: outOfRange ? COLORS.error : DRAFT_B.inkMuted,
          fontWeight: outOfRange ? 600 : 400,
          flexShrink: 0,
          ml: "auto",
        }}
      >
        {wordCount} words · target {min}–{max}
      </Typography>
    </Box>
  );
}
