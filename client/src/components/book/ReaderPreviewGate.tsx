import { useTheme } from "@mui/material";
import { Box, Button, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type { RefObject } from "react";

type TeaserPage = {
  imageUrl?: string;
  textTemplate?: string;
};

interface ReaderPreviewGateProps {
  teaserPage?: TeaserPage;
  title: string;
  subtitle: string;
  teaserLine?: string;
  addToCartLabel: string;
  onAddToCart: () => void;
  ctaAnchorRef?: RefObject<HTMLDivElement | null>;
  variant?: "below" | "overlay";
  sectionRef?: RefObject<HTMLDivElement | null>;
  onDismiss?: () => void;
  dismissLabel?: string;
  isRTL?: boolean;
}

/**
 * Props contract — must remain compatible with BookReaderPage.tsx:
 *   <ReaderPreviewGate
 *     variant="overlay"
 *     sectionRef={...}
 *     teaserPage={...}
 *     title={...}
 *     subtitle={...}
 *     teaserLine={...}
 *     addToCartLabel={...}
 *     onAddToCart={...}
 *     onDismiss={...}
 *     dismissLabel={...}
 *     ctaAnchorRef={...}
 *   />
 *
 * NEW optional prop: isRTL (boolean). BookReaderPage should pass `isRTL={isRTL}`.
 * If not passed, the ribbon label still renders correctly but without RTL-aware vertical text rotation.
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
  isRTL = false,
}: ReaderPreviewGateProps) {
  const theme = useTheme();

  if (variant === "overlay") {
    return (
      <OverlayGateInBook
        teaserPage={teaserPage}
        title={title}
        subtitle={subtitle}
        teaserLine={teaserLine}
        addToCartLabel={addToCartLabel}
        onAddToCart={onAddToCart}
        onDismiss={onDismiss}
        dismissLabel={dismissLabel}
        sectionRef={sectionRef}
        ctaAnchorRef={ctaAnchorRef}
        isRTL={isRTL}
      />
    );
  }

  // ─────────────────────────────────────────────────────────
  // "below" variant — kept for backwards compatibility.
  // Not touched by this redesign. If you don't use it anywhere,
  // it's fine to leave as-is.
  // ─────────────────────────────────────────────────────────
  return (
    <Box
      ref={sectionRef}
      sx={{
        mt: 4,
        p: 3,
        borderRadius: 3,
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        maxWidth: 640,
        mx: "auto",
        textAlign: "center",
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
        {title}
      </Typography>
      <Typography sx={{ color: theme.palette.text.secondary, mb: 2 }}>
        {subtitle}
      </Typography>
      {teaserLine ? (
        <Typography
          sx={{
            fontStyle: "italic",
            color: theme.palette.text.secondary,
            mb: 3,
          }}
        >
          {teaserLine}
        </Typography>
      ) : null}
      <Box ref={ctaAnchorRef}>
        <Button
          variant="contained"
          onClick={onAddToCart}
          sx={{
            backgroundColor: "#824D5C",
            color: "#FDF5EE",
            fontWeight: 700,
            px: 4,
            py: 1.2,
            borderRadius: 50,
            "&:hover": { backgroundColor: "#6F404D" },
          }}
        >
          {addToCartLabel}
        </Button>
      </Box>
    </Box>
  );
}

// ════════════════════════════════════════════════════════════
// In-book gate — Option A: bookmark ribbon + sealed right page.
// Rendered as two elements:
//   1. A bookmark ribbon anchored to the top of the book spine.
//   2. An overlay that REPLACES only the right page content with
//      the gate card — the left illustration stays fully visible.
// ════════════════════════════════════════════════════════════

function OverlayGateInBook({
  teaserPage,
  title,
  subtitle,
  teaserLine,
  addToCartLabel,
  onAddToCart,
  onDismiss,
  dismissLabel,
  sectionRef,
  ctaAnchorRef,
  isRTL,
}: {
  teaserPage?: TeaserPage;
  title: string;
  subtitle: string;
  teaserLine?: string;
  addToCartLabel: string;
  onAddToCart: () => void;
  onDismiss?: () => void;
  dismissLabel?: string;
  sectionRef?: RefObject<HTMLDivElement | null>;
  ctaAnchorRef?: RefObject<HTMLDivElement | null>;
  isRTL: boolean;
}) {
  return (
    <>
      {/* Absolute overlay that sits INSIDE the book wrapper.
          The book wrapper in BookReaderPage has position:relative + isolation:isolate,
          so this fills the book's bounding box exactly.

          It covers ONLY the right half of the book so the child's illustration
          stays visible on the left. Mobile fallback: a full-book panel. */}
      <Box
        ref={sectionRef}
        sx={{
          position: "absolute",
          top: 0,
          bottom: 0,
          // Cover only the right half of the book on desktop. On mobile, cover the full book.
          // In RTL, the "right page" is visually on the LEFT side of the book, so we swap.
          left: { xs: 0, md: isRTL ? 0 : "50%" },
          right: { xs: 0, md: isRTL ? "50%" : 0 },
          zIndex: 30,
          pointerEvents: "auto",
          borderRadius: {
            xs: 0,
            md: isRTL ? "4px 0 0 4px" : "0 8px 8px 0",
          },
          overflow: "hidden",
          // Sealed-page background: a warm cream parchment with the next-page image
          // whisper-blurred behind it so the page feels paused, not hidden.
          background:
            "linear-gradient(135deg,#F7F2EC 0%,#EFE7DE 60%,#E4D8CE 100%)",
        }}
      >
        {/* Optional teaser background: very subtle blurred next-page image */}
        {teaserPage?.imageUrl ? (
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${teaserPage.imageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(18px) saturate(0.6) brightness(0.95)",
              opacity: 0.18,
              transform: "scale(1.08)",
              pointerEvents: "none",
            }}
          />
        ) : null}

        {/* Parchment grain */}
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            opacity: 0.6,
            pointerEvents: "none",
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.038'/%3E%3C/svg%3E\")",
          }}
        />

        {/* Dismiss (X) button — top-right corner of the sealed page */}
        {onDismiss ? (
          <IconButton
            onClick={onDismiss}
            aria-label={dismissLabel || "Close"}
            sx={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 4,
              width: 32,
              height: 32,
              backgroundColor: "rgba(130,77,92,0.12)",
              color: "#824D5C",
              "&:hover": {
                backgroundColor: "rgba(130,77,92,0.22)",
              },
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        ) : null}

        {/* Corner ornaments (match the book spreads' decorative language) */}
        <CornerOrn pos="tl" />
        <CornerOrn pos="tr" />
        <CornerOrn pos="bl" />
        <CornerOrn pos="br" />

        {/* Card content */}
        <Box
          ref={ctaAnchorRef}
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: { xs: "32px 28px", md: "48px 44px" },
            zIndex: 3,
          }}
        >
          {/* Chapter label */}
          <Typography
            sx={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              color: "#824D5C",
              opacity: 0.7,
              mb: "14px",
            }}
          >
            {subtitle?.split(".")[0] || ""}
          </Typography>

          <Box
            aria-hidden
            sx={{
              width: 52,
              height: 1,
              background:
                "linear-gradient(to right, transparent, #824D5C, transparent)",
              opacity: 0.55,
              mb: "28px",
            }}
          />

          {/* Wax-seal-style lock */}
          <Box
            aria-hidden
            sx={{
              width: 78,
              height: 78,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 35% 30%, #B07A8A 0%, #824D5C 50%, #5A3040 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow:
                "0 6px 16px rgba(90,48,64,.4), inset 0 2px 4px rgba(255,255,255,.25), inset 0 -2px 4px rgba(0,0,0,.2)",
              mb: "22px",
              position: "relative",
            }}
          >
            <Box
              aria-hidden
              sx={{
                position: "absolute",
                inset: "8px",
                border: "1.5px dashed rgba(255,235,225,0.5)",
                borderRadius: "50%",
              }}
            />
            <svg width="28" height="28" viewBox="0 0 26 26" fill="none" aria-hidden>
              <rect
                x="5"
                y="12"
                width="16"
                height="11"
                rx="2"
                stroke="#FDF5EE"
                strokeWidth="1.8"
              />
              <path
                d="M8 12V8.5a5 5 0 0110 0V12"
                stroke="#FDF5EE"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </Box>

          {/* Title — using Playfair italic, book-native */}
          <Typography
            sx={{
              fontFamily: "'Playfair Display', serif",
              fontSize: { xs: 18, md: 22 },
              fontWeight: 700,
              fontStyle: "italic",
              color: "#3C1C24",
              mb: "10px",
              lineHeight: 1.2,
              maxWidth: 280,
            }}
          >
            {title}
          </Typography>

          {/* Teaser / subtitle body */}
          <Typography
            sx={{
              fontFamily: "'Lora', serif",
              fontSize: 13,
              color: "rgba(60,28,36,0.62)",
              lineHeight: 1.65,
              maxWidth: 260,
              mb: "24px",
              fontStyle: "italic",
              // When RTL, swap fonts to match the book's Arabic/Hebrew setting
              ...(isRTL
                ? {
                    fontFamily: "'Frank Ruhl Libre', serif",
                    fontStyle: "normal",
                    direction: "rtl",
                  }
                : {}),
            }}
          >
            {teaserLine || subtitle}
          </Typography>

          <Box
            aria-hidden
            sx={{
              width: 52,
              height: 1,
              background:
                "linear-gradient(to right, transparent, #824D5C, transparent)",
              opacity: 0.55,
              mb: "24px",
            }}
          />

          {/* Primary CTA */}
          <Button
            onClick={onAddToCart}
            sx={{
              padding: "12px 34px",
              borderRadius: 50,
              background: "linear-gradient(90deg,#824D5C,#B07A8A)",
              fontFamily: "'Nunito', sans-serif",
              fontSize: 13,
              fontWeight: 800,
              color: "#FDF5EE",
              letterSpacing: "0.06em",
              boxShadow: "0 4px 16px rgba(90,48,64,.3)",
              mb: "12px",
              textTransform: "none",
              "&:hover": {
                background: "linear-gradient(90deg,#6F404D,#9A6878)",
                boxShadow: "0 6px 20px rgba(90,48,64,.38)",
              },
            }}
          >
            {addToCartLabel}
          </Button>

          {/* Secondary dismiss link (if provided) */}
          {onDismiss && dismissLabel ? (
            <Box
              component="button"
              onClick={onDismiss}
              sx={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "'Nunito', sans-serif",
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(60,28,36,0.4)",
                letterSpacing: "0.04em",
                padding: "4px 8px",
                "&:hover": {
                  color: "rgba(60,28,36,0.7)",
                },
              }}
            >
              {dismissLabel}
            </Box>
          ) : null}
        </Box>
      </Box>

      {/* Bookmark ribbon — sits above the book, hangs off the spine.
          We position it relative to the book wrapper (which is position:relative). */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          top: -14,
          // Center on the spine (50% of the book wrapper width).
          left: "50%",
          transform: "translateX(-50%)",
          width: 28,
          height: 140,
          background: "linear-gradient(to bottom, #824D5C 0%, #6F404D 100%)",
          zIndex: 31,
          boxShadow: "2px 0 4px rgba(0,0,0,.18)",
          pointerEvents: "none",
          // Hide on mobile — book stacks vertically and the ribbon looks orphaned.
          display: { xs: "none", md: "block" },
        }}
      >
        {/* Notched V-shape tail at the bottom */}
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            bottom: -10,
            left: 0,
            width: "100%",
            height: 0,
            borderLeft: "14px solid transparent",
            borderRight: "14px solid transparent",
            borderTop: "12px solid #6F404D",
          }}
        />
        {/* Vertical label */}
        <Typography
          sx={{
            position: "absolute",
            top: "40%",
            left: "50%",
            transform: isRTL
              ? "translate(-50%, -50%) rotate(180deg)"
              : "translate(-50%, -50%)",
            writingMode: "vertical-rl",
            fontFamily: "'Playfair Display', serif",
            fontSize: 8,
            letterSpacing: "0.18em",
            color: "rgba(255,235,225,0.7)",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          {/* Intentionally short label that reads well vertically */}
          {isRTL ? "סוף התצוגה" : "Preview ends"}
        </Typography>
      </Box>
    </>
  );
}

function CornerOrn({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const base = {
    position: "absolute" as const,
    width: 28,
    height: 28,
    pointerEvents: "none" as const,
    zIndex: 2,
    opacity: 0.2,
  };
  const placement: Record<string, object> = {
    tl: { top: 14, left: 14 },
    tr: { top: 14, right: 14, transform: "scaleX(-1)" },
    bl: { bottom: 14, left: 14, transform: "scaleY(-1)" },
    br: { bottom: 14, right: 14, transform: "scale(-1,-1)" },
  };
  return (
    <Box sx={{ ...base, ...placement[pos] }} aria-hidden>
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <path
          d="M4 28 Q4 4 28 4"
          stroke="#824D5C"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M4 28 Q4 16 16 4"
          stroke="#824D5C"
          strokeWidth="0.8"
          fill="none"
          opacity="0.5"
        />
      </svg>
    </Box>
  );
}
