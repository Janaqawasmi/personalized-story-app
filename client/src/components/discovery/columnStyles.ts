import { SxProps, Theme } from "@mui/material";

// Therapeutic design tokens
export const columnTitle: SxProps<Theme> = {
  fontSize: "0.875rem",
  fontWeight: 600,
  color: "#617891",
  marginBottom: 2,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

export const itemStyle: SxProps<Theme> = {
  padding: "12px 20px",
  marginBottom: 1.5,
  borderRadius: "24px", // Pill-style rounded
  backgroundColor: "#ffffff",
  border: "1px solid #e8e8e8",
  cursor: "pointer",
  transition: "all 0.2s ease",
  fontSize: "1rem",
  fontWeight: 400,
  color: "#2c3e50",
  "&:hover": {
    backgroundColor: "#f8f9fa",
    borderColor: "#d0d7de",
    transform: "translateY(-1px)",
  },
  "&:active": {
    transform: "translateY(0)",
  },
};

export const activeItem: SxProps<Theme> = {
  backgroundColor: "#f5f1ec", // Soft beige
  borderColor: "#617891",
  color: "#617891",
  fontWeight: 500,
  "&:hover": {
    backgroundColor: "#ede8e0",
  },
};



