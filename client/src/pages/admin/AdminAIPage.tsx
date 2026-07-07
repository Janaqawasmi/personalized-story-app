import { useEffect, useState } from "react";
import { Box, Grid, Paper, Typography } from "@mui/material";
import { COLORS, ADMIN_CHART_COLORS } from "../../theme";
import { useTranslation } from "../../i18n/useTranslation";
import { getAdminAiStats, type AdminAiStats } from "../../api/adminAi";
import AdminStatCard from "./components/AdminStatCard";

export default function AdminAIPage() {
  const t = useTranslation();
  const [stats, setStats] = useState<AdminAiStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAdminAiStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load AI stats");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const exampleBankEntries = stats ? Object.entries(stats.exampleBankBreakdown) : [];
  const exampleBankMax = Math.max(1, ...exampleBankEntries.map(([, count]) => count));

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 500,
          color: COLORS.textSecondary,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          mb: 1.5,
        }}
      >
        {t("admin.ai.sectionEyebrow")}
      </Typography>

      {error && <Typography sx={{ fontSize: 12, color: "error.main", mb: 2 }}>{error}</Typography>}
      {loading && <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>{t("admin.common.loading")}</Typography>}

      {!loading && stats && (
        <>
          <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
            <Grid size={{ xs: 6, md: 3 }}>
              <AdminStatCard label={t("admin.ai.totalGenerations")} value={stats.totalGenerations.toLocaleString()} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <AdminStatCard
                label={t("admin.ai.avgLatency")}
                value={`${(stats.avgLatencyMs / 1000).toFixed(1)}s`}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <AdminStatCard label={t("admin.ai.avgLlmCalls")} value={String(stats.avgLlmCallsPerStory)} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <AdminStatCard
                label={t("admin.ai.failureRate")}
                value={`${stats.failureRatePct}%`}
              />
            </Grid>
          </Grid>

          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper elevation={0} sx={{ p: 2, border: `0.5px solid ${COLORS.border}`, borderRadius: "12px", bgcolor: "#fff", height: "100%" }}>
                <Typography sx={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary, mb: 2 }}>
                  {t("admin.ai.exampleBankTitle")}
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {exampleBankEntries.map(([label, count], i) => (
                    <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: ADMIN_CHART_COLORS[i % ADMIN_CHART_COLORS.length], flexShrink: 0 }} />
                      <Typography sx={{ fontSize: 12, color: COLORS.textPrimary, flex: 1 }}>{label}</Typography>
                      <Box sx={{ width: 90, bgcolor: COLORS.background, borderRadius: "2px", height: 6 }}>
                        <Box
                          sx={{
                            width: `${Math.round((count / exampleBankMax) * 100)}%`,
                            height: "100%",
                            borderRadius: "2px",
                            bgcolor: ADMIN_CHART_COLORS[i % ADMIN_CHART_COLORS.length],
                          }}
                        />
                      </Box>
                      <Typography sx={{ fontSize: 12, color: COLORS.textSecondary, width: 32, textAlign: "end" }}>
                        {count}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper elevation={0} sx={{ p: 2, border: `0.5px solid ${COLORS.border}`, borderRadius: "12px", bgcolor: "#fff", height: "100%" }}>
                <Typography sx={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary, mb: 2 }}>
                  {t("admin.ai.reliabilityTitle")}
                </Typography>
                <Typography sx={{ fontSize: 12, color: COLORS.textSecondary, mb: 1 }}>
                  {t("admin.ai.avgReruns")}: <strong>{stats.avgReruns}</strong>
                </Typography>
                <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                  {t("admin.ai.stuckGenerating")}: <strong>{stats.stuckGenerating}</strong>
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}
