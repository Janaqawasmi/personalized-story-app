// src/components/MegaMenu/styles.ts
import { Theme } from "@mui/material/styles";
import { SystemStyleObject } from "@mui/system";

export const overlay: SystemStyleObject<Theme> = {
  position: "fixed",
  inset: 0,
  zIndex: 1300, // Below panel but above AppBar
  backgroundColor: "rgba(0,0,0,0.35)",
};

export const panel: SystemStyleObject<Theme> = {
  width: "100%",
  maxWidth: 1400,
  backgroundColor: "#ffffff",
  borderRadius: 4,
  boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
  direction: "rtl",
  overflow: "hidden",
};

export const header: SystemStyleObject<Theme> = {
  px: 4,
  py: 3,
  borderBottom: "1px solid rgba(0,0,0,0.08)",
  position: "relative",
};

export const title: SystemStyleObject<Theme> = {
  fontSize: "1.35rem",
  fontWeight: 800,
  color: "#111827",
};

export const subtitle: SystemStyleObject<Theme> = {
  fontSize: "0.95rem",
  color: "rgba(17,24,39,0.65)",
  mt: 0.5,
};

export const grid: SystemStyleObject<Theme> = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 28,
  px: 4,
  py: 4,
};

export const column: SystemStyleObject<Theme> = {
  display: "flex",
  flexDirection: "column",
};

export const columnHeader: SystemStyleObject<Theme> = {
  fontWeight: 800,
  fontSize: "1rem",
  color: "#111827",
  pb: 1,
  mb: 2,
  borderBottom: "1px solid rgba(0,0,0,0.08)",
};

export const helperText: SystemStyleObject<Theme> = {
  fontSize: "0.85rem",
  color: "rgba(17,24,39,0.55)",
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
  color: "#374151",
  transition: "background-color 120ms ease",
  "&:hover": { backgroundColor: "rgba(0,0,0,0.04)" },
};

export const itemActive: SystemStyleObject<Theme> = {
  backgroundColor: "rgba(17,24,39,0.08)",
  fontWeight: 800,
  color: "#111827",
};

export const mutedBox: SystemStyleObject<Theme> = {
  mt: 1,
  px: 2,
  py: 2,
  borderRadius: 4,
  backgroundColor: "rgba(0,0,0,0.03)",
  color: "rgba(17,24,39,0.55)",
  fontSize: "0.9rem",
  textAlign: "right",
};


