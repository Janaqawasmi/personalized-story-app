import { Box, Typography, Button, useTheme } from "@mui/material";
import { useMemo } from "react";

type BookCoverProps = {
  title: string;
  onStart: () => void;
  language?: string;
};

export default function BookCover({ title, onStart, language = "he" }: BookCoverProps) {
  const theme = useTheme();
  const isRTL = language === "he" || language === "ar";
  const startText = language === "ar" ? "ابدأ القراءة" : "התחילו לקרוא";

  return (
    <Box
      sx={{
        width: "100%",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.palette.background.default,
        direction: isRTL ? "rtl" : "ltr",
        position: "relative",
      }}
    >
      {/* Cover Image Placeholder */}
      <Box
        sx={{
          width: "100%",
          maxWidth: 600,
          height: "70vh",
          backgroundColor: theme.palette.background.paper,
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mb: 4,
          border: `1px solid ${theme.palette.divider}`,
          backgroundImage: `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.secondary.main}15 100%)`,
        }}
      >
        <Typography
          sx={{
            color: theme.palette.text.secondary,
            fontSize: "0.9rem",
          }}
        >
          {title}
        </Typography>
      </Box>

      {/* Title Overlay */}
      <Box
        sx={{
          position: "absolute",
          bottom: "15%",
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          maxWidth: 600,
          px: 3,
        }}
      >
        <Typography
          sx={{
            fontSize: "2rem",
            fontWeight: 700,
            color: theme.palette.text.primary,
            mb: 3,
            lineHeight: 1.3,
          }}
        >
          {title}
        </Typography>

        <Button
          variant="contained"
          onClick={onStart}
          sx={{
            py: 1.5,
            px: 4,
            borderRadius: 2,
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.background.paper,
            fontSize: "1rem",
            fontWeight: 600,
            textTransform: "none",
            "&:hover": {
              backgroundColor: theme.palette.primary.main,
              opacity: 0.9,
            },
          }}
        >
          {startText}
        </Button>
      </Box>
    </Box>
  );
}








