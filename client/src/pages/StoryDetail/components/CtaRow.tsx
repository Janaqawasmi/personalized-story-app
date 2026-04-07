import { Box, Button, IconButton, GlobalStyles, useTheme } from "@mui/material";
import { motion } from "framer-motion";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
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
  favoriteLoading: boolean;
  reducedMotion: boolean;
}

export default function CtaRow({
  onPersonalize,
  onFavoriteToggle,
  isFavorite,
  status,
  favoriteLoading,
  reducedMotion,
}: CtaRowProps) {
  const t = useTranslation();
  const theme = useTheme();
  const comingSoon = status === "coming_soon";

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
      </Box>
    </>
  );
}
