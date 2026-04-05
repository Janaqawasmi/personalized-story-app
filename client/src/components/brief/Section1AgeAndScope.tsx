// client/src/components/brief/Section1AgeAndScope.tsx
//
// Story Brief — Section 1: Age & Story Scope
//
// Three fields in spec order (1.1 → 1.2 → 1.3):
//   1.1  Target age range         — single-select, 4 options
//   1.2  Peak emotional intensity — single-select, 3 options + inline definition
//   1.3  Story length             — single-select, 3 options + dynamic preview string
//
// Spec: /docs/dammah-story-brief-spec-v1.2.md §3

import React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { COLORS } from "../../theme";
import BriefValidationSummary, {
  type BriefMissingField,
} from "./BriefValidationSummary";
import {
  AGE_RANGES,
  AGE_RANGE_LABELS,
  PEAK_INTENSITIES,
  PEAK_INTENSITY_LABELS,
  PEAK_INTENSITY_DEFINITIONS,
  STORY_LENGTHS,
  STORY_LENGTH_DEFAULT,
  STORY_LENGTH_LABELS,
  STORY_LENGTH_PREVIEWS,
  WARN_SIGNIFICANT_YOUNG_AGE,
  type AgeAndScope,
  type AgeRange,
  type PeakIntensity,
  type StoryLength,
} from "../../types/storyBrief";

// ============================================================================
// Style tokens
// ============================================================================

const CARD_SELECTED_BG = "#EEF2F5";   // very light tint of COLORS.primary
const CARD_UNSELECTED_BG = COLORS.surface;

// ============================================================================
// Props
// ============================================================================

interface Props {
  /** Current field values. Partial — fields may be unset when first opened. */
  value: Partial<AgeAndScope>;
  /** Called whenever any field changes; merges the update into parent state. */
  onChange: (updates: Partial<AgeAndScope>) => void;
  /** Called when the psychologist clicks "Save & continue". */
  onContinue: () => void;
  /** Optional — renders a Back button when provided. */
  onBack?: () => void;
}

// ============================================================================
// Sub-components
// ============================================================================

// ---------------------------------------------------------------------------
// FieldGroup — labelled block shared by all three fields
// ---------------------------------------------------------------------------

interface FieldGroupProps {
  id: string;
  label: string;
  children: React.ReactNode;
}

