import { Box, Typography, LinearProgress } from "@mui/material";
import { COLORS } from "../../theme";

type Props = {
  step: number;
  totalSteps: number;
  label?: string;
};

export default function StepIndicator({
  step,
  totalSteps,
  label,
}: Props) {
  const progress = (step / totalSteps) * 100;

  return (
    <Box mb={4}>
      <Typography
        variant="body2"
        color={COLORS.textSecondary}
        mb={1}
      >
        Step {step} of {totalSteps}
        {label ? ` — ${label}` : ""}
      </Typography>

      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 6,
          borderRadius: 3,
          backgroundColor: COLORS.background,
          "& .MuiLinearProgress-bar": {
            backgroundColor: COLORS.primary,
          },
        }}
      />
    </Box>
  );
}
