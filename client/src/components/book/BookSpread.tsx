import { Box, Typography, useTheme } from "@mui/material";
import { useRef, useEffect, useState } from "react";
import { useTranslation } from "../../i18n/useTranslation";

type Page = {
  pageNumber: number;
  textTemplate: string;
  imagePromptTemplate?: string;
  imageUrl?: string;
  emotionalTone?: string;
};

type BookSpreadProps = {
  page: Page;
  title: string;
  isRTL: boolean;
  totalPages: number;
  onNext?: () => void;
  onPrev?: () => void;
  canGoNext?: boolean;
  canGoPrev?: boolean;
};

export default function BookSpread({
  page,
  title,
  isRTL,
  totalPages,
  onNext,
  onPrev,
  canGoNext,
  canGoPrev,
}: BookSpreadProps) {
  const t = useTranslation();
  const theme = useTheme();

  // Drag tracking state
  const dragStartX = useRef<number | null>(null);
  const dragSide = useRef<"left" | "right" | null>(null);
  const isDragging = useRef(false);
  const hasFlippedRef = useRef(false);
  const didDragRef = useRef(false);

  // Visual curl state
  const [curlProgress, setCurlProgress] = useState(0); // 0 → 1
  const [curlSide, setCurlSide] = useState<"left" | "right" | null>(null);

  // Page turn animation state
  const [isTurning, setIsTurning] = useState(false);
  const [turnDirection, setTurnDirection] = useState<"next" | "prev" | null>(null);

  const DRAG_THRESHOLD = 80; // px
  const CORNER_SIZE = 120; // px

  // Page turn trigger function
  const startPageTurn = (direction: "next" | "prev") => {
    if (isTurning) return;

    setIsTurning(true);
    setTurnDirection(direction);

    // Call navigation ONLY after animation finishes
    setTimeout(() => {
      if (direction === "next") onNext?.();
      if (direction === "prev") onPrev?.();

      setIsTurning(false);
      setTurnDirection(null);
    }, 420); // must match animation duration
  };

  // Keyframes for page turn animation
  const pageTurnStyles = {
    "@keyframes pageTurnNext": {
      from: { transform: "translateX(0%)" },
      to: { transform: "translateX(100%)" },
    },
    "@keyframes pageTurnPrev": {
      from: { transform: "translateX(0%)" },
      to: { transform: "translateX(-100%)" },
    },
  };

  // Update curl progress while dragging
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging.current || dragStartX.current === null) return;

      const deltaX = e.clientX - dragStartX.current;
      
      // Mark as drag if movement exceeds threshold
      if (Math.abs(deltaX) > 10) {
        didDragRef.current = true;
      }
      
      const progress = Math.min(Math.abs(deltaX) / 240, 1);

      setCurlProgress(progress);
      setCurlSide(dragSide.current);
    };

    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  // Handle drag release (flip logic)
  useEffect(() => {
    const handlePointerUp = (e: PointerEvent) => {
      if (
        !isDragging.current ||
        dragStartX.current === null ||
        hasFlippedRef.current
      ) {
        return;
      }

      const deltaX = e.clientX - dragStartX.current;

      if (dragSide.current === "left" && deltaX > DRAG_THRESHOLD) {
        hasFlippedRef.current = true;
        startPageTurn("next");
      }

      if (dragSide.current === "right" && deltaX < -DRAG_THRESHOLD) {
        hasFlippedRef.current = true;
        startPageTurn("prev");
      }

      dragStartX.current = null;
      dragSide.current = null;
      isDragging.current = false;

      // Reset curl animation
      setCurlProgress(0);
      setCurlSide(null);
    };

    window.addEventListener("pointerup", handlePointerUp);
    return () => window.removeEventListener("pointerup", handlePointerUp);
  }, [onNext, onPrev]);

  return (
    <Box
      sx={{
        ...pageTurnStyles,
        position: "relative",
        // Book shell frame
        width: "100%",
        maxWidth: 1200,
        mx: "auto",
        minHeight: { xs: "70vh", md: 640 },
        borderRadius: { xs: 4, md: 8 },
        overflowX: "visible",
        overflowY: "hidden",
        border: "1px solid rgba(0,0,0,0.10)",
        background: "linear-gradient(180deg, #f7f2ec 0%, #efe7de 100%)",
        boxShadow:
          "0 26px 60px rgba(0,0,0,0.20), 0 2px 0 rgba(255,255,255,0.65) inset",
        // IMPORTANT: pages must touch
        display: "flex",
        flexDirection: { xs: "column", md: isRTL ? "row-reverse" : "row" },
        // Spine / gutter crease (the "connected pages" look)
        "&::after": {
          content: '""',
          position: "absolute",
          top: 0,
          bottom: 0,
          left: "50%",
          width: { xs: 0, md: 28 },
          transform: "translateX(-50%)",
          // 🔥 THIS IS THE FIX - spine behind pages
          zIndex: 1,
          pointerEvents: "none",
          background:
            "linear-gradient(to right," +
            "rgba(0,0,0,0.22) 0%," +
            "rgba(0,0,0,0.08) 25%," +
            "rgba(255,255,255,0.35) 50%," +
            "rgba(0,0,0,0.08) 75%," +
            "rgba(0,0,0,0.22) 100%)",
        },
      }}
    >
      {/* Page stack — DEBUG VISIBLE */}
      <Box
        sx={{
          position: "absolute",
          top: 20,
          bottom: 20,
          left: -14, // 👈 MUST be negative
          width: 18,
          background: "#d4c2c8", // 👈 solid color for debug
          borderRadius: 2,
          zIndex: 1,
          pointerEvents: "none",
        }}
      />
      {/* Left Page - Text */}
      <Box
        sx={{
          flex: 1,
          zIndex: 2,
          backgroundColor: "#fbfbfb",
          // Paper grain (subtle dots)
          backgroundImage:
            "radial-gradient(rgba(0,0,0,0.025) 1px, transparent 1px)",
          backgroundSize: "3px 3px",
          // Inner shadow toward the spine (makes pages "bend inward")
          boxShadow: isRTL
            ? "inset -30px 0 30px rgba(0,0,0,0.12)"
            : "inset 30px 0 30px rgba(0,0,0,0.12)",
          // Slight edge line
          borderRight: { xs: "none", md: isRTL ? "none" : "1px solid rgba(0,0,0,0.07)" },
          borderLeft: { xs: "none", md: isRTL ? "1px solid rgba(0,0,0,0.07)" : "none" },
          p: { xs: 3, md: 6 },
          display: "flex",
          flexDirection: "column",
          position: "relative",
          minHeight: { xs: "50vh", md: "70vh" },
          cursor: canGoNext ? "pointer" : "default",
          transform:
            curlSide === "left"
              ? `translateX(${curlProgress * 12}px)`
              : undefined,
          transition: isDragging.current ? "none" : "transform 0.35s ease",
          pointerEvents: isTurning ? "none" : "auto",
          "&:hover": canGoNext && !isDragging.current
            ? {
                transform: "scale(1.01)",
              }
            : {},
          "&::after": {
            content: '""',
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            borderRadius: { xs: 4, md: 0 }, // on desktop pages are flush; mobile can be rounded
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.55)",
            opacity: 0.7,
          },
        }}
        onPointerDown={(e) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;

          const inLeftCorner =
            x < CORNER_SIZE && (y < CORNER_SIZE || y > rect.height - CORNER_SIZE);

          if (!inLeftCorner || !canGoNext) return;

          hasFlippedRef.current = false;
          didDragRef.current = false;
          dragStartX.current = e.clientX;
          dragSide.current = "left";
          isDragging.current = true;
        }}
        onClick={() => {
          if (didDragRef.current) return;
          if (canGoNext) {
            startPageTurn("next");
          }
        }}
      >
        {/* Audio Narration Control — soft pill design */}
        <Box
          onClick={() => {
            console.log("Audio narration clicked");
          }}
          sx={{
            position: "absolute",
            top: 20,
            left: 48,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          {/* Play icon circle */}
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "#F3E6EA",
              border: "2px solid #824D5C",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#824D5C",
              fontSize: "0.9rem",
              lineHeight: 1,
              zIndex: 2,
            }}
          >
            ▶
          </Box>

          {/* Text pill */}
          <Box
            sx={{
              ml: -1.2, // overlap with circle
              pl: 2.4,
              pr: 2,
              py: 0.6,
              borderRadius: 999,
              background: "#F3E6EA",
              color: "#824D5C",
              fontSize: "0.85rem",
              fontWeight: 500,
              letterSpacing: "0.02em",
              display: "flex",
              alignItems: "center",
              whiteSpace: "nowrap",
            }}
          >
            {t("book.audioReading")}
          </Box>
        </Box>

        {/* Story Title (small, top) */}
        <Typography
          sx={{
            fontSize: "0.75rem",
            color: theme.palette.text.secondary,
            mb: 2,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {title}
        </Typography>

        {/* Page Text */}
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            alignItems: "center", // ⬅ vertical centering
            justifyContent: "center",
          }}
        >
          <Typography
            sx={{
              maxWidth: 420,
              textAlign: "center",
              fontSize: "1.25rem",
              lineHeight: 2,
              letterSpacing: "0.02em",
              wordSpacing: "0.04em",
              color: theme.palette.text.primary,
              fontFamily: `"Tajawal", "Alef", "Georgia", serif`,
              whiteSpace: "pre-line",
            }}
          >
            {page.textTemplate || ""}
          </Typography>
        </Box>

        {/* Page Number (bottom corner) */}
        <Typography
          sx={{
            fontSize: "0.75rem",
            color: theme.palette.text.secondary,
            position: "absolute",
            bottom: 16,
            [isRTL ? "left" : "right"]: 16,
          }}
        >
          {page.pageNumber}
        </Typography>

        {/* Curl Overlay - Left Page */}
        {curlSide === "left" && (
          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: `${curlProgress * 220}px`,
              height: `${curlProgress * 220}px`,
              background: `
                linear-gradient(
                  135deg,
                  #ffffff 0%,
                  #f2f2f2 40%,
                  #d6d6d6 100%
                )
              `,
              clipPath: "polygon(0 100%, 100% 100%, 0 0)",
              boxShadow: `
                ${curlProgress * 8}px ${curlProgress * -8}px
                ${curlProgress * 16}px rgba(0,0,0,0.25)
              `,
              transition: isDragging.current ? "none" : "all 0.35s ease",
              pointerEvents: "none",
            }}
          />
        )}
      </Box>

      {/* Page stack - right edge */}
      <Box
        sx={{
          position: "absolute",
          top: 14,
          bottom: 14,
          right: 12,
          width: 18,
          zIndex: 1,
          pointerEvents: "none",
          display: { xs: "none", md: "block" },
          opacity: 0.75,
          background:
            "repeating-linear-gradient(to bottom," +
            "rgba(0,0,0,0.08) 0px," +
            "rgba(0,0,0,0.08) 1px," +
            "rgba(255,255,255,0.00) 4px," +
            "rgba(255,255,255,0.00) 7px)",
          filter: "blur(0.6px)",
          maskImage:
            "linear-gradient(to left, rgba(0,0,0,1), rgba(0,0,0,0))",
        }}
      />
      {/* Right Page - Image */}
      <Box
        sx={{
          flex: 1,
          zIndex: 3,
          // Inner shadow toward the spine (makes pages "bend inward")
          boxShadow: isRTL
            ? "inset 30px 0 30px rgba(0,0,0,0.12)"
            : "inset -30px 0 30px rgba(0,0,0,0.12)",
          // Slight edge line
          borderLeft: { xs: "none", md: isRTL ? "none" : "1px solid rgba(0,0,0,0.07)" },
          borderRight: { xs: "none", md: isRTL ? "1px solid rgba(0,0,0,0.07)" : "none" },
          minHeight: "70vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          position: "relative",
          backgroundImage: page.imageUrl
            ? `url(${page.imageUrl})`
            : `linear-gradient(135deg, ${theme.palette.primary.main}08 0%, ${theme.palette.secondary.main}08 100%)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          cursor: canGoPrev ? "pointer" : "default",
          transform:
            curlSide === "right"
              ? `translateX(-${curlProgress * 12}px)`
              : undefined,
          transition: isDragging.current ? "none" : "transform 0.35s ease",
          pointerEvents: isTurning ? "none" : "auto",
          "&:hover": canGoPrev && !isDragging.current
            ? {
                transform: "scale(1.01)",
              }
            : {},
          "&::after": {
            content: '""',
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            borderRadius: { xs: 4, md: 0 }, // on desktop pages are flush; mobile can be rounded
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.55)",
            opacity: 0.7,
          },
        }}
        onPointerDown={(e) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const x = rect.width - (e.clientX - rect.left);
          const y = e.clientY - rect.top;

          const inRightCorner =
            x < CORNER_SIZE && (y < CORNER_SIZE || y > rect.height - CORNER_SIZE);

          if (!inRightCorner || !canGoPrev) return;

          hasFlippedRef.current = false;
          didDragRef.current = false;
          dragStartX.current = e.clientX;
          dragSide.current = "right";
          isDragging.current = true;
        }}
        onClick={() => {
          if (didDragRef.current) return;
          if (canGoPrev) {
            startPageTurn("prev");
          }
        }}
      >
        {/* Page Flip Corner (on hover) */}
        {canGoNext && (
          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              [isRTL ? "left" : "right"]: 0,
              width: 80,
              height: 80,
              background: `linear-gradient(${isRTL ? "225deg" : "135deg"}, ${theme.palette.divider}40 0%, transparent 60%)`,
              borderRadius: isRTL ? "0 0 100% 0" : "0 0 0 100%",
              opacity: 0,
              transition: "opacity 0.2s ease",
              "&:hover": {
                opacity: 0.4,
              },
              pointerEvents: "none",
            }}
          />
        )}
        {!page.imageUrl && (
          <Box
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.palette.background.default,
            }}
          >
            <Typography
              sx={{
                color: theme.palette.text.secondary,
                fontSize: "0.85rem",
                textAlign: "center",
                px: 3,
              }}
            >
              {page.imagePromptTemplate || t("book.imageComingSoon")}
            </Typography>
          </Box>
        )}

        {/* Curl Overlay - Right Page */}
        {curlSide === "right" && (
          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: `${curlProgress * 220}px`,
              height: `${curlProgress * 220}px`,
              background: `
                linear-gradient(
                  225deg,
                  #ffffff 0%,
                  #f2f2f2 40%,
                  #d6d6d6 100%
                )
              `,
              clipPath: "polygon(100% 100%, 100% 0, 0 100%)",
              boxShadow: `
                ${curlProgress * -8}px ${curlProgress * -8}px
                ${curlProgress * 16}px rgba(0,0,0,0.25)
              `,
              transition: isDragging.current ? "none" : "all 0.35s ease",
              pointerEvents: "none",
            }}
          />
        )}
      </Box>

      {/* Full-page turn overlay */}
      {isTurning && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: turnDirection === "next" ? "0%" : "50%",
            width: "50%",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(245,245,245,0.96))",
            backgroundImage:
              "radial-gradient(rgba(0,0,0,0.02) 1px, transparent 1px)",
            backgroundSize: "3px 3px",
            boxShadow: "0 0 40px rgba(0,0,0,0.35)",
            zIndex: 9999,
            animation: `${turnDirection === "next" ? "pageTurnNext" : "pageTurnPrev"} 420ms ease forwards`,
          }}
        />
      )}

      {/* Page Counter */}
      <Typography
        sx={{
          position: "absolute",
          bottom: 12,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
          fontSize: "0.75rem",
          color: "rgba(0,0,0,0.55)",
          background: "rgba(255,255,255,0.55)",
          backdropFilter: "blur(6px)",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 999,
          px: 1.4,
          py: 0.4,
          letterSpacing: "0.08em",
        }}
      >
        {page.pageNumber} / {totalPages}
      </Typography>

      {/* LEFT EDGE TAB — Next */}
      {canGoNext && (
        <Box
          onClick={() => startPageTurn("next")}
          sx={{
            position: "absolute",
            top: "50%",
            left: 0,
            transform: "translateY(-50%)",
            zIndex: 30,
            width: { xs: 34, md: 40 },
            height: { xs: 54, md: 64 },
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            userSelect: "none",
            background: "rgba(255,255,255,0.65)",
            backdropFilter: "blur(6px)",
            border: "1px solid rgba(0,0,0,0.10)",
            borderLeft: "none",
            borderRadius: "0 999px 999px 0",
            boxShadow: "0 10px 22px rgba(0,0,0,0.18)",
            opacity: 0.55,
            transition: "opacity 160ms ease, transform 160ms ease",
            "&:hover": {
              opacity: 1,
              transform: "translateY(-50%) translateX(2px)",
            },
          }}
        >
          <Typography sx={{ fontSize: "1.35rem", lineHeight: 1 }}>
            ←
          </Typography>
        </Box>
      )}

      {/* RIGHT EDGE TAB — Prev */}
      {canGoPrev && (
        <Box
          onClick={() => startPageTurn("prev")}
          sx={{
            position: "absolute",
            top: "50%",
            right: 0,
            transform: "translateY(-50%)",
            zIndex: 30,
            width: { xs: 34, md: 40 },
            height: { xs: 54, md: 64 },
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            userSelect: "none",
            background: "rgba(255,255,255,0.65)",
            backdropFilter: "blur(6px)",
            border: "1px solid rgba(0,0,0,0.10)",
            borderRight: "none",
            borderRadius: "999px 0 0 999px",
            boxShadow: "0 10px 22px rgba(0,0,0,0.18)",
            opacity: 0.55,
            transition: "opacity 160ms ease, transform 160ms ease",
            "&:hover": {
              opacity: 1,
              transform: "translateY(-50%) translateX(-2px)",
            },
          }}
        >
          <Typography sx={{ fontSize: "1.35rem", lineHeight: 1 }}>
            →
          </Typography>
        </Box>
      )}
    </Box>
  );
}

