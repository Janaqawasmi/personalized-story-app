import { SxProps, Theme } from "@mui/material";
import { COLORS } from "../../theme";

// Therapeutic design tokens
export const columnTitle: SxProps<Theme> = {
  fontSize: "0.875rem",
  fontWeight: 600,
  color: COLORS.primary,
  marginBottom: 2,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

export const itemStyle: SxProps<Theme> = {
  padding: "12px 20px",
  marginBottom: 1.5,
  borderRadius: "24px", // Pill-style rounded
  backgroundColor: COLORS.surface,
  border: `1px solid ${COLORS.border}`,
  cursor: "pointer",
  transition: "all 0.2s ease",
  fontSize: "1rem",
  fontWeight: 400,
  color: COLORS.textDark,
  "&:hover": {
    backgroundColor: COLORS.grayLight,
    borderColor: COLORS.border,
    transform: "translateY(-1px)",
  },
  "&:active": {
    transform: "translateY(0)",
  },
};

export const activeItem: SxProps<Theme> = {
  backgroundColor: COLORS.beigeLight, // Soft beige
  borderColor: COLORS.primary,
  color: COLORS.primary,
  fontWeight: 500,
  "&:hover": {
    backgroundColor: COLORS.beigeLighter,
  },
};



