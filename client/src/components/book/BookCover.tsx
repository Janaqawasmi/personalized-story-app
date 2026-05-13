import { Box, Button, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import {
  BOOK_COLORS,
  BOOK_FONTS,
  BOOK_GRADIENTS,
  BOOK_RADII,
  BOOK_SHADOWS,
  BOOK_LEATHER_NOISE_SVG,
} from "./bookTokens";

interface BookCoverProps {
  title: string;
  onStart: () => void;
  language?: string;
  uiLanguage?: string;
  coverImage?: string;
  childName?: string;
  startLabel?: string;
  /** Use inside dialogs / flex panes: avoid 100vh so the CTA stays scrollable or visible. */
  embedded?: boolean;
}

const RTL_LANGUAGES = ["he", "ar", "iw", "he-il", "ar-sa", "ar-il"];

function isRtlLanguage(language?: string): boolean {
  if (!language) return false;
  return RTL_LANGUAGES.includes(language.toLowerCase());
}

export default function BookCover({
  title,
  onStart,
  language,
  uiLanguage,
  coverImage,
  childName,
  startLabel,
  embedded = false,
}: BookCoverProps) {
  // Story language — affects body text direction, Hebrew/Arabic body font
  const isStoryRTL = isRtlLanguage(language);
  // UI language — affects button label and the "preview disclaimer" line
  const isUiRTL = isRtlLanguage(uiLanguage || language);
  const [imgLoaded, setImgLoaded] = useState(!coverImage);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (!coverImage) {
      setImgLoaded(true);
      setImgFailed(false);
      return;
    }
    setImgLoaded(false);
    setImgFailed(false);
    const img = new Image();
    let cancelled = false;
    const done = (failed: boolean) => {
      if (cancelled) return;
      setImgLoaded(true);
      if (failed) setImgFailed(true);
    };
    img.onload = () => done(false);
    img.onerror = () => done(true);
    img.src = coverImage;
    // Safety timeout — if neither event fires within 4s, reveal anyway.
    const fallbackTimeout = window.setTimeout(() => done(true), 4000);
    return () => {
      cancelled = true;
      window.clearTimeout(fallbackTimeout);
    };
  }, [coverImage]);

  const showImageHero = Boolean(coverImage && !imgFailed);
  const bodyFont = isUiRTL ? BOOK_FONTS.bodyRtl : BOOK_FONTS.bodyLtr;
  const bodyStyle = isUiRTL ? "normal" : "italic";

  const forLabel = childName
    ? isUiRTL
      ? `סיפור עבור ${childName}`
      : `A story for ${childName}`
    : isUiRTL
    ? "סיפור אישי"
    : "Your story";

  const openLabel = startLabel || (isUiRTL ? "פתח את הספר" : "Open the book");

  return (
    <Box
      dir="ltr"
      sx={{
        minHeight: embedded ? "auto" : "100vh",
        background: BOOK_COLORS.pageBgRadial,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: embedded
          ? { xs: "24px 20px 28px", md: "32px 24px 36px" }
          : { xs: "48px 20px 32px", md: "72px 24px 48px" },
        boxSizing: "border-box",
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: { xs: 260, sm: 300, md: 340 },
          height: { xs: 380, sm: 440, md: 490 },
          filter: BOOK_SHADOWS.bookDropStrong,
          borderRadius: BOOK_RADII.bookPoster,
          mb: { xs: 3, md: 4 },
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            top: 3,
            bottom: 3,
            left: -8,
            width: 10,
            background: BOOK_GRADIENTS.coverBoard,
            zIndex: 0,
            borderRadius: "2px",
          }}
        />
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            top: 3,
            bottom: 3,
            right: -8,
            width: 10,
            background: BOOK_COLORS.parchmentEdgeDark,
            borderLeft: `1px solid rgba(130,77,92,.15)`,
            zIndex: 0,
          }}
        />

        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background: showImageHero
              ? BOOK_GRADIENTS.leather
              : BOOK_GRADIENTS.leatherRich,
            borderRadius: BOOK_RADII.bookPoster,
            zIndex: 2,
            overflow: "hidden",
          }}
        >
          {showImageHero ? (
            <>
              <Box
                aria-hidden
                sx={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: `url(${coverImage})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center top",
                  height: "78%",
                  opacity: imgLoaded ? 1 : 0,
                  transition: "opacity 0.5s ease",
                }}
              />
              <Box
                aria-hidden
                sx={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "62%",
                  background: `linear-gradient(to top, ${BOOK_COLORS.leatherDark} 0%, rgba(60,28,40,0.92) 35%, transparent 100%)`,
                }}
              />
            </>
          ) : (
            <Box
              aria-hidden
              sx={{
                position: "absolute",
                inset: 0,
                opacity: 0.3,
                backgroundImage: BOOK_LEATHER_NOISE_SVG,
              }}
            />
          )}

          <Box
            sx={{
              position: "absolute",
              top: 26,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              zIndex: 3,
            }}
          >
            <Box
              aria-hidden
              sx={{
                width: 30,
                height: "0.5px",
                background:
                  "linear-gradient(to right, transparent, rgba(253,245,238,0.7))",
              }}
            />
            <Typography
              component="div"
              sx={{
                fontFamily: BOOK_FONTS.display,
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.34em",
                textTransform: "uppercase",
                color: BOOK_COLORS.cream,
              }}
            >
              Dammah
            </Typography>
            <Box
              aria-hidden
              sx={{
                width: 30,
                height: "0.5px",
                background:
                  "linear-gradient(to left, transparent, rgba(253,245,238,0.7))",
              }}
            />
          </Box>

          {!showImageHero ? (
            <Box
              sx={{
                position: "absolute",
                inset: 18,
                border: `1px solid rgba(253,245,238,0.18)`,
                borderRadius: "3px",
                pointerEvents: "none",
              }}
              aria-hidden
            />
          ) : null}

          <Box
            sx={{
              position: "absolute",
              bottom: { xs: 22, md: 32 },
              left: 24,
              right: 24,
              textAlign: "center",
              zIndex: 3,
            }}
          >
            <Typography
              component="div"
              sx={{
                fontFamily: BOOK_FONTS.sans,
                fontSize: { xs: 8, md: 9 },
                fontWeight: 800,
                letterSpacing: "0.26em",
                textTransform: "uppercase",
                color: "rgba(253,245,238,0.7)",
                mb: "10px",
              }}
            >
              {forLabel}
            </Typography>

            <Typography
              component="div"
              sx={{
                fontFamily: BOOK_FONTS.display,
                fontSize: { xs: 26, sm: 30, md: 34 },
                fontWeight: 700,
                fontStyle: "italic",
                color: BOOK_COLORS.cream,
                letterSpacing: "-0.01em",
                lineHeight: 1.05,
                textShadow: "0 2px 12px rgba(0,0,0,0.45)",
              }}
            >
              {title}
            </Typography>

            <Box
              aria-hidden
              sx={{
                width: 48,
                height: "0.5px",
                background:
                  "linear-gradient(to right, transparent, rgba(253,245,238,0.55), transparent)",
                margin: "16px auto 0",
              }}
            />
          </Box>
        </Box>
      </Box>

      <Button
        onClick={onStart}
        sx={{
          padding: { xs: "12px 36px", md: "14px 44px" },
          borderRadius: BOOK_RADII.pill,
          background: BOOK_GRADIENTS.ctaPrimary,
          fontFamily: BOOK_FONTS.sans,
          fontSize: { xs: 12, md: 13 },
          fontWeight: 800,
          color: BOOK_COLORS.cream,
          letterSpacing: "0.1em",
          boxShadow: BOOK_SHADOWS.ctaPrimaryStrong,
          textTransform: "uppercase",
          transition: "background 0.3s ease, box-shadow 0.3s ease",
          "&:hover": {
            background: BOOK_GRADIENTS.ctaPrimaryHover,
            boxShadow: "0 10px 28px rgba(90,48,64,0.42)",
          },
        }}
      >
        {openLabel}
      </Button>

      <Typography
        component="div"
        sx={{
          fontFamily: BOOK_FONTS.bodyLtr,
          fontSize: 12,
          fontStyle: "italic",
          color: BOOK_COLORS.inkSoft,
          mt: "14px",
          direction: isUiRTL ? "rtl" : "ltr",
          ...(isUiRTL ? { fontFamily: bodyFont, fontStyle: bodyStyle } : {}),
        }}
      >
        {isUiRTL
          ? "שלושה עמודי תצוגה — ללא צורך ברכישה"
          : "3 pages of preview — no purchase needed"}
      </Typography>
    </Box>
  );
}
