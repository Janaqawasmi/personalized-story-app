import { Box, Button, Chip, IconButton, GlobalStyles, useTheme } from "@mui/material";
import { motion } from "framer-motion";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { useTranslation } from "../../../i18n/useTranslation";
import { COLORS } from "../../../theme";
import { SDRadii, SDShadows, colorWithAlpha } from "../StoryDetail.styles";

interface CtaRowProps {
  onPersonalize: () => void;
  onFavoriteToggle: () => void;
  isFavorite: boolean;
  status: string;
  /** Author intent: story is designed to support personalization in general. */
  personalizationEnabled: boolean;
  /**
   * Derived: all four gates pass — the full wizard can run.
   *   = personalizationEnabled && textPersonalizationReady
   *     && visualPersonalizationEnabled && visualPersonalizationReady
   */
  canStartPersonalization: boolean;
  favoriteLoading: boolean;
  reducedMotion: boolean;
}

export default function CtaRow({
  onPersonalize,
  onFavoriteToggle,
  isFavorite,
  status,
  personalizationEnabled,
  canStartPersonalization,
  favoriteLoading,
  reducedMotion,
}: CtaRowProps) {
  const t = useTranslation();
  const theme = useTheme();
  const comingSoon = status === "coming_soon";

  const favoriteButton = (
    <IconButton
      onClick={onFavoriteToggle}
      disabled={favoriteLoading}
      aria-label={isFavorite ? t("cta.removeFavorite") : t("cta.addFavorite")}
      sx={{
        width: 52,
        height: 52,
        borderRadius: SDRadii.cta,
        flexShrink: 0,
        ...(isFavorite
          ? {
              border: `1px solid ${COLORS.secondary}`,
              backgroundColor: colorWithAlpha(COLORS.secondary, 0.08),
              color: COLORS.secondary,
            }
          : {
              border: `1px solid ${COLORS.border}`,
              backgroundColor: COLORS.surface,
              color: COLORS.textSecondary,
            }),
      }}
    >
      {reducedMotion ? (
        isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />
      ) : (
        <motion.div
          animate={isFavorite ? { scale: [1, 1.2, 1] } : { scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          style={{ display: "flex" }}
        >
          {isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
        </motion.div>
      )}
    </IconButton>
  );

  // Permanently fixed: author never intended this story to support personalization.
  if (!personalizationEnabled && !comingSoon) {
    return (
      <Box sx={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <Chip
          icon={<LockOutlinedIcon sx={{ fontSize: 15 }} />}
          label={t("storyDetail.fixedStory")}
          size="small"
          sx={{
            flex: 1,
            height: 44,
            borderRadius: SDRadii.cta,
            border: `1px solid ${COLORS.border}`,
            backgroundColor: COLORS.surface,
            color: COLORS.textSecondary,
            fontSize: "14px",
            fontWeight: 500,
            "& .MuiChip-icon": { color: COLORS.textSecondary },
          }}
        />
        {favoriteButton}
      </Box>
    );
  }

  // Intended to be personalizable but not all readiness gates are open yet.
  if (personalizationEnabled && !canStartPersonalization && !comingSoon) {
    return (
      <Box sx={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <Chip
          icon={<AccessTimeOutlinedIcon sx={{ fontSize: 15 }} />}
          label={t("storyDetail.personalizationComingSoon")}
          size="small"
          sx={{
            flex: 1,
            height: 44,
            borderRadius: SDRadii.cta,
            border: `1px solid ${colorWithAlpha(COLORS.primary, 0.35)}`,
            backgroundColor: colorWithAlpha(COLORS.primary, 0.05),
            color: COLORS.primary,
            fontSize: "14px",
            fontWeight: 500,
            "& .MuiChip-icon": { color: COLORS.primary },
          }}
        />
        {favoriteButton}
      </Box>
    );
  }

  return (
    <>
      <GlobalStyles
        styles={{
          "@keyframes ctaPulse": {
            "0%, 100%": { boxShadow: `0 0 0 0 ${colorWithAlpha(COLORS.primary, 0)}` },
            "50%": { boxShadow: `0 0 0 10px ${colorWithAlpha(COLORS.primary, 0.3)}` },
          },
        }}
      />
      <Box sx={{ display: "flex", gap: "10px", alignItems: "stretch" }}>
        <Button
          variant="contained"
          disableElevation
          onClick={onPersonalize}
          sx={{
            flex: 1,
            background: COLORS.secondary,
            color: COLORS.surface,
            fontSize: "17px",
            fontWeight: 700,
            borderRadius: SDRadii.cta,
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            textTransform: "none",
            animation: reducedMotion ? "none" : "ctaPulse 2.5s ease-in-out infinite",
            "&:hover": {
              animation: "none",
              transform: "translateY(-2px)",
              background: theme.palette.secondary.dark,
              boxShadow: SDShadows.ctaHover,
            },
          }}
        >
          {comingSoon ? (
            <NotificationsNoneIcon sx={{ fontSize: 18 }} />
          ) : (
            <AutoAwesomeIcon sx={{ fontSize: 18 }} />
          )}
          {comingSoon ? t("pricing.notifyMe") : t("storyDetail.personalize")}
        </Button>

        {favoriteButton}
      </Box>
    </>
  );
}
