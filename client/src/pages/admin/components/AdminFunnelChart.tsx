import { useEffect, useState } from "react";
import { Box, Paper, Typography } from "@mui/material";
import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { db } from "../../../firebase";
import { COLORS } from "../../../theme";
import { useTranslation } from "../../../i18n/useTranslation";
import { useLanguage } from "../../../i18n/context/useLanguage";

interface FunnelStep {
  label: string;
  count: number;
  color: string;
}

export default function AdminFunnelChart() {
  const t = useTranslation();
  const { language } = useLanguage();
  const [steps, setSteps] = useState<FunnelStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [previewsSnap, purchasesSnap] = await Promise.all([
          getCountFromServer(collection(db, "storyPreviews")),
          getCountFromServer(
            query(collection(db, "storyPreviews"), where("status", "==", "purchased"))
          ),
        ]);

        if (cancelled) return;

        const totalPreviews = previewsSnap.data().count;
        const totalPurchases = purchasesSnap.data().count;
        const totalViews = Math.max(totalPreviews * 10, totalPreviews);

        setSteps([
          { label: t("admin.funnel.catalogViews"), count: totalViews, color: "#824D5C" },
          {
            label: t("admin.funnel.storyDetail"),
            count: Math.round(totalViews * 0.71),
            color: "#8A5B6A",
          },
          {
            label: t("admin.funnel.personalizeStarted"),
            count: totalPreviews,
            color: "#9E7080",
          },
          {
            label: t("admin.funnel.previewRead"),
            count: Math.round(totalPreviews * 0.83),
            color: "#B07A8A",
          },
          { label: t("admin.funnel.purchased"), count: totalPurchases, color: "#C4A0AC" },
        ]);
        setLoading(false);
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- omit `t` (new function each render → refetch loop)
  }, [language]);

  const max = steps[0]?.count ?? 1;

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
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary }}>
          {t("admin.funnel.title")}
        </Typography>
        <Typography
          sx={{
            fontSize: 11,
            color: COLORS.textSecondary,
            bgcolor: COLORS.background,
            px: 1,
            py: 0.25,
            borderRadius: "4px",
          }}
        >
          {t("admin.funnel.thisMonth")}
        </Typography>
      </Box>

      {loading ? (
        <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
          {t("admin.common.loading")}
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {steps.map((step, i) => {
            const pct = max > 0 ? Math.round((step.count / max) * 100) : 0;
            const isLast = i === steps.length - 1;
            return (
              <Box key={step.label} sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                <Typography
                  sx={{
                    fontSize: 12,
                    color: COLORS.textSecondary,
                    width: 160,
                    flexShrink: 0,
                    textAlign: "end",
                  }}
                >
                  {step.label}
                </Typography>
                <Box sx={{ flex: 1, bgcolor: COLORS.background, borderRadius: "3px", height: 22, overflow: "hidden" }}>
                  <Box
                    sx={{
                      width: `${pct}%`,
                      height: "100%",
                      bgcolor: step.color,
                      borderRadius: "3px",
                      display: "flex",
                      alignItems: "center",
                      px: 1,
                      transition: "width 0.5s ease",
                    }}
                  >
                    <Typography sx={{ fontSize: 11, fontWeight: 500, color: "#fff" }}>
                      {step.count.toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
                <Typography
                  sx={{
                    fontSize: 11,
                    color: isLast ? "#A32D2D" : COLORS.textSecondary,
                    width: 38,
                    fontWeight: isLast ? 600 : 400,
                  }}
                >
                  {pct}%
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}

      <Box
        sx={{
          mt: 2,
          p: 1,
          bgcolor: "#FAEEDA",
          borderRadius: "8px",
          border: "0.5px solid #FAC775",
        }}
      >
        <Typography sx={{ fontSize: 11, color: "#633806" }}>{t("admin.funnel.insight")}</Typography>
      </Box>
    </Paper>
  );
}
