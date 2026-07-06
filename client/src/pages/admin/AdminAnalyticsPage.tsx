import { useEffect, useMemo, useState } from "react";
import { Box, Grid, Paper, Typography } from "@mui/material";
import { collection, getCountFromServer, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { COLORS } from "../../theme";
import { useTranslation } from "../../i18n/useTranslation";
import AdminKpiCard from "./components/AdminKpiCard";
import { getPurchasesTimeseries, type PurchaseTimeseries } from "../../api/adminAnalytics";
import { listAdminFeedback, type AdminFeedbackItem } from "../../api/adminFeedback";
import { listAdminSpecialists, type AdminSpecialistListItem } from "../../api/adminSpecialists";

const BAR_COLORS = ["#824D5C", "#0F6E56", "#185FA5", "#BA7517", "#534AB7", "#993556", "#3B6D11"];

function BarList({ items }: { items: { label: string; count: number }[] }) {
  const max = items[0]?.count ?? 1;
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {items.map((item, i) => (
        <Box key={item.label} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: BAR_COLORS[i % BAR_COLORS.length], flexShrink: 0 }} />
          <Typography sx={{ fontSize: 12, color: COLORS.textPrimary, flex: 1 }}>{item.label}</Typography>
          <Box sx={{ width: 90, bgcolor: COLORS.background, borderRadius: "2px", height: 6 }}>
            <Box
              sx={{
                width: `${max > 0 ? Math.round((item.count / max) * 100) : 0}%`,
                height: "100%",
                borderRadius: "2px",
                bgcolor: BAR_COLORS[i % BAR_COLORS.length],
              }}
            />
          </Box>
          <Typography sx={{ fontSize: 12, color: COLORS.textSecondary, width: 32, textAlign: "end" }}>
            {item.count}
          </Typography>
        </Box>
      ))}
      {items.length === 0 && (
        <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>—</Typography>
      )}
    </Box>
  );
}

function DailyTrendChart({ series }: { series: PurchaseTimeseries["series"] }) {
  const max = Math.max(1, ...series.map((d) => d.count));
  return (
    <Box sx={{ display: "flex", alignItems: "flex-end", gap: "3px", height: 120, overflowX: "auto" }}>
      {series.map((day) => (
        <Box
          key={day.date}
          title={`${day.date}: ${day.count} purchase${day.count === 1 ? "" : "s"} (₪${(day.revenueCents / 100).toFixed(0)})`}
          sx={{
            flex: "1 0 6px",
            minWidth: 6,
            height: `${Math.max(2, (day.count / max) * 100)}%`,
            bgcolor: day.count > 0 ? COLORS.secondary : COLORS.border,
            borderRadius: "2px 2px 0 0",
          }}
        />
      ))}
    </Box>
  );
}

