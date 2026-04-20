// Compact horizontal pipeline for the story workspace (Brief → Generate → Review → Approved).

import React from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";

import type { Story } from "../../types/story";
import { COLORS } from "../../theme";
import {
  PIPELINE_STEP_LABELS,
  getStoryPipelineUiState,
  type PipelineStepIndex,
} from "../utils/storyPipeline";

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
        mx: 0.5,
        mt: "9px",
        borderRadius: 1,
        bgcolor: archived
          ? "action.disabledBackground"
          : complete
            ? COLORS.primary
            : COLORS.border,
        opacity: archived ? 0.35 : complete ? 0.55 : 0.45,
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
  const allComplete = active !== null && active.stepsCompleted === 4;

  const hint = archived
    ? "This story is archived. Restore it from the menu to continue the pipeline."
    : active?.nextHint ?? "";

  return (
    <Box
      component="nav"
      aria-label="Story pipeline progress"
      sx={{
        mb: 2,
        pb: 2,
        borderBottom: `1px solid ${COLORS.border}`,
      }}
    >
      <Stack
        direction="row"
        alignItems="flex-start"
        sx={{
          overflowX: "auto",
          pb: 0.5,
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
              <Stack
                alignItems="center"
                spacing={0.5}
                sx={{
                  width: { xs: 72, sm: 88 },
                  flexShrink: 0,
                }}
              >
                {archived ? (
                  <RadioButtonUncheckedIcon
                    sx={{ fontSize: 20, color: COLORS.textSecondary, opacity: 0.45 }}
                  />
                ) : stepDone ? (
                  <CheckCircleIcon sx={{ fontSize: 20, color: COLORS.primary }} />
                ) : isCurrent ? (
                  <RadioButtonCheckedIcon sx={{ fontSize: 20, color: COLORS.primary }} />
                ) : (
                  <RadioButtonUncheckedIcon
                    sx={{ fontSize: 20, color: COLORS.border, opacity: 0.9 }}
                  />
                )}
                <Typography
                  variant="caption"
                  component="span"
                  sx={{
                    fontWeight: isCurrent ? 700 : stepDone ? 600 : 500,
                    color: archived
                      ? "text.disabled"
                      : isCurrent || stepDone
                        ? COLORS.textPrimary
                        : COLORS.textSecondary,
                    fontSize: { xs: "0.65rem", sm: "0.7rem" },
                    textAlign: "center",
                    lineHeight: 1.2,
                  }}
                >
                  {label}
                </Typography>
              </Stack>
            </React.Fragment>
          );
        })}
      </Stack>

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
