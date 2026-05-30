/**
 * VersionTimeline — renders the three inline sections of the version strip.
 * This component is a fragment; the cream strip Box lives in DraftTabB.
 */
import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import type { Agent1Result } from "../../../types/agent1Result";
import { useLanguage } from "../../../i18n/context/useLanguage";
import {
  dateLocaleForLang,
  formatRelativeTimeMs,
} from "../../../i18n/specialistRelativeTime";
import { useSpecialistDeskUi } from "../../../i18n/specialistDeskUi";
import { COLORS } from "../../../theme";
import { MAX_VERSIONS } from "./shared";
import { DRAFT_B, FONTS } from "./tokens";

function BranchGlyph() {
  return (
    <svg
      width={14}
      height={14}
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
  /** Index of the version backing the working draft (gets the "current" marker). */
  currentVersionIndex?: number;
}

export default function VersionTimeline({
  versions,
  selectedIndex,
  onSelect,
  wordCount,
  targetRange,
  currentVersionIndex,
}: VersionTimelineProps) {
  const desk = useSpecialistDeskUi();
  const { language } = useLanguage();
  const [min, max] = targetRange;
  // Match the server's drift band (output-parser computeDrift): flag red only
  // below min * 0.7 or above max * 1.3, not at the strict range edges.
  const outOfRange = wordCount < min * 0.7 || wordCount > max * 1.3;

  return (
    <>
      {/* Branch icon + "VERSIONS" label */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexShrink: 0 }}>
        <BranchGlyph />
        <Typography
          sx={{
            fontSize: "11.5px",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: DRAFT_B.inkMuted,
            fontFamily: FONTS.sans,
          }}
        >
          Versions
        </Typography>
      </Box>

      {/* Pills row */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flex: 1,
          gap: 0,
          flexWrap: "wrap",
          minWidth: 0,
        }}
      >
        {versions.map((version, i) => {
          const isLatest = i === versions.length - 1;
          const sel = i === selectedIndex;
          const rel = formatRelativeTimeMs(
            new Date(version.generatedAt).getTime(),
            desk,
            dateLocaleForLang(language),
          );
          const modelLabel = version.modelLabel ?? "Sonnet 4.6";
          const titleTop = `v${i + 1} · ${modelLabel}`;
          const isCurrent =
            currentVersionIndex != null ? i === currentVersionIndex : isLatest;
          const subtitleLine = isCurrent ? `${rel} · current` : rel;

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
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    textAlign: "left",
                  }}
                >
                  <span style={{ display: "block" }}>{titleTop}</span>
                  <span style={{ fontSize: 10, opacity: 0.75, fontWeight: 500 }}>
                    {subtitleLine}
                  </span>
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
                flexShrink: 0,
                alignSelf: "center",
                borderTop: `1px dashed ${DRAFT_B.border}`,
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
                fontFamily: FONTS.sans,
              }}
            >
              v{versions.length + 1} available
            </Typography>
          </>
        )}
      </Box>

      {/* Word count */}
      <Typography
        sx={{
          fontSize: "11px",
          color: outOfRange ? COLORS.error : DRAFT_B.inkMuted,
          fontWeight: outOfRange ? 600 : 500,
          flexShrink: 0,
          fontFamily: FONTS.sans,
        }}
      >
        {wordCount} words · target {min}–{max}
      </Typography>
    </>
  );
}
