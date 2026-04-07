// client/src/components/brief/Section5PersonalizationConfig.tsx
//
// Story Brief — Section 5: Personalization Configuration
//
// Conditional on the personalization decision from Section 4 (Field 4.0):
//
//   If personalization ON  → Field 5.1 — Personalization Constraints
//       Free text list, optional, pre-filled with type-specific defaults.
//       Prompt: "What must never be changed when a parent personalizes this story?"
//
//   If personalization OFF → Field 5.2 — Why Not
//       Free text, required, max 400 chars.
//       Prompt: "Why is this story better with a fixed protagonist?
//                This note is shown to parents."
//
// This is the last section. The navigation button reads "Submit brief →".
//
// Spec: /docs/dammah-story-brief-spec-v1.2.md §7

import React, { useId } from "react";
import {
  Alert,
  Box,
  Button,
  Divider,
  IconButton,
  InputBase,
  Stack,
  Typography,
} from "@mui/material";
import { COLORS } from "../../theme";
import BriefValidationSummary, {
  type BriefMissingField,
} from "./BriefValidationSummary";
import { WHY_NOT_CHAR_LIMIT, type PersonalizationConfig, type StoryType } from "../../types/storyBrief";
import { useStoryBriefUi } from "../../i18n/storyBriefUi";

// ============================================================================
// Style tokens
// ============================================================================

const CARD_TINT = "#EEF2F5";

// ============================================================================
// Props
// ============================================================================

interface Props {
  storyType: StoryType;
  /** From Section 4 Field 4.0. */
  personalization: "yes" | "no";
  value: Partial<PersonalizationConfig>;
  onChange: (updates: Partial<PersonalizationConfig>) => void;
  /** Called when the psychologist submits the final brief. */
  onSubmit: () => void;
  onBack?: () => void;
  /** True while the submission is being processed. */
  submitting?: boolean;
}

// ============================================================================
// Sub-components (match previous sections)
// ============================================================================

// ---------------------------------------------------------------------------
// FieldGroup
// ---------------------------------------------------------------------------

interface FieldGroupProps {
  id: string;
  label: string;
  optional?: boolean;
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
          <Typography component="span" variant="caption" color={COLORS.textSecondary} fontWeight={400}>
            {optionalSuffix ?? "(optional)"}
          </Typography>
        ) : (
          <Typography component="span" aria-hidden="true" color={COLORS.secondary} fontWeight={700}>
            *
          </Typography>
        )}
      </Typography>
      {children}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// TextArea — multi-line with character counter
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

// ============================================================================
// Main component
// ============================================================================

