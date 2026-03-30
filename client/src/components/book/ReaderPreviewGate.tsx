import { Box, Button, Typography, useTheme, IconButton } from "@mui/material";
import type { Ref } from "react";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CloseIcon from "@mui/icons-material/Close";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";

type TeaserPage = {
  imageUrl?: string;
  textTemplate?: string;
};

export type ReaderPreviewGateVariant = "below" | "overlay";

type GateCardProps = {
  teaserPage?: TeaserPage | null;
  title: string;
  subtitle: string;
  teaserLine: string;
  addToCartLabel: string;
  onAddToCart: () => void;
  ctaAnchorRef?: Ref<HTMLDivElement>;
  teaserHeight: { xs: number; md: number };
  dismissLabel?: string;
  onDismiss?: () => void;
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
  /** When `overlay`, renders as an in-book layer (fullscreen + normal). */
  variant?: ReaderPreviewGateVariant;
  /** Root ref for the gate root (below layout or overlay scrim). */
  sectionRef?: Ref<HTMLDivElement>;
  /** Overlay only: close without purchasing. */
  onDismiss?: () => void;
  dismissLabel?: string;
};

function GateCard({
  teaserPage,
  title,
  subtitle,
  teaserLine,
  addToCartLabel,
  onAddToCart,
  ctaAnchorRef,
  teaserHeight,
  dismissLabel,
  onDismiss,
}: GateCardProps) {
  const theme = useTheme();
  const img = teaserPage?.imageUrl?.trim();

  return (
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
            height: { xs: teaserHeight.xs, md: teaserHeight.md },
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
                fontSize: "0.95rem",
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
            py: 3,
            px: 2,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
          }}
        >
          <LockOutlinedIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />
          <Typography sx={{ fontWeight: 600, fontSize: "0.95rem" }}>{teaserLine}</Typography>
        </Box>
      )}

      <Box
        ref={ctaAnchorRef}
        sx={{
          p: { xs: 2, md: 2.5 },
          backgroundColor: theme.palette.background.paper,
          scrollMarginTop: { xs: 88, md: 96 },
          scrollMarginBottom: 40,
        }}
      >
        <Typography
          variant="h6"
          component="h2"
          sx={{ fontWeight: 700, mb: 0.75, color: theme.palette.text.primary, fontSize: { xs: "1.05rem", md: "1.25rem" } }}
        >
          {title}
        </Typography>
        <Typography
          sx={{
            color: theme.palette.text.secondary,
            mb: 2,
            maxWidth: 560,
            lineHeight: 1.55,
            fontSize: { xs: "0.82rem", md: "0.9rem" },
          }}
        >
          {subtitle}
        </Typography>
        <Button
          variant="contained"
          size="large"
          onClick={onAddToCart}
          startIcon={<ShoppingCartOutlinedIcon />}
          fullWidth
          sx={{
            py: 1.15,
            px: 2,
            fontWeight: 700,
            borderRadius: 2,
            boxShadow: "0 8px 24px rgba(130,77,92,0.35)",
          }}
        >
          {addToCartLabel}
        </Button>
        {onDismiss && dismissLabel ? (
          <Button
            variant="text"
            size="medium"
            onClick={onDismiss}
            fullWidth
            sx={{ mt: 1, color: "text.secondary" }}
          >
            {dismissLabel}
          </Button>
        ) : null}
      </Box>
    </Box>
  );
}

/**
 * After the last free preview spread: lock teaser + purchase CTA.
 * `below` — block under the book (scrollable page). `overlay` — in-book layer (works in fullscreen).
 */
export default function ReaderPreviewGate({
  teaserPage,
  title,
  subtitle,
  teaserLine,
  addToCartLabel,
  onAddToCart,
  ctaAnchorRef,
  variant = "below",
  sectionRef,
  onDismiss,
  dismissLabel,
}: ReaderPreviewGateProps) {
  if (variant === "overlay") {
    return (
      <Box
        ref={sectionRef}
        id="reader-preview-cta-overlay"
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: 10050,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: { xs: 1.5, md: 2 },
          py: { xs: 1.5, md: 2 },
          borderRadius: { xs: 4, md: 8 },
          background: "linear-gradient(160deg, rgba(18,14,16,0.42) 0%, rgba(18,14,16,0.78) 100%)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          pointerEvents: "auto",
          animation: "readerPreviewOverlayIn 320ms ease-out",
          "@keyframes readerPreviewOverlayIn": {
            from: { opacity: 0 },
            to: { opacity: 1 },
          },
        }}
      >
        {onDismiss ? (
          <IconButton
            onClick={onDismiss}
            aria-label={dismissLabel || "Close"}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              zIndex: 10060,
              color: "rgba(255,255,255,0.92)",
              backgroundColor: "rgba(0,0,0,0.2)",
              "&:hover": { backgroundColor: "rgba(0,0,0,0.35)" },
            }}
          >
            <CloseIcon />
          </IconButton>
        ) : null}
        <Box
          sx={{
            width: "100%",
            maxWidth: 520,
            maxHeight: "100%",
            overflow: "auto",
            borderRadius: 3,
          }}
        >
          <GateCard
            teaserPage={teaserPage}
            title={title}
            subtitle={subtitle}
            teaserLine={teaserLine}
            addToCartLabel={addToCartLabel}
            onAddToCart={onAddToCart}
            ctaAnchorRef={ctaAnchorRef}
            teaserHeight={{ xs: 120, md: 140 }}
            onDismiss={onDismiss}
            dismissLabel={dismissLabel}
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box
      ref={sectionRef}
      sx={{
        maxWidth: 1200,
        mx: "auto",
        mt: 3,
        mb: 2,
        px: { xs: 2, md: 0 },
      }}
    >
      <GateCard
        teaserPage={teaserPage}
        title={title}
        subtitle={subtitle}
        teaserLine={teaserLine}
        addToCartLabel={addToCartLabel}
        onAddToCart={onAddToCart}
        ctaAnchorRef={ctaAnchorRef}
        teaserHeight={{ xs: 160, md: 200 }}
      />
    </Box>
  );
}
