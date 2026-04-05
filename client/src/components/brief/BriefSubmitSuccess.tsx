// client/src/components/brief/BriefSubmitSuccess.tsx
//
// Shown after a successful API submit — brief id, JSON backup, start over.

import React, { useState } from "react";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { COLORS } from "../../theme";

interface Props {
  briefId: string;
  /** Pretty-printed JSON of the submitted brief (local backup). */
  jsonText: string;
  onCreateAnother: () => void;
}

export default function BriefSubmitSuccess({ briefId, jsonText, onCreateAnother }: Props) {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  function handleDownload() {
    const blob = new Blob([jsonText], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `story-brief-${briefId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(jsonText);
      setCopyFeedback("Copied");
      window.setTimeout(() => setCopyFeedback(null), 2000);
    } catch {
      setCopyFeedback("Copy failed — select the text manually");
      window.setTimeout(() => setCopyFeedback(null), 4000);
    }
  }

  return (
    <Box>
      <Stack alignItems="center" textAlign="center" sx={{ mb: 3 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            backgroundColor: "rgba(76, 175, 80, 0.12)",
            color: COLORS.success,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 1.5,
          }}
          aria-hidden
        >
          <CheckCircleOutlineIcon sx={{ fontSize: 34 }} />
        </Box>
        <Typography variant="h5" fontWeight={800} color={COLORS.textPrimary} gutterBottom>
          Brief submitted successfully
        </Typography>
        <Typography variant="body2" color={COLORS.textSecondary} sx={{ maxWidth: 560, lineHeight: 1.6 }}>
          Your brief is saved on the server. Keep the brief ID below for tracking. You can also download or
          copy the JSON as a local backup.
        </Typography>
      </Stack>

      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 2,
          border: `1px solid ${COLORS.border}`,
          backgroundColor: "#FAFAFA",
        }}
      >
        <Typography variant="caption" color={COLORS.textSecondary} fontWeight={700} display="block" mb={0.5}>
          Brief ID
        </Typography>
        <Typography
          variant="body1"
          fontWeight={700}
          sx={{
            fontFamily: "ui-monospace, monospace",
            wordBreak: "break-all",
            color: COLORS.primary,
          }}
        >
          {briefId}
        </Typography>
      </Paper>

      <Typography variant="subtitle2" fontWeight={700} color={COLORS.textPrimary} mb={1}>
        Brief JSON (backup)
      </Typography>
      <Paper
        elevation={0}
        component="pre"
        sx={{
          p: 2,
          mb: 1,
          borderRadius: 2,
          border: `1px solid ${COLORS.border}`,
          maxHeight: 280,
          overflow: "auto",
          fontSize: "0.75rem",
          fontFamily: "ui-monospace, monospace",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          backgroundColor: COLORS.surface,
          margin: 0,
        }}
      >
        {jsonText}
      </Paper>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
        <Button
          type="button"
          variant="outlined"
          size="small"
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
          sx={{ textTransform: "none", fontWeight: 600, borderColor: COLORS.border, color: COLORS.textPrimary }}
        >
          Download JSON
        </Button>
        <Button
          type="button"
          variant="outlined"
          size="small"
          startIcon={<ContentCopyIcon />}
          onClick={() => void handleCopy()}
          sx={{ textTransform: "none", fontWeight: 600, borderColor: COLORS.border, color: COLORS.textPrimary }}
        >
          Copy to clipboard
        </Button>
        {copyFeedback && (
          <Typography variant="caption" color={COLORS.textSecondary} sx={{ alignSelf: "center" }}>
            {copyFeedback}
          </Typography>
        )}
      </Stack>

      <Button
        type="button"
        variant="contained"
        fullWidth
        onClick={onCreateAnother}
        sx={{
          py: 1.25,
          textTransform: "none",
          fontWeight: 700,
          backgroundColor: COLORS.primary,
          "&:hover": { backgroundColor: COLORS.secondary },
        }}
      >
        Create another brief
      </Button>
    </Box>
  );
}
