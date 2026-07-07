import { Paper, Typography } from "@mui/material";
import { COLORS } from "../../../theme";

export default function AdminStatCard({ label, value }: { label: string; value: string }) {
  return (
    <Paper elevation={0} sx={{ p: "14px 16px", border: `0.5px solid ${COLORS.border}`, borderRadius: "12px", bgcolor: "#fff" }}>
      <Typography sx={{ fontSize: 11, color: COLORS.textSecondary, mb: 0.75 }}>{label}</Typography>
      <Typography sx={{ fontSize: 22, fontWeight: 500, color: COLORS.textPrimary }}>{value}</Typography>
    </Paper>
  );
}
