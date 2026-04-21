import React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

import { COLORS } from "../../../theme";
import { formatRelativeTime } from "../StoryRow";
import { DRAFT_B } from "./tokens";

export interface SaveStatusBarProps {
  unsaved: boolean;
  isSaving: boolean;
  lastSavedAt: number | null;
  onSave: () => void;
  mode: "read" | "edit";
  onModeToggle: () => void;
  readOnly: boolean;
}

export default function SaveStatusBar({
  unsaved,
  isSaving,
  lastSavedAt,
  onSave,
  mode,
  onModeToggle,
  readOnly,
}: SaveStatusBarProps) {
  if (readOnly) return null;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        mt: 2.5,
        px: "14px",
        py: "10px",
        background: "rgba(255,255,255,0.6)",
        backdropFilter: "blur(4px)",
        border: `1px solid ${DRAFT_B.borderSoft}`,
        borderRadius: "10px",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minHeight: 24 }}>
        {isSaving ? (
          <>
            <CircularProgress size={14} sx={{ color: COLORS.primary }} />
            <Typography variant="body2" sx={{ color: COLORS.primary }}>
              Saving…
            </Typography>
          </>
        ) : unsaved ? (
          <>
            <Typography component="span" sx={{ color: "#ed9b40", fontSize: "14px" }}>
              ●
            </Typography>
            <Typography variant="body2" sx={{ color: "#7a5a1e", fontWeight: 600 }}>
              Unsaved changes
            </Typography>
          </>
        ) : (
          <>
            <CheckCircleOutlineIcon sx={{ fontSize: 14, color: "text.secondary" }} />
            <Typography variant="body2" color="text.secondary">
              {lastSavedAt != null
                ? `Saved ${formatRelativeTime(lastSavedAt)}`
                : "All changes saved"}
            </Typography>
          </>
        )}
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Button variant="text" size="small" onClick={onModeToggle} sx={{ textTransform: "none" }}>
          {mode === "read" ? "Edit" : "Preview"}
        </Button>
        <Button
          variant="contained"
          size="small"
          disabled={!unsaved || isSaving}
          onClick={onSave}
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          Save draft
        </Button>
      </Box>
    </Box>
  );
}
