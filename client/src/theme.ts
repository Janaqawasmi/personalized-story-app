// src/theme.ts
import { createTheme, Theme } from "@mui/material/styles";
import type { Direction } from "./i18n/context/LanguageContext";

export const DESIGN_TOKENS = {
  fontDisplay: "'Cormorant Garamond', serif",
  fontBody: "'DM Sans', sans-serif",

  ink: "#1c1118",
  ink2: "#5a4a52",
  ink3: "#9a8a92",
  rose: "#824D5C",
  rose2: "#B07A8A",
  rose3: "#d4a8b4",
  rosebg: "#fdf0f3",
  gold: "#c4965a",
  cream: "#f8f4ef",
  parchment: "#efe8df",
  border: "#ddd4ca",
  night: "#170d1e",
  night2: "#2a1a35",
  night3: "#3d2548",

  springBounce: "cubic-bezier(0.34, 1.26, 0.64, 1)",
  easeStd: "cubic-bezier(0.4, 0, 0.2, 1)",
};

/** Specialist workspace / Direction B palette (warm editorial UI). */
export const COLORS = {
  primary: "#617891",
  primaryDark: "#4a5f74",
  primarySoft: " #e7ecf1",
  secondary: "#824D5C",

  background: "#E5DFD9",
  cream: "#f5f1eb",
  surface: "#FFFFFF",

  textPrimary: "#2a2421",
  textSecondary: "#4c4440",
  textMuted: "#7a716a",

  border: "#d7cfc4",
  borderSoft: "#e6dfd5",

  success: "#5f7a54",
  successSoft: " #eaf0e4",
  warning: "#b08433",
  warningSoft: " #f5ecd7",
  error: "#a14a4a",
  errorSoft: "#f0e4e4",

  info: "#185FA5",
  infoSoft: "#E6F1FB",
};

/**
 * Single source of truth for admin-panel status pills (purchase status,
 * account status, story status, alert severity, etc). Pages previously
 * duplicated their own hardcoded hex maps for this — route all of them
 * through here instead so retheming/adding a status happens in one place.
 */
export const ADMIN_STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  active: { bg: COLORS.successSoft, fg: COLORS.success },
  approved: { bg: COLORS.successSoft, fg: COLORS.success },
  paid: { bg: COLORS.successSoft, fg: COLORS.success },
  completed: { bg: COLORS.successSoft, fg: COLORS.success },
  published: { bg: COLORS.successSoft, fg: COLORS.success },

  pending: { bg: COLORS.warningSoft, fg: COLORS.warning },
  awaiting: { bg: COLORS.warningSoft, fg: COLORS.warning },

  disabled: { bg: COLORS.errorSoft, fg: COLORS.error },
  rejected: { bg: COLORS.errorSoft, fg: COLORS.error },
  failed: { bg: COLORS.errorSoft, fg: COLORS.error },

  refunded: { bg: COLORS.infoSoft, fg: COLORS.info },
};

/**
 * Categorical palette for admin charts/bar lists (topic breakdowns, per-day
 * bars, etc). Centralized so every chart uses the same 7 colors instead of
 * each component re-declaring its own ad-hoc array.
 */
export const ADMIN_CHART_COLORS: string[] = [
  "#824D5C",
  "#0F6E56",
  "#185FA5",
  "#BA7517",
  "#534AB7",
  "#993556",
  "#3B6D11",
];

/** Severity palette for the Overview alert feed (distinct shape from ADMIN_STATUS_COLORS — needs a border + dot + two text tones). */
export const ADMIN_SEVERITY_COLORS = {
  danger: { bg: "#FCEBEB", border: "#F7C1C1", dot: "#E24B4A", text: "#791F1F", timestamp: "#A32D2D" },
  warn: { bg: "#FAEEDA", border: "#FAC775", dot: "#BA7517", text: "#633806", timestamp: "#854F0B" },
  info: { bg: "#E6F1FB", border: "#B5D4F4", dot: "#185FA5", text: "#0C447C", timestamp: "#185FA5" },
};

/** Shared badge red — sidebar pending-count badges, alert count badges. */
export const ADMIN_BADGE_COLOR = "#E53935";

export function createAppTheme(direction: Direction = "rtl"): Theme {
  return createTheme({
    direction,
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
      divider: COLORS.border,
      error: {
        main: COLORS.error,
      },
      success: {
        main: COLORS.success,
      },
      warning: {
        main: COLORS.warning,
      },
    },

    typography: {
      fontFamily: "'Nunito', 'Segoe UI', sans-serif",
      h1: { fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700 },
      h2: { fontFamily: "'Playfair Display', Georgia, serif" },
      h3: { fontFamily: "'Playfair Display', Georgia, serif" },
      h4: { fontFamily: "'Playfair Display', Georgia, serif" },
      h5: { fontFamily: "'Playfair Display', Georgia, serif" },
      h6: { fontFamily: "'Playfair Display', Georgia, serif" },
      button: {
        textTransform: "none",
        fontWeight: 600,
      },
    },

    shape: {
      borderRadius: 12,
    },
  });
}

// Default theme for backward compatibility (RTL)
const theme = createAppTheme("rtl");

export default theme;
