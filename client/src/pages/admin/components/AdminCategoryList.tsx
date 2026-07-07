import { useEffect, useState } from "react";
import { Box, Paper, Typography } from "@mui/material";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../firebase";
import { COLORS, ADMIN_CHART_COLORS } from "../../../theme";
import { useTranslation } from "../../../i18n/useTranslation";

export default function AdminCategoryList() {
  const t = useTranslation();
  const [categories, setCategories] = useState<{ label: string; count: number; color: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Nothing here is language-dependent (topic strings are raw Firestore
  // field values, not translated) — this previously re-ran on every language
  // toggle, refetching the entire storyPreviews collection for no reason.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const snap = await getDocs(collection(db, "storyPreviews"));
        const counts: Record<string, number> = {};
        snap.docs.forEach((docSnap) => {
          const data = docSnap.data() as Record<string, unknown>;
          const topic = String(data.topic ?? data.primaryTopic ?? "other");
          counts[topic] = (counts[topic] ?? 0) + 1;
        });

        const sorted = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 7)
          .map(([topic, count], i) => ({
            label: topic.charAt(0).toUpperCase() + topic.slice(1).replace(/_/g, " "),
            count,
            color: ADMIN_CHART_COLORS[i % ADMIN_CHART_COLORS.length],
          }));

        if (!cancelled) {
          setCategories(sorted);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const max = categories[0]?.count ?? 1;

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
        {t("admin.categories.title")}
      </Typography>
      {loading ? (
        <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
          {t("admin.common.loading")}
        </Typography>
      ) : categories.length === 0 ? (
        <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
          {t("admin.categories.empty")}
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {categories.map((cat) => (
            <Box key={cat.label} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: cat.color, flexShrink: 0 }} />
              <Typography sx={{ fontSize: 12, color: COLORS.textPrimary, flex: 1 }}>{cat.label}</Typography>
              <Box sx={{ width: 90, bgcolor: COLORS.background, borderRadius: "2px", height: 6 }}>
                <Box
                  sx={{
                    width: `${Math.round((cat.count / max) * 100)}%`,
                    height: "100%",
                    borderRadius: "2px",
                    bgcolor: cat.color,
                  }}
                />
              </Box>
              <Typography sx={{ fontSize: 12, color: COLORS.textSecondary, width: 32, textAlign: "end" }}>
                {cat.count}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );
}
