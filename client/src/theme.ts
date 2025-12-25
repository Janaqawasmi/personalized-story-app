// src/theme.ts
import { createTheme } from "@mui/material/styles";

export const COLORS = {
  // Brand colors
  primary: "#617891",     // Blue (main brand color)
  secondary: "#824D5C",   // Rose accent

  // Backgrounds
  background: "#E5DFD9",  // Frost / page background
  surface: "#FFFFFF",    // Cards, panels

  // Text
  textPrimary: "#000000",
  textSecondary: "#4A4A4A",

  // UI
  border: "#D0C8C0",

  // States
  success: "#4CAF50",
  error: "#E53935",
};

const theme = createTheme({
  palette: {
    primary: {
      main: COLORS.primary,
    },
    secondary: {
      main: COLORS.secondary,
    },
    background: {
      default: COLORS.background,
      paper: COLORS.surface,
    },
    text: {
      primary: COLORS.textPrimary,
      secondary: COLORS.textSecondary,
    },
    error: {
      main: COLORS.error,
    },
    success: {
      main: COLORS.success,
    },
  },

  typography: {
    fontFamily: `"Tajawal", "Alef", "Roboto", sans-serif`,
    h1: {
      fontWeight: 700,
    },
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },

  shape: {
    borderRadius: 12,
  },
});

export default theme;