export default function AdminAnalyticsPage() {
  const t = useTranslation();

  const [loading, setLoading] = useState(true);
  const [totalPreviews, setTotalPreviews] = useState(0);
  const [totalPurchasedPreviews, setTotalPurchasedPreviews] = useState(0);
  const [languageCounts, setLanguageCounts] = useState<{ label: string; count: number }[]>([]);
  const [ageCounts, setAgeCounts] = useState<{ label: string; count: number }[]>([]);
  const [timeseries, setTimeseries] = useState<PurchaseTimeseries | null>(null);
  const [feedback, setFeedback] = useState<AdminFeedbackItem[]>([]);
  const [specialists, setSpecialists] = useState<AdminSpecialistListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [previewsCount, purchasedCount, templatesSnap, series, feedbackRows, specialistRows] =
          await Promise.all([
            getCountFromServer(collection(db, "storyPreviews")),
            getCountFromServer(query(collection(db, "storyPreviews"), where("status", "==", "purchased"))),
            getDocs(collection(db, "story_templates")),
            getPurchasesTimeseries(30),
            listAdminFeedback(),
            listAdminSpecialists(),
          ]);

        if (cancelled) return;

        const langCounts: Record<string, number> = {};
        const ageGroupCounts: Record<string, number> = {};
        templatesSnap.docs.forEach((doc) => {
          const data = doc.data() as Record<string, unknown>;
          const gen = data.generationConfig as { language?: string } | undefined;
          const lang = String(gen?.language ?? "—");
          langCounts[lang] = (langCounts[lang] ?? 0) + 1;
          const age = String(data.ageGroup ?? "—");
          ageGroupCounts[age] = (ageGroupCounts[age] ?? 0) + 1;
        });

        setTotalPreviews(previewsCount.data().count);
        setTotalPurchasedPreviews(purchasedCount.data().count);
        setLanguageCounts(
          Object.entries(langCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([label, count]) => ({ label: label.toUpperCase(), count })),
        );
        setAgeCounts(
          Object.entries(ageGroupCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([label, count]) => ({ label, count })),
        );
        setTimeseries(series);
        setFeedback(feedbackRows);
        setSpecialists(specialistRows);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load analytics");
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const conversionRate = totalPreviews > 0 ? (totalPurchasedPreviews / totalPreviews) * 100 : 0;

  const ratingHistogram = useMemo(() => {
    const counts = [0, 0, 0, 0, 0]; // index 0 = 1 star ... index 4 = 5 stars
    feedback.forEach((f) => {
      if (f.rating && f.rating >= 1 && f.rating <= 5) counts[f.rating - 1]++;
    });
    return [5, 4, 3, 2, 1].map((stars) => ({ label: `★${stars}`, count: counts[stars - 1] ?? 0 }));
  }, [feedback]);

  const topSpecialists = useMemo(
    () =>
      [...specialists]
        .sort((a, b) => b.totalPurchases - a.totalPurchases)
        .slice(0, 5)
        .map((s) => ({ label: s.displayName, count: s.totalPurchases })),
    [specialists],
  );

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
        {t("admin.analytics.sectionEyebrow")}
      </Typography>

      {error && <Typography sx={{ fontSize: 12, color: "error.main", mb: 2 }}>{error}</Typography>}
      {loading && <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>{t("admin.common.loading")}</Typography>}

      {!loading && (
        <>
          <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
            <Grid size={{ xs: 6, md: 3 }}>
              <AdminKpiCard
                label={t("admin.analytics.kpiPreviews")}
                value={totalPreviews.toLocaleString()}
                delta={t("admin.analytics.kpiAllTime")}
                deltaType="neutral"
                fillPct={100}
                fillColor={COLORS.secondary}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <AdminKpiCard
                label={t("admin.analytics.kpiConversion")}
                value={`${conversionRate.toFixed(1)}%`}
                delta={t("admin.analytics.kpiConversionSub")}
                deltaType="neutral"
                fillPct={Math.min(100, conversionRate)}
                fillColor="#0F6E56"
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <AdminKpiCard
                label={t("admin.analytics.kpiRevenue30d")}
                value={`₪${((timeseries?.totalRevenueCents ?? 0) / 100).toLocaleString()}`}
                delta={t("admin.analytics.kpiLast30Days")}
                deltaType="neutral"
                fillPct={100}
                fillColor="#185FA5"
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <AdminKpiCard
                label={t("admin.analytics.kpiPurchases30d")}
                value={String(timeseries?.totalPaidPurchases ?? 0)}
                delta={t("admin.analytics.kpiLast30Days")}
                deltaType="neutral"
                fillPct={100}
                fillColor="#BA7517"
              />
            </Grid>
          </Grid>

          <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
            <Grid size={{ xs: 12 }}>
              <Paper elevation={0} sx={{ p: 2, border: `0.5px solid ${COLORS.border}`, borderRadius: "12px", bgcolor: "#fff" }}>
                <Typography sx={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary, mb: 2 }}>
                  {t("admin.analytics.trendTitle")}
                </Typography>
                {timeseries && <DailyTrendChart series={timeseries.series} />}
              </Paper>
            </Grid>
          </Grid>

          <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper elevation={0} sx={{ p: 2, border: `0.5px solid ${COLORS.border}`, borderRadius: "12px", bgcolor: "#fff", height: "100%" }}>
                <Typography sx={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary, mb: 2 }}>
                  {t("admin.analytics.languageTitle")}
                </Typography>
                <BarList items={languageCounts} />
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper elevation={0} sx={{ p: 2, border: `0.5px solid ${COLORS.border}`, borderRadius: "12px", bgcolor: "#fff", height: "100%" }}>
                <Typography sx={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary, mb: 2 }}>
                  {t("admin.analytics.ageTitle")}
                </Typography>
                <BarList items={ageCounts} />
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper elevation={0} sx={{ p: 2, border: `0.5px solid ${COLORS.border}`, borderRadius: "12px", bgcolor: "#fff", height: "100%" }}>
                <Typography sx={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary, mb: 2 }}>
                  {t("admin.analytics.ratingTitle")}
                </Typography>
                <BarList items={ratingHistogram} />
              </Paper>
            </Grid>
          </Grid>

          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper elevation={0} sx={{ p: 2, border: `0.5px solid ${COLORS.border}`, borderRadius: "12px", bgcolor: "#fff", height: "100%" }}>
                <Typography sx={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary, mb: 2 }}>
                  {t("admin.analytics.topSpecialistsTitle")}
                </Typography>
                <BarList items={topSpecialists} />
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}
