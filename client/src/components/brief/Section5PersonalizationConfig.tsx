// client/src/components/brief/Section5PersonalizationConfig.tsx
//
// Story Brief — Section 5: Personalization Configuration
//
// When personalization is OFF → Field 5.2 — Why Not (required, max 400 chars).
// When personalization is ON → confirmation screen (no additional inputs), submit from Section 5.
//
// Spec: /docs/dammah-story-brief-spec-v1.3.md §7

import React, { useId } from "react";
import { Box, Button, Divider, InputBase, Stack, Typography } from "@mui/material";
import { COLORS } from "../../theme";
import BriefValidationSummary, { type BriefMissingField } from "./BriefValidationSummary";
import { WHY_NOT_CHAR_LIMIT, type PersonalizationConfig } from "../../types/storyBrief";
import { useStoryBriefUi } from "../../i18n/storyBriefUi";

const CARD_TINT = "#EEF2F5";

interface Props {
  personalization: "yes" | "no";
  value: Partial<PersonalizationConfig>;
  onChange: (updates: Partial<PersonalizationConfig>) => void;
  onSubmit: () => void;
  onBack?: () => void;
  submitting?: boolean;
}

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

export default function Section5PersonalizationConfig({
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

  const whyNot = value.whyNot ?? "";
  const isPersonalized = personalization === "yes";
  const isComplete = isPersonalized ? true : whyNot.trim().length > 0;

  const missingFields: BriefMissingField[] = [];
  if (!isPersonalized && !whyNot.trim()) {
    missingFields.push({
      label: ui.s5MissingWhyNot,
      targetId: id("5-2-label"),
    });
  }

  return (
    <Box>
      <Box mb={5}>
        <Typography variant="overline" display="block" color={COLORS.textSecondary} letterSpacing={1} mb={0.5}>
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
        {!isPersonalized && (
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
