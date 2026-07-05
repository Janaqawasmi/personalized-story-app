// src/components/MegaMenu/styles.ts
import { Theme } from "@mui/material/styles";
import { SystemStyleObject } from "@mui/system";
import { Z_INDEX_MEGA_MENU_PANEL } from "../../constants/zIndex";

// Dropdown panel - attached to navbar
export const panel: SystemStyleObject<Theme> = {
  position: "fixed",
  top: { xs: 56, md: 60 }, // Height of AppBar (must match Navbar.tsx's source of truth)
  left: 0,
  right: 0,
  zIndex: Z_INDEX_MEGA_MENU_PANEL, // Above AppBar
  backgroundColor: (theme: Theme) => theme.palette.background.paper,
  borderTop: "none", // No border line
  borderBottomLeftRadius: (theme: Theme) => theme.shape.borderRadius,
  borderBottomRightRadius: (theme: Theme) => theme.shape.borderRadius,
  boxShadow: "none", // No shadow - looks integrated with navbar
  direction: "rtl",
  overflow: "hidden",
  maxHeight: { xs: "calc(100vh - 56px)", md: "calc(100vh - 60px)" },
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
};

// Container to center content
export const container: SystemStyleObject<Theme> = {
  maxWidth: 1400,
  margin: "0 auto",
  width: "100%",
};

// Grid layout - 2 columns on desktop, stacked on mobile
export const grid: SystemStyleObject<Theme> = {
  display: "grid",
  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
  gap: { xs: 3, md: 40 },
  px: { xs: 2.5, md: 5 },
  py: { xs: 3, md: 5 },
};

export const column: SystemStyleObject<Theme> = {
  display: "flex",
  flexDirection: "column",
};

export const columnHeader: SystemStyleObject<Theme> = {
  fontWeight: 700,
  fontSize: "0.875rem",
  color: (theme: Theme) => theme.palette.text.primary,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  mb: 2.5,
  pb: 1,
  borderBottom: (theme: Theme) => `1px solid ${theme.palette.divider}`,
};

export const item: SystemStyleObject<Theme> = {
  textAlign: "right",
  px: 0,
  py: 1,
  cursor: "pointer",
  fontSize: "0.95rem",
  color: (theme: Theme) => theme.palette.text.primary,
  fontWeight: 400,
  transition: "color 0.15s ease",
  textDecoration: "none",
  "&:hover": {
    color: (theme: Theme) => theme.palette.primary.main,
  },
};

export const itemActive: SystemStyleObject<Theme> = {
  color: (theme: Theme) => theme.palette.primary.main,
  fontWeight: 600,
};
