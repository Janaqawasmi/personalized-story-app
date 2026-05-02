// client/src/components/brief/ComplexityMeter.tsx
//
// Live story-load meter (spec §21 — Complexity Handling UI, Layer 1 + Layer 2).
// Collapsed: white surface chip with title + slim gauge; details in a Popper on hover; click toggles pin.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Fade, Paper, Popper, Stack, Typography, useTheme } from "@mui/material";
import { COLORS } from "../../theme";
import type { CompleteBrief, StoryLength } from "../../types/storyBrief";
import { STORY_LENGTH_DEFAULT } from "../../types/storyBrief";
import { calculateComplexityLoad, type ComplexityLoadState } from "../../services/complexityBudget";
import { useComplexitySignals } from "../../services/complexitySignalTracker";
import { useStoryBriefUi } from "../../i18n/storyBriefUi";
const BRIEF_COLUMN_MAX_PX = 840;

const STORY_LENGTH_ORDER: StoryLength[] = ["short", "standard", "extended"];

/** Collapsed: slim horizontal bar; expanded panel uses a thicker reference bar. */
const TRACK_H_COLLAPSED_PX = 8;
const TRACK_H_EXPANDED_PX = 14;

const HOVER_CLOSE_MS = 280;

/** Left = 0 load, right = max (direction: ltr so fill matches §16 regardless of page RTL). */
function HorizontalLoadTrack({
  minTickPct,
  fillRatio,
  barColor,
  heightPx,
}: {
  minTickPct: number;
  fillRatio: number;
  barColor: string;
  heightPx: number;
}) {
  const pct = Math.min(Math.max(fillRatio * 100, 0), 100);
  const fillFull = pct >= 99.5;
  const radius = Math.max(2, heightPx / 2);

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height: heightPx,
        borderRadius: `${radius}px`,
        bgcolor: "rgba(97, 120, 145, 0.12)",
        overflow: "hidden",
        direction: "ltr",
      }}
      aria-hidden
    >
      {/* budget.min tick (recommended limit), same scale as §16 */}
      <Box
        sx={{
          position: "absolute",
          left: `${minTickPct}%`,
          top: 0,
          bottom: 0,
          width: 2,
          transform: "translateX(-50%)",
          bgcolor: "rgba(255,255,255,0.7)",
          zIndex: 1,
          pointerEvents: "none",
          boxShadow: "0 0 0 1px rgba(97,120,145,0.12)",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: `${pct}%`,
          bgcolor: barColor,
          borderRadius: fillFull ? `${radius}px` : `${radius}px 0 0 ${radius}px`,
          transition: "width 0.25s ease, background-color 0.2s ease",
        }}
      />
    </Box>
  );
}

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

