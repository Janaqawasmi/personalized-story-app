import { useEffect, useState } from "react";
import { Box, Grid, Typography, Paper, Button } from "@mui/material";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import { COLORS } from "../../theme";
import { useTranslation } from "../../i18n/useTranslation";
import AdminKpiCard from "./components/AdminKpiCard";

interface StoryTemplate {
  id: string;
  title: string;
  authorName: string;
  topic: string;
  language: string[];
  spreadCount: number;
  status: string;
  createdAt: Date;
  submittedAt: Date;
}

export default function AdminStoriesPage() {
  const t = useTranslation();
  const [pending, setPending] = useState<StoryTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "story_templates"),
      where("status", "==", "pending_review")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs
          .map((d) => {
            const data = d.data() as Record<string, unknown>;
            const createdAtRaw = data.createdAt as { toDate?: () => Date } | undefined;
            const submittedAtRaw = data.submittedAt as { toDate?: () => Date } | undefined;
            const pages = data.pages as unknown[] | undefined;
            const gen = data.generationConfig as { language?: string } | undefined;
            const lang = gen?.language;

            return {
              id: d.id,
              title: String(data.title ?? ""),
              authorName: String(
                data.authorName ?? data.approvedBy ?? data.specialistId ?? "—"
              ),
              topic: String(data.primaryTopic ?? data.topic ?? "—"),
              language: Array.isArray(data.language)
                ? (data.language as string[])
                : lang
                  ? [lang]
                  : [],
              spreadCount: Array.isArray(pages) ? pages.length : 0,
              status: String(data.status ?? ""),
              createdAt: createdAtRaw?.toDate?.() ?? new Date(),
              submittedAt: submittedAtRaw?.toDate?.() ?? createdAtRaw?.toDate?.() ?? new Date(),
            };
          })
          .sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());
        setPending(items);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, []);

  const handleApprove = async (id: string) => {
    await updateDoc(doc(db, "story_templates", id), {
      status: "approved",
      approvedAt: serverTimestamp(),
    });
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt(t("admin.stories.rejectPrompt"));
    if (!reason) return;
    await updateDoc(doc(db, "story_templates", id), {
      status: "rejected",
      rejectionReason: reason,
      rejectedAt: serverTimestamp(),
    });
  };

  const getWaitColor = (submittedAt: Date): { bg: string; text: string; label: string } => {
    const hours = Math.floor((Date.now() - submittedAt.getTime()) / 36e5);
    if (hours > 36) {
      return {
        bg: "#FAEEDA",
        text: "#854F0B",
        label: t("admin.stories.waitingDays", { days: Math.floor(hours / 24) }),
      };
    }
    if (hours > 12) {
      return { bg: "#FAEEDA", text: "#854F0B", label: t("admin.stories.waitingHours", { hours }) };
    }
    return {
      bg: "#EAF3DE",
      text: "#27500A",
      label: hours < 1 ? t("admin.stories.justSubmitted") : t("admin.stories.waitingHours", { hours }),
    };
  };

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
        {t("admin.stories.sectionEyebrow")}
      </Typography>
      <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <AdminKpiCard
            label={t("admin.stories.kpiPending")}
            value={String(pending.length)}
            delta={t("admin.stories.kpiPendingSub")}
            deltaType="neutral"
            fillPct={Math.min(100, pending.length * 10)}
            fillColor="#BA7517"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <AdminKpiCard
            label={t("admin.stories.kpiAvgWait")}
            value="3.2 days"
            delta={t("admin.stories.kpiAvgWaitSub")}
            deltaType="neutral"
            fillPct={40}
            fillColor={COLORS.primary}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <AdminKpiCard
            label={t("admin.stories.kpiApprovedMonth")}
            value="12"
            delta={t("admin.stories.kpiApprovedSub")}
            deltaType="up"
            fillPct={60}
            fillColor="#0F6E56"
          />
        </Grid>
      </Grid>

      <Paper elevation={0} sx={{ p: 2, border: `0.5px solid ${COLORS.border}`, borderRadius: "12px", bgcolor: "#fff" }}>
        <Typography sx={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary, mb: 2 }}>
          {t("admin.stories.pendingTitle")}
        </Typography>

        {loading && (
          <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>{t("admin.common.loading")}</Typography>
        )}

        {!loading && pending.length === 0 && (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography sx={{ fontSize: 24, mb: 1 }}>📚</Typography>
            <Typography sx={{ fontSize: 13, color: COLORS.textSecondary }}>{t("admin.stories.allClear")}</Typography>
          </Box>
        )}

        {pending.map((story, i) => {
          const wait = getWaitColor(story.submittedAt);
          const isLast = i === pending.length - 1;
          return (
            <Box
              key={story.id}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                py: 1.5,
                borderBottom: isLast ? "none" : `0.5px solid ${COLORS.border}`,
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 48,
                  borderRadius: "4px",
                  flexShrink: 0,
                  background: "linear-gradient(135deg, #1a3a5c, #0f2847)",
                }}
              />
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary }}>
                  {story.title}
                </Typography>
                <Typography sx={{ fontSize: 11, color: COLORS.textSecondary }}>
                  {story.authorName} · {story.topic} · {story.language.join(" + ") || "—"} · {story.spreadCount}{" "}
                  {t("admin.stories.spreads")}
                </Typography>
              </Box>
              <Box
                sx={{
                  bgcolor: wait.bg,
                  color: wait.text,
                  fontSize: 11,
                  px: 1,
                  py: 0.5,
                  borderRadius: "4px",
                  flexShrink: 0,
                }}
              >
                {wait.label}
              </Box>
              <Box sx={{ display: "flex", gap: 0.75, flexShrink: 0 }}>
                <Button
                  size="small"
                  onClick={() => handleApprove(story.id)}
                  sx={{
                    fontSize: 11,
                    bgcolor: "#EAF3DE",
                    color: "#27500A",
                    border: "0.5px solid #C0DD97",
                    "&:hover": { bgcolor: "#D4EAC0" },
                    textTransform: "none",
                    px: 1.5,
                  }}
                >
                  {t("admin.stories.approve")}
                </Button>
                <Button
                  size="small"
                  onClick={() => handleReject(story.id)}
                  sx={{
                    fontSize: 11,
                    bgcolor: "#FCEBEB",
                    color: "#791F1F",
                    border: "0.5px solid #F7C1C1",
                    "&:hover": { bgcolor: "#FAD5D5" },
                    textTransform: "none",
                    px: 1.5,
                  }}
                >
                  {t("admin.stories.reject")}
                </Button>
              </Box>
            </Box>
          );
        })}
      </Paper>
    </Box>
  );
}
