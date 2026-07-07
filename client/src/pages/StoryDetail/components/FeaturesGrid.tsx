import { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import ShieldIcon from "@mui/icons-material/Shield";
import VisibilityIcon from "@mui/icons-material/Visibility";
import LanguageIcon from "@mui/icons-material/Language";
import { useTranslation } from "../../../i18n/useTranslation";
import { COLORS } from "../../../theme";
import { colorWithAlpha } from "../StoryDetail.styles";
import { featureStagger, featureItemLtr, featureItemRtl } from "../animations/variants";

interface FeaturesGridProps {
  isRTL: boolean;
  reducedMotion: boolean;
  /** Not every story supports personalization — swap the AI-name/photo tile for a fixed-story one when it doesn't. */
  personalizationEnabled: boolean;
}

/** Soft but visible anchors — same hues, higher presence than pastel */
const SOFT_ICON = {
  ai: colorWithAlpha(COLORS.primary, 0.58),
  psych: colorWithAlpha(COLORS.success, 0.64),
  preview: colorWithAlpha(COLORS.primary, 0.5),
  lang: colorWithAlpha(COLORS.secondary, 0.6),
} as const;

/**
 * Secondary trust row — full-width, below the hero. Holds the trust signals
 * that don't need to compete with the title/purchase panel for attention
 * (AI personalization, psychologist design, preview-first, languages).
 */
export default function FeaturesGrid({ isRTL, reducedMotion, personalizationEnabled }: FeaturesGridProps) {
  const t = useTranslation();
  const itemVariant = reducedMotion ? undefined : isRTL ? featureItemRtl : featureItemLtr;
  const staggerVariant = reducedMotion ? undefined : featureStagger;

  const items = useMemo(
    () => [
      personalizationEnabled
        ? { key: "ai", iconColor: SOFT_ICON.ai, Icon: PlayArrowIcon, tKey: "features.aiNamePhoto" as const }
        : { key: "fixed", iconColor: SOFT_ICON.ai, Icon: AutoStoriesOutlinedIcon, tKey: "features.completeStory" as const },
      { key: "psych", iconColor: SOFT_ICON.psych, Icon: ShieldIcon, tKey: "features.psychDesigned" as const },
      { key: "preview", iconColor: SOFT_ICON.preview, Icon: VisibilityIcon, tKey: "features.previewFirst" as const },
      { key: "lang", iconColor: SOFT_ICON.lang, Icon: LanguageIcon, tKey: "features.bilingualAvail" as const },
    ],
    [personalizationEnabled],
  );

  const iconSlot = (Icon: typeof PlayArrowIcon, iconColor: string) => (
    <Box
      sx={{
        width: 32,
        height: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon sx={{ fontSize: 22, color: iconColor }} />
    </Box>
  );

  const gridSx = {
    display: "grid",
    gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
    columnGap: "16px",
    rowGap: { xs: "16px", md: "8px" },
  } as const;

  const row = (
    <Box sx={gridSx}>
      {items.map(({ key, iconColor, Icon, tKey }) => (
        <Box key={key} sx={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
          {iconSlot(Icon, iconColor)}
          <Typography
            sx={{
              fontSize: "13px",
              fontWeight: 700,
              color: colorWithAlpha(COLORS.textPrimary, 0.78),
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

  const content = reducedMotion || !itemVariant ? (
    row
  ) : (
    <motion.div variants={staggerVariant} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} style={{ width: "100%" }}>
      <Box sx={gridSx}>
        {items.map(({ key, iconColor, Icon, tKey }) => (
          <motion.div key={key} variants={itemVariant}>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              {iconSlot(Icon, iconColor)}
              <Typography
                sx={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: colorWithAlpha(COLORS.textPrimary, 0.78),
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

  return (
    <Box
      sx={{
        borderTop: `1px solid ${COLORS.border}`,
        borderBottom: `1px solid ${COLORS.border}`,
        py: 3,
        mb: 5,
      }}
    >
      {content}
    </Box>
  );
}
