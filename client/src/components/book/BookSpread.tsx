import { Box, Typography, useTheme } from "@mui/material";

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

  return (
    <Box
      sx={{
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
          cursor: canGoPrev ? "pointer" : "default",
          transition: "transform 0.2s ease",
          "&:hover": canGoPrev
            ? {
                transform: "scale(1.01)",
              }
            : {},
        }}
        onClick={canGoPrev ? onPrev : undefined}
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
          cursor: canGoNext ? "pointer" : "default",
          transition: "transform 0.2s ease",
          "&:hover": canGoNext
            ? {
                transform: "scale(1.01)",
              }
            : {},
        }}
        onClick={canGoNext ? onNext : undefined}
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
      </Box>
    </Box>
  );
}

