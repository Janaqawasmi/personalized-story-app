import { SxProps, Theme } from "@mui/material";

export const filterBarSx: SxProps<Theme> = {
  display: "flex",
  alignItems: "center",
  gap: 1,
  flexWrap: "wrap",
  backgroundColor: "#FFFFFF",
  border: "1px solid #D0C8C0",
  borderRadius: "14px",
  padding: "12px 16px",
  marginBottom: 1.5,
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

export const filterLabelSx: SxProps<Theme> = {
  fontSize: "11px",
  fontWeight: 700,
  color: "#888888",
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  whiteSpace: "nowrap",
  flexShrink: 0,
};

export const dividerSx: SxProps<Theme> = {
  width: "1px",
  height: "24px",
  backgroundColor: "#D0C8C0",
  flexShrink: 0,
  mx: 0.5,
};

export const chipBaseSx: SxProps<Theme> = {
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  padding: "6px 14px",
  borderRadius: "20px",
  border: "1px solid #D0C8C0",
  backgroundColor: "#FFFFFF",
  cursor: "pointer",
  fontFamily: "'Nunito', sans-serif",
  fontSize: "13px",
  fontWeight: 500,
  color: "#4A4A4A",
  whiteSpace: "nowrap",
  userSelect: "none",
  transition: "all 0.2s ease",
  flexShrink: 0,
  "&:hover": {
    borderColor: "#B07A8A",
    color: "#824D5C",
    backgroundColor: "#fdf8f6",
  },
};

export const chipActiveSx: SxProps<Theme> = {
  ...chipBaseSx,
  backgroundColor: "#824D5C",
  color: "#FFFFFF",
  borderColor: "#824D5C",
  fontWeight: 600,
  boxShadow: "0 1px 4px rgba(130,77,92,0.25)",
  "&:hover": {
    backgroundColor: "#6d404f",
    borderColor: "#6d404f",
    color: "#FFFFFF",
  },
};

export const chipLockedSx: SxProps<Theme> = {
  ...chipBaseSx,
  background: "linear-gradient(135deg, #824D5C, #B07A8A)",
  color: "#FFFFFF",
  borderColor: "transparent",
  fontWeight: 700,
  cursor: "default",
  padding: "6px 16px",
  "&:hover": {
    background: "linear-gradient(135deg, #824D5C, #B07A8A)",
    borderColor: "transparent",
    color: "#FFFFFF",
  },
};

export const dotSx = (color: string): SxProps<Theme> => ({
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  backgroundColor: color,
  flexShrink: 0,
  display: "inline-block",
});

export const ddAnchorSx: SxProps<Theme> = {
  position: "relative",
  display: "inline-flex",
  flexShrink: 0,
};

export const ddButtonSx: SxProps<Theme> = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "6px 14px",
  borderRadius: "20px",
  border: "1px solid #D0C8C0",
  backgroundColor: "#FFFFFF",
  cursor: "pointer",
  fontFamily: "'Nunito', sans-serif",
  fontSize: "13px",
  fontWeight: 500,
  color: "#4A4A4A",
  whiteSpace: "nowrap",
  transition: "all 0.2s ease",
  "&:hover": {
    borderColor: "#B07A8A",
    color: "#824D5C",
  },
};

export const ddButtonSelectedSx: SxProps<Theme> = {
  ...ddButtonSx,
  backgroundColor: "#f5ece9",
  borderColor: "#B07A8A",
  color: "#824D5C",
  fontWeight: 600,
  "&:hover": {
    backgroundColor: "#f0e0db",
    borderColor: "#824D5C",
    color: "#824D5C",
  },
};

export const ddArrowSx = (open: boolean): SxProps<Theme> => ({
  fontSize: "10px",
  opacity: 0.6,
  transition: "transform 0.2s",
  transform: open ? "rotate(180deg)" : "rotate(0deg)",
  display: "inline-block",
});

export const ddPanelSx: SxProps<Theme> = {
  position: "absolute",
  top: "calc(100% + 6px)",
  insetInlineStart: 0,
  minWidth: "240px",
  backgroundColor: "#FFFFFF",
  border: "1px solid #D0C8C0",
  borderRadius: "12px",
  padding: "6px",
  zIndex: 30,
  maxHeight: "320px",
  overflowY: "auto",
  boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
};

export const ddSearchSx: SxProps<Theme> = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #D0C8C0",
  borderRadius: "8px",
  fontFamily: "'Nunito', sans-serif",
  fontSize: "13px",
  marginBottom: "4px",
  outline: "none",
  color: "#1a1a1a",
  boxSizing: "border-box",
  "&:focus": { borderColor: "#B07A8A" },
};

export const ddCategoryLabelSx: SxProps<Theme> = {
  fontSize: "11px",
  fontWeight: 700,
  color: "#888888",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  padding: "8px 10px 4px",
  userSelect: "none",
};

export const ddItemSx: SxProps<Theme> = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "13px",
  color: "#4A4A4A",
  transition: "all 0.12s",
  "&:hover": { backgroundColor: "#f9f7f5", color: "#1a1a1a" },
};

export const ddItemActiveSx: SxProps<Theme> = {
  ...ddItemSx,
  backgroundColor: "#f5ece9",
  color: "#824D5C",
  fontWeight: 600,
};

export const activeStripSx: SxProps<Theme> = {
  display: "flex",
  alignItems: "center",
  gap: 1,
  flexWrap: "wrap",
  marginBottom: 2,
};

export const activeTagSx: SxProps<Theme> = {
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  padding: "4px 8px 4px 12px",
  borderRadius: "16px",
  backgroundColor: "#f5ece9",
  color: "#824D5C",
  fontSize: "12px",
  fontWeight: 600,
};

export const activeTagXSx: SxProps<Theme> = {
  width: "16px",
  height: "16px",
  minWidth: "16px",
  borderRadius: "50%",
  border: "none",
  backgroundColor: "rgba(130,77,92,0.15)",
  color: "#824D5C",
  fontSize: "9px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  transition: "all 0.15s",
  "&:hover": { backgroundColor: "#824D5C", color: "#FFFFFF" },
};

export const clearAllBtnSx: SxProps<Theme> = {
  padding: "4px 12px",
  borderRadius: "16px",
  border: "1px solid #D0C8C0",
  backgroundColor: "transparent",
  fontFamily: "'Nunito', sans-serif",
  fontSize: "12px",
  fontWeight: 600,
  color: "#888888",
  cursor: "pointer",
  transition: "all 0.15s",
  "&:hover": {
    borderColor: "#A32D2D",
    color: "#A32D2D",
    backgroundColor: "#fef2f2",
  },
};
