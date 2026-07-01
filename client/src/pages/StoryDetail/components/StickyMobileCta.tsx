import { Box, Typography, Button, useTheme } from "@mui/material";
import { useTranslation } from "../../../i18n/useTranslation";
import { COLORS } from "../../../theme";

interface StickyMobileCtaProps {
  visible: boolean;
  title: string;
  price: string;
  /** Author intent: story is designed to support personalization in general. */
  personalizationEnabled: boolean;
  /** Derived: all four gates pass — show the Personalize button. */
  canStartPersonalization: boolean;
  onPersonalize: () => void;
  /** Called when the user clicks "Buy this story" on a non-personalizable story. */
  onBuy: () => void;
  onPreviewClick: () => void;
}

export default function StickyMobileCta({
  visible,
  title,
  price,
  personalizationEnabled,
  canStartPersonalization,
  onPersonalize,
  onBuy,
  onPreviewClick,
}: StickyMobileCtaProps) {
  const t = useTranslation();
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 0,
        insetInlineStart: 0,
        insetInlineEnd: 0,
        display: { xs: "flex", md: "none" },
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        zIndex: 90,
        background: COLORS.surface,
        borderTop: `1px solid ${COLORS.border}`,
        padding: "12px 20px",
        transform: visible ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.3s ease",
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          sx={{ fontSize: "14px", fontWeight: 700, color: COLORS.textPrimary, overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {title}
        </Typography>
        <Typography sx={{ fontSize: "12px", color: COLORS.textSecondary, mt: 0.25 }}>{price}</Typography>
      </Box>
      <Box sx={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
        <Button
          variant="outlined"
          onClick={onPreviewClick}
          sx={{
            borderColor: COLORS.primary,
            color: COLORS.primary,
            fontSize: "13px",
            fontWeight: 700,
            borderRadius: "10px",
            textTransform: "none",
            py: 1,
            px: 1.5,
            "&:hover": {
              borderColor: COLORS.primary,
              backgroundColor: theme.palette.primary.light,
            },
          }}
        >
          {t("preview.preview")}
        </Button>

        {/* State A: personalization ready */}
        {canStartPersonalization && (
          <Button
            variant="contained"
            disableElevation
            onClick={onPersonalize}
            sx={{
              background: COLORS.secondary,
              color: COLORS.surface,
              fontSize: "13px",
              fontWeight: 700,
              borderRadius: "10px",
              textTransform: "none",
              py: 1,
              px: 1.75,
              "&:hover": { background: theme.palette.secondary.dark },
            }}
          >
            {t("storyDetail.personalizeThisStory")}
          </Button>
        )}

        {/* State B: no personalization — show purchase button */}
        {!personalizationEnabled && !canStartPersonalization && (
          <Button
            variant="contained"
            disableElevation
            onClick={onBuy}
            sx={{
              background: COLORS.secondary,
              color: COLORS.surface,
              fontSize: "13px",
              fontWeight: 700,
              borderRadius: "10px",
              textTransform: "none",
              py: 1,
              px: 1.75,
              "&:hover": { background: theme.palette.secondary.dark },
            }}
          >
            {t("storyDetail.buyThisStory")}
          </Button>
        )}

        {/* State C: personalization intended but not ready — no action button shown */}
      </Box>
    </Box>
  );
}
