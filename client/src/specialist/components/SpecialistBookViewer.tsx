// Full-story book preview for specialists — shown after all illustrations are approved.
// Uses the same BookCover + BookSpread components as the user-facing reader,
// but with no preview gate, no TTS, and no personalization — all pages are accessible.

import { useState, useRef, useCallback, useEffect } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

import BookCover from "../../components/book/BookCover";
import BookSpread, { type BookSpreadHandle } from "../../components/book/BookSpread";
import type { Story } from "../../types/story";
import { COLORS, DESIGN_TOKENS } from "../../theme";

// Detect RTL from the text content (Hebrew/Arabic Unicode ranges)
function detectRTL(text: string): boolean {
  return /[֐-׿؀-ۿ]/.test(text);
}

interface Props {
  story: Story;
}

export default function SpecialistBookViewer({ story }: Props) {
  // Map PageIllustration → the Page shape BookSpread expects.
  // Pages without an illustrationUrl are included — BookSpread shows a placeholder.
  const pages = (story.pages ?? [])
    .sort((a, b) => a.pageNumber - b.pageNumber)
    .map((p) => ({
      pageNumber: p.pageNumber,
      textTemplate: p.text,
      imageUrl: p.illustrationUrl ?? undefined,
    }));

  const [showCover, setShowCover] = useState(true);
  const [spreadIndex, setSpreadIndex] = useState(0);
  const bookSpreadRef = useRef<BookSpreadHandle | null>(null);

  const isRTL = pages.length > 0 ? detectRTL(pages[0].textTemplate) : false;
  const canGoPrev = spreadIndex > 0;
  const canGoNext = spreadIndex < pages.length - 1;
  const currentPage = pages[spreadIndex];

  // These are passed as onNext/onPrev to BookSpread — called when a flip animation ends
  const handlePrev = useCallback(() => {
    setSpreadIndex((i) => Math.max(i - 1, 0));
  }, []);

  const handleNext = useCallback(() => {
    setSpreadIndex((i) => Math.min(i + 1, pages.length - 1));
  }, [pages.length]);

  // Trigger the flip animation from external arrows / keyboard
  const requestFlipPrev = useCallback(() => {
    if (spreadIndex > 0) bookSpreadRef.current?.flipPrev();
  }, [spreadIndex]);

  const requestFlipNext = useCallback(() => {
    if (spreadIndex < pages.length - 1) bookSpreadRef.current?.flipNext();
  }, [spreadIndex, pages.length]);

  // Keyboard navigation
  useEffect(() => {
    if (showCover) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")  isRTL ? requestFlipNext() : requestFlipPrev();
      else if (e.key === "ArrowRight") isRTL ? requestFlipPrev() : requestFlipNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showCover, isRTL, requestFlipPrev, requestFlipNext]);

  if (pages.length === 0) {
    return (
      <Box sx={{ px: { xs: 2, sm: 3, md: 5 }, pt: 5, pb: 6, textAlign: "center" }}>
        <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
          No illustrated pages available.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {showCover ? (
        <BookCover
          title={story.title}
          onStart={() => {
            setSpreadIndex(0);
            setShowCover(false);
          }}
          startLabel="Open book"
        />
      ) : (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            pt: 2,
            pb: 6,
            px: 3,
          }}
        >
          {/* Header */}
          <Box sx={{ width: "100%", maxWidth: 1200, mb: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.25 }}>
              <CheckCircleIcon sx={{ color: COLORS.success, fontSize: 20 }} />
              <Typography
                variant="h6"
                sx={{ fontFamily: DESIGN_TOKENS.fontDisplay, fontWeight: 700, color: COLORS.textPrimary }}
              >
                {story.status === "published" ? "Published story" : "Story preview"}
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: COLORS.textSecondary, pl: "28px" }}>
              Page {spreadIndex + 1} of {pages.length} — use arrow keys or click the arrows to navigate.
            </Typography>
          </Box>
          {/* Book spread + external arrows */}
          <Box
            dir="ltr"
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
              position: "relative",
              isolation: "isolate",
              overflow: "visible",
            }}
          >
            <BookSpread
              ref={bookSpreadRef}
              page={currentPage}
              title={story.title}
              isRTL={isRTL}
              totalPages={pages.length}
              onNext={handleNext}
              onPrev={handlePrev}
              canGoNext={canGoNext}
              canGoPrev={canGoPrev}
              isFullScreen={false}
              nextPage={pages[spreadIndex + 1]}
            />

            {/* Left external arrow */}
            {(isRTL ? canGoNext : canGoPrev) && (
              <Box
                onClick={isRTL ? requestFlipNext : requestFlipPrev}
                sx={{
                  position: "absolute", top: "50%", left: { xs: -56, md: -72 },
                  transform: "translateY(-50%)",
                  width: { xs: 44, md: 56 }, height: { xs: 56, md: 72 },
                  borderRadius: "50%", display: "flex", alignItems: "center",
                  justifyContent: "center", cursor: "pointer", userSelect: "none",
                  backgroundColor: "rgba(255,255,255,0.9)",
                  border: "2px solid rgba(0,0,0,0.12)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  transition: "transform 0.2s, background-color 0.2s",
                  zIndex: 10000,
                  "&:hover": { backgroundColor: "#fff", transform: "translateY(-50%) scale(1.05)" },
                }}
              >
                <Typography sx={{ fontSize: { xs: "1.5rem", md: "1.8rem" }, color: "#824D5C", fontWeight: 600, lineHeight: 1 }}>
                  ←
                </Typography>
              </Box>
            )}

            {/* Right external arrow */}
            {(isRTL ? canGoPrev : canGoNext) && (
              <Box
                onClick={isRTL ? requestFlipPrev : requestFlipNext}
                sx={{
                  position: "absolute", top: "50%", right: { xs: -56, md: -72 },
                  transform: "translateY(-50%)",
                  width: { xs: 44, md: 56 }, height: { xs: 56, md: 72 },
                  borderRadius: "50%", display: "flex", alignItems: "center",
                  justifyContent: "center", cursor: "pointer", userSelect: "none",
                  backgroundColor: "rgba(255,255,255,0.9)",
                  border: "2px solid rgba(0,0,0,0.12)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  transition: "transform 0.2s, background-color 0.2s",
                  zIndex: 10000,
                  "&:hover": { backgroundColor: "#fff", transform: "translateY(-50%) scale(1.05)" },
                }}
              >
                <Typography sx={{ fontSize: { xs: "1.5rem", md: "1.8rem" }, color: "#824D5C", fontWeight: 600, lineHeight: 1 }}>
                  →
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}
