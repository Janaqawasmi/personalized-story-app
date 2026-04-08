// client/src/components/brief/MidFlowCheckpoint.tsx
//
// Spec §21 Layer 3 — checkpoint at Section 3 → 4 when story load is yellow or red (once per session).

import React, { useMemo } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { COLORS } from "../../theme";
import type { CompleteBrief } from "../../types/storyBrief";
import { calculateComplexityLoad } from "../../services/complexityBudget";
import { useComplexitySignals } from "../../services/complexitySignalTracker";
import { useStoryBriefUi } from "../../i18n/storyBriefUi";

export interface MidFlowCheckpointProps {
  open: boolean;
  /** Normalized brief used for load calculation (same as meter). */
  brief: CompleteBrief;
  /** After `markMidFlowCheckpointSeen` — advance to section 4. */
  onContinue: () => void;
  /** After `markMidFlowCheckpointSeen` — remain on section 3. */
  onReview: () => void;
}

export default function MidFlowCheckpoint({
  open,
  brief,
  onContinue,
  onReview,
}: MidFlowCheckpointProps) {
  const ui = useStoryBriefUi();
  const { markMidFlowCheckpointSeen } = useComplexitySignals();

  const load = useMemo(() => calculateComplexityLoad(brief), [brief]);

  const handleContinue = () => {
    markMidFlowCheckpointSeen();
    onContinue();
  };

  const handleReview = () => {
    markMidFlowCheckpointSeen();
    onReview();
  };

  return (
    <Dialog
      open={open}
      onClose={(_e, reason) => {
        if (reason === "backdropClick" || reason === "escapeKeyDown") {
          return;
        }
      }}
      disableEscapeKeyDown
      fullWidth
      maxWidth="sm"
      aria-labelledby="mid-flow-checkpoint-title"
      PaperProps={{
        sx: {
          borderRadius: 2.5,
          border: `1px solid rgba(97, 120, 145, 0.28)`,
          background: `linear-gradient(180deg, rgba(97, 120, 145, 0.06) 0%, ${COLORS.surface} 42%)`,
          boxShadow: `
            0 1px 2px rgba(0, 0, 0, 0.05),
            0 20px 48px -20px rgba(97, 120, 145, 0.22)
          `,
        },
      }}
    >
      <DialogTitle
        id="mid-flow-checkpoint-title"
        sx={{ fontWeight: 800, color: COLORS.primary, pb: 1 }}
      >
        {ui.midFlowCheckpointTitle}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.75 }}>
            {ui.midFlowCheckpointBody}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: COLORS.textSecondary,
              lineHeight: 1.65,
              px: 1.5,
              py: 1.25,
              borderRadius: 2,
              bgcolor: "rgba(97, 120, 145, 0.07)",
              border: `1px solid rgba(208, 200, 192, 0.45)`,
            }}
          >
            {ui.midFlowCheckpointLoadLine(
              load.totalPageCost,
              load.budget.min,
              load.budget.max,
            )}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions
        sx={{
          flexDirection: { xs: "column-reverse", sm: "row" },
          alignItems: { xs: "stretch", sm: "center" },
          justifyContent: "flex-end",
          gap: 1,
          px: 3,
          pb: 2.5,
        }}
      >
        <Button
          type="button"
          variant="outlined"
          color="primary"
          onClick={handleReview}
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          {ui.midFlowCheckpointReview}
        </Button>
        <Button
          type="button"
          variant="contained"
          color="primary"
          onClick={handleContinue}
          sx={{ textTransform: "none", fontWeight: 800 }}
        >
          {ui.midFlowCheckpointContinue}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
