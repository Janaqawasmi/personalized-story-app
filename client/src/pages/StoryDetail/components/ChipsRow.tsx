import { Box, Typography, useTheme } from "@mui/material";
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

const chipSx = {
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  padding: "5px 12px",
  borderRadius: SDRadii.chip,
  fontSize: "13px",
  fontWeight: 600,
  transition: "transform 0.2s",
  "&:hover": { transform: "translateY(-1px)" },
};

export default function ChipsRow({ ageRange, topicLabel }: ChipsRowProps) {
  const t = useTranslation();
  const theme = useTheme();

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: "8px", mb: 2 }}>
      <Box
        sx={{
          ...chipSx,
          backgroundColor: theme.palette.primary.light,
          color: COLORS.primary,
          border: `1px solid ${alpha(COLORS.primary, 0.3)}`,
        }}
      >
        <AutoAwesomeIcon sx={{ fontSize: 16 }} />
        <Typography component="span" sx={{ fontSize: "inherit", fontWeight: 600 }}>
          {t("chips.aiPersonalized")}
        </Typography>
      </Box>
      <Box
        sx={{
          ...chipSx,
          backgroundColor: colorWithAlpha(COLORS.success, 0.12),
          color: COLORS.success,
        }}
      >
        <ShieldIcon sx={{ fontSize: 16 }} />
        <Typography component="span" sx={{ fontSize: "inherit", fontWeight: 600 }}>
          {t("chips.therapeutic")}
        </Typography>
      </Box>
      {ageRange ? (
        <Box sx={{ ...chipSx, backgroundColor: COLORS.background, color: COLORS.textSecondary }}>
          <Typography component="span" sx={{ fontSize: "inherit", fontWeight: 600 }}>
            {t("chips.age", { age: ageRange })}
          </Typography>
        </Box>
      ) : null}
      {topicLabel ? (
        <Box
          sx={{
            ...chipSx,
            backgroundColor: colorWithAlpha(COLORS.secondary, 0.1),
            color: COLORS.secondary,
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
