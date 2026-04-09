// client/src/components/brief/ComplexityMeter.tsx
//
// Live story-load meter (spec §21 — Complexity Handling UI, Layer 1 + Layer 2).
// Pure calculation from `calculateComplexityLoad`; sticky bar for passive awareness.

import React, { useCallback, useMemo, useState } from "react";
import {
  Box,
  Button,
  Collapse,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material";
import { COLORS } from "../../theme";
import type { CompleteBrief, StoryLength } from "../../types/storyBrief";
import { STORY_LENGTH_DEFAULT } from "../../types/storyBrief";
import { calculateComplexityLoad, type ComplexityLoadState } from "../../services/complexityBudget";
import { useComplexitySignals } from "../../services/complexitySignalTracker";
import { useStoryBriefUi } from "../../i18n/storyBriefUi";
import { Z_INDEX_COMPLEXITY_METER } from "../../constants/zIndex";

const BRIEF_COLUMN_MAX_PX = 840;

const STORY_LENGTH_ORDER: StoryLength[] = ["short", "standard", "extended"];

function nextStoryLength(current: StoryLength): StoryLength | null {
  const i = STORY_LENGTH_ORDER.indexOf(current);
  if (i < 0 || i >= STORY_LENGTH_ORDER.length - 1) return null;
  return STORY_LENGTH_ORDER[i + 1]!;
}

function barColorForState(state: ComplexityLoadState, warningMain: string): string {
  switch (state) {
    case "green":
      return COLORS.success;
    case "yellow":
      return warningMain;
    case "red":
      return COLORS.error;
    default:
      return COLORS.primary;
  }
}

export interface ComplexityMeterProps {
  /** Current brief draft; updates recompute load. */
  brief: CompleteBrief;
  /** Called when the psychologist accepts a longer story length (Layer 2). */
  onLengthChange?: (next: StoryLength) => void;
}

export default function ComplexityMeter({ brief, onLengthChange }: ComplexityMeterProps) {
  const theme = useTheme();
  const ui = useStoryBriefUi();
  const { markLengthBumpAcknowledged } = useComplexitySignals();
  const warningMain = theme.palette.warning.main;

  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const expanded = hovered || pinned;

  const load = useMemo(() => calculateComplexityLoad(brief), [brief]);

  const ageRange = brief.section1.ageRange ?? "3-5";
  const storyLength = brief.section1.storyLength ?? STORY_LENGTH_DEFAULT;
  const ageLabel = ui.AGE_RANGE_LABELS[ageRange];
  const lengthLabel = ui.STORY_LENGTH_LABELS[storyLength];

  const fillRatio = useMemo(() => {
    const max = load.budget.max;
    if (max <= 0) return 0;
    return Math.min(Math.max(load.totalPageCost / max, 0), 1);
  }, [load.budget.max, load.totalPageCost]);

  // Bar color must reflect the spec thresholds (min triggers warning; max is hard cap).
  // Keep the rest of the UI logic on `load.state` unchanged.
  const barState: ComplexityLoadState = useMemo(() => {
    const pages = load.totalPageCost;
    const { min, max } = load.budget;
    if (pages <= min) return "green";
    if (pages < max) return "yellow";
    return "red";
  }, [load.budget, load.totalPageCost]);

  const barColor = barColorForState(barState, warningMain);

  const minTickPct = useMemo(() => {
    const { min, max } = load.budget;
    if (max <= 0) return 0;
    return Math.min(Math.max(min / max, 0), 1) * 100;
  }, [load.budget]);

  const zone1Pct = useMemo(() => {
    const pages = load.totalPageCost;
    const { min, max } = load.budget;
    if (max <= 0) return 0;
    const z1 = Math.min(Math.max(pages, 0), min);
    return (z1 / max) * 100;
  }, [load.budget, load.totalPageCost]);

  const zone2Pct = useMemo(() => {
    const pages = load.totalPageCost;
    const { min, max } = load.budget;
    if (max <= 0) return 0;
    const capped = Math.min(Math.max(pages, 0), max);
    const z2 = Math.max(capped - min, 0);
    return (z2 / max) * 100;
  }, [load.budget, load.totalPageCost]);

  const nextLen = nextStoryLength(storyLength);
  const showLengthBump =
    expanded && (load.state === "yellow" || load.state === "red") && !!onLengthChange;

  const togglePinned = useCallback(() => {
    setPinned((p) => !p);
  }, []);

  const handleMouseEnter = useCallback(() => setHovered(true), []);
  const handleMouseLeave = useCallback(() => setHovered(false), []);

  return (
    <Paper
      elevation={8}
      component="aside"
      aria-label={ui.complexityMeterAria(expanded)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      sx={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        /* Below MUI Snackbar (1400) so save/submit toasts stay visible */
        zIndex: Z_INDEX_COMPLEXITY_METER,
        borderRadius: 0,
        borderTop: `1px solid ${COLORS.border}`,
        backgroundColor: COLORS.surface,
        boxShadow: "0 -8px 32px rgba(97, 120, 145, 0.12)",
        maxHeight: expanded ? "min(70vh, 520px)" : undefined,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: BRIEF_COLUMN_MAX_PX,
          mx: "auto",
          px: { xs: 2, sm: 2.5 },
          py: expanded ? { xs: 1.5, sm: 2 } : { xs: 1.25, sm: 1.5 },
          boxSizing: "border-box",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          component="div"
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          onClick={togglePinned}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              togglePinned();
            }
          }}
          sx={{
            mb: expanded ? 1.25 : 0,
            cursor: "pointer",
            borderRadius: 1,
            outline: "none",
            "&:focus-visible": { boxShadow: `0 0 0 2px ${COLORS.primary}` },
          }}
        >
          <Typography
            component="span"
            variant="subtitle2"
            sx={{ fontWeight: 800, color: COLORS.textPrimary, flexShrink: 0 }}
          >
            {ui.complexityMeterTitle}
          </Typography>
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                direction: "ltr",
                position: "relative",
                display: "flex",
                height: 10,
                borderRadius: 5,
                bgcolor: "rgba(97, 120, 145, 0.12)",
                overflow: "hidden",
              }}
            >
              {/* budget.min tick (recommended limit), positioned on the max-denominator scale */}
              <Box
                sx={{
                  position: "absolute",
                  left: `${minTickPct}%`,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  transform: "translateX(-1px)",
                  bgcolor: "rgba(255,255,255,0.7)",
                  zIndex: 1,
                  pointerEvents: "none",
                }}
              />
              <Box
                sx={{
                  width: `${Math.min(zone1Pct, 100)}%`,
                  height: "100%",
                  bgcolor: barColor,
                  borderRadius: 5,
                  transition: "width 0.25s ease, background-color 0.2s ease",
                }}
              />
              {/* Zone 2 only appears once load exceeds budget.min */}
              {zone2Pct > 0 && (
                <Box
                  sx={{
                    width: `${Math.min(zone2Pct, 100)}%`,
                    height: "100%",
                    bgcolor: barColor,
                    transition: "width 0.25s ease, background-color 0.2s ease",
                  }}
                />
              )}
            </Box>
          </Box>
          <Box
            sx={{
              background: "rgba(97, 120, 145, 0.06)",
              borderRadius: 1,
              p: 0.5,
              color: COLORS.textSecondary,
              display: "flex",
              flexShrink: 0,
              pointerEvents: "none",
            }}
          >
            {expanded ? (
              <KeyboardArrowUp fontSize="small" aria-hidden />
            ) : (
              <KeyboardArrowDown fontSize="small" aria-hidden />
            )}
          </Box>
        </Stack>

        <Collapse in={expanded}>
          <Stack spacing={1.25} sx={{ pt: 0.5, pb: 0.5 }}>
            <Typography variant="caption" color={COLORS.textSecondary} sx={{ fontWeight: 600 }}>
              {ui.complexityBudgetSummary(
                load.budget.min,
                load.budget.max,
                lengthLabel,
                ageLabel,
              )}
            </Typography>

            <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2.5, listStyle: "disc" }}>
              {load.breakdown.map((row) => (
                <Typography
                  key={row.id}
                  component="li"
                  variant="body2"
                  color="text.primary"
                  sx={{ lineHeight: 1.55 }}
                >
                  {ui.complexityBreakdownLine(row.displayLabel, row.scaledCost)}
                </Typography>
              ))}
            </Stack>

            <Typography variant="body2" sx={{ fontWeight: 700, color: COLORS.primary }}>
              {ui.complexityTotalApprox(load.totalPageCost)}
            </Typography>

            {showLengthBump && (
              <Box
                sx={{
                  mt: 0.5,
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: "rgba(97, 120, 145, 0.06)",
                  border: `1px solid rgba(208, 200, 192, 0.55)`,
                }}
              >
                {nextLen ? (
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
                    <Typography variant="body2" sx={{ flex: 1, lineHeight: 1.6 }}>
                      {ui.complexityLengthBumpMessage(ui.STORY_LENGTH_LABELS[nextLen])}
                    </Typography>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      onClick={() => {
                        markLengthBumpAcknowledged();
                        onLengthChange?.(nextLen);
                      }}
                      sx={{ flexShrink: 0, fontWeight: 700 }}
                    >
                      {ui.complexityLengthBumpCta(ui.STORY_LENGTH_LABELS[nextLen])}
                    </Button>
                  </Stack>
                ) : (
                  <Typography variant="body2" color={COLORS.textSecondary}>
                    {ui.complexityLengthBumpMaxed}
                  </Typography>
                )}
              </Box>
            )}
          </Stack>
        </Collapse>
      </Box>
    </Paper>
  );
}