export default function Section5PersonalizationConfig({
  storyType,
  personalization,
  value,
  onChange,
  onSubmit,
  onBack,
  submitting = false,
}: Props) {
  const ui = useStoryBriefUi();
  const uid = useId();
  const id = (suffix: string) => `${uid}-${suffix}`;

  const isPersonalized = personalization === "yes";

  // Constraints — default to story type defaults if not yet set by parent
  const constraints =
    value.constraints ?? (ui.PERSONALIZATION_CONSTRAINTS_DEFAULTS[storyType] ?? [""]);
  const whyNot = value.whyNot ?? "";

  // ── Completion check ──────────────────────────────────────────────────────

  const isComplete = isPersonalized
    ? true // constraints are optional
    : whyNot.trim().length > 0;

  const missingFields: BriefMissingField[] = [];
  if (!isPersonalized && !whyNot.trim()) {
    missingFields.push({
      label: ui.s5MissingWhyNot,
      targetId: id("5-2-label"),
    });
  }

  // ── Constraint list handlers ───────────────────────────────────────────────

  function handleConstraintChange(index: number, text: string) {
    const updated = [...constraints];
    updated[index] = text;
    onChange({ constraints: updated });
  }

  function handleConstraintDelete(index: number) {
    if (constraints.length <= 0) return;
    onChange({ constraints: constraints.filter((_, i) => i !== index) });
  }

  function handleConstraintAdd() {
    onChange({ constraints: [...constraints, ""] });
  }

  // ─── Render ───────────────────────────────────────────────────────────────

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
          {ui.s5Overline}
        </Typography>
        <Typography variant="h5" fontWeight={700} mb={0.75}>
          {ui.s5Title}
        </Typography>
        <Typography variant="body2" color={COLORS.textSecondary} sx={{ maxWidth: 720 }}>
          {isPersonalized ? ui.s5IntroOn : ui.s5IntroOff}
        </Typography>
      </Box>

      <Stack spacing={5}>
        {isPersonalized ? (
          /* ═══════════════════════════════════════════════════════════════
              Field 5.1 — Personalization Constraints (personalization ON)
          ═══════════════════════════════════════════════════════════════ */
          <FieldGroup id={id("5-1-label")} label={ui.s5Field51} optional optionalSuffix={ui.optionalSuffix}>
            <Typography variant="caption" color={COLORS.textSecondary} display="block" mb={1.5}>
              {ui.s5Field51Helper}
            </Typography>

            <Stack spacing={1}>
              {constraints.map((item, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1,
                    border: `1.5px solid ${item.trim() ? COLORS.border : COLORS.border}`,
                    borderRadius: 2,
                    backgroundColor: COLORS.surface,
                    "&:focus-within": { borderColor: COLORS.primary },
                    transition: "border-color 0.15s ease",
                    pr: 0.5,
                  }}
                >
                  {/* Item number pill */}
                  <Box
                    sx={{
                      flexShrink: 0,
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      backgroundColor: CARD_TINT,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      ml: 1.5,
                      mt: 1.25,
                    }}
                  >
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      color={COLORS.textSecondary}
                      sx={{ lineHeight: 1 }}
                    >
                      {idx + 1}
                    </Typography>
                  </Box>

                  <InputBase
                    value={item}
                    onChange={(e) => handleConstraintChange(idx, e.target.value)}
                    placeholder={ui.s5ConstraintPlaceholder}
                    multiline
                    fullWidth
                    inputProps={{ "aria-label": `Constraint item ${idx + 1}` }}
                    sx={{
                      py: 1.25,
                      fontSize: "0.875rem",
                      lineHeight: 1.65,
                      alignItems: "flex-start",
                      "& .MuiInputBase-input": {
                        color: COLORS.textPrimary,
                        "&::placeholder": { color: COLORS.border, opacity: 1 },
                      },
                    }}
                  />

                  <IconButton
                    size="small"
                    onClick={() => handleConstraintDelete(idx)}
                    aria-label={`Remove constraint ${idx + 1}`}
                    sx={{
                      mt: 0.75,
                      color: COLORS.textSecondary,
                      "&:hover": { color: COLORS.secondary },
                    }}
                  >
                    <Typography
                      component="span"
                      variant="body2"
                      fontWeight={700}
                      lineHeight={1}
                      sx={{ fontSize: "1rem" }}
                    >
                      ×
                    </Typography>
                  </IconButton>
                </Box>
              ))}
            </Stack>

            <Button
              variant="outlined"
              size="small"
              onClick={handleConstraintAdd}
              sx={{
                mt: 1.25,
                borderColor: COLORS.border,
                color: COLORS.textSecondary,
                textTransform: "none",
                fontWeight: 500,
                "&:hover": { borderColor: COLORS.primary, color: COLORS.primary },
              }}
            >
              {ui.s3AddConstraint}
            </Button>

            <Alert
              severity="info"
              icon={false}
              sx={{
                mt: 2,
                borderRadius: 2,
                backgroundColor: CARD_TINT,
                border: `1px solid ${COLORS.border}`,
                "& .MuiAlert-message": { fontSize: "0.8rem", color: COLORS.textSecondary },
              }}
            >
              {ui.s5ConstraintsInfo}
            </Alert>
          </FieldGroup>
        ) : (
          /* ═══════════════════════════════════════════════════════════════
              Field 5.2 — Why Not (personalization OFF)
          ═══════════════════════════════════════════════════════════════ */
          <FieldGroup id={id("5-2-label")} label={ui.s5Field52}>
            <Typography variant="caption" color={COLORS.textSecondary} display="block" mb={1.5}>
              {ui.s5Field52Helper}
            </Typography>
            <TextArea
              id={id("5-2-input")}
              value={whyNot}
              onChange={(v) => onChange({ whyNot: v })}
              maxChars={WHY_NOT_CHAR_LIMIT}
              placeholder={ui.s5Field52Placeholder}
              formatCounter={ui.charactersCount}
            />
          </FieldGroup>
        )}

        <Divider />

        {/* ── Section summary ─────────────────────────────────────────── */}
        <Box
          sx={{
            border: `1px solid ${COLORS.border}`,
            borderRadius: 2,
            backgroundColor: CARD_TINT,
            px: 2.5,
            py: 2,
          }}
        >
          <Typography variant="body2" fontWeight={600} color={COLORS.primary} mb={0.5}>
            {ui.s5AlmostDoneTitle}
          </Typography>
          <Typography variant="caption" color={COLORS.textSecondary} lineHeight={1.6}>
            {ui.s5AlmostDoneBody}
          </Typography>
        </Box>

        <BriefValidationSummary missing={submitting ? [] : missingFields} />

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
              disabled={submitting}
              sx={{ color: COLORS.textSecondary, textTransform: "none" }}
            >
              {ui.back}
            </Button>
          )}
          <Button
            variant="contained"
            onClick={() => {
              if (isComplete && !submitting) onSubmit();
            }}
            disabled={!isComplete || submitting}
            sx={{
              px: 4,
              py: 1.25,
              backgroundColor: COLORS.secondary,
              fontWeight: 600,
              textTransform: "none",
              "&:hover": { backgroundColor: "#6B3D4A" },
              "&:disabled": { opacity: 0.45 },
            }}
          >
            {submitting ? ui.submitting : ui.submitBrief}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
