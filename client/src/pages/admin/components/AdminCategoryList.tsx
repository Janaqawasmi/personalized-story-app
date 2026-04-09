import { useEffect, useState } from "react";
import { Box, Paper, Typography } from "@mui/material";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../firebase";
import { COLORS } from "../../../theme";
import { useTranslation } from "../../../i18n/useTranslation";
import { useLanguage } from "../../../i18n/context/useLanguage";

const CATEGORY_COLORS: Record<string, string> = {
  fear: "#534AB7",
  anxiety: "#0F6E56",
  confidence: "#824D5C",
  grief: "#BA7517",
  anger: "#185FA5",
  social: "#993556",
  family: "#3B6D11",
};

export default function AdminCategoryList() {
  const t = useTranslation();
  const { language } = useLanguage();
  const [categories, setCategories] = useState<{ label: string; count: number; color: string }[]>([]);
  const [loading, setLoading] = useState(true);

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
          .map(([topic, count]) => ({
            label: topic.charAt(0).toUpperCase() + topic.slice(1).replace(/_/g, " "),
            count,
            color: CATEGORY_COLORS[topic.toLowerCase()] ?? "#888",
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
  }, [language]);

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
