// client/src/components/brief/BriefLanguagePickerField.tsx
//
// Reusable en / he / ar pill selector for brief setup language fields.

import React from "react";
import { Box, Typography } from "@mui/material";
import { COLORS } from "../../theme";
import { STORY_LANGUAGES, type StoryLanguage } from "../../types/storyBrief";
import { useStoryBriefUi } from "../../i18n/storyBriefUi";

const CARD_SELECTED_BG = "#EEF2F5";

interface LanguagePillProps {
  selected: boolean;
  label: string;
  onClick: () => void;
}

function LanguagePill({ selected, label, onClick }: LanguagePillProps) {
  return (
    <Box
      component="button"
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      sx={{
        flex: 1,
        minWidth: 0,
        px: 1.75,
        py: 1.35,
        borderRadius: 2,
        border: `1.5px solid ${selected ? COLORS.primary : COLORS.border}`,
        bgcolor: selected ? CARD_SELECTED_BG : COLORS.surface,
        color: selected ? COLORS.primary : COLORS.textPrimary,
        fontWeight: selected ? 700 : 500,
        fontSize: "0.875rem",
        fontFamily: "inherit",
        cursor: "pointer",
        transition: "border-color 0.15s ease, background-color 0.15s ease",
        "&:hover": { borderColor: COLORS.primary },
      }}
    >
      {label}
    </Box>
  );
}

export interface BriefLanguagePickerFieldProps {
  id: string;
  label: string;
  helper: string;
  value: StoryLanguage;
  onChange: (lang: StoryLanguage) => void;
  mb?: number;
}

export default function BriefLanguagePickerField({
  id,
  label,
  helper,
  value,
  onChange,
  mb = 3,
}: BriefLanguagePickerFieldProps) {
  const ui = useStoryBriefUi();

  return (
    <Box
      component="fieldset"
      aria-labelledby={id}
      sx={{ border: "none", p: 0, m: 0, mb }}
    >
      <Typography component="legend" id={id} variant="body1" fontWeight={600} mb={0.5}>
        {label}
      </Typography>
      <Typography variant="caption" color={COLORS.textSecondary} display="block" mb={1.5} sx={{ lineHeight: 1.55 }}>
        {helper}
      </Typography>
      <Box display="flex" gap={1.25} sx={{ maxWidth: 520 }}>
        {STORY_LANGUAGES.map((lang) => (
          <LanguagePill
            key={lang}
            selected={value === lang}
            label={ui.LANGUAGE_LABELS[lang]}
            onClick={() => onChange(lang)}
          />
        ))}
      </Box>
    </Box>
  );
}
