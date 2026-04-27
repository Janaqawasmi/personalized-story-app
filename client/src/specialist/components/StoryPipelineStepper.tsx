// Compact horizontal pipeline for the story workspace
// (Brief → Generate → Review → Approved → Illustration → Publish).

import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import type { Story } from "../../types/story";
import { COLORS } from "../../theme";
import {
  PIPELINE_STEP_LABELS,
  getStoryPipelineUiState,
  type PipelineStepIndex,
} from "../utils/storyPipeline";
import { DRAFT_B, FONTS } from "./draftB/tokens";

function Connector({
  complete,
  archived,
}: {
  complete: boolean;
  archived: boolean;
}) {
  return (
    <Box
      sx={{
        flex: 1,
        height: 2,
        minWidth: 12,
        mx: 0.75,
        mt: "11px",
        borderRadius: 1,
        bgcolor: archived ? DRAFT_B.border : complete ? COLORS.primary : DRAFT_B.border,
        opacity: archived ? 0.35 : 1,
      }}
    />
  );
}

export interface StoryPipelineStepperProps {
  story: Story;
}

export default function StoryPipelineStepper({ story }: StoryPipelineStepperProps) {
  const ui = getStoryPipelineUiState(story.status);
  const archived = ui.kind === "archived";
  const active = ui.kind === "active" ? ui : null;
  const totalSteps = PIPELINE_STEP_LABELS.length;
  const allComplete = active !== null && active.stepsCompleted === totalSteps;

  const hint = archived
    ? "This story is archived. Restore it from the menu to continue the pipeline."
    : active?.nextHint ?? "";

  return (
    <Box
      component="nav"
      aria-label="Story pipeline progress"
      sx={{
        px: { xs: 2, sm: 3, md: 5 },
        pt: 1.75,
        pb: 2,
        mb: 0,
        borderBottom: `1px solid ${DRAFT_B.border}`,
        bgcolor: DRAFT_B.cream,
        fontFamily: FONTS.sans,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 0.5,
          overflowX: "auto",
          pb: 0.25,
        }}
      >
        {PIPELINE_STEP_LABELS.map((label, index) => {
          const position = index as PipelineStepIndex;
          const stepsCompleted = active?.stepsCompleted ?? 0;

          const stepDone =
            !archived &&
            active !== null &&
            (allComplete ? true : position < stepsCompleted);

          const isCurrent =
            !archived &&
            !allComplete &&
            active !== null &&
            position === active.emphasisStepIndex;

          const connectorComplete =
            !archived && active !== null && active.stepsCompleted >= index;

          return (
            <React.Fragment key={label}>
              {index > 0 && (
                <Connector complete={connectorComplete} archived={archived} />
              )}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 0.5,
                  minWidth: 78,
                  flexShrink: 0,
                }}
              >
                <Box
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    bgcolor:
                      archived || (!stepDone && !isCurrent)
                        ? "transparent"
                        : stepDone
                          ? COLORS.primary
                          : DRAFT_B.cream,
                    border:
                      stepDone && !archived
                        ? "none"
                        : `2px solid ${isCurrent && !archived ? COLORS.primary : DRAFT_B.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                  }}
                >
                  {archived ? null : stepDone ? (
                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M20 6L9 17l-5-5"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : isCurrent ? (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: COLORS.primary,
                      }}
                    />
                  ) : null}
                </Box>
                <Typography
                  variant="caption"
                  component="span"
                  sx={{
                    fontWeight: isCurrent ? 700 : stepDone ? 600 : 500,
                    color: archived
                      ? DRAFT_B.inkMuted
                      : isCurrent || stepDone
                        ? DRAFT_B.ink
                        : DRAFT_B.inkMuted,
                    fontSize: "11px",
                    textAlign: "center",
                    lineHeight: 1.2,
                    letterSpacing: "0.01em",
                  }}
                >
                  {label}
                </Typography>
              </Box>
            </React.Fragment>
          );
        })}
      </Box>

      {hint ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 1.25, fontSize: "0.8125rem", lineHeight: 1.45 }}
        >
          {hint}
        </Typography>
      ) : null}
    </Box>
  );
}
