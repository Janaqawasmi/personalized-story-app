// client/src/components/brief/Section4StoryWorld.tsx
//
// Story Brief — Section 4: Story World
//
// Eight fields in spec order (4.0 → 4.7):
//   4.0  Personalization decision     — binary yes/no, default yes; gates 4.1, 4.2, 4.3
//   4.1  Protagonist gender           — single select, hidden when personalization ON
//   4.2  Protagonist type             — single select, locked to Child when personalization ON
//   4.3  Protagonist age relative     — single select, hidden when personalization ON
//   4.4  Caregiver's presence         — single select, 5 options
//   4.5  Narrative distance           — single select + conditional parallel sub-field
//   4.6  Supporting characters        — multi-select up to 2 + role note per selected character
//   4.7  Character notes              — free text 300 chars, optional
//
// Spec: /docs/dammah-story-brief-spec-v1.3.md §6

import React, { useId } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  Chip,
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
  PERSONALIZATION_DEFAULT,
  PROTAGONIST_GENDERS,
  PROTAGONIST_TYPES,
  PROTAGONIST_AGE_RELATIVES,
  PROTAGONIST_AGE_RELATIVE_DEFAULT,
  CAREGIVER_PRESENCES,
  NARRATIVE_DISTANCES,
  PARALLEL_CHALLENGE_CHAR_LIMIT,
  SUPPORTING_CHARACTERS,
  SUPPORTING_CHARACTER_MAX_SELECT,
  CHARACTER_ROLE_NOTE_CHAR_LIMIT,
  CHARACTER_NOTES_CHAR_LIMIT,
  type StoryWorld,
  type ProtagonistType,
  type SupportingCharacter,
  type AgeRange,
} from "../../types/storyBrief";
import { useStoryBriefUi } from "../../i18n/storyBriefUi";

// ============================================================================
// Style tokens
// ============================================================================

const CARD_SELECTED_BG = "#EEF2F5";
const CARD_UNSELECTED_BG = COLORS.surface;
const CARD_TINT = "#EEF2F5";
const LOCK_BG = "#F5F5F5";

// ============================================================================
// Props
// ============================================================================

interface Props {
  ageRange: AgeRange | null;
  value: Partial<StoryWorld>;
  onChange: (updates: Partial<StoryWorld>) => void;
  onContinue: () => void;
  /** Defaults to "Save & continue"; use "Submit brief" when this is the last step (personalization ON). */
  continueLabel?: string;
  /** Match Section 5 submit styling when the primary action submits the brief. */
  continueIsSubmit?: boolean;
  /** True while a submit started from this step is in flight. */
  submitting?: boolean;
  onBack?: () => void;
}

// ============================================================================
// Shared sub-components
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
// OptionCard — single-select clickable card
// ---------------------------------------------------------------------------

interface OptionCardProps {
  selected: boolean;
  locked?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
  flex?: boolean;
}

