import { Box, Paper, Typography } from "@mui/material";
import { COLORS } from "../../theme";
import { useTranslation } from "../../i18n/useTranslation";

export default function AdminRevenuePage() {
  const t = useTranslation();

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={0} sx={{ p: 3, border: `0.5px solid ${COLORS.border}`, borderRadius: "12px", bgcolor: "#fff" }}>
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary, mb: 1 }}>
          {t("admin.revenue.title")}
        </Typography>
        <Typography sx={{ fontSize: 13, color: COLORS.textSecondary }}>{t("admin.revenue.body")}</Typography>
      </Paper>
    </Box>
  );
}
