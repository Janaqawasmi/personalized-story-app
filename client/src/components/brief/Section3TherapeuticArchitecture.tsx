// client/src/components/brief/Section3TherapeuticArchitecture.tsx
//
// Story Brief — Section 3: Therapeutic Architecture
//
// Seven fields in spec order (3.1 → 3.7):
//   3.1  Primary therapeutic approach  — single select, 7 options + 1-sentence definition
//   3.2  Supporting approach           — single select, optional, excludes primary; conflict warning
//   3.3  Shame dimension               — single select, 3 levels with description
//   3.4  Somatic expression            — multi-select up to 2 + free text 150 chars
//   3.5  Coping tool                   — single select, 3 grouped categories; age note for abstract
//   3.6  Resolution completeness       — single select, 3 options, default partial
//   3.7  What this story must never do — editable text list, pre-filled defaults, min 1 item
//
// Spec: /docs/dammah-story-brief-spec-v1.2.md §5

import React, { useId } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  Divider,
  IconButton,
  InputBase,
  Stack,
  Typography,
} from "@mui/material";
import { COLORS } from "../../theme";
import {
  THERAPEUTIC_APPROACHES_BY_TYPE,
  THERAPEUTIC_APPROACH_LABELS,
  THERAPEUTIC_APPROACH_DEFINITIONS,
  CONFLICTING_APPROACH_PAIRS,
  SHAME_DIMENSIONS,
  SHAME_DIMENSION_LABELS,
  SHAME_DIMENSION_DESCRIPTIONS,
  SOMATIC_EXPRESSIONS,
  SOMATIC_EXPRESSION_LABELS,
  SOMATIC_MAX_SELECT,
  SOMATIC_OTHER_CHAR_LIMIT,
  COPING_TOOL_CATEGORIES_FEAR_ANXIETY,
  COPING_TOOL_LABELS,
  ABSTRACT_COPING_TOOLS,
  RESOLUTION_OPTIONS,
  RESOLUTION_LABELS,
  RESOLUTION_DESCRIPTIONS,
  RESOLUTION_DEFAULTS,
  MUST_NEVER_DEFAULTS,
  type TherapeuticArchitecture,
  type TherapeuticApproach,
  type SomaticExpression,
  type CopingTool,
  type StoryType,
  type AgeRange,
} from "../../types/storyBrief";

// ============================================================================
// Style tokens
// ============================================================================

const CARD_SELECTED_BG = "#EEF2F5";
const CARD_UNSELECTED_BG = COLORS.surface;
const CARD_TINT = "#EEF2F5";

// ============================================================================
// Props
// ============================================================================

interface Props {
  storyType: StoryType;
  /** Needed for coping-tool age note and cross-field warnings. */
  ageRange: AgeRange | null;
  value: Partial<TherapeuticArchitecture>;
  onChange: (updates: Partial<TherapeuticArchitecture>) => void;
  onContinue: () => void;
  onBack?: () => void;
}

// ============================================================================
// Shared sub-components (mirror Section 1 patterns exactly)
// ============================================================================

// ---------------------------------------------------------------------------
// FieldGroup
// ---------------------------------------------------------------------------

interface FieldGroupProps {
  id: string;
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}

