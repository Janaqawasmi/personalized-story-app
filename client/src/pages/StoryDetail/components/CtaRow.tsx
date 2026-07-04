import { Box, Button, Chip, IconButton, GlobalStyles, Typography, useTheme } from "@mui/material";
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
  /** Called when the user clicks "Buy this story" on a non-personalizable story. */
  onBuy: () => void;
  /** True while the fixed-story purchase is being added to the cart. */
  buying: boolean;
  /** Error message to show if adding the story to the cart failed. */
  buyError: string | null;
  onFavoriteToggle: () => void;
  isFavorite: boolean;
  status: string;
  /** Author intent: story is designed to support personalization in general. */
  personalizationEnabled: boolean;
  /**
   * Derived: all four gates pass — the full wizard can run.
   *   = personalizationEnabled && (textPersonalizationReady || hasValidTextTemplates)
   *     && visualPersonalizationEnabled && visualPersonalizationReady
   */
  canStartPersonalization: boolean;
  /**
   * Technical reason `canStartPersonalization` is false, shown only outside
   * production builds so a specialist/dev debugging "Personalization coming
   * soon" doesn't have to go spelunking through Firestore.
   */
  blockedReason?: string | null;
  favoriteLoading: boolean;
  reducedMotion: boolean;
}

export default function CtaRow({
  onPersonalize,
  onBuy,
  buying,
  buyError,
  onFavoriteToggle,
  isFavorite,
  status,
  personalizationEnabled,
  canStartPersonalization,
  blockedReason,
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

  // State B: story is not designed for personalization — "Buy Story" adds the
  // original template directly to the cart (no personalization form, no child
  // name/gender/photo) and takes the user straight to checkout.
  if (!personalizationEnabled && !comingSoon) {
    return (
      <Box sx={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
          <Button
            variant="contained"
            disableElevation
            onClick={onBuy}
            disabled={buying}
            sx={{
              width: "100%",
              background: COLORS.secondary,
              color: COLORS.surface,
              fontSize: "17px",
              fontWeight: 700,
              borderRadius: SDRadii.cta,
              padding: "16px 20px",
              textTransform: "none",
              "&:hover": {
                background: theme.palette.secondary.dark,
                boxShadow: SDShadows.ctaHover,
              },
              "&.Mui-disabled": {
                background: colorWithAlpha(COLORS.secondary, 0.6),
                color: COLORS.surface,
              },
            }}
          >
            {buying ? t("storyDetail.addingToCart") : t("storyDetail.buyThisStory")}
          </Button>
          {buyError ? (
            <Typography sx={{ fontSize: "12px", color: COLORS.error, px: "2px" }}>{buyError}</Typography>
          ) : (
            <Box sx={{ display: "flex", alignItems: "center", gap: "4px", px: "2px" }}>
              <LockOutlinedIcon sx={{ fontSize: 12, color: COLORS.textSecondary }} />
              <Typography sx={{ fontSize: "12px", color: COLORS.textSecondary }}>
                {t("storyDetail.fixedVersionLabel")}
              </Typography>
            </Box>
          )}
        </Box>
        {favoriteButton}
      </Box>
    );
  }

  // Intended to be personalizable but not all readiness gates are open yet.
  if (personalizationEnabled && !canStartPersonalization && !comingSoon) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: "6px" }}>
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
        {/* Dev/admin diagnostic only — never shown in a production build. */}
        {process.env.NODE_ENV !== "production" && blockedReason && (
          <Typography sx={{ fontSize: "11px", color: COLORS.textSecondary, px: "2px" }}>
            [dev] {blockedReason}
          </Typography>
        )}
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
          {comingSoon ? t("pricing.notifyMe") : t("storyDetail.personalizeThisStory")}
        </Button>

        {favoriteButton}
      </Box>
    </>
  );
}
