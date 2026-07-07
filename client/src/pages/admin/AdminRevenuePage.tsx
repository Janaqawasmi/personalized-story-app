import { useEffect, useState } from "react";
import { Box, Grid, Paper, Select, MenuItem, Typography } from "@mui/material";
import { COLORS } from "../../theme";
import { useTranslation } from "../../i18n/useTranslation";
import { getPurchasesTimeseries, type PurchaseTimeseries } from "../../api/adminAnalytics";
import AdminKpiCard from "./components/AdminKpiCard";
import AdminDailyTrendChart from "./components/AdminDailyTrendChart";

const RANGE_OPTIONS = [7, 30, 90];

export default function AdminRevenuePage() {
  const t = useTranslation();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<PurchaseTimeseries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPurchasesTimeseries(days)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load revenue");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5, mb: 1.5 }}>
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 500,
            color: COLORS.textSecondary,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          {t("admin.revenue.sectionEyebrow")}
        </Typography>
        <Select
          size="small"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          sx={{ fontSize: 12, minWidth: 140 }}
        >
          {RANGE_OPTIONS.map((d) => (
            <MenuItem key={d} value={d} sx={{ fontSize: 12 }}>
              {t("admin.revenue.rangeDays", { days: d })}
            </MenuItem>
          ))}
        </Select>
      </Box>

      {error && <Typography sx={{ fontSize: 12, color: "error.main", mb: 2 }}>{error}</Typography>}
      {loading && <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>{t("admin.common.loading")}</Typography>}

      {!loading && data && (
        <>
          <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
            <Grid size={{ xs: 6, md: 3 }}>
              <AdminKpiCard
                label={t("admin.revenue.kpiRevenue")}
                value={`₪${(data.totalRevenueCents / 100).toLocaleString()}`}
                delta={t("admin.revenue.kpiRangeSub", { days })}
                deltaType="neutral"
                fillPct={100}
                fillColor={COLORS.secondary}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <AdminKpiCard
                label={t("admin.revenue.kpiPaidPurchases")}
                value={String(data.totalPaidPurchases)}
                delta={t("admin.revenue.kpiRangeSub", { days })}
                deltaType="neutral"
                fillPct={100}
                fillColor="#0F6E56"
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <AdminKpiCard
                label={t("admin.revenue.kpiRefunded")}
                value={`₪${(data.totalRefundedCents / 100).toLocaleString()}`}
                delta={t("admin.revenue.kpiRefundedSub", { count: data.totalRefundedPurchases })}
                deltaType={data.totalRefundedPurchases > 0 ? "down" : "neutral"}
                fillPct={data.totalRevenueCents > 0 ? Math.min(100, (data.totalRefundedCents / data.totalRevenueCents) * 100) : 0}
                fillColor="#A32D2D"
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <AdminKpiCard
                label={t("admin.revenue.kpiAllTime")}
                value={`₪${(data.allTimeRevenueCents / 100).toLocaleString()}`}
                delta={t("admin.kpi.allTime")}
                deltaType="neutral"
                fillPct={100}
                fillColor="#185FA5"
              />
            </Grid>
          </Grid>

          <Paper elevation={0} sx={{ p: 2, border: `0.5px solid ${COLORS.border}`, borderRadius: "12px", bgcolor: "#fff" }}>
            <Typography sx={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary, mb: 2 }}>
              {t("admin.revenue.trendTitle")}
            </Typography>
            <AdminDailyTrendChart series={data.series} />
          </Paper>
        </>
      )}
    </Box>
  );
}
