import { Box, Paper, Typography } from "@mui/material";
import { COLORS } from "../../../theme";
import type { ActivityItem } from "../../../hooks/useAdminStats";
import { useTranslation } from "../../../i18n/useTranslation";

const ICON_MAP: Record<string, { icon: string; bg: string }> = {
  purchase: { icon: "💳", bg: "#FBEAF0" },
  personalization: { icon: "📖", bg: "#EAF3DE" },
  template_submitted: { icon: "👩‍⚕️", bg: "#E6F1FB" },
  error: { icon: "⚠️", bg: "#FCEBEB" },
  voice: { icon: "🎙️", bg: "#FAEEDA" },
};

interface Props {
  items: ActivityItem[];
}

export default function AdminActivityFeed({ items }: Props) {
  const t = useTranslation();

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
      <Typography sx={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary, mb: 2 }}>
        {t("admin.activity.title")}
      </Typography>

      {items.length === 0 ? (
        <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>{t("admin.activity.empty")}</Typography>
      ) : (
        <Box>
          {items.map((item, i) => {
            const style = ICON_MAP[item.type] ?? { icon: "•", bg: COLORS.background };
            const isLast = i === items.length - 1;
            return (
              <Box
                key={item.id}
                sx={{
                  display: "flex",
                  gap: 1.25,
                  py: 1,
                  borderBottom: isLast ? "none" : `0.5px solid ${COLORS.border}`,
                }}
              >
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: "7px",
                    bgcolor: style.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  {style.icon}
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 12, color: COLORS.textPrimary, lineHeight: 1.4 }}>
                    {item.message}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: COLORS.textSecondary, mt: 0.25 }}>
                    {item.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
