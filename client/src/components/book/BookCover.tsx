import { Box, Typography, Button, useTheme } from "@mui/material";
import { useMemo } from "react";
import { useTranslation } from "../../i18n/useTranslation";

type BookCoverProps = {
  title: string;
  onStart: () => void;
  language?: string;
};

export default function BookCover({
  title,
  onStart,
  language = "he"
}: BookCoverProps) {
  const theme = useTheme();
  const t = useTranslation();

  const isRTL = language === "he" || language === "ar";
  const startText = language === "ar" ? "ابدأ القراءة" : t("book.startReading");

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f5f1e8 0%, #e8dfc8 100%)",
        padding: 4,
        gap: 4
      }}
    >
      {/* 3D Hardcover Book Container */}
      <Box
        sx={{
          position: "relative",
          width: { xs: "85%", sm: "400px", md: "480px" },
          maxWidth: "480px",
          // Let image determine height - no fixed aspect ratio
          display: "flex",
          flexDirection: "column",
          // Outer shadow - book resting on surface
          filter: "drop-shadow(0 20px 40px rgba(0, 0, 0, 0.15)) drop-shadow(0 8px 16px rgba(0, 0, 0, 0.08))",
          transition: "transform 0.3s ease",
          "&:hover": {
            transform: "translateY(-4px)",
            filter: "drop-shadow(0 24px 48px rgba(0, 0, 0, 0.18)) drop-shadow(0 10px 20px rgba(0, 0, 0, 0.1))"
          }
        }}
      >
        {/* Paper Pages - Right Edge (Visible Thickness) */}
        {[...Array(12)].map((_, i) => {
          // Create natural unevenness in page edges
          const baseOffset = i * 1.5;
          const xJitter = (i % 3 === 0 ? 0.4 : i % 3 === 1 ? -0.2 : 0.1);
          const yJitter = (i % 2 === 0 ? 0.3 : -0.2);
          
          // Cream/off-white color variation for realistic paper
          const creamShades = [
            "#fdfbf7", "#faf8f4", "#f8f6f2", "#f5f3ef",
            "#f3f1ed", "#f0eeea", "#eeece8", "#ebe9e5",
            "#e9e7e3", "#e6e4e0", "#e4e2de", "#e1dfdb"
          ];

          return (
            <Box
              key={`right-page-${i}`}
              sx={{
                position: "absolute",
                right: -(baseOffset + xJitter),
                top: baseOffset * 0.3 + yJitter,
                bottom: baseOffset * 0.3 - yJitter,
                width: "6px",
                background: `linear-gradient(to right, 
                  ${creamShades[i]} 0%, 
                  ${creamShades[i]} 70%, 
                  rgba(0,0,0,0.03) 100%)`,
                borderRadius: "0 2px 2px 0",
                boxShadow: "inset -1px 0 2px rgba(0,0,0,0.04)",
                zIndex: 100 - i
              }}
            />
          );
        })}

        {/* Paper Pages - Bottom Edge (Visible Thickness) */}
        {[...Array(12)].map((_, i) => {
          const baseOffset = i * 1.5;
          const yJitter = (i % 3 === 0 ? 0.4 : i % 3 === 1 ? -0.2 : 0.1);
          const xJitter = (i % 2 === 0 ? 0.3 : -0.2);
          
          const creamShades = [
            "#fdfbf7", "#faf8f4", "#f8f6f2", "#f5f3ef",
            "#f3f1ed", "#f0eeea", "#eeece8", "#ebe9e5",
            "#e9e7e3", "#e6e4e0", "#e4e2de", "#e1dfdb"
          ];

          return (
            <Box
              key={`bottom-page-${i}`}
              sx={{
                position: "absolute",
                bottom: -(baseOffset + yJitter),
                left: baseOffset * 0.3 + xJitter,
                right: baseOffset * 0.3 - xJitter,
                height: "6px",
                background: `linear-gradient(to bottom, 
                  ${creamShades[i]} 0%, 
                  ${creamShades[i]} 70%, 
                  rgba(0,0,0,0.04) 100%)`,
                borderRadius: "0 0 2px 2px",
                boxShadow: "inset 0 -1px 2px rgba(0,0,0,0.04)",
                zIndex: 100 - i,
                // Match width of the book cover container
                width: "100%"
              }}
            />
          );
        })}

        {/* Hardcover Book Front */}
        <Box
          sx={{
            position: "relative",
            width: "100%",
            borderRadius: "8px",
            overflow: "hidden",
            background: "#fff",
            // Subtle 3D bevel effect
            boxShadow: `
              inset 0 1px 0 rgba(255,255,255,0.5),
              inset 0 -1px 0 rgba(0,0,0,0.05),
              0 2px 4px rgba(0,0,0,0.08)
            `,
            zIndex: 200,
            // Container adapts to image aspect ratio
            display: "flex",
            flexDirection: "column"
          }}
        >
          {/* Cover Image */}
          <Box
            component="img"
            src="/story-images/placeholders/book-intro-placeholder.jpg"
            alt={title}
            sx={{
              width: "100%",
              height: "auto",
              display: "block",
              // Show full image, no cropping or padding
              objectFit: "contain",
              // Matte finish (no gloss)
              filter: "contrast(0.98) saturate(1.05)"
            }}
          />

          {/* Title Band Overlay - Semi-transparent paper label effect */}
          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: { xs: 2.5, sm: 3, md: 3.5 },
              background: "linear-gradient(to top, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.92) 100%)",
              backdropFilter: "blur(8px)",
              borderTop: "1px solid rgba(0,0,0,0.06)",
              boxShadow: "0 -4px 12px rgba(0,0,0,0.05)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0.5
            }}
          >
            {/* Book Title */}
            <Typography
              variant="h4"
              sx={{
                fontFamily: "'Crimson Text', 'Georgia', 'Times New Roman', serif",
                fontWeight: 600,
                fontSize: { xs: "1.5rem", sm: "1.75rem", md: "2rem" },
                color: "#2c2416",
                textAlign: "center",
                lineHeight: 1.3,
                letterSpacing: "0.02em",
                direction: isRTL ? "rtl" : "ltr",
                // Subtle text shadow for depth
                textShadow: "0 1px 2px rgba(0,0,0,0.08)"
              }}
            >
              {title}
            </Typography>

            {/* Author Name - Placeholder */}
            <Typography
              variant="subtitle1"
              sx={{
                fontFamily: "'Crimson Text', 'Georgia', serif",
                fontWeight: 400,
                fontSize: { xs: "0.95rem", sm: "1rem" },
                color: "#6b5d4f",
                fontStyle: "italic",
                textAlign: "center",
                direction: isRTL ? "rtl" : "ltr"
              }}
            >
              {/* You can add author name here if available */}
            </Typography>
          </Box>
        </Box>

        {/* Spine Thickness - Left Edge */}
        <Box
          sx={{
            position: "absolute",
            left: -8,
            top: 4,
            bottom: 4,
            width: "8px",
            background: "linear-gradient(to right, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.08) 100%)",
            borderRadius: "4px 0 0 4px",
            zIndex: 50
          }}
        />
      </Box>

      {/* Start Reading Button */}
      <Button
        variant="contained"
        onClick={onStart}
        sx={{
          fontSize: { xs: "1.1rem", sm: "1.25rem" },
          fontWeight: 600,
          padding: { xs: "14px 40px", sm: "16px 48px" },
          borderRadius: "12px",
          textTransform: "none",
          fontFamily: isRTL ? "'Rubik', sans-serif" : "'Nunito', sans-serif",
          direction: isRTL ? "rtl" : "ltr",
          background: "linear-gradient(135deg, #ff6b9d 0%, #ff8fab 100%)",
          color: "#fff",
          boxShadow: "0 4px 14px rgba(255, 107, 157, 0.4)",
          transition: "all 0.3s ease",
          "&:hover": {
            background: "linear-gradient(135deg, #ff5a8d 0%, #ff7a9b 100%)",
            boxShadow: "0 6px 20px rgba(255, 107, 157, 0.5)",
            transform: "translateY(-2px)"
          },
          "&:active": {
            transform: "translateY(0)"
          }
        }}
      >
        {startText}
      </Button>
    </Box>
  );
}
