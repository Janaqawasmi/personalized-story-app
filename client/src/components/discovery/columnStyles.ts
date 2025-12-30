import { SxProps, Theme } from "@mui/material";

// Therapeutic design tokens
export const columnTitle: SxProps<Theme> = {
  fontSize: "0.875rem",
  fontWeight: 600,
  color: (theme: Theme) => theme.palette.primary.main,
  marginBottom: 2,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

export const itemStyle: SxProps<Theme> = {
  padding: "12px 20px",
  marginBottom: 1.5,
  borderRadius: "24px", // Pill-style rounded
  backgroundColor: (theme: Theme) => theme.palette.background.paper,
  border: (theme: Theme) => `1px solid ${theme.palette.divider}`,
  cursor: "pointer",
  transition: "all 0.2s ease",
  fontSize: "1rem",
  fontWeight: 400,
  color: (theme: Theme) => theme.palette.text.primary,
  "&:hover": {
    backgroundColor: (theme: Theme) => theme.palette.background.default,
    borderColor: (theme: Theme) => theme.palette.divider,
    transform: "translateY(-1px)",
  },
  "&:active": {
    transform: "translateY(0)",
  },
};

export const activeItem: SxProps<Theme> = {
  backgroundColor: (theme: Theme) => theme.palette.background.default, // Soft beige
  borderColor: (theme: Theme) => theme.palette.primary.main,
  color: (theme: Theme) => theme.palette.primary.main,
  fontWeight: 500,
  "&:hover": {
    backgroundColor: (theme: Theme) => theme.palette.background.default,
    opacity: 0.9,
  },
};



