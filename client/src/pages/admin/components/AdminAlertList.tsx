import { Box, Paper, Typography } from "@mui/material";
import { COLORS } from "../../../theme";
import type { Alert } from "../../../hooks/useAdminStats";
import { useTranslation } from "../../../i18n/useTranslation";

const ALERT_STYLES = {
  danger: {
    bg: "#FCEBEB",
    border: "#F7C1C1",
    dotColor: "#E24B4A",
    textColor: "#791F1F",
    tsColor: "#A32D2D",
  },
  warn: {
    bg: "#FAEEDA",
    border: "#FAC775",
    dotColor: "#BA7517",
    textColor: "#633806",
    tsColor: "#854F0B",
  },
  info: {
    bg: "#E6F1FB",
    border: "#B5D4F4",
    dotColor: "#185FA5",
    textColor: "#0C447C",
    tsColor: "#185FA5",
  },
};

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
              bgcolor: "#E53935",
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
            const s = ALERT_STYLES[alert.type];
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
                    bgcolor: s.dotColor,
                    mt: "3px",
                    flexShrink: 0,
                  }}
                />
                <Box>
                  <Typography sx={{ fontSize: 12, color: s.textColor, lineHeight: 1.4 }}>
                    {alert.message}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: s.tsColor, mt: 0.25 }}>
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
