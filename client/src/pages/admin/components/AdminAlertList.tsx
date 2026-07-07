import { Box, Paper, Typography } from "@mui/material";
import { COLORS, ADMIN_SEVERITY_COLORS, ADMIN_BADGE_COLOR } from "../../../theme";
import type { Alert } from "../../../hooks/useAdminStats";
import { useTranslation } from "../../../i18n/useTranslation";

interface Props {
  alerts: Alert[];
}

export default function AdminAlertList({ alerts }: Props) {
  const t = useTranslation();
  const badgeCount = alerts.length;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: `0.5px solid ${COLORS.border}`,
        borderRadius: "12px",
        bgcolor: "#fff",
        height: "100%",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary }}>
          {t("admin.alerts.title")}
        </Typography>
        {badgeCount > 0 && (
          <Box
            sx={{
              bgcolor: ADMIN_BADGE_COLOR,
              color: "#fff",
              fontSize: 10,
              fontWeight: 600,
              px: "6px",
              py: "1px",
              borderRadius: "10px",
            }}
          >
            {badgeCount}
          </Box>
        )}
      </Box>

      {alerts.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 3 }}>
          <Typography sx={{ fontSize: 24, mb: 1 }}>✅</Typography>
          <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>{t("admin.alerts.allClear")}</Typography>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {alerts.map((alert) => {
            const s = ADMIN_SEVERITY_COLORS[alert.type];
            return (
              <Box
                key={alert.id}
                sx={{
                  display: "flex",
                  gap: 1,
                  p: 1.25,
                  borderRadius: "8px",
                  bgcolor: s.bg,
                  border: `0.5px solid ${s.border}`,
                }}
              >
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    bgcolor: s.dot,
                    mt: "3px",
                    flexShrink: 0,
                  }}
                />
                <Box>
                  <Typography sx={{ fontSize: 12, color: s.text, lineHeight: 1.4 }}>
                    {alert.message}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: s.timestamp, mt: 0.25 }}>
                    {alert.timestamp.toLocaleDateString()} · {alert.source}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Paper>
  );
}