function FieldGroup({ id, label, optional, children }: FieldGroupProps) {
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
            (optional)
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
// OptionCard — single-select clickable card
// ---------------------------------------------------------------------------

interface OptionCardProps {
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  ariaLabel?: string;
}

function OptionCard({ selected, onClick, disabled, children, ariaLabel }: OptionCardProps) {
  return (
    <Card
      elevation={0}
      aria-pressed={selected}
      aria-label={ariaLabel}
      sx={{
        border: selected ? `2px solid ${COLORS.primary}` : `1px solid ${COLORS.border}`,
        backgroundColor: disabled
          ? COLORS.background
          : selected
          ? CARD_SELECTED_BG
          : CARD_UNSELECTED_BG,
        borderRadius: 2,
        opacity: disabled ? 0.45 : 1,
        transition: "border-color 0.15s ease, background-color 0.15s ease",
        "&:hover": !disabled ? { borderColor: COLORS.primary } : {},
      }}
    >
      <CardActionArea
        onClick={onClick}
        disabled={disabled}
        disableRipple
        sx={{ p: 0, height: "100%", display: "flex", alignItems: "stretch" }}
      >
        {children}
      </CardActionArea>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// SelectedDot — circular selection indicator (single-select)
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

// ---------------------------------------------------------------------------
// CheckDot — square checkbox-style indicator (multi-select)
// ---------------------------------------------------------------------------

function CheckDot({ selected }: { selected: boolean }) {
  return (
    <Box
      aria-hidden="true"
      sx={{
        width: 16,
        height: 16,
        borderRadius: "3px",
        flexShrink: 0,
        border: `2px solid ${selected ? COLORS.primary : COLORS.border}`,
        backgroundColor: selected ? COLORS.primary : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.15s ease",
      }}
    >
      {selected && (
        <Box
          component="span"
          sx={{
            display: "block",
            width: 8,
            height: 5,
            borderLeft: `2px solid ${COLORS.surface}`,
            borderBottom: `2px solid ${COLORS.surface}`,
            transform: "rotate(-45deg) translateY(-1px)",
          }}
        />
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// TextArea — single-field textarea with character counter
// ---------------------------------------------------------------------------

interface TextAreaProps {
  id: string;
  value: string;
  onChange: (v: string) => void;
  maxChars: number;
  placeholder: string;
  minRows?: number;
}

function TextArea({ id, value, onChange, maxChars, placeholder, minRows = 3 }: TextAreaProps) {
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
            fontSize: "0.875rem",
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
          {used} / {maxChars} characters
        </Typography>
      </Box>
    </Box>
  );
}

// ============================================================================
// Main component
// ============================================================================

export default function Section3TherapeuticArchitecture({
  storyType,
  ageRange,
  value,
  onChange,
  onContinue,
  onBack,
}: Props) {
  const uid = useId();
  const id = (suffix: string) => `${uid}-${suffix}`;

  // Derive current values with defaults
  const primaryApproach = value.primaryApproach ?? null;
  const supportingApproach = value.supportingApproach ?? null;
  const shameDimension = value.shameDimension ?? null;
  const somaticExpressions = value.somaticExpressions ?? [];
  const somaticOther = value.somaticOther ?? "";
  const copingTool = value.copingTool ?? null;
  const resolutionCompleteness =
    value.resolutionCompleteness ?? (RESOLUTION_DEFAULTS[storyType] ?? null);
  const mustNeverList =
    value.mustNeverList ?? (MUST_NEVER_DEFAULTS[storyType] ?? [""]);

  const approaches = THERAPEUTIC_APPROACHES_BY_TYPE[storyType] ?? [];

  // ── Derived flags ──────────────────────────────────────────────────────────

  const isConflictingPair =
    primaryApproach !== null &&
    supportingApproach !== null &&
    CONFLICTING_APPROACH_PAIRS.some(
      ([a, b]) =>
        (primaryApproach === a && supportingApproach === b) ||
        (primaryApproach === b && supportingApproach === a)
    );

  const showAbstractAgeNote =
    copingTool !== null &&
    ageRange === "3-5" &&
    (ABSTRACT_COPING_TOOLS as readonly CopingTool[]).includes(copingTool);

  const somaticAtMax = somaticExpressions.length >= SOMATIC_MAX_SELECT;

  const isComplete =
    primaryApproach !== null &&
    shameDimension !== null &&
    somaticExpressions.length > 0 &&
    copingTool !== null &&
    resolutionCompleteness !== null &&
    mustNeverList.length > 0 &&
    mustNeverList.every((item) => item.trim().length > 0);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handlePrimaryApproach(v: TherapeuticApproach) {
    const updates: Partial<TherapeuticArchitecture> = { primaryApproach: v };
    // Clear supporting if it would equal the new primary
    if (supportingApproach === v) updates.supportingApproach = null;
    onChange(updates);
  }

  function handleSupportingApproach(v: TherapeuticApproach | null) {
    onChange({ supportingApproach: v });
  }

  function handleSomaticToggle(expr: SomaticExpression) {
    const already = somaticExpressions.includes(expr);
    if (already) {
      onChange({ somaticExpressions: somaticExpressions.filter((e) => e !== expr) });
    } else if (!somaticAtMax) {
      onChange({ somaticExpressions: [...somaticExpressions, expr] });
    }
  }

  function handleMustNeverChange(index: number, text: string) {
    const updated = [...mustNeverList];
    updated[index] = text;
    onChange({ mustNeverList: updated });
  }

  function handleMustNeverDelete(index: number) {
    if (mustNeverList.length <= 1) return;
    onChange({ mustNeverList: mustNeverList.filter((_, i) => i !== index) });
  }

  function handleMustNeverAdd() {
    onChange({ mustNeverList: [...mustNeverList, ""] });
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <Box>
      {/* ── Section header ──────────────────────────────────────────────── */}
      <Box mb={4}>
        <Typography
          variant="overline"
          display="block"
          color={COLORS.textSecondary}
          letterSpacing={1}
          mb={0.5}
        >
          Section 3 of 5
        </Typography>
        <Typography variant="h5" fontWeight={700} mb={0.75}>
          Therapeutic Architecture
        </Typography>
        <Typography variant="body2" color={COLORS.textSecondary} maxWidth={560}>
          The clinical mechanism: how the story will work therapeutically. These decisions shape
          the story's arc and the agent's narrative technique.
        </Typography>
      </Box>

      <Stack spacing={4}>
        {/* ═══════════════════════════════════════════════════════════════
            Field 3.1 — Primary Therapeutic Approach
        ═══════════════════════════════════════════════════════════════ */}
        <FieldGroup id={id("3-1-label")} label="Primary therapeutic approach">
          <Typography variant="caption" color={COLORS.textSecondary} display="block" mb={1.5}>
            Determines the story's therapeutic spine — how the protagonist moves from difficulty
            to resolution.
          </Typography>
          <Stack spacing={1.25}>
            {approaches.map((approach) => {
              const selected = primaryApproach === approach;
              return (
                <OptionCard
                  key={approach}
                  selected={selected}
                  onClick={() => handlePrimaryApproach(approach)}
                  ariaLabel={THERAPEUTIC_APPROACH_LABELS[approach]}
                >
                  <Box
                    display="flex"
                    alignItems="flex-start"
                    gap={1.5}
                    px={2.5}
                    py={1.75}
                    width="100%"
                  >
                    <Box pt={0.3}>
                      <SelectedDot selected={selected} />
                    </Box>
                    <Box>
                      <Typography
                        variant="body2"
                        fontWeight={selected ? 700 : 600}
                        color={selected ? COLORS.primary : COLORS.textPrimary}
                        mb={0.25}
                      >
                        {THERAPEUTIC_APPROACH_LABELS[approach]}
                      </Typography>
                      <Typography variant="caption" color={COLORS.textSecondary} lineHeight={1.5}>
                        {THERAPEUTIC_APPROACH_DEFINITIONS[approach]}
                      </Typography>
                    </Box>
                  </Box>
                </OptionCard>
              );
            })}
          </Stack>
        </FieldGroup>

        <Divider />

        {/* ═══════════════════════════════════════════════════════════════
            Field 3.2 — Supporting Approach (optional)
        ═══════════════════════════════════════════════════════════════ */}
        <FieldGroup id={id("3-2-label")} label="Supporting approach" optional>
          <Typography variant="caption" color={COLORS.textSecondary} display="block" mb={1.5}>
            Flavors the story without driving the arc. The primary approach selected above is
            excluded from this list.
          </Typography>
          <Stack spacing={1.25}>
            {/* "None" deselect option */}
            <OptionCard
              selected={supportingApproach === null}
              onClick={() => handleSupportingApproach(null)}
              ariaLabel="No supporting approach"
            >
              <Box display="flex" alignItems="center" gap={1.5} px={2.5} py={1.5} width="100%">
                <SelectedDot selected={supportingApproach === null} />
                <Typography
                  variant="body2"
                  fontWeight={supportingApproach === null ? 700 : 500}
                  color={supportingApproach === null ? COLORS.primary : COLORS.textSecondary}
                  fontStyle="italic"
                >
                  No supporting approach
                </Typography>
              </Box>
            </OptionCard>

            {approaches
              .filter((a) => a !== primaryApproach)
              .map((approach) => {
                const selected = supportingApproach === approach;
                return (
                  <OptionCard
                    key={approach}
                    selected={selected}
                    onClick={() => handleSupportingApproach(approach)}
                    ariaLabel={THERAPEUTIC_APPROACH_LABELS[approach]}
                  >
                    <Box
                      display="flex"
                      alignItems="flex-start"
                      gap={1.5}
                      px={2.5}
                      py={1.75}
                      width="100%"
                    >
                      <Box pt={0.3}>
                        <SelectedDot selected={selected} />
                      </Box>
                      <Box>
                        <Typography
                          variant="body2"
                          fontWeight={selected ? 700 : 600}
                          color={selected ? COLORS.primary : COLORS.textPrimary}
                          mb={0.25}
                        >
                          {THERAPEUTIC_APPROACH_LABELS[approach]}
                        </Typography>
                        <Typography variant="caption" color={COLORS.textSecondary} lineHeight={1.5}>
                          {THERAPEUTIC_APPROACH_DEFINITIONS[approach]}
                        </Typography>
                      </Box>
                    </Box>
                  </OptionCard>
                );
              })}
          </Stack>

          {/* Conflict warning */}
          {isConflictingPair && (
            <Alert
              severity="warning"
              sx={{ mt: 1.5, borderRadius: 2, "& .MuiAlert-message": { fontSize: "0.875rem" } }}
            >
              These approaches can pull in different directions. Is this intentional?
            </Alert>
          )}
        </FieldGroup>

        <Divider />

        {/* ═══════════════════════════════════════════════════════════════
            Field 3.3 — Shame Dimension
        ═══════════════════════════════════════════════════════════════ */}
        <FieldGroup id={id("3-3-label")} label="Shame dimension">
          <Typography variant="caption" color={COLORS.textSecondary} display="block" mb={1.5}>
            Governs how the agent handles self-blame or stigma in the story.
          </Typography>
          <Stack spacing={1.25}>
            {SHAME_DIMENSIONS.map((level) => {
              const selected = shameDimension === level;
              return (
                <OptionCard
                  key={level}
                  selected={selected}
                  onClick={() => onChange({ shameDimension: level })}
                  ariaLabel={SHAME_DIMENSION_LABELS[level]}
                >
                  <Box
                    display="flex"
                    alignItems="flex-start"
                    gap={1.5}
                    px={2.5}
                    py={1.75}
                    width="100%"
                  >
                    <Box pt={0.3}>
                      <SelectedDot selected={selected} />
                    </Box>
                    <Box>
                      <Typography
                        variant="body2"
                        fontWeight={selected ? 700 : 600}
                        color={selected ? COLORS.primary : COLORS.textPrimary}
                        mb={0.25}
                      >
                        {SHAME_DIMENSION_LABELS[level]}
                      </Typography>
                      <Typography variant="caption" color={COLORS.textSecondary} lineHeight={1.5}>
                        {SHAME_DIMENSION_DESCRIPTIONS[level]}
                      </Typography>
                    </Box>
                  </Box>
                </OptionCard>
              );
            })}
          </Stack>
        </FieldGroup>

        <Divider />

        {/* ═══════════════════════════════════════════════════════════════
            Field 3.4 — Somatic Expression
        ═══════════════════════════════════════════════════════════════ */}
        <FieldGroup id={id("3-4-label")} label="How does the anxiety show up in the body?">
          <Typography variant="caption" color={COLORS.textSecondary} display="block" mb={1.5}>
            Select up to 2. The agent uses these to mirror the child's physical experience in the
            story.
          </Typography>
          <Box
            display="grid"
            gridTemplateColumns="repeat(2, 1fr)"
            gap={1.25}
            sx={{ "@media (max-width: 480px)": { gridTemplateColumns: "1fr" } }}
          >
            {SOMATIC_EXPRESSIONS.map((expr) => {
              const selected = somaticExpressions.includes(expr);
              const disabled = !selected && somaticAtMax;
              return (
                <OptionCard
                  key={expr}
                  selected={selected}
                  onClick={() => handleSomaticToggle(expr)}
                  disabled={disabled}
                  ariaLabel={SOMATIC_EXPRESSION_LABELS[expr]}
                >
                  <Box display="flex" alignItems="center" gap={1.25} px={2} py={1.5} width="100%">
                    <CheckDot selected={selected} />
                    <Typography
                      variant="body2"
                      fontWeight={selected ? 600 : 400}
                      color={selected ? COLORS.primary : COLORS.textPrimary}
                    >
                      {SOMATIC_EXPRESSION_LABELS[expr]}
                    </Typography>
                  </Box>
                </OptionCard>
              );
            })}
          </Box>

          {/* "Anything else" free text — directly below checkboxes per spec */}
          <Box mt={2}>
            <Typography
              variant="caption"
              color={COLORS.textSecondary}
              display="block"
              mb={0.75}
              fontStyle="italic"
            >
              Anything else the body does? (optional)
            </Typography>
            <TextArea
              id={id("3-4-other")}
              value={somaticOther}
              onChange={(v) => onChange({ somaticOther: v })}
              maxChars={SOMATIC_OTHER_CHAR_LIMIT}
              placeholder="Describe any other physical responses not listed above…"
              minRows={2}
            />
          </Box>
        </FieldGroup>

        <Divider />

        {/* ═══════════════════════════════════════════════════════════════
            Field 3.5 — The Coping Tool
        ═══════════════════════════════════════════════════════════════ */}
        <FieldGroup id={id("3-5-label")} label="The coping tool">
          <Typography variant="caption" color={COLORS.textSecondary} display="block" mb={1.5}>
            One tool only. The agent shows the protagonist using it at the story's most difficult
            moment — demonstrated in action, never named.
          </Typography>

          <Stack spacing={2.5}>
            {COPING_TOOL_CATEGORIES_FEAR_ANXIETY.map((category) => (
              <Box key={category.label}>
                <Typography
                  variant="overline"
                  display="block"
                  color={COLORS.textSecondary}
                  letterSpacing={1}
                  mb={1}
                  sx={{ fontSize: "0.7rem" }}
                >
                  {category.label}
                </Typography>
                <Stack spacing={1}>
                  {category.tools.map((tool) => {
                    const selected = copingTool === tool;
                    return (
                      <OptionCard
                        key={tool}
                        selected={selected}
                        onClick={() => onChange({ copingTool: tool })}
                        ariaLabel={COPING_TOOL_LABELS[tool]}
                      >
                        <Box
                          display="flex"
                          alignItems="center"
                          gap={1.5}
                          px={2.5}
                          py={1.5}
                          width="100%"
                        >
                          <SelectedDot selected={selected} />
                          <Typography
                            variant="body2"
                            fontWeight={selected ? 700 : 500}
                            color={selected ? COLORS.primary : COLORS.textPrimary}
                          >
                            {COPING_TOOL_LABELS[tool]}
                          </Typography>
                        </Box>
                      </OptionCard>
                    );
                  })}
                </Stack>
              </Box>
            ))}
          </Stack>

          {/* Age note for abstract tools + ages 3–5 */}
          {showAbstractAgeNote && (
            <Alert
              severity="info"
              icon={false}
              sx={{
                mt: 1.5,
                borderRadius: 2,
                backgroundColor: CARD_TINT,
                border: `1px solid ${COLORS.border}`,
                "& .MuiAlert-message": { fontSize: "0.875rem", color: COLORS.textSecondary },
              }}
            >
              For younger children, the agent will show this as a simple physical action or
              repeated pattern — not verbal self-talk.
            </Alert>
          )}
        </FieldGroup>

        <Divider />

        {/* ═══════════════════════════════════════════════════════════════
            Field 3.6 — Resolution Completeness
        ═══════════════════════════════════════════════════════════════ */}
        <FieldGroup id={id("3-6-label")} label="Resolution completeness">
          <Typography variant="caption" color={COLORS.textSecondary} display="block" mb={1.5}>
            Governs the final scene. Default for Fear & Anxiety is Partial resolution.
          </Typography>
          <Stack spacing={1.25}>
            {RESOLUTION_OPTIONS.map((option) => {
              const selected = resolutionCompleteness === option;
              return (
                <OptionCard
                  key={option}
                  selected={selected}
                  onClick={() => onChange({ resolutionCompleteness: option })}
                  ariaLabel={RESOLUTION_LABELS[option]}
                >
                  <Box
                    display="flex"
                    alignItems="flex-start"
                    gap={1.5}
                    px={2.5}
                    py={1.75}
                    width="100%"
                  >
                    <Box pt={0.3}>
                      <SelectedDot selected={selected} />
                    </Box>
                    <Box>
                      <Typography
                        variant="body2"
                        fontWeight={selected ? 700 : 600}
                        color={selected ? COLORS.primary : COLORS.textPrimary}
                        mb={0.25}
                      >
                        {RESOLUTION_LABELS[option]}
                        {option === RESOLUTION_DEFAULTS[storyType] && (
                          <Typography
                            component="span"
                            variant="caption"
                            color={COLORS.textSecondary}
                            fontWeight={400}
                            ml={0.75}
                          >
                            (default)
                          </Typography>
                        )}
                      </Typography>
                      <Typography variant="caption" color={COLORS.textSecondary} lineHeight={1.5}>
                        {RESOLUTION_DESCRIPTIONS[option]}
                      </Typography>
                    </Box>
                  </Box>
                </OptionCard>
              );
            })}
          </Stack>
        </FieldGroup>

        <Divider />

        {/* ═══════════════════════════════════════════════════════════════
            Field 3.7 — What This Story Must Never Do
        ═══════════════════════════════════════════════════════════════ */}
        <FieldGroup id={id("3-7-label")} label="What this story must never do">
          <Typography variant="caption" color={COLORS.textSecondary} display="block" mb={1.5}>
            Clinical and content constraints together — the agent treats every item as a hard
            rule. Pre-filled with defaults for this story type; keep, remove, or add.
          </Typography>

          <Stack spacing={1}>
            {mustNeverList.map((item, idx) => (
              <Box
                key={idx}
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1,
                  border: `1.5px solid ${item.trim() ? COLORS.border : COLORS.secondary}`,
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
                  onChange={(e) => handleMustNeverChange(idx, e.target.value)}
                  placeholder="Add a constraint the agent must never violate…"
                  multiline
                  fullWidth
                  inputProps={{ "aria-label": `Must-never item ${idx + 1}` }}
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

                {/* Delete button — disabled when only 1 item remains */}
                <IconButton
                  size="small"
                  onClick={() => handleMustNeverDelete(idx)}
                  disabled={mustNeverList.length <= 1}
                  aria-label={`Remove item ${idx + 1}`}
                  sx={{
                    mt: 0.75,
                    color: COLORS.textSecondary,
                    "&:hover": { color: COLORS.secondary },
                    "&:disabled": { opacity: 0.3 },
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

          {/* Empty-item warning */}
          {mustNeverList.some((item) => item.trim().length === 0) && (
            <Alert
              severity="warning"
              icon={false}
              sx={{
                mt: 1,
                borderRadius: 2,
                backgroundColor: "#FBF4F5",
                border: `1px solid ${COLORS.secondary}`,
                "& .MuiAlert-message": { fontSize: "0.8rem", color: COLORS.textSecondary },
              }}
            >
              Each constraint must have content before you can continue.
            </Alert>
          )}

          {/* Add item button */}
          <Button
            variant="outlined"
            size="small"
            onClick={handleMustNeverAdd}
            sx={{
              mt: 1.25,
              borderColor: COLORS.border,
              color: COLORS.textSecondary,
              textTransform: "none",
              fontWeight: 500,
              "&:hover": { borderColor: COLORS.primary, color: COLORS.primary },
            }}
          >
            + Add constraint
          </Button>
        </FieldGroup>

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
            onClick={() => {
              if (isComplete) onContinue();
            }}
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
