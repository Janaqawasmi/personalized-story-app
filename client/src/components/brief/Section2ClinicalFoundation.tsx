// client/src/components/brief/Section2ClinicalFoundation.tsx
//
// Story Brief — Section 2: Clinical Foundation
//
// Five fields in spec order (2.1 → 2.5):
//   2.1  Emotional world of the population — free text 600 chars, clickable starter prompt
//   2.2  The specific trigger              — free text 400 chars, specificity nudge < 80 chars
//   2.3  Therapeutic intention             — completion format (two halves), inline examples
//   2.4  Clinical creative vision          — free text 400 chars
//   2.5  One true thing                    — free text 300 chars, optional
//
// Spec: /docs/dammah-story-brief-spec-v1.3.md §4

import React, { useId, useState } from "react";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import {
  Alert,
  Box,
  Button,
  Collapse,
  Divider,
  InputBase,
  Stack,
  Typography,
} from "@mui/material";
import { COLORS } from "../../theme";
import BriefValidationSummary, {
  type BriefMissingField,
} from "./BriefValidationSummary";
import {
  POPULATION_CHAR_LIMIT,
  TRIGGER_CHAR_LIMIT,
  TRIGGER_NUDGE_THRESHOLD,
  INTENTION_NUDGE_THRESHOLD,
  CREATIVE_VISION_CHAR_LIMIT,
  ONE_TRUE_THING_CHAR_LIMIT,
  type ClinicalFoundation,
  type StoryType,
} from "../../types/storyBrief";
import { useStoryBriefUi } from "../../i18n/storyBriefUi";

// ============================================================================
// Style tokens (match Section 1 palette)
// ============================================================================

const CARD_TINT = "#EEF2F5";
const SCAFFOLD_BG = "#F3F6F9";
const SCAFFOLD_BORDER = "#D6DEE8";

// ============================================================================
// Props
// ============================================================================

interface Props {
  /** Story type drives starter prompts, trigger label, and examples. */
  storyType: StoryType;
  /** Current field values. Partial — fields may be unset on first open. */
  value: Partial<ClinicalFoundation>;
  /** Called whenever any field changes; parent merges updates into its state. */
  onChange: (updates: Partial<ClinicalFoundation>) => void;
  /** Called when the psychologist clicks "Save & continue". */
  onContinue: () => void;
  /** Renders a Back button when provided. */
  onBack?: () => void;
}

// ============================================================================
// Sub-components
// ============================================================================

// ---------------------------------------------------------------------------
// FieldGroup — labelled fieldset, shared by all fields
// ---------------------------------------------------------------------------

interface FieldGroupProps {
  id: string;
  label: string;
  optional?: boolean;
  /** e.g. "(optional)" — required when `optional` is true */
  optionalSuffix?: string;
  children: React.ReactNode;
}

