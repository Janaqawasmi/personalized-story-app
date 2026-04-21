import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import type { Agent1Result } from "../../../types/agent1Result";
import { COLORS } from "../../../theme";
import { formatRelativeTime } from "../StoryRow";
import { MAX_VERSIONS } from "./shared";
import { DRAFT_B, FONTS } from "./tokens";

/** Git-branch style icon (matches Direction B mock). */
function BranchGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      style={{ color: DRAFT_B.inkMuted, transform: "rotate(90deg)", flexShrink: 0 }}
    >
      <path
        d="M6 3v12M18 9v3a2 2 0 01-2 2H6M18 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM18 15a3 3 0 100 6 3 3 0 000-6z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
}: VersionTimelineProps) {
  const [min, max] = targetRange;
  const outOfRange = wordCount < min || wordCount > max;

  return (
    <Box
      sx={{
        px: { xs: 0, md: 0 },
        py: 1.75,
        mb: 2,
        bgcolor: DRAFT_B.cream,
        borderBottom: `1px solid ${DRAFT_B.border}`,
        display: "flex",
        alignItems: "center",
        gap: 2,
        flexWrap: "wrap",
        fontFamily: FONTS.sans,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
        <BranchGlyph />
        <Typography
          sx={{
            fontSize: "11.5px",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: DRAFT_B.inkMuted,
          }}
        >
          Versions
        </Typography>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", flex: 1, gap: 0, flexWrap: "wrap", minWidth: 0 }}>
        {versions.map((version, i) => {
          const isLatest = i === versions.length - 1;
          const sel = i === selectedIndex;
          const rel = formatRelativeTime(new Date(version.generatedAt).getTime());
          const titleTop =
            i === 0 ? "First draft" : isLatest ? "Current revision" : `Revision ${i}`;
          const subtitleLine = isLatest ? `${rel} · current` : rel;

          return (
            <React.Fragment key={version.generationId ?? i}>
              {i > 0 && (
                <Box
                  sx={{
                    width: 40,
                    height: "1px",
                    bgcolor: DRAFT_B.border,
                    flexShrink: 0,
                    alignSelf: "center",
                  }}
                />
              )}
              <button
                type="button"
                onClick={() => onSelect(i)}
                style={{
                  padding: "6px 14px 6px 10px",
                  borderRadius: 999,
                  background: sel ? COLORS.primary : "#fff",
                  border: `1px solid ${sel ? COLORS.primary : DRAFT_B.border}`,
                  color: sel ? "#fff" : DRAFT_B.inkSoft,
                  cursor: "pointer",
                  fontFamily: FONTS.sans,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: sel ? "rgba(255,255,255,0.22)" : DRAFT_B.primarySoft,
                    color: sel ? "#fff" : COLORS.primaryDark,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  v{i + 1}
                </span>
                <span style={{ fontSize: 11.5, fontWeight: 600, textAlign: "left" }}>
                  <span style={{ display: "block" }}>{titleTop}</span>
                  <span style={{ fontSize: 10, opacity: 0.75, fontWeight: 500 }}>{subtitleLine}</span>
                </span>
              </button>
            </React.Fragment>
          );
        })}

        {versions.length < MAX_VERSIONS && (
          <>
            <Box
              sx={{
                width: 40,
                height: "1px",
                bgcolor: DRAFT_B.border,
                borderTop: `1px dashed ${DRAFT_B.border}`,
                flexShrink: 0,
                alignSelf: "center",
              }}
            />
            <Typography
              component="span"
              sx={{
                padding: "6px 12px",
                borderRadius: 999,
                border: `1px dashed ${DRAFT_B.border}`,
                color: DRAFT_B.inkMuted,
                fontSize: "11.5px",
                fontWeight: 500,
                fontStyle: "italic",
              }}
            >
              v{versions.length + 1} available via Regenerate
            </Typography>
          </>
        )}
      </Box>

      <Typography
        sx={{
          fontSize: "12px",
          color: outOfRange ? COLORS.error : DRAFT_B.inkMuted,
          fontWeight: outOfRange ? 600 : 500,
          flexShrink: 0,
          ml: { xs: 0, md: "auto" },
        }}
      >
        {wordCount} words · target {min}–{max}
      </Typography>
    </Box>
  );
}
