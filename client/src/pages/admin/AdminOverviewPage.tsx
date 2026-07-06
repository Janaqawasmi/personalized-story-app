import { Box, Grid, Typography } from "@mui/material";
import { useAdminStats } from "../../hooks/useAdminStats";
import { COLORS } from "../../theme";
import { useTranslation } from "../../i18n/useTranslation";
import AdminKpiCard from "./components/AdminKpiCard";
import AdminFunnelChart from "./components/AdminFunnelChart";
import AdminCategoryList from "./components/AdminCategoryList";
import AdminAlertList from "./components/AdminAlertList";
import AdminActivityFeed from "./components/AdminActivityFeed";

export default function AdminOverviewPage() {
  const stats = useAdminStats();
  const t = useTranslation();

  const conversionRate =
    stats.totalPersonalizations > 0 ? (stats.totalPurchases / stats.totalPersonalizations) * 100 : 0;

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
        {t("admin.overview.kpiEyebrow")}
      </Typography>
      <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <AdminKpiCard
            label={t("admin.kpi.personalizations")}
            value={stats.loading ? "—" : stats.totalPersonalizations.toLocaleString()}
            delta={t("admin.kpi.allTime")}
            deltaType="neutral"
            fillPct={100}
            fillColor={COLORS.secondary}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <AdminKpiCard
            label={t("admin.kpi.caregivers")}
            value={stats.loading ? "—" : stats.totalCaregivers.toLocaleString()}
            delta={t("admin.kpi.allTime")}
            deltaType="neutral"
            fillPct={100}
            fillColor="#0F6E56"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <AdminKpiCard
            label={t("admin.kpi.conversionRate")}
            value={stats.loading ? "—" : `${conversionRate.toFixed(1)}%`}
            delta={t("admin.kpi.realConversion")}
            deltaType="neutral"
            fillPct={Math.min(100, conversionRate)}
            fillColor="#BA7517"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <AdminKpiCard
            label={t("admin.kpi.revenue")}
            value={stats.loading ? "—" : `₪${(stats.allTimeRevenueCents / 100).toLocaleString()}`}
            delta={t("admin.kpi.allTime")}
            deltaType="neutral"
            fillPct={100}
            fillColor="#185FA5"
          />
        </Grid>
      </Grid>

      <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <AdminFunnelChart />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <AdminCategoryList />
        </Grid>
      </Grid>

      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, md: 4 }}>
          <AdminAlertList alerts={stats.activeAlerts} />
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <AdminActivityFeed items={stats.recentActivity} />
        </Grid>
      </Grid>
    </Box>
  );
}