function OptionCard({ selected, locked, onClick, children, ariaLabel, flex }: OptionCardProps) {
  return (
    <Card
      elevation={0}
      aria-pressed={selected}
      aria-label={ariaLabel}
      sx={{
        flex: flex ? 1 : undefined,
        border: locked
          ? `1px solid ${COLORS.border}`
          : selected
          ? `2px solid ${COLORS.primary}`
          : `1px solid ${COLORS.border}`,
        backgroundColor: locked ? LOCK_BG : selected ? CARD_SELECTED_BG : CARD_UNSELECTED_BG,
        borderRadius: 2,
        opacity: locked ? 0.7 : 1,
        transition: "border-color 0.15s ease, background-color 0.15s ease",
        "&:hover": !locked ? { borderColor: COLORS.primary } : {},
      }}
    >
      <CardActionArea
        onClick={onClick}
        disabled={locked}
        disableRipple
        sx={{ p: 0, height: "100%", display: "flex", alignItems: "stretch" }}
      >
        {children}
      </CardActionArea>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// SelectedDot — circular indicator (single-select)
// ---------------------------------------------------------------------------

function SelectedDot({ selected, locked }: { selected: boolean; locked?: boolean }) {
  return (
    <Box
      aria-hidden="true"
      sx={{
        width: 16,
        height: 16,
        borderRadius: "50%",
        flexShrink: 0,
        border: `2px solid ${locked ? COLORS.border : selected ? COLORS.primary : COLORS.border}`,
        backgroundColor: locked
          ? COLORS.border
          : selected
          ? COLORS.primary
          : "transparent",
        transition: "all 0.15s ease",
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// CheckDot — square checkbox indicator (multi-select)
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

function TextArea({ id, value, onChange, maxChars, placeholder, minRows = 3, formatCounter }: TextAreaProps) {
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
          {formatCounter(used, maxChars)}
        </Typography>
      </Box>
    </Box>
  );
}

// ============================================================================
// Main component
// ============================================================================

export default function Section4StoryWorld({
  ageRange,
  value,
  onChange,
  onContinue,
  continueLabel,
  continueIsSubmit = false,
  submitting = false,
  onBack,
}: Props) {
  const ui = useStoryBriefUi();
  const primaryCtaLabel = continueLabel ?? ui.saveContinue;
  const uid = useId();
  const id = (suffix: string) => `${uid}-${suffix}`;

  // ── Derive current values ─────────────────────────────────────────────────

  const personalization = value.personalization ?? PERSONALIZATION_DEFAULT;
  const isPersonalized = personalization === "yes";

  const protagonistGender = value.protagonistGender ?? null;
  // When personalization ON, type is locked to "child"
  const protagonistType: ProtagonistType = isPersonalized
    ? "child"
    : (value.protagonistType ?? null) as ProtagonistType;
  const protagonistAgeRelative =
    value.protagonistAgeRelative ?? PROTAGONIST_AGE_RELATIVE_DEFAULT;
  const caregiverPresence = value.caregiverPresence ?? null;
  const narrativeDistance = value.narrativeDistance ?? null;
  const parallelChallenge = value.parallelChallenge ?? "";
  const supportingCharacters = value.supportingCharacters ?? [];
  const characterRoleNotes = value.characterRoleNotes ?? {};
  const characterNotes = value.characterNotes ?? "";

  const supportingAtMax = supportingCharacters.length >= SUPPORTING_CHARACTER_MAX_SELECT;

  // Age guidance note for protagonist type
  const ageGuidanceNote = ageRange ? (ui.PROTAGONIST_TYPE_AGE_GUIDANCE[ageRange] ?? null) : null;

  // Personalization + Direct note
  const showDirectPersonalizationNote = isPersonalized && narrativeDistance === "direct";

  // ── Completion check ──────────────────────────────────────────────────────

  const isComplete =
    caregiverPresence !== null &&
    narrativeDistance !== null &&
    protagonistType !== null &&
    (!isPersonalized
      ? protagonistGender !== null
      : true);

  const rawProtagonistType = value.protagonistType ?? null;

  const missingFields: BriefMissingField[] = [];
  if (!isPersonalized && protagonistGender === null) {
    missingFields.push({ label: ui.s4MissingGender, targetId: id("4-1-label") });
  }
  if (!isPersonalized && rawProtagonistType === null) {
    missingFields.push({ label: ui.s4MissingType, targetId: id("4-2-label") });
  }
  if (caregiverPresence === null) {
    missingFields.push({ label: ui.s4MissingCaregiver, targetId: id("4-4-label") });
  }
  if (narrativeDistance === null) {
    missingFields.push({ label: ui.s4MissingNarrative, targetId: id("4-5-label") });
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handlePersonalizationChange(v: "yes" | "no") {
    const updates: Partial<StoryWorld> = { personalization: v };
    if (v === "yes") {
      // Lock protagonist to child, clear fields that are hidden
      updates.protagonistType = "child";
      updates.protagonistGender = null;
    }
    onChange(updates);
  }

  function handleSupportingToggle(char: SupportingCharacter) {
    const already = supportingCharacters.includes(char);
    if (already) {
      // Remove character and its role note
      const updated = supportingCharacters.filter((c) => c !== char);
      const updatedNotes = { ...characterRoleNotes };
      delete updatedNotes[char];
      onChange({ supportingCharacters: updated, characterRoleNotes: updatedNotes });
    } else if (!supportingAtMax) {
      onChange({ supportingCharacters: [...supportingCharacters, char] });
    }
  }

  function handleRoleNote(char: SupportingCharacter, text: string) {
    onChange({ characterRoleNotes: { ...characterRoleNotes, [char]: text } });
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
          {ui.s4Overline}
        </Typography>
        <Typography variant="h5" fontWeight={700} mb={0.75}>
          {ui.s4Title}
        </Typography>
        <Typography variant="body2" color={COLORS.textSecondary} sx={{ maxWidth: 720 }}>
          {ui.s4Intro}
        </Typography>
      </Box>

      <Stack spacing={5}>
        {/* ═══════════════════════════════════════════════════════════════
            Field 4.0 — Personalization Decision
        ═══════════════════════════════════════════════════════════════ */}
        <FieldGroup id={id("4-0-label")} label={ui.s4Field40}>
          <Typography variant="caption" color={COLORS.textSecondary} display="block" mb={1.5}>
            {ui.s4Field40Helper}
          </Typography>
          <Box display="flex" gap={1.5} sx={{ "@media (max-width: 480px)": { flexDirection: "column" } }}>
            {(["yes", "no"] as const).map((opt) => {
              const selected = personalization === opt;
              return (
                <OptionCard
                  key={opt}
                  selected={selected}
                  onClick={() => handlePersonalizationChange(opt)}
                  flex
                  ariaLabel={opt === "yes" ? ui.s4AriaPersonalizationYes : ui.s4AriaPersonalizationNo}
                >
                  <Box
                    display="flex"
                    flexDirection="column"
                    gap={0.75}
                    px={2.5}
                    py={2}
                    width="100%"
                  >
                    <Box display="flex" alignItems="center" gap={1.25}>
                      <SelectedDot selected={selected} />
                      <Typography
                        variant="body2"
                        fontWeight={selected ? 700 : 600}
                        color={selected ? COLORS.primary : COLORS.textPrimary}
                      >
                        {opt === "yes" ? ui.s4PersonalizationYes : ui.s4PersonalizationNo}
                      </Typography>
                    </Box>
                    <Typography
                      variant="caption"
                      color={COLORS.textSecondary}
                      lineHeight={1.5}
                      pl={3.25}
                    >
                      {ui.PERSONALIZATION_OPTION_DESCRIPTIONS[opt]}
                    </Typography>
                  </Box>
                </OptionCard>
              );
            })}
          </Box>
        </FieldGroup>

        <Divider />

        {/* ═══════════════════════════════════════════════════════════════
            Field 4.1 — Protagonist Gender  (hidden when personalization ON)
        ═══════════════════════════════════════════════════════════════ */}
        {!isPersonalized && (
          <FieldGroup id={id("4-1-label")} label={ui.s4Field41}>
            <Typography variant="caption" color={COLORS.textSecondary} display="block" mb={1.5}>
              {ui.s4Field41Helper}
            </Typography>
            <Box
              display="grid"
              gridTemplateColumns="repeat(3, 1fr)"
              gap={1.25}
              sx={{ "@media (max-width: 480px)": { gridTemplateColumns: "1fr" } }}
            >
              {PROTAGONIST_GENDERS.map((gender) => {
                const selected = protagonistGender === gender;
                return (
                  <OptionCard
                    key={gender}
                    selected={selected}
                    onClick={() => onChange({ protagonistGender: gender })}
                    ariaLabel={ui.PROTAGONIST_GENDER_LABELS[gender]}
                  >
                    <Box
                      display="flex"
                      flexDirection="column"
                      gap={0.5}
                      px={2}
                      py={1.75}
                      width="100%"
                    >
                      <Box display="flex" alignItems="center" gap={1.25}>
                        <SelectedDot selected={selected} />
                        <Typography
                          variant="body2"
                          fontWeight={selected ? 700 : 500}
                          color={selected ? COLORS.primary : COLORS.textPrimary}
                        >
                          {ui.PROTAGONIST_GENDER_LABELS[gender]}
                        </Typography>
                      </Box>
                      {ui.PROTAGONIST_GENDER_NOTE[gender] && (
                        <Typography
                          variant="caption"
                          color={COLORS.textSecondary}
                          lineHeight={1.4}
                          pl={3.25}
                        >
                          {ui.PROTAGONIST_GENDER_NOTE[gender]}
                        </Typography>
                      )}
                    </Box>
                  </OptionCard>
                );
              })}
            </Box>
          </FieldGroup>
        )}

        {!isPersonalized && <Divider />}

        {/* ═══════════════════════════════════════════════════════════════
            Field 4.2 — Protagonist Type
            Locked to "Child character" when personalization is ON
        ═══════════════════════════════════════════════════════════════ */}
        <FieldGroup id={id("4-2-label")} label={ui.s4Field42}>
          {isPersonalized ? (
            /* Locked state */
            <Box>
              <Box
                sx={{
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 2,
                  backgroundColor: LOCK_BG,
                  px: 2.5,
                  py: 1.75,
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                }}
              >
                <SelectedDot selected locked />
                <Box>
                  <Typography variant="body2" fontWeight={600} color={COLORS.textSecondary}>
                    {ui.s4LockedChildTitle}
                  </Typography>
                  <Typography variant="caption" color={COLORS.textSecondary} lineHeight={1.4}>
                    {ui.s4LockedChildSubtitle}
                  </Typography>
                </Box>
                <Chip
                  label={ui.s4LockedChip}
                  size="small"
                  sx={{
                    ml: "auto",
                    fontSize: "0.7rem",
                    backgroundColor: COLORS.background,
                    color: COLORS.textSecondary,
                    border: `1px solid ${COLORS.border}`,
                  }}
                />
              </Box>
            </Box>
          ) : (
            <Box>
              <Typography variant="caption" color={COLORS.textSecondary} display="block" mb={1.5}>
                {ui.s4Field42Helper}
              </Typography>
              <Stack spacing={1.25}>
                {PROTAGONIST_TYPES.map((type) => {
                  const selected = protagonistType === type;
                  return (
                    <OptionCard
                      key={type}
                      selected={selected}
                      onClick={() => onChange({ protagonistType: type })}
                      ariaLabel={ui.PROTAGONIST_TYPE_LABELS[type]}
                    >
                      <Box display="flex" alignItems="center" gap={1.5} px={2.5} py={1.75} width="100%">
                        <SelectedDot selected={selected} />
                        <Typography
                          variant="body2"
                          fontWeight={selected ? 700 : 500}
                          color={selected ? COLORS.primary : COLORS.textPrimary}
                        >
                          {ui.PROTAGONIST_TYPE_LABELS[type]}
                        </Typography>
                      </Box>
                    </OptionCard>
                  );
                })}
              </Stack>
            </Box>
          )}

          {/* Age-range guidance note — shown when personalization OFF */}
          {!isPersonalized && ageGuidanceNote && (
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
              {ageGuidanceNote}
            </Alert>
          )}
        </FieldGroup>

        <Divider />

        {/* ═══════════════════════════════════════════════════════════════
            Field 4.3 — Protagonist Age Relative to Reader
            Hidden when personalization is ON
        ═══════════════════════════════════════════════════════════════ */}
        {!isPersonalized && (
          <>
            <FieldGroup id={id("4-3-label")} label={ui.s4Field43}>
              <Typography variant="caption" color={COLORS.textSecondary} display="block" mb={1.5}>
                {ui.s4Field43Helper}
              </Typography>
              <Box display="flex" gap={1.5} sx={{ "@media (max-width: 480px)": { flexDirection: "column" } }}>
                {PROTAGONIST_AGE_RELATIVES.map((opt) => {
                  const selected = protagonistAgeRelative === opt;
                  return (
                    <OptionCard
                      key={opt}
                      selected={selected}
                      onClick={() => onChange({ protagonistAgeRelative: opt })}
                      flex
                      ariaLabel={ui.PROTAGONIST_AGE_RELATIVE_LABELS[opt]}
                    >
                      <Box display="flex" alignItems="center" gap={1.25} px={2.5} py={1.75} width="100%">
                        <SelectedDot selected={selected} />
                        <Typography
                          variant="body2"
                          fontWeight={selected ? 700 : 500}
                          color={selected ? COLORS.primary : COLORS.textPrimary}
                        >
                          {ui.PROTAGONIST_AGE_RELATIVE_LABELS[opt]}
                          {opt === PROTAGONIST_AGE_RELATIVE_DEFAULT && (
                            <Typography
                              component="span"
                              variant="caption"
                              color={COLORS.textSecondary}
                              fontWeight={400}
                              ml={0.75}
                            >
                              {ui.s3DefaultSuffix}
                            </Typography>
                          )}
                        </Typography>
                      </Box>
                    </OptionCard>
                  );
                })}
              </Box>
            </FieldGroup>
            <Divider />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            Field 4.4 — Caregiver's Presence
        ═══════════════════════════════════════════════════════════════ */}
        <FieldGroup id={id("4-4-label")} label={ui.s4Field44}>
          <Typography variant="caption" color={COLORS.textSecondary} display="block" mb={1.5}>
            {ui.s4Field44Helper}
          </Typography>
          <Stack spacing={1.25}>
            {CAREGIVER_PRESENCES.map((option) => {
              const selected = caregiverPresence === option;
              const desc = ui.CAREGIVER_PRESENCE_DESCRIPTIONS[option];
              return (
                <OptionCard
                  key={option}
                  selected={selected}
                  onClick={() => onChange({ caregiverPresence: option })}
                  ariaLabel={ui.CAREGIVER_PRESENCE_LABELS[option]}
                >
                  <Box
                    display="flex"
                    alignItems="flex-start"
                    gap={1.5}
                    px={2.5}
                    py={desc ? 1.75 : 1.5}
                    width="100%"
                  >
                    <Box pt={desc ? 0.3 : 0}>
                      <SelectedDot selected={selected} />
                    </Box>
                    <Box>
                      <Typography
                        variant="body2"
                        fontWeight={selected ? 700 : 500}
                        color={selected ? COLORS.primary : COLORS.textPrimary}
                        mb={desc ? 0.25 : 0}
                      >
                        {ui.CAREGIVER_PRESENCE_LABELS[option]}
                      </Typography>
                      {desc && (
                        <Typography variant="caption" color={COLORS.textSecondary} lineHeight={1.5}>
                          {desc}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </OptionCard>
              );
            })}
          </Stack>
        </FieldGroup>

        <Divider />

        {/* ═══════════════════════════════════════════════════════════════
            Field 4.5 — Narrative Distance
        ═══════════════════════════════════════════════════════════════ */}
        <FieldGroup id={id("4-5-label")} label={ui.s4Field45}>
          <Typography variant="caption" color={COLORS.textSecondary} display="block" mb={1.5}>
            {ui.s4Field45Helper}
          </Typography>
          <Stack spacing={1.25}>
            {NARRATIVE_DISTANCES.map((dist) => {
              const selected = narrativeDistance === dist;
              return (
                <OptionCard
                  key={dist}
                  selected={selected}
                  onClick={() => onChange({ narrativeDistance: dist })}
                  ariaLabel={ui.NARRATIVE_DISTANCE_LABELS[dist]}
                >
                  <Box display="flex" alignItems="flex-start" gap={1.5} px={2.5} py={1.75} width="100%">
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
                        {ui.NARRATIVE_DISTANCE_LABELS[dist]}
                      </Typography>
                      <Typography variant="caption" color={COLORS.textSecondary} lineHeight={1.5}>
                        {ui.NARRATIVE_DISTANCE_DEFINITIONS[dist]}
                      </Typography>
                    </Box>
                  </Box>
                </OptionCard>
              );
            })}
          </Stack>

          {/* Conditional: Parallel sub-field */}
          {narrativeDistance === "parallel" && (
            <Box
              mt={2}
              sx={{
                border: `1.5px solid ${COLORS.primary}`,
                borderRadius: 2,
                backgroundColor: CARD_TINT,
                p: 2,
              }}
            >
              <Typography variant="body2" fontWeight={600} color={COLORS.primary} mb={0.5}>
                {ui.s4ParallelTitle}
              </Typography>
              <Typography variant="caption" color={COLORS.textSecondary} display="block" mb={1.25}>
                {ui.s4ParallelHelper}
              </Typography>
              <TextArea
                id={id("4-5-parallel")}
                value={parallelChallenge}
                onChange={(v) => onChange({ parallelChallenge: v })}
                maxChars={PARALLEL_CHALLENGE_CHAR_LIMIT}
                placeholder={ui.s4ParallelPlaceholder}
                minRows={2}
                formatCounter={ui.charactersCount}
              />
            </Box>
          )}

          {/* Conditional: Direct + personalization ON note */}
          {showDirectPersonalizationNote && (
            <Alert
              severity="warning"
              sx={{
                mt: 1.5,
                borderRadius: 2,
                "& .MuiAlert-message": { fontSize: "0.875rem" },
              }}
            >
              {ui.s4DirectPersonalizationWarning}
            </Alert>
          )}
        </FieldGroup>

        <Divider />

        {/* ═══════════════════════════════════════════════════════════════
            Field 4.6 — Supporting Characters
        ═══════════════════════════════════════════════════════════════ */}
        <FieldGroup id={id("4-6-label")} label={ui.s4Field46} optional optionalSuffix={ui.optionalSuffix}>
          <Typography variant="caption" color={COLORS.textSecondary} display="block" mb={1.5}>
            {ui.s4Field46Helper(SUPPORTING_CHARACTER_MAX_SELECT)}
          </Typography>
          <Stack spacing={1.25}>
            {SUPPORTING_CHARACTERS.map((char) => {
              const selected = supportingCharacters.includes(char);
              const disabled = !selected && supportingAtMax;
              const roleNote = characterRoleNotes[char] ?? "";

              return (
                <Box key={char}>
                  <Card
                    elevation={0}
                    aria-pressed={selected}
                    sx={{
                      border: selected
                        ? `2px solid ${COLORS.primary}`
                        : `1px solid ${COLORS.border}`,
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
                      onClick={() => handleSupportingToggle(char)}
                      disabled={disabled}
                      disableRipple
                      sx={{ p: 0 }}
                    >
                      <Box display="flex" alignItems="center" gap={1.5} px={2.5} py={1.5} width="100%">
                        <CheckDot selected={selected} />
                        <Typography
                          variant="body2"
                          fontWeight={selected ? 600 : 400}
                          color={selected ? COLORS.primary : COLORS.textPrimary}
                        >
                          {ui.SUPPORTING_CHARACTER_LABELS[char]}
                        </Typography>
                      </Box>
                    </CardActionArea>
                  </Card>

                  {/* Conditional role note — directly below when selected */}
                  {selected && (
                    <Box
                      mt={0.75}
                      ml={2}
                      sx={{
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: 2,
                        backgroundColor: COLORS.surface,
                        "&:focus-within": { borderColor: COLORS.primary },
                        transition: "border-color 0.15s ease",
                      }}
                    >
                      <InputBase
                        value={roleNote}
                        onChange={(e) => {
                          if (e.target.value.length <= CHARACTER_ROLE_NOTE_CHAR_LIMIT) {
                            handleRoleNote(char, e.target.value);
                          }
                        }}
                        placeholder={ui.s4RolePlaceholder}
                        multiline
                        fullWidth
                        inputProps={{ "aria-label": ui.s4RoleAria(ui.SUPPORTING_CHARACTER_LABELS[char]) }}
                        sx={{
                          px: 2,
                          py: 1.25,
                          fontSize: "0.85rem",
                          lineHeight: 1.55,
                          alignItems: "flex-start",
                          "& .MuiInputBase-input": {
                            color: COLORS.textPrimary,
                            "&::placeholder": { color: COLORS.border, opacity: 1 },
                          },
                        }}
                      />
                      <Box
                        display="flex"
                        justifyContent="flex-end"
                        pr={1.5}
                        pb={0.75}
                        mt={-0.5}
                      >
                        <Typography variant="caption" color={COLORS.textSecondary}>
                          {CHARACTER_ROLE_NOTE_CHAR_LIMIT - roleNote.length} /{" "}
                          {CHARACTER_ROLE_NOTE_CHAR_LIMIT}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Box>
              );
            })}
          </Stack>
        </FieldGroup>

        <Divider />

        {/* ═══════════════════════════════════════════════════════════════
            Field 4.7 — Character Notes
        ═══════════════════════════════════════════════════════════════ */}
        <FieldGroup id={id("4-7-label")} label={ui.s4Field47} optional optionalSuffix={ui.optionalSuffix}>
          <Typography variant="caption" color={COLORS.textSecondary} display="block" mb={1.5}>
            {ui.s4Field47Helper}
          </Typography>
          <TextArea
            id={id("4-7-input")}
            value={characterNotes}
            onChange={(v) => onChange({ characterNotes: v })}
            maxChars={CHARACTER_NOTES_CHAR_LIMIT}
            placeholder={ui.s4Field47Placeholder}
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
              disabled={submitting}
              sx={{ color: COLORS.textSecondary, textTransform: "none" }}
            >
              {ui.back}
            </Button>
          )}
          <Button
            variant="contained"
            onClick={() => {
              if (isComplete) onContinue();
            }}
            disabled={!isComplete || submitting}
            sx={{
              px: 4,
              py: 1.25,
              backgroundColor: continueIsSubmit ? COLORS.secondary : COLORS.primary,
              fontWeight: 600,
              textTransform: "none",
              "&:hover": { backgroundColor: continueIsSubmit ? "#6B3D4A" : COLORS.secondary },
              "&:disabled": { opacity: 0.45 },
            }}
          >
            {primaryCtaLabel}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
