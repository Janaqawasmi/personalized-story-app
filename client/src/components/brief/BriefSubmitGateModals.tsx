// client/src/components/brief/BriefSubmitGateModals.tsx
//
// Modals for spec §8 submit gate: hard block (cannot submit) and hard warnings (ack required).

import React from "react";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Stack,
  Typography,
} from "@mui/material";
import { COLORS } from "../../theme";
import type { SubmitGateItem } from "../../validation/briefSubmitGate";

const DIALOG_PAPER_SX = {
  borderRadius: 3,
  border: `1px solid ${COLORS.border}`,
};

// ── Hard block: submission not allowed ─────────────────────────────────────

interface HardBlockDialogProps {
  open: boolean;
  items: SubmitGateItem[];
  onClose: () => void;
}

export function HardBlockSubmitDialog({ open, items, onClose }: HardBlockDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: DIALOG_PAPER_SX }}>
      <DialogTitle sx={{ fontWeight: 800, color: COLORS.textPrimary, pr: 2 }}>
        Cannot submit yet
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color={COLORS.textSecondary} sx={{ mb: 2, lineHeight: 1.6 }}>
          This brief has a clinical-structure issue that must be fixed before submission. Update the
          fields below, then try again.
        </Typography>
        <Stack spacing={2}>
          {items.map((item) => (
            <Box
              key={item.id}
              sx={{
                p: 2,
                borderRadius: 2,
                border: `1px solid ${COLORS.border}`,
                backgroundColor: "#FAF8F6",
              }}
            >
              <Typography variant="subtitle2" fontWeight={700} color={COLORS.textPrimary} gutterBottom>
                {item.title}
              </Typography>
              <Typography variant="body2" color={COLORS.textSecondary} sx={{ lineHeight: 1.6 }}>
                {item.message}
              </Typography>
            </Box>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button
          variant="contained"
          onClick={onClose}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            backgroundColor: COLORS.primary,
            "&:hover": { backgroundColor: COLORS.secondary },
          }}
        >
          Go back & review
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Hard warnings: acknowledgment required ───────────────────────────────────

interface HardWarningSubmitDialogProps {
  open: boolean;
  items: SubmitGateItem[];
  understood: boolean;
  onUnderstoodChange: (v: boolean) => void;
  onGoBack: () => void;
  onProceed: () => void;
}

export function HardWarningSubmitDialog({
  open,
  items,
  understood,
  onUnderstoodChange,
  onGoBack,
  onProceed,
}: HardWarningSubmitDialogProps) {
  return (
    <Dialog open={open} onClose={onGoBack} fullWidth maxWidth="sm" PaperProps={{ sx: DIALOG_PAPER_SX }}>
      <DialogTitle sx={{ fontWeight: 800, color: COLORS.textPrimary, pr: 2 }}>
        Clinical safety check
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color={COLORS.textSecondary} sx={{ mb: 2, lineHeight: 1.6 }}>
          Your brief matches one or more combinations that need an explicit clinical decision before we
          send it for generation. Review each note, then confirm if you still want to submit.
        </Typography>
        <Stack spacing={2} sx={{ mb: 2 }}>
          {items.map((item, i) => (
            <Box key={item.id}>
              {i > 0 && <Divider sx={{ mb: 2 }} />}
              <Typography variant="subtitle2" fontWeight={700} color={COLORS.textPrimary} gutterBottom>
                {item.title}
              </Typography>
              <Typography variant="body2" color={COLORS.textPrimary} sx={{ mb: 1, lineHeight: 1.55 }}>
                {item.message}
              </Typography>
              <Typography variant="caption" color={COLORS.textSecondary} display="block" sx={{ lineHeight: 1.6 }}>
                {item.clinicalNote}
              </Typography>
            </Box>
          ))}
        </Stack>
        <FormControlLabel
          control={
            <Checkbox
              checked={understood}
              onChange={(_, c) => onUnderstoodChange(c)}
              sx={{ color: COLORS.primary, "&.Mui-checked": { color: COLORS.primary } }}
            />
          }
          label={
            <Typography variant="body2" color={COLORS.textPrimary} sx={{ lineHeight: 1.5 }}>
              I understand and want to proceed
            </Typography>
          }
        />
      </DialogContent>
      <DialogActions
        sx={{
          px: 3,
          pb: 2.5,
          flexDirection: { xs: "column-reverse", sm: "row" },
          gap: 1,
          alignItems: { xs: "stretch", sm: "center" },
        }}
      >
        <Button
          variant="text"
          onClick={onGoBack}
          sx={{ color: COLORS.textSecondary, textTransform: "none", fontWeight: 600 }}
        >
          Go back & review
        </Button>
        <Button
          variant="contained"
          disabled={!understood}
          onClick={onProceed}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            backgroundColor: COLORS.secondary,
            "&:hover": { backgroundColor: "#6B3D4A" },
            "&:disabled": { opacity: 0.45 },
          }}
        >
          Proceed
        </Button>
      </DialogActions>
    </Dialog>
  );
}