function FieldGroup({ id, label, optional, optionalSuffix, children }: FieldGroupProps) {
  return (
    <Box component="fieldset" aria-labelledby={id} sx={{ border: "none", p: 0, m: 0 }}>
      <Typography
        component="legend"
        id={id}
        variant="body1"
        fontWeight={600}
        mb={0.5}
        sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
      >
        {label}
        {optional ? (
          <Typography
            component="span"
            variant="caption"
            color={COLORS.textSecondary}
            fontWeight={400}
          >
            {optionalSuffix ?? "(optional)"}
          </Typography>
        ) : (
          <Typography
            component="span"
            aria-hidden="true"
            color={COLORS.secondary}
            fontWeight={700}
          >
            *
          </Typography>
        )}
      </Typography>
      {children}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// TextArea — styled textarea with character counter
// ---------------------------------------------------------------------------

interface TextAreaProps {
  id: string;
  value: string;
  onChange: (v: string) => void;
  maxChars: number;
  placeholder: string;
  minRows?: number;
  formatCounter: (used: number, max: number) => string;
}

function TextArea({ id, value, onChange, maxChars, placeholder, minRows = 4, formatCounter }: TextAreaProps) {
  const used = value.length;
  const remaining = maxChars - used;
  const nearLimit = remaining <= Math.ceil(maxChars * 0.1);

  return (
    <Box>
      <Box
        sx={{
          border: `1.5px solid ${COLORS.border}`,
          borderRadius: 2,
          backgroundColor: COLORS.surface,
          "&:focus-within": { borderColor: COLORS.primary },
          transition: "border-color 0.15s ease",
        }}
      >
        <InputBase
          id={id}
          value={value}
          onChange={(e) => {
            if (e.target.value.length <= maxChars) onChange(e.target.value);
          }}
          placeholder={placeholder}
          multiline
          minRows={minRows}
          fullWidth
          inputProps={{ "aria-label": placeholder }}
          sx={{
            px: 2,
            py: 1.5,
            fontSize: "0.9rem",
            lineHeight: 1.65,
            alignItems: "flex-start",
            "& .MuiInputBase-input": {
              color: COLORS.textPrimary,
              "&::placeholder": { color: COLORS.border, opacity: 1 },
            },
          }}
        />
      </Box>
      <Box display="flex" justifyContent="flex-end" mt={0.5}>
        <Typography
          variant="caption"
          color={nearLimit ? COLORS.secondary : COLORS.textSecondary}
          fontWeight={nearLimit ? 600 : 400}
        >
          {formatCounter(used, maxChars)}
        </Typography>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// ThinkingGuide — collapsible scaffold shown above Field 2.1 text area.
// Sub-questions are for the psychologist only — never persisted or sent to
// the agent.
// ---------------------------------------------------------------------------

interface ThinkingGuideProps {
  title: string;
  subQuestions: string[];
}

function ThinkingGuide({ title, subQuestions }: ThinkingGuideProps) {
  const [open, setOpen] = useState(false);

  return (
    <Box
      sx={{
        mb: 1.75,
        border: `1px solid ${SCAFFOLD_BORDER}`,
        borderRadius: 2,
        backgroundColor: SCAFFOLD_BG,
        overflow: "hidden",
      }}
    >
      {/* ── Trigger row ─────────────────────────────────────────────────── */}
      <Box
        component="button"
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
        sx={{
          all: "unset",
          display: "flex",
          alignItems: "center",
          width: "100%",
          cursor: "pointer",
          px: 2,
          py: 1.25,
          gap: 1,
          "&:focus-visible": { outline: `2px solid ${COLORS.primary}`, outlineOffset: -2 },
        }}
      >
        <LightbulbOutlinedIcon
          sx={{ fontSize: 18, color: COLORS.primary, flexShrink: 0 }}
        />
        <Box flex={1}>
          <Typography variant="body2" fontWeight={600} color={COLORS.primary} lineHeight={1.3}>
            {title}
          </Typography>
        </Box>
        <KeyboardArrowDownIcon
          sx={{
            fontSize: 20,
            color: COLORS.textSecondary,
            flexShrink: 0,
            transition: "transform 0.2s ease",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </Box>

      {/* ── Expanded content ────────────────────────────────────────────── */}
      <Collapse in={open}>
        <Box
          sx={{
            borderTop: `1px solid ${SCAFFOLD_BORDER}`,
            px: 2,
            pt: 1.5,
            pb: 2,
          }}
        >
          <Stack spacing={1}>
            {subQuestions.map((q, i) => (
              <Box key={q} display="flex" alignItems="flex-start" gap={1.25}>
                <Box
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    backgroundColor: COLORS.primary,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    mt: "1px",
                  }}
                >
                  <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, lineHeight: 1 }}>
                    {i + 1}
                  </Typography>
                </Box>
                <Typography variant="body2" color={COLORS.textPrimary} sx={{ pt: 0.2 }}>
                  {q}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// InlineInput — short single-line text input used inside the intention frame
// ---------------------------------------------------------------------------

interface InlineInputProps {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  ariaLabel: string;
}

function InlineInput({ id, value, onChange, placeholder, ariaLabel }: InlineInputProps) {
  return (
    <Box
      sx={{
        display: "inline-flex",
        borderBottom: `2px solid ${value.trim() ? COLORS.primary : COLORS.border}`,
        minWidth: 180,
        flex: 1,
        transition: "border-color 0.15s ease",
      }}
    >
      <InputBase
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputProps={{ "aria-label": ariaLabel }}
        sx={{
          fontSize: "0.9rem",
          width: "100%",
          "& .MuiInputBase-input": {
            color: COLORS.textPrimary,
            pb: 0.25,
            "&::placeholder": { color: COLORS.border, opacity: 1 },
          },
        }}
      />
    </Box>
  );
}

// ============================================================================
// Main component
// ============================================================================

export default function Section2ClinicalFoundation({
  storyType,
  value,
  onChange,
  onContinue,
  onBack,
}: Props) {
  const ui = useStoryBriefUi();
  const uid = useId();
  const id = (suffix: string) => `${uid}-${suffix}`;

  const population = value.population ?? "";
  const trigger = value.trigger ?? "";
  const intentionFeel = value.intentionFeel ?? "";
  const intentionBecause = value.intentionBecause ?? "";
  const creativeVision = value.creativeVision ?? "";
  const oneTrueThing = value.oneTrueThing ?? "";

  // ── Derived state ──────────────────────────────────────────────────────────

  const triggerLabel = ui.TRIGGER_LABELS[storyType] ?? ui.fallbackTriggerLabel;
  const thinkingScaffold = ui.POPULATION_THINKING_SCAFFOLDS[storyType];
  const goodExamples = ui.INTENTION_GOOD_EXAMPLES[storyType] ?? [];
  const badExamples = ui.INTENTION_BAD_EXAMPLES[storyType] ?? [];

  const showTriggerNudge =
    trigger.length > 0 && trigger.length < TRIGGER_NUDGE_THRESHOLD;

  const intentionCombinedLength = intentionFeel.trim().length + intentionBecause.trim().length;
  const showIntentionNudge =
    (intentionFeel.trim().length > 0 || intentionBecause.trim().length > 0) &&
    intentionCombinedLength < INTENTION_NUDGE_THRESHOLD;

  const isComplete =
    population.trim().length > 0 &&
    trigger.trim().length > 0 &&
    intentionFeel.trim().length > 0 &&
    intentionBecause.trim().length > 0 &&
    creativeVision.trim().length > 0;

  const missingFields: BriefMissingField[] = [];
  if (!population.trim()) {
    missingFields.push({
      label: ui.s2MissingPopulation,
      targetId: id("2-1-label"),
    });
  }
  if (!trigger.trim()) {
    missingFields.push({ label: triggerLabel, targetId: id("2-2-label") });
  }
  if (!intentionFeel.trim() || !intentionBecause.trim()) {
    missingFields.push({ label: ui.s2MissingIntention, targetId: id("2-3-label") });
  }
  if (!creativeVision.trim()) {
    missingFields.push({ label: ui.s2MissingCreative, targetId: id("2-4-label") });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box>
      {/* ── Section header ──────────────────────────────────────────────── */}
      <Box mb={5}>
        <Typography
          variant="overline"
          display="block"
          color={COLORS.textSecondary}
          letterSpacing={1}
          mb={0.5}
        >
          {ui.s2Overline}
        </Typography>
        <Typography variant="h5" fontWeight={700} mb={0.75}>
          {ui.s2Title}
        </Typography>
        <Typography variant="body2" color={COLORS.textSecondary} sx={{ maxWidth: 720 }}>
          {ui.s2Intro}
        </Typography>
      </Box>

      <Stack spacing={5}>
        {/* ═══════════════════════════════════════════════════════════════
            Field 2.1 — Emotional World of the Population
        ═══════════════════════════════════════════════════════════════ */}
        <FieldGroup id={id("2-1-label")} label={ui.s2Field21}>
          <Typography variant="caption" color={COLORS.textSecondary} display="block" mb={1.5}>
            {ui.s2Field21Helper}
          </Typography>

          {/* Thinking scaffold — collapses; never written to the field or payload */}
          {thinkingScaffold && (
            <ThinkingGuide
              title={thinkingScaffold.summaryTitle}
              subQuestions={thinkingScaffold.subQuestions}
            />
          )}

          <TextArea
            id={id("2-1-input")}
            value={population}
            onChange={(v) => onChange({ population: v })}
            maxChars={POPULATION_CHAR_LIMIT}
            placeholder={ui.s2Field21Placeholder}
            minRows={5}
            formatCounter={ui.charactersCount}
          />
        </FieldGroup>

        <Divider />

        {/* ═══════════════════════════════════════════════════════════════
            Field 2.2 — The Specific Trigger
        ═══════════════════════════════════════════════════════════════ */}
        <FieldGroup id={id("2-2-label")} label={triggerLabel}>
          <Typography variant="caption" color={COLORS.textSecondary} display="block" mb={1.5}>
            {ui.s2Field22Helper}
          </Typography>

          <TextArea
            id={id("2-2-input")}
            value={trigger}
            onChange={(v) => onChange({ trigger: v })}
            maxChars={TRIGGER_CHAR_LIMIT}
            placeholder={ui.s2Field22Placeholder}
            formatCounter={ui.charactersCount}
          />

          {showTriggerNudge && (
            <Alert
              severity="info"
              icon={false}
              sx={{
                mt: 1.25,
                borderRadius: 2,
                backgroundColor: CARD_TINT,
                border: `1px solid ${COLORS.border}`,
                "& .MuiAlert-message": { fontSize: "0.875rem", color: COLORS.textSecondary },
              }}
            >
              {ui.TRIGGER_NUDGE}
            </Alert>
          )}
        </FieldGroup>

        <Divider />

        {/* ═══════════════════════════════════════════════════════════════
            Field 2.3 — Therapeutic Intention
        ═══════════════════════════════════════════════════════════════ */}
        <FieldGroup id={id("2-3-label")} label={ui.s2Field23}>
          <Typography variant="caption" color={COLORS.textSecondary} display="block" mb={2}>
            {ui.s2Field23Helper}
          </Typography>

          {/* Completion frame */}
          <Box
            sx={{
              border: `1.5px solid ${COLORS.border}`,
              borderRadius: 2,
              backgroundColor: COLORS.surface,
              p: 2.5,
              "&:focus-within": { borderColor: COLORS.primary },
              transition: "border-color 0.15s ease",
            }}
          >
            <Stack spacing={1.75}>
              {/* First half */}
              <Box display="flex" alignItems="baseline" gap={1} flexWrap="wrap">
                <Typography
                  variant="body2"
                  color={COLORS.textSecondary}
                  sx={{ flexShrink: 0, fontStyle: "italic" }}
                >
                  {ui.s2IntentionFeelPrefix}
                </Typography>
                <InlineInput
                  id={id("2-3-feel")}
                  value={intentionFeel}
                  onChange={(v) => onChange({ intentionFeel: v })}
                  placeholder={ui.s2IntentionFeelPlaceholder}
                  ariaLabel={ui.s2IntentionAriaFeel}
                />
              </Box>

              {/* Second half */}
              <Box display="flex" alignItems="baseline" gap={1} flexWrap="wrap">
                <Typography
                  variant="body2"
                  color={COLORS.textSecondary}
                  sx={{ flexShrink: 0, fontStyle: "italic" }}
                >
                  {ui.s2IntentionBecausePrefix}
                </Typography>
                <InlineInput
                  id={id("2-3-because")}
                  value={intentionBecause}
                  onChange={(v) => onChange({ intentionBecause: v })}
                  placeholder={ui.s2IntentionBecausePlaceholder}
                  ariaLabel={ui.s2IntentionAriaBecause}
                />
              </Box>
            </Stack>
          </Box>

          {/* Brevity nudge */}
          {showIntentionNudge && (
            <Alert
              severity="info"
              icon={false}
              sx={{
                mt: 1.25,
                borderRadius: 2,
                backgroundColor: CARD_TINT,
                border: `1px solid ${COLORS.border}`,
                "& .MuiAlert-message": { fontSize: "0.875rem", color: COLORS.textSecondary },
              }}
            >
              {ui.INTENTION_NUDGE}
            </Alert>
          )}

          {/* Inline examples */}
          {(goodExamples.length > 0 || badExamples.length > 0) && (
            <Box mt={2.5}>
              {goodExamples.length > 0 && (
                <Box mb={2}>
                  <Typography
                    variant="caption"
                    fontWeight={600}
                    color={COLORS.success}
                    display="block"
                    mb={0.75}
                    sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                  >
                    {ui.s2StrongExamples}
                  </Typography>
                  <Stack spacing={0.75}>
                    {goodExamples.map((ex, i) => (
                      <Box
                        key={i}
                        sx={{
                          px: 2,
                          py: 1,
                          borderLeft: `3px solid ${COLORS.success}`,
                          backgroundColor: "#F4FAF4",
                          borderRadius: "0 8px 8px 0",
                        }}
                      >
                        <Typography variant="caption" color={COLORS.textSecondary} fontStyle="italic">
                          "…feel{" "}
                          <Box component="span" fontWeight={600} color={COLORS.textPrimary}>
                            {ex.feel}
                          </Box>{" "}
                          because{" "}
                          <Box component="span" fontWeight={600} color={COLORS.textPrimary}>
                            {ex.because}
                          </Box>
                          "
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}

              {badExamples.length > 0 && (
                <Box>
                  <Typography
                    variant="caption"
                    fontWeight={600}
                    color={COLORS.secondary}
                    display="block"
                    mb={0.75}
                    sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                  >
                    {ui.s2AvoidThis}
                  </Typography>
                  <Stack spacing={0.75}>
                    {badExamples.map((ex, i) => (
                      <Box
                        key={i}
                        sx={{
                          px: 2,
                          py: 1,
                          borderLeft: `3px solid ${COLORS.secondary}`,
                          backgroundColor: "#FBF4F5",
                          borderRadius: "0 8px 8px 0",
                        }}
                      >
                        <Typography variant="caption" color={COLORS.textSecondary} fontStyle="italic">
                          "…feel{" "}
                          <Box component="span" fontWeight={600} color={COLORS.textPrimary}>
                            {ex.feel}
                          </Box>{" "}
                          because{" "}
                          <Box component="span" fontWeight={600} color={COLORS.textPrimary}>
                            {ex.because}
                          </Box>
                          "
                        </Typography>
                        {ex.note && (
                          <Typography
                            variant="caption"
                            color={COLORS.secondary}
                            display="block"
                            mt={0.25}
                          >
                            — {ex.note}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>
          )}
        </FieldGroup>

        <Divider />

        {/* ═══════════════════════════════════════════════════════════════
            Field 2.4 — Clinical Creative Vision
        ═══════════════════════════════════════════════════════════════ */}
        <FieldGroup id={id("2-4-label")} label={ui.s2Field24}>
          <Typography variant="caption" color={COLORS.textSecondary} display="block" mb={1.5}>
            {ui.s2Field24Helper}
          </Typography>

          <TextArea
            id={id("2-4-input")}
            value={creativeVision}
            onChange={(v) => onChange({ creativeVision: v })}
            maxChars={CREATIVE_VISION_CHAR_LIMIT}
            placeholder={ui.s2Field24Placeholder}
            formatCounter={ui.charactersCount}
          />
        </FieldGroup>

        <Divider />

        {/* ═══════════════════════════════════════════════════════════════
            Field 2.5 — One True Thing
        ═══════════════════════════════════════════════════════════════ */}
        <FieldGroup id={id("2-5-label")} label={ui.s2Field25} optional optionalSuffix={ui.optionalSuffix}>
          <Typography variant="caption" color={COLORS.textSecondary} display="block" mb={1.5}>
            {ui.s2Field25Helper}
          </Typography>

          <TextArea
            id={id("2-5-input")}
            value={oneTrueThing}
            onChange={(v) => onChange({ oneTrueThing: v })}
            maxChars={ONE_TRUE_THING_CHAR_LIMIT}
            placeholder={ui.s2Field25Placeholder}
            minRows={3}
            formatCounter={ui.charactersCount}
          />
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
              {ui.back}
            </Button>
          )}
          <Button
            variant="contained"
            onClick={() => { if (isComplete) onContinue(); }}
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
            {ui.saveContinue}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
