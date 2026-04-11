import { Box, Paper, Typography } from "@mui/material";
import { COLORS } from "../../../theme";

interface Props {
  label: string;
  value: string;
  delta: string;
  deltaType: "up" | "down" | "neutral";
  fillPct: number;
  fillColor: string;
}

export default function AdminKpiCard({
  label,
  value,
  delta,
  deltaType,
  fillPct,
  fillColor,
}: Props) {
  const deltaColor =
    deltaType === "up" ? "#3B6D11" : deltaType === "down" ? "#A32D2D" : COLORS.textSecondary;

  return (
    <Paper
      elevation={0}
      sx={{
        p: "14px 16px",
        border: `0.5px solid ${COLORS.border}`,
        borderRadius: "12px",
        bgcolor: "#fff",
      }}
    >
      <Typography sx={{ fontSize: 11, color: COLORS.textSecondary, mb: 0.75 }}>{label}</Typography>
      <Typography sx={{ fontSize: 22, fontWeight: 500, color: COLORS.textPrimary }}>{value}</Typography>
      <Typography sx={{ fontSize: 11, color: deltaColor, mt: 0.5 }}>{delta}</Typography>
      <Box sx={{ mt: 1.25, height: "3px", borderRadius: "2px", bgcolor: COLORS.border }}>
        <Box sx={{ width: `${fillPct}%`, height: "100%", borderRadius: "2px", bgcolor: fillColor }} />
      </Box>
    </Paper>
  );
}
