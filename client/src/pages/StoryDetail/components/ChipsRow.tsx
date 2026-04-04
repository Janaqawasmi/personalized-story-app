import { Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ShieldIcon from "@mui/icons-material/Shield";
import { useTranslation } from "../../../i18n/useTranslation";
import { COLORS } from "../../../theme";
import { SDRadii, colorWithAlpha } from "../StoryDetail.styles";

interface ChipsRowProps {
  ageRange: string;
  topicLabel: string;
}

const chipShadow = `0 1px 3px ${colorWithAlpha(COLORS.textPrimary, 0.05)}`;

const chipSx = {
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  padding: "5px 12px",
  borderRadius: SDRadii.chip,
  fontSize: "13px",
  fontWeight: 600,
  transition: "transform 0.2s, box-shadow 0.2s",
  boxShadow: chipShadow,
  "&:hover": { transform: "translateY(-1px)", boxShadow: `0 2px 6px ${colorWithAlpha(COLORS.textPrimary, 0.07)}` },
};

export default function ChipsRow({ ageRange, topicLabel }: ChipsRowProps) {
  const t = useTranslation();

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: "8px", mb: 2 }}>
      <Box
        sx={{
          ...chipSx,
          backgroundColor: colorWithAlpha(COLORS.primary, 0.1),
          color: colorWithAlpha(COLORS.primary, 0.78),
          border: `1px solid ${alpha(COLORS.primary, 0.18)}`,
        }}
      >
        <AutoAwesomeIcon sx={{ fontSize: 16, opacity: 0.9 }} />
        <Typography component="span" sx={{ fontSize: "inherit", fontWeight: 600 }}>
          {t("chips.aiPersonalized")}
        </Typography>
      </Box>
      <Box
        sx={{
          ...chipSx,
          backgroundColor: colorWithAlpha(COLORS.success, 0.12),
          color: colorWithAlpha(COLORS.success, 0.76),
          border: `1px solid ${alpha(COLORS.success, 0.22)}`,
        }}
      >
        <ShieldIcon sx={{ fontSize: 16, opacity: 0.9 }} />
        <Typography component="span" sx={{ fontSize: "inherit", fontWeight: 600 }}>
          {t("chips.therapeutic")}
        </Typography>
      </Box>
      {ageRange ? (
        <Box
          sx={{
            ...chipSx,
            backgroundColor: COLORS.background,
            color: colorWithAlpha(COLORS.textSecondary, 0.92),
            border: `1px solid ${alpha(COLORS.secondary, 0.22)}`,
          }}
        >
          <Typography component="span" sx={{ fontSize: "inherit", fontWeight: 600 }}>
            {t("chips.age", { age: ageRange })}
          </Typography>
        </Box>
      ) : null}
      {topicLabel ? (
        <Box
          sx={{
            ...chipSx,
            backgroundColor: colorWithAlpha(COLORS.secondary, 0.11),
            color: colorWithAlpha(COLORS.secondary, 0.72),
            border: `1px solid ${alpha(COLORS.secondary, 0.2)}`,
          }}
        >
          <Typography component="span" sx={{ fontSize: "inherit", fontWeight: 600 }}>
            {topicLabel}
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
}
