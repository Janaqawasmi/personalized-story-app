import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ShieldIcon from "@mui/icons-material/Shield";
import VisibilityIcon from "@mui/icons-material/Visibility";
import LanguageIcon from "@mui/icons-material/Language";
import { useTranslation } from "../../../i18n/useTranslation";
import { SDRadii } from "../StoryDetail.styles";
import { featureStagger, featureItemLtr, featureItemRtl } from "../animations/variants";

interface FeaturesGridProps {
  isRTL: boolean;
  reducedMotion: boolean;
}

const items = [
  { key: "ai", iconBg: "#EEEDFE", iconColor: "#534AB7", Icon: PlayArrowIcon, tKey: "features.aiNamePhoto" as const },
  { key: "psych", iconBg: "#E1F5EE", iconColor: "#1D9E75", Icon: ShieldIcon, tKey: "features.psychDesigned" as const },
  { key: "preview", iconBg: "#E6F1FB", iconColor: "#378ADD", Icon: VisibilityIcon, tKey: "features.previewFirst" as const },
  { key: "lang", iconBg: "#FAECE7", iconColor: "#D85A30", Icon: LanguageIcon, tKey: "features.bilingualAvail" as const },
];

export default function FeaturesGrid({ isRTL, reducedMotion }: FeaturesGridProps) {
  const t = useTranslation();
  const itemVariant = reducedMotion ? undefined : isRTL ? featureItemRtl : featureItemLtr;
  const staggerVariant = reducedMotion ? undefined : featureStagger;

  const grid = (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        columnGap: "16px",
        rowGap: "6px",
        mb: 2.5,
      }}
    >
      {items.map(({ key, iconBg, iconColor, Icon, tKey }) => (
        <Box key={key} sx={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: SDRadii.featIcon,
              backgroundColor: iconBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon sx={{ fontSize: 16, color: iconColor }} />
          </Box>
          <Typography
            sx={{
              fontSize: "13px",
              fontWeight: 600,
              color: "#555",
              lineHeight: 1.4,
              paddingTop: "6px",
            }}
          >
            {t(tKey)}
          </Typography>
        </Box>
      ))}
    </Box>
  );

  if (reducedMotion || !itemVariant) {
    return grid;
  }

  return (
    <motion.div variants={staggerVariant} initial="hidden" animate="visible" style={{ width: "100%" }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          columnGap: "16px",
          rowGap: "6px",
          mb: 2.5,
        }}
      >
        {items.map(({ key, iconBg, iconColor, Icon, tKey }) => (
          <motion.div key={key} variants={itemVariant}>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: SDRadii.featIcon,
                  backgroundColor: iconBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon sx={{ fontSize: 16, color: iconColor }} />
              </Box>
              <Typography
                sx={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#555",
                  lineHeight: 1.4,
                  paddingTop: "6px",
                }}
              >
                {t(tKey)}
              </Typography>
            </Box>
          </motion.div>
        ))}
      </Box>
    </motion.div>
  );
}
