import { Box, Typography } from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ShieldIcon from "@mui/icons-material/Shield";
import { useTranslation } from "../../../i18n/useTranslation";
import { SDColors, SDRadii } from "../StoryDetail.styles";

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

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: "8px", mb: 2 }}>
      <Box sx={{ ...chipSx, backgroundColor: SDColors.purple.light, color: SDColors.purple.text }}>
        <AutoAwesomeIcon sx={{ fontSize: 16 }} />
        <Typography component="span" sx={{ fontSize: "inherit", fontWeight: 600 }}>
          {t("chips.aiPersonalized")}
        </Typography>
      </Box>
      <Box sx={{ ...chipSx, backgroundColor: SDColors.green.light, color: SDColors.green.dark }}>
        <ShieldIcon sx={{ fontSize: 16 }} />
        <Typography component="span" sx={{ fontSize: "inherit", fontWeight: 600 }}>
          {t("chips.therapeutic")}
        </Typography>
      </Box>
      {ageRange ? (
        <Box sx={{ ...chipSx, backgroundColor: SDColors.amber.light, color: SDColors.amber.dark }}>
          <Typography component="span" sx={{ fontSize: "inherit", fontWeight: 600 }}>
            {t("chips.age", { age: ageRange })}
          </Typography>
        </Box>
      ) : null}
      {topicLabel ? (
        <Box sx={{ ...chipSx, backgroundColor: SDColors.pink.light, color: SDColors.pink.dark }}>
          <Typography component="span" sx={{ fontSize: "inherit", fontWeight: 600 }}>
            {topicLabel}
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
}