function FieldGroup({ id, label, children }: FieldGroupProps) {
  return (
    <Box component="fieldset" aria-labelledby={id} sx={{ border: "none", p: 0, m: 0 }}>
      <Typography
        component="legend"
        id={id}
        variant="body1"
        fontWeight={600}
        mb={0.5}
        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
      >
        {label}
        <Typography
          component="span"
          aria-hidden="true"
          color={COLORS.secondary}
          fontWeight={700}
        >
          *
        </Typography>
      </Typography>
      {children}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// OptionCard — clickable card representing a single-select option
// ---------------------------------------------------------------------------

interface OptionCardProps {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  /** Grow to fill available horizontal space. */
  flex?: boolean;
  /** Minimum width used in horizontal layouts. */
  minWidth?: number | string;
  /** For screen readers. */
  ariaLabel?: string;
}

function OptionCard({
  selected,
  onClick,
  children,
  flex,
  minWidth,
  ariaLabel,
}: OptionCardProps) {
  return (
    <Card
      elevation={0}
      aria-pressed={selected}
      aria-label={ariaLabel}
      sx={{
        flex: flex ? 1 : undefined,
        minWidth: minWidth ?? undefined,
        border: selected
          ? `2px solid ${COLORS.primary}`
          : `1px solid ${COLORS.border}`,
        backgroundColor: selected ? CARD_SELECTED_BG : CARD_UNSELECTED_BG,
        borderRadius: 2,
        transition: "border-color 0.15s ease, background-color 0.15s ease",
        "&:hover": { borderColor: COLORS.primary },
      }}
    >
      <CardActionArea
        onClick={onClick}
        disableRipple
        sx={{ p: 0, height: "100%", display: "flex", alignItems: "stretch" }}
      >
        {children}
      </CardActionArea>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// SelectedDot — visual selection indicator
// ---------------------------------------------------------------------------

function SelectedDot({ selected }: { selected: boolean }) {
  return (
    <Box
      aria-hidden="true"
      sx={{
        width: 16,
        height: 16,
        borderRadius: "50%",
        flexShrink: 0,
        border: `2px solid ${selected ? COLORS.primary : COLORS.border}`,
        backgroundColor: selected ? COLORS.primary : "transparent",
        transition: "all 0.15s ease",
      }}
    />
  );
}

// ============================================================================
// Main component
// ============================================================================

export default function Section1AgeAndScope({
  value,
  onChange,
  onContinue,
  onBack,
}: Props) {
  // Derive the current story length, defaulting to "standard" per spec
  const ageRange = value.ageRange ?? null;
  const peakIntensity = value.peakIntensity ?? null;
  const storyLength = value.storyLength ?? STORY_LENGTH_DEFAULT;

  // Cross-field warning: significant + ages 3–5 (spec Section 8, rule #2)
  const showIntensityWarning =
    peakIntensity === "significant" && ageRange === "3-5";

  // Preview string for the currently selected age × length combination
  const lengthPreview: string | null =
    ageRange !== null
      ? STORY_LENGTH_PREVIEWS[ageRange][storyLength]
      : null;

  const isComplete = ageRange !== null && peakIntensity !== null;

  const missingFields: BriefMissingField[] = [];
  if (ageRange === null) {
    missingFields.push({ label: "Target age range", targetId: "field-1-1-label" });
  }
  if (peakIntensity === null) {
    missingFields.push({ label: "Peak emotional intensity", targetId: "field-1-2-label" });
  }

  function handleAgeRange(v: AgeRange) {
    onChange({ ageRange: v });
  }

  function handlePeakIntensity(v: PeakIntensity) {
    onChange({ peakIntensity: v });
  }

  function handleStoryLength(v: StoryLength) {
    onChange({ storyLength: v });
  }

  function handleContinue() {
    if (isComplete) onContinue();
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <Box>
      {/* ── Section header ─────────────────────────────────────────────── */}
      <Box mb={4}>
        <Typography
          variant="overline"
          display="block"
          color={COLORS.textSecondary}
          letterSpacing={1}
          mb={0.5}
        >
          Section 1 of 5
        </Typography>
        <Typography variant="h5" fontWeight={700} mb={0.75}>
          Age & Story Scope
        </Typography>
        <Typography variant="body2" color={COLORS.textSecondary} maxWidth={560}>
          Age range governs language complexity, coping tool appropriateness, and structural
          parameters. Set the scope before designing the clinical content.
        </Typography>
      </Box>

      <Stack spacing={4}>
        {/* ═══════════════════════════════════════════════════════════════
            Field 1.1 — Target Age Range
        ═══════════════════════════════════════════════════════════════ */}
        <FieldGroup id="field-1-1-label" label="Target age range">
          <Box
            display="grid"
            gridTemplateColumns="repeat(4, 1fr)"
            gap={1.5}
            sx={{ "@media (max-width: 480px)": { gridTemplateColumns: "repeat(2, 1fr)" } }}
          >
            {AGE_RANGES.map((range) => {
              const selected = ageRange === range;
              return (
                <OptionCard
                  key={range}
                  selected={selected}
                  onClick={() => handleAgeRange(range)}
                  ariaLabel={`Age range ${AGE_RANGE_LABELS[range]}`}
                >
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    gap={1}
                    px={2}
                    py={2}
                    width="100%"
                  >
                    <SelectedDot selected={selected} />
                    <Typography
                      fontWeight={selected ? 700 : 500}
                      fontSize="1.05rem"
                      color={selected ? COLORS.primary : COLORS.textPrimary}
                    >
                      {AGE_RANGE_LABELS[range]}
                    </Typography>
                  </Box>
                </OptionCard>
              );
            })}
          </Box>
        </FieldGroup>

        <Divider />

        {/* ═══════════════════════════════════════════════════════════════
            Field 1.2 — Peak Emotional Intensity
        ═══════════════════════════════════════════════════════════════ */}
        <FieldGroup id="field-1-2-label" label="Peak emotional intensity">
          <Typography variant="caption" color={COLORS.textSecondary} display="block" mb={1.5}>
            Sets how distressed the protagonist becomes before the resolution.
          </Typography>
          <Stack spacing={1.25}>
            {PEAK_INTENSITIES.map((intensity) => {
              const selected = peakIntensity === intensity;
              return (
                <OptionCard
                  key={intensity}
                  selected={selected}
                  onClick={() => handlePeakIntensity(intensity)}
                  ariaLabel={PEAK_INTENSITY_LABELS[intensity]}
                >
                  <Box display="flex" alignItems="flex-start" gap={1.5} px={2.5} py={2} width="100%">
                    <Box pt={0.25}>
                      <SelectedDot selected={selected} />
                    </Box>
                    <Box>
                      <Typography
                        fontWeight={selected ? 700 : 600}
                        color={selected ? COLORS.primary : COLORS.textPrimary}
                        mb={0.25}
                      >
                        {PEAK_INTENSITY_LABELS[intensity]}
                      </Typography>
                      <Typography variant="body2" color={COLORS.textSecondary} lineHeight={1.5}>
                        {PEAK_INTENSITY_DEFINITIONS[intensity]}
                      </Typography>
                    </Box>
                  </Box>
                </OptionCard>
              );
            })}
          </Stack>

          {/* Inline cross-field warning: significant + ages 3–5 */}
          {showIntensityWarning && (
            <Alert
              severity="warning"
              sx={{
                mt: 1.5,
                borderRadius: 2,
                "& .MuiAlert-message": { fontSize: "0.875rem" },
              }}
            >
              <Typography variant="body2" fontWeight={600} mb={0.25}>
                Significant intensity with ages 3–5
              </Typography>
              <Typography variant="body2">{WARN_SIGNIFICANT_YOUNG_AGE}</Typography>
              <Typography variant="caption" color="text.secondary" display="block" mt={0.75}>
                You can continue, but you will need to acknowledge this before submitting the brief.
              </Typography>
            </Alert>
          )}
        </FieldGroup>

        <Divider />

        {/* ═══════════════════════════════════════════════════════════════
            Field 1.3 — Story Length
        ═══════════════════════════════════════════════════════════════ */}
        <FieldGroup id="field-1-3-label" label="Story length">
          <Typography variant="caption" color={COLORS.textSecondary} display="block" mb={1.5}>
            Affects the available page budget. Default is Standard.
          </Typography>
          <Box display="flex" gap={1.5} sx={{ "@media (max-width: 480px)": { flexDirection: "column" } }}>
            {STORY_LENGTHS.map((length) => {
              const selected = storyLength === length;
              return (
                <OptionCard
                  key={length}
                  selected={selected}
                  onClick={() => handleStoryLength(length)}
                  flex
                  ariaLabel={STORY_LENGTH_LABELS[length]}
                >
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    gap={0.75}
                    px={2}
                    py={2}
                    width="100%"
                  >
                    <SelectedDot selected={selected} />
                    <Typography
                      fontWeight={selected ? 700 : 500}
                      color={selected ? COLORS.primary : COLORS.textPrimary}
                    >
                      {STORY_LENGTH_LABELS[length]}
                    </Typography>
                  </Box>
                </OptionCard>
              );
            })}
          </Box>

          {/* Dynamic preview string — shows once age range is selected */}
          <Box
            mt={1.5}
            px={2}
            py={1.25}
            sx={{
              borderRadius: 2,
              backgroundColor: lengthPreview ? CARD_SELECTED_BG : COLORS.background,
              border: `1px solid ${lengthPreview ? COLORS.border : "transparent"}`,
              minHeight: 44,
              display: "flex",
              alignItems: "center",
            }}
          >
            {lengthPreview ? (
              <Typography variant="body2" color={COLORS.textSecondary} fontStyle="italic">
                {lengthPreview}
              </Typography>
            ) : (
              <Typography variant="body2" color={COLORS.border}>
                Select an age range above to see story details.
              </Typography>
            )}
          </Box>
        </FieldGroup>

        <BriefValidationSummary missing={missingFields} />

        {/* ── Navigation ─────────────────────────────────────────────────── */}
        <Box
          pt={2}
          display="flex"
          alignItems="center"
          justifyContent={onBack ? "space-between" : "flex-end"}
          sx={{ borderTop: `1px solid ${COLORS.border}` }}
        >
          {onBack && (
            <Button
              variant="text"
              onClick={onBack}
              sx={{ color: COLORS.textSecondary, textTransform: "none" }}
            >
              ← Back
            </Button>
          )}
          <Button
            variant="contained"
            onClick={handleContinue}
            disabled={!isComplete}
            sx={{
              px: 4,
              py: 1.25,
              backgroundColor: COLORS.primary,
              fontWeight: 600,
              textTransform: "none",
              "&:hover": { backgroundColor: COLORS.secondary },
              "&:disabled": { opacity: 0.45 },
            }}
          >
            Save & continue →
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
