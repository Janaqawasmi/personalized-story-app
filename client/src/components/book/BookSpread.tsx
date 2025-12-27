import { Box, Typography, useTheme } from "@mui/material";
import { useRef, useEffect, useState } from "react";

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
        display: "flex",
        flexDirection: { xs: "column", md: isRTL ? "row-reverse" : "row" },
        width: "100%",
        maxWidth: 1100,
        mx: "auto",
        gap: 2,
        minHeight: "70vh",
      }}
    >
      {/* Left Page - Text */}
      <Box
        sx={{
          flex: 1,
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
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
        <Typography
          sx={{
            fontSize: "1.1rem",
            lineHeight: 1.9,
            color: theme.palette.text.primary,
            flexGrow: 1,
            fontFamily: `"Tajawal", "Alef", "Georgia", serif`,
          }}
        >
          {page.textTemplate || ""}
        </Typography>

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

      {/* Right Page - Image */}
      <Box
        sx={{
          flex: 1,
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
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
              {page.imagePromptTemplate || "תמונה תופיע כאן בקרוב"}
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
            backgroundColor: theme.palette.background.paper,
            boxShadow: "0 0 40px rgba(0,0,0,0.35)",
            zIndex: 9999,
            animation: `${turnDirection === "next" ? "pageTurnNext" : "pageTurnPrev"} 420ms ease forwards`,
          }}
        />
      )}
    </Box>
  );
}