export default function ComplexityMeter({
  brief,
  onLengthChange,
}: ComplexityMeterProps) {
  const theme = useTheme();
  const ui = useStoryBriefUi();
  const { markLengthBumpAcknowledged } = useComplexitySignals();
  const warningMain = theme.palette.warning.main;

  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const pinnedRef = useRef(false);
  useEffect(() => {
    pinnedRef.current = pinned;
  }, [pinned]);
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

  // Use engine-computed state so UI color can never diverge from the shared §16 logic.
  const barColor = barColorForState(load.state, warningMain);

  const minTickPct = useMemo(() => {
    const { min, max } = load.budget;
    if (max <= 0) return 0;
    return Math.min(Math.max(min / max, 0), 1) * 100;
  }, [load.budget]);

  const nextLen = nextStoryLength(storyLength);
  const showLengthBump =
    expanded && (load.state === "yellow" || load.state === "red") && !!onLengthChange;

  const togglePinned = useCallback(() => {
    setPinned((p) => !p);
  }, []);

  const leaveTimerRef = useRef<number | null>(null);

  const cancelCloseHover = useCallback(() => {
    if (leaveTimerRef.current != null) {
      window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  }, []);

  const scheduleCloseHover = useCallback(() => {
    cancelCloseHover();
    leaveTimerRef.current = window.setTimeout(() => {
      leaveTimerRef.current = null;
      if (!pinnedRef.current) setHovered(false);
    }, HOVER_CLOSE_MS);
  }, [cancelCloseHover]);

  useEffect(() => () => cancelCloseHover(), [cancelCloseHover]);

  const popperPaperRef = useRef<HTMLDivElement | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const setAnchorRef = useCallback((node: HTMLElement | null) => {
    setAnchorEl(node);
  }, []);

  useEffect(() => {
    if (!pinned) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (anchorEl?.contains(t)) return;
      if (popperPaperRef.current?.contains(t)) return;
      setPinned(false);
      setHovered(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [pinned, anchorEl]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPinned(false);
        setHovered(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [expanded]);

  const collapsedTrackH = TRACK_H_COLLAPSED_PX;
  const panelTrackH = TRACK_H_EXPANDED_PX;

  const handleDetailPointerEnter = useCallback(() => {
    cancelCloseHover();
    setHovered(true);
  }, [cancelCloseHover]);

  const detailPanel = (
    <Stack spacing={1.25} sx={{ pt: 0.25 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: COLORS.textPrimary }}>
        {ui.complexityMeterTitle}
      </Typography>
      <HorizontalLoadTrack
        minTickPct={minTickPct}
        fillRatio={fillRatio}
        barColor={barColor}
        heightPx={panelTrackH}
      />

      <Typography variant="caption" color={COLORS.textSecondary} sx={{ fontWeight: 600 }}>
        {ui.complexityBudgetSummary(load.budget.min, load.budget.max, lengthLabel, ageLabel)}
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
  );

  return (
    <>
      <Box
        ref={setAnchorRef}
        component="aside"
        aria-label={ui.complexityMeterAria(expanded)}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-haspopup="true"
        onMouseEnter={() => {
          cancelCloseHover();
          setHovered(true);
        }}
        onMouseLeave={scheduleCloseHover}
        onClick={() => togglePinned()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            togglePinned();
          }
        }}
        sx={{
          position: "relative",
          display: "block",
          width: "100%",
          mb: { xs: 2.5, md: 3 },
          cursor: "pointer",
          outline: "none",
          lineHeight: 1.2,
          "&:focus-visible": { boxShadow: `0 0 0 2px ${COLORS.primary}` },
        }}
      >
        <Paper
          elevation={0}
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" },
            justifyContent: "center",
            gap: { xs: 1.25, sm: 1.75 },
            py: 1.25,
            px: 1.75,
            bgcolor: COLORS.surface,
            borderRadius: 2,
            border: `1px solid rgba(208, 200, 192, 0.45)`,
            boxShadow: "0 2px 14px rgba(97, 120, 145, 0.08)",
            width: "100%",
            maxWidth: BRIEF_COLUMN_MAX_PX,
            boxSizing: "border-box",
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 800,
              color: COLORS.textPrimary,
              flexShrink: 0,
              alignSelf: { xs: "flex-start", sm: "center" },
            }}
          >
            {ui.complexityMeterTitle}
          </Typography>
          <Box
            sx={{
              width: "100%",
              flex: { sm: 1 },
              minWidth: { sm: 0 },
              alignSelf: { xs: "stretch", sm: "center" },
            }}
          >
            <HorizontalLoadTrack
              minTickPct={minTickPct}
              fillRatio={fillRatio}
              barColor={barColor}
              heightPx={collapsedTrackH}
            />
          </Box>
        </Paper>
      </Box>

      <Popper
        open={expanded && Boolean(anchorEl)}
        anchorEl={anchorEl}
        placement="bottom-start"
        transition
        sx={{ zIndex: theme.zIndex.modal }}
        modifiers={[{ name: "offset", options: { offset: [0, 10] } }]}
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={180}>
            <Paper
              ref={popperPaperRef}
              elevation={10}
              onMouseEnter={handleDetailPointerEnter}
              onMouseLeave={scheduleCloseHover}
              sx={{
                maxWidth: Math.min(BRIEF_COLUMN_MAX_PX, 400),
                p: 2,
                borderRadius: 2,
                border: `1px solid rgba(208, 200, 192, 0.55)`,
                bgcolor: COLORS.surface,
                maxHeight: "min(72vh, 520px)",
                overflowY: "auto",
              }}
            >
              {detailPanel}
            </Paper>
          </Fade>
        )}
      </Popper>
    </>
  );
}
