import { Box, Button } from "@mui/material";
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
        {/* Solid Hardcover Spine – Connected & Color-Matched */}
        <Box
          sx={{
            position: "absolute",
            left: "-18px",        // tighter → connected
            top: 0,
            bottom: 0,
            width: "18px",

            // Same family as cover, slightly darker
            background: `
              linear-gradient(
                to right,
                #e8dfc8 0%,
                #d8ceb2 35%,
                #cfc4a5 100%
              )
            `,

            borderRadius: "6px 0 0 6px",

            // IMPORTANT: inset shadow = glued seam
            boxShadow: `
              inset -2px 0 4px rgba(0,0,0,0.18),
              inset 1px 0 1px rgba(255,255,255,0.4)
            `,

            zIndex: 300
          }}
        />

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
                zIndex: 100 - i
              }}
            />
          );
        })}

        {/* Hardcover Book Front */}
        <Box
          sx={{
            position: "relative",
            width: "100%",
            height: "100%",
            borderRadius: "8px",
            overflow: "hidden",
            background: "#fff",
            // Subtle 3D bevel effect
            boxShadow: `
              inset 0 1px 0 rgba(255,255,255,0.5),
              inset 0 -1px 0 rgba(0,0,0,0.05),
              0 2px 4px rgba(0,0,0,0.08)
            `,
            zIndex: 200
          }}
        >
          {/* Cover Image */}
          <Box
            component="img"
            src="/story-images/placeholders/book-intro-placeholder.jpg"
            alt={title}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              filter: "contrast(0.98) saturate(1.05)"
            }}
          />
        </Box>
      </Box>

      {/* Start Reading Button */}
      <Button
        variant="contained"
        onClick={onStart}
        sx={{
          px: 4,
          py: 1.2,
          borderRadius: 999,
          direction: isRTL ? "rtl" : "ltr",
          backgroundColor: "#824D5C",
          "&:hover": {
            backgroundColor: "#6f404d",
          },
        }}
      >
        {startText}
      </Button>
    </Box>
  );
}
