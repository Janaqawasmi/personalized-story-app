import { Box, Button, Typography, useTheme } from "@mui/material";
import type { Ref } from "react";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";

type TeaserPage = {
  imageUrl?: string;
  textTemplate?: string;
};

type ReaderPreviewGateProps = {
  teaserPage?: TeaserPage | null;
  title: string;
  subtitle: string;
  teaserLine: string;
  addToCartLabel: string;
  onAddToCart: () => void;
  /** Optional: lower CTA panel (copy + button) for scroll targets / layout. */
  ctaAnchorRef?: Ref<HTMLDivElement>;
};

/**
 * Shown after the last free preview spread: blurred peek at the next spread,
 * lock affordance, and purchase CTA.
 */
export default function ReaderPreviewGate({
  teaserPage,
  title,
  subtitle,
  teaserLine,
  addToCartLabel,
  onAddToCart,
  ctaAnchorRef,
}: ReaderPreviewGateProps) {
  const theme = useTheme();
  const img = teaserPage?.imageUrl?.trim();

  return (
    <Box
      sx={{
        maxWidth: 1200,
        mx: "auto",
        mt: 3,
        mb: 2,
        px: { xs: 2, md: 0 },
      }}
    >
      <Box
        sx={{
          position: "relative",
          borderRadius: 3,
          overflow: "hidden",
          border: `1px solid ${theme.palette.divider}`,
          background:
            "linear-gradient(135deg, rgba(130,77,92,0.12) 0%, rgba(47,62,70,0.08) 45%, rgba(130,77,92,0.15) 100%)",
          boxShadow: "0 20px 48px rgba(0,0,0,0.12)",
        }}
      >
        {img ? (
          <Box
            sx={{
              position: "relative",
              height: { xs: 160, md: 200 },
              overflow: "hidden",
            }}
          >
            <Box
              component="img"
              src={img}
              alt=""
              sx={{
                position: "absolute",
                inset: "-12%",
                width: "124%",
                height: "124%",
                objectFit: "cover",
                filter: "blur(22px) saturate(0.85)",
                transform: "scale(1.08)",
                opacity: 0.85,
                animation: "previewGateShimmer 4.5s ease-in-out infinite",
                "@keyframes previewGateShimmer": {
                  "0%, 100%": { opacity: 0.78, filter: "blur(22px) saturate(0.85)" },
                  "50%": { opacity: 0.92, filter: "blur(18px) saturate(0.95)" },
                },
              }}
            />
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(15,12,14,0.72) 100%)",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                textAlign: "center",
                px: 2,
              }}
            >
              <LockOutlinedIcon sx={{ fontSize: 40, color: "rgba(255,255,255,0.92)" }} />
              <Typography
                sx={{
                  color: "rgba(255,255,255,0.9)",
                  fontSize: "1rem",
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                }}
              >
                {teaserLine}
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              py: 4,
              px: 2,
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
            }}
          >
            <LockOutlinedIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />
            <Typography sx={{ fontWeight: 600 }}>{teaserLine}</Typography>
          </Box>
        )}

        <Box
          ref={ctaAnchorRef}
          sx={{
            p: { xs: 2.5, md: 3 },
            backgroundColor: theme.palette.background.paper,
          }}
        >
          <Typography
            variant="h6"
            component="h2"
            sx={{ fontWeight: 700, mb: 0.75, color: theme.palette.text.primary }}
          >
            {title}
          </Typography>
          <Typography
            sx={{
              color: theme.palette.text.secondary,
              mb: 2.5,
              maxWidth: 560,
              lineHeight: 1.6,
            }}
          >
            {subtitle}
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={onAddToCart}
            startIcon={<ShoppingCartOutlinedIcon />}
            sx={{
              py: 1.25,
              px: 3,
              fontWeight: 700,
              borderRadius: 2,
              boxShadow: "0 8px 24px rgba(130,77,92,0.35)",
            }}
          >
            {addToCartLabel}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
