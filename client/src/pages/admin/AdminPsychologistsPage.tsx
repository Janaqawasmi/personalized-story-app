import { useEffect, useState } from "react";
import { Box, Paper, Typography, Avatar } from "@mui/material";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import { COLORS } from "../../theme";
import { useTranslation } from "../../i18n/useTranslation";

interface Psychologist {
  id: string;
  displayName: string;
  specialty: string;
  storyCount: number;
  totalPersonalizations: number;
  avgCompletion: number;
  status: "active" | "pending" | "review";
  joinedAt: Date;
}

const STATUS_STYLES = {
  active: { bg: "#EAF3DE", color: "#3B6D11", labelKey: "admin.psychologists.statusActive" as const },
  pending: { bg: "#FAEEDA", color: "#854F0B", labelKey: "admin.psychologists.statusPending" as const },
  review: { bg: "#E6F1FB", color: "#185FA5", labelKey: "admin.psychologists.statusReview" as const },
};

export default function AdminPsychologistsPage() {
  const t = useTranslation();
  const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "psychologists"),
      (snap) => {
        const items = snap.docs
          .map((d) => {
            const data = d.data() as Record<string, unknown>;
            const joinedRaw = data.joinedAt as { toDate?: () => Date } | undefined;
            return {
              id: d.id,
              displayName: String(data.displayName ?? "—"),
              specialty: String(data.specialty ?? ""),
              storyCount: Number(data.storyCount ?? 0),
              totalPersonalizations: Number(data.totalPersonalizations ?? 0),
              avgCompletion: Number(data.avgCompletion ?? 0),
              status: (data.status as Psychologist["status"]) ?? "pending",
              joinedAt: joinedRaw?.toDate?.() ?? new Date(),
            };
          })
          .sort((a, b) => b.totalPersonalizations - a.totalPersonalizations);
        setPsychologists(items);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, []);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const getCompletionColor = (pct: number) =>
    pct >= 70 ? "#3B6D11" : pct >= 50 ? "#BA7517" : "#A32D2D";

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
        {t("admin.psychologists.sectionEyebrow")}
      </Typography>

      <Paper elevation={0} sx={{ p: 2, border: `0.5px solid ${COLORS.border}`, borderRadius: "12px", bgcolor: "#fff" }}>
        <Typography sx={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary, mb: 2 }}>
          {t("admin.psychologists.leaderboard")}
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "2fr 1.5fr 60px 120px 100px 80px",
            gap: 1,
            px: 1,
            pb: 1,
            borderBottom: `0.5px solid ${COLORS.border}`,
          }}
        >
          {[
            t("admin.psychologists.colCreator"),
            t("admin.psychologists.colSpecialty"),
            t("admin.psychologists.colStories"),
            t("admin.psychologists.colPersonalizations"),
            t("admin.psychologists.colCompletion"),
            t("admin.psychologists.colStatus"),
          ].map((h, idx) => (
            <Typography key={idx} sx={{ fontSize: 11, color: COLORS.textSecondary }}>
              {h}
            </Typography>
          ))}
        </Box>

        {loading && (
          <Typography sx={{ fontSize: 12, color: COLORS.textSecondary, mt: 2 }}>{t("admin.common.loading")}</Typography>
        )}

        {psychologists.map((p, i) => {
          const status = STATUS_STYLES[p.status] ?? STATUS_STYLES.pending;
          const isLast = i === psychologists.length - 1;
          return (
            <Box
              key={p.id}
              sx={{
                display: "grid",
                gridTemplateColumns: "2fr 1.5fr 60px 120px 100px 80px",
                gap: 1,
                px: 1,
                py: 1,
                borderBottom: isLast ? "none" : `0.5px solid ${COLORS.border}`,
                alignItems: "center",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Avatar sx={{ width: 28, height: 28, bgcolor: COLORS.secondary, fontSize: 11 }}>
                  {getInitials(p.displayName)}
                </Avatar>
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 500, color: COLORS.textPrimary }}>
                    {p.displayName}
                  </Typography>
                  <Typography sx={{ fontSize: 10, color: COLORS.textSecondary }}>
                    {t("admin.psychologists.joined", { date: p.joinedAt.toLocaleDateString() })}
                  </Typography>
                </Box>
              </Box>
              <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>{p.specialty || "—"}</Typography>
              <Typography sx={{ fontSize: 12, color: COLORS.textPrimary }}>{p.storyCount}</Typography>
              <Typography sx={{ fontSize: 12, color: COLORS.textPrimary }}>
                {p.totalPersonalizations.toLocaleString()}
              </Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: getCompletionColor(p.avgCompletion) }}>
                {p.avgCompletion ? `${p.avgCompletion}%` : "—"}
              </Typography>
              <Box
                sx={{
                  bgcolor: status.bg,
                  color: status.color,
                  fontSize: 10,
                  px: "8px",
                  py: "2px",
                  borderRadius: "10px",
                  display: "inline-block",
                }}
              >
                {t(status.labelKey)}
              </Box>
            </Box>
          );
        })}
      </Paper>
    </Box>
  );
}
