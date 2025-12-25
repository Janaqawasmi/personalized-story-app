// src/components/MegaMenu/styles.ts
import { Theme } from "@mui/material/styles";
import { SystemStyleObject } from "@mui/system";
import { COLORS } from "../../theme";

export const overlay: SystemStyleObject<Theme> = {
  position: "fixed",
  inset: 0,
  zIndex: 1300, // Below panel but above AppBar
  backgroundColor: COLORS.overlay,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 2, // Add some padding on mobile
};

export const panel: SystemStyleObject<Theme> = {
  width: "100%",
  maxWidth: 1400,
  maxHeight: "90vh", // Prevent overflow on small screens
  backgroundColor: COLORS.surface,
  borderRadius: 4,
  boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
  direction: "rtl",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  margin: "auto", // Additional centering support
};

export const header: SystemStyleObject<Theme> = {
  px: 4,
  py: 3,
  borderBottom: `1px solid ${COLORS.borderLight}`,
  position: "relative",
};

export const title: SystemStyleObject<Theme> = {
  fontSize: "1.35rem",
  fontWeight: 800,
  color: COLORS.textDark,
};

export const subtitle: SystemStyleObject<Theme> = {
  fontSize: "0.95rem",
  color: COLORS.textMuted,
  mt: 0.5,
};

export const grid: SystemStyleObject<Theme> = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 28,
  px: 4,
  py: 4,
  overflowY: "auto", // Allow scrolling if content is too tall
  flex: 1, // Take available space
};

export const column: SystemStyleObject<Theme> = {
  display: "flex",
  flexDirection: "column",
};

export const columnHeader: SystemStyleObject<Theme> = {
  fontWeight: 800,
  fontSize: "1rem",
  color: COLORS.textDark,
  pb: 1,
  mb: 2,
  borderBottom: `1px solid ${COLORS.borderLight}`,
};

export const helperText: SystemStyleObject<Theme> = {
  fontSize: "0.85rem",
  color: COLORS.textMutedLight,
  mt: -1,
  mb: 2,
};

export const item: SystemStyleObject<Theme> = {
  textAlign: "right",
  px: 2,
  py: 1.4,
  borderRadius: 4,
  cursor: "pointer",
  fontSize: "0.95rem",
  color: COLORS.textMedium,
  transition: "background-color 120ms ease",
  "&:hover": { backgroundColor: COLORS.hoverBg },
};

export const itemActive: SystemStyleObject<Theme> = {
  backgroundColor: COLORS.activeBg,
  fontWeight: 800,
  color: COLORS.textDark,
};

export const mutedBox: SystemStyleObject<Theme> = {
  mt: 1,
  px: 2,
  py: 2,
  borderRadius: 4,
  backgroundColor: COLORS.mutedBg,
  color: COLORS.textMutedLight,
  fontSize: "0.9rem",
  textAlign: "right",
};


