import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Grid,
  Typography,
  Paper,
  Button,
  TextField,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from "@mui/material";
import { CloseOutlined } from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import { COLORS } from "../../theme";
import { useTranslation } from "../../i18n/useTranslation";
import AdminKpiCard from "./components/AdminKpiCard";
import { listAdminSpecialists } from "../../api/adminSpecialists";
import { listAdminFeedback, type AdminFeedbackItem } from "../../api/adminFeedback";

interface StoryTemplatePageData {
  pageNumber: number;
  text: string;
  imageUrl: string | null;
}

interface StoryTemplateRow {
  id: string;
  title: string;
  specialistId: string | null;
  topic: string;
  ageGroup: string;
  language: string[];
  spreadCount: number;
  status: string;
  purchaseCount: number;
  createdAt: Date;
  submittedAt: Date;
  approvedAt: string | null;
  rejectionReason: string | null;
  pages: StoryTemplatePageData[];
}

export default function AdminStoriesPage() {
  const t = useTranslation();
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const [allStories, setAllStories] = useState<StoryTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [specialistNames, setSpecialistNames] = useState<Map<string, string>>(new Map());

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [topicFilter, setTopicFilter] = useState("");

  const [selectedStory, setSelectedStory] = useState<StoryTemplateRow | null>(null);
  const [selectedStoryFeedback, setSelectedStoryFeedback] = useState<AdminFeedbackItem[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "story_templates"),
      (snap) => {
        const items = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          const createdAtRaw = data.createdAt as { toDate?: () => Date } | undefined;
          const submittedAtRaw = data.submittedAt as { toDate?: () => Date } | undefined;
          const pages = (data.pages as Record<string, unknown>[] | undefined) ?? [];
          const gen = data.generationConfig as { language?: string } | undefined;
          const lang = gen?.language;

          return {
            id: d.id,
            title: String(data.title ?? ""),
            specialistId: typeof data.specialistId === "string" ? data.specialistId : null,
            topic: String(data.primaryTopic ?? data.topic ?? "—"),
            ageGroup: String(data.ageGroup ?? "—"),
            language: Array.isArray(data.language) ? (data.language as string[]) : lang ? [lang] : [],
            spreadCount: pages.length,
            status: String(data.status ?? ""),
            purchaseCount: Number(data.purchaseCount ?? 0),
            createdAt: createdAtRaw?.toDate?.() ?? new Date(),
            submittedAt: submittedAtRaw?.toDate?.() ?? createdAtRaw?.toDate?.() ?? new Date(),
            approvedAt: typeof data.approvedAt === "string" ? data.approvedAt : null,
            rejectionReason: typeof data.rejectionReason === "string" ? data.rejectionReason : null,
            pages: pages.map((p, idx) => {
              const textTemplate = p.textTemplate as { masculine?: string; feminine?: string } | undefined;
              return {
                pageNumber: Number(p.pageNumber ?? idx + 1),
                text: textTemplate?.masculine || textTemplate?.feminine || "",
                imageUrl: typeof p.sampleImageUrl === "string" ? p.sampleImageUrl : null,
              };
            }),
          };
        });
        setAllStories(items);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, []);

  useEffect(() => {
    listAdminSpecialists()
      .then((rows) => setSpecialistNames(new Map(rows.map((r) => [r.id, r.displayName]))))
      .catch(() => {});
  }, []);

  const pending = useMemo(
    () =>
      allStories
        .filter((s) => s.status === "pending_review")
        .sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime()),
    [allStories],
  );

  const approvedThisMonthCount = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return allStories.filter(
      (s) => s.status === "approved" && s.approvedAt && new Date(s.approvedAt) >= startOfMonth,
    ).length;
  }, [allStories]);

  const avgWaitHours = useMemo(() => {
    if (pending.length === 0) return 0;
    const totalHours = pending.reduce(
      (sum, s) => sum + (Date.now() - s.submittedAt.getTime()) / 36e5,
      0,
    );
    return totalHours / pending.length;
  }, [pending]);

  const topicOptions = useMemo(
    () => Array.from(new Set(allStories.map((s) => s.topic).filter((x) => x && x !== "—"))).sort(),
    [allStories],
  );

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allStories
      .filter((s) => !q || s.title.toLowerCase().includes(q))
      .filter((s) => !statusFilter || s.status === statusFilter)
      .filter((s) => !topicFilter || s.topic === topicFilter)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [allStories, search, statusFilter, topicFilter]);

  const getCreatorName = (specialistId: string | null) => {
    if (!specialistId) return "—";
    return specialistNames.get(specialistId) ?? specialistId;
  };

  const handleApprove = async (id: string) => {
    await updateDoc(doc(db, "story_templates", id), {
      status: "approved",
      approvedAt: new Date().toISOString(),
    });
  };

  const openRejectDialog = (id: string) => {
    setRejectTargetId(id);
    setRejectReason("");
  };

  const submitReject = async () => {
    if (!rejectTargetId || !rejectReason.trim()) return;
    await updateDoc(doc(db, "story_templates", rejectTargetId), {
      status: "rejected",
      rejectionReason: rejectReason.trim(),
      rejectedAt: serverTimestamp(),
    });
    setRejectTargetId(null);
    setRejectReason("");
  };

  const openDetail = (story: StoryTemplateRow) => {
    setSelectedStory(story);
    setSelectedStoryFeedback([]);
    setFeedbackLoading(true);
    listAdminFeedback(story.id)
      .then(setSelectedStoryFeedback)
      .catch(() => {})
      .finally(() => setFeedbackLoading(false));
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

  const statusChipStyle = (status: string) =>
    status === "approved"
      ? { bg: "#EAF3DE", color: "#3B6D11" }
      : status === "rejected"
        ? { bg: "#F4E2E2", color: "#A32D2D" }
        : { bg: "#FAEEDA", color: "#854F0B" };

  const avgRatingFor = (feedback: AdminFeedbackItem[]) => {
    const rated = feedback.filter((f) => f.rating != null);
    if (rated.length === 0) return null;
    return rated.reduce((sum, f) => sum + (f.rating ?? 0), 0) / rated.length;
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
            value={pending.length > 0 ? `${(avgWaitHours / 24).toFixed(1)}d` : "—"}
            delta={t("admin.stories.kpiAvgWaitSub")}
            deltaType="neutral"
            fillPct={Math.min(100, (avgWaitHours / 48) * 100)}
            fillColor={COLORS.primary}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <AdminKpiCard
            label={t("admin.stories.kpiApprovedMonth")}
            value={String(approvedThisMonthCount)}
            delta={t("admin.stories.kpiApprovedSub")}
            deltaType="neutral"
            fillPct={Math.min(100, approvedThisMonthCount * 8)}
            fillColor="#0F6E56"
          />
        </Grid>
      </Grid>

      <Paper elevation={0} sx={{ p: 2, border: `0.5px solid ${COLORS.border}`, borderRadius: "12px", bgcolor: "#fff", mb: 2.5 }}>
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
                onClick={() => openDetail(story)}
                sx={{
                  width: 36,
                  height: 48,
                  borderRadius: "4px",
                  flexShrink: 0,
                  cursor: "pointer",
                  backgroundImage: story.pages[0]?.imageUrl ? `url(${story.pages[0].imageUrl})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  background: story.pages[0]?.imageUrl ? undefined : "linear-gradient(135deg, #1a3a5c, #0f2847)",
                }}
              />
              <Box sx={{ flex: 1, cursor: "pointer", minWidth: 0 }} onClick={() => openDetail(story)}>
                <Typography sx={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary }}>
                  {story.title}
                </Typography>
                <Typography sx={{ fontSize: 11, color: COLORS.textSecondary }}>
                  {getCreatorName(story.specialistId)} · {story.topic} · {story.language.join(" + ") || "—"} ·{" "}
                  {story.spreadCount} {t("admin.stories.spreads")}
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
                  onClick={() => openRejectDialog(story.id)}
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

      <Paper elevation={0} sx={{ p: 2, border: `0.5px solid ${COLORS.border}`, borderRadius: "12px", bgcolor: "#fff" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5, mb: 2 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary }}>
            {t("admin.stories.catalogTitle")}
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <TextField
              size="small"
              placeholder={t("admin.stories.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ fontSize: 12, minWidth: 180 }}
            />
            <Select
              size="small"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              displayEmpty
              sx={{ fontSize: 12, minWidth: 140 }}
            >
              <MenuItem value="" sx={{ fontSize: 12 }}>{t("admin.stories.statusAll")}</MenuItem>
              <MenuItem value="approved" sx={{ fontSize: 12 }}>{t("admin.stories.statusApproved")}</MenuItem>
              <MenuItem value="pending_review" sx={{ fontSize: 12 }}>{t("admin.stories.statusPendingReview")}</MenuItem>
              <MenuItem value="rejected" sx={{ fontSize: 12 }}>{t("admin.stories.statusRejected")}</MenuItem>
            </Select>
            <Select
              size="small"
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              displayEmpty
              sx={{ fontSize: 12, minWidth: 140 }}
            >
              <MenuItem value="" sx={{ fontSize: 12 }}>{t("admin.stories.topicAll")}</MenuItem>
              {topicOptions.map((topic) => (
                <MenuItem key={topic} value={topic} sx={{ fontSize: 12 }}>{topic}</MenuItem>
              ))}
            </Select>
          </Box>
        </Box>

        <Box sx={{ overflowX: "auto" }}>
          <Box sx={{ minWidth: 780 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "2fr 1.3fr 1fr 70px 90px 90px 100px",
                gap: 1,
                px: 1,
                pb: 1,
                borderBottom: `0.5px solid ${COLORS.border}`,
              }}
            >
              {[
                t("admin.stories.colTitle"),
                t("admin.stories.colCreator"),
                t("admin.stories.colTopic"),
                t("admin.stories.colAge"),
                t("admin.stories.colPurchases"),
                t("admin.stories.colStatus"),
                t("admin.stories.colCreated"),
              ].map((h, idx) => (
                <Typography key={idx} sx={{ fontSize: 11, color: COLORS.textSecondary }}>
                  {h}
                </Typography>
              ))}
            </Box>

            {!loading && filteredCatalog.length === 0 && (
              <Typography sx={{ fontSize: 12, color: COLORS.textSecondary, mt: 2 }}>
                {t("admin.stories.emptyCatalog")}
              </Typography>
            )}

            {filteredCatalog.map((story, i) => {
              const chip = statusChipStyle(story.status);
              const isLast = i === filteredCatalog.length - 1;
              return (
                <Box
                  key={story.id}
                  onClick={() => openDetail(story)}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1.3fr 1fr 70px 90px 90px 100px",
                    gap: 1,
                    px: 1,
                    py: 1,
                    borderBottom: isLast ? "none" : `0.5px solid ${COLORS.border}`,
                    alignItems: "center",
                    cursor: "pointer",
                    "&:hover": { bgcolor: `${COLORS.secondary}0A` },
                  }}
                >
                  <Typography sx={{ fontSize: 12, fontWeight: 500, color: COLORS.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {story.title || "—"}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: COLORS.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {getCreatorName(story.specialistId)}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: COLORS.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {story.topic}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>{story.ageGroup}</Typography>
                  <Typography sx={{ fontSize: 12, color: COLORS.textPrimary }}>{story.purchaseCount}</Typography>
                  <Box sx={{ bgcolor: chip.bg, color: chip.color, fontSize: 10, px: "8px", py: "2px", borderRadius: "10px", width: "fit-content" }}>
                    {t(`admin.stories.status${story.status === "approved" ? "Approved" : story.status === "rejected" ? "Rejected" : "PendingReview"}`)}
                  </Box>
                  <Typography sx={{ fontSize: 11, color: COLORS.textSecondary }}>
                    {story.createdAt.toLocaleDateString()}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Paper>

      <Dialog open={!!rejectTargetId} onClose={() => setRejectTargetId(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 600 }}>{t("admin.stories.rejectDialogTitle")}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            label={t("admin.stories.rejectReasonLabel")}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectTargetId(null)} sx={{ textTransform: "none" }}>
            {t("admin.stories.rejectCancel")}
          </Button>
          <Button
            onClick={submitReject}
            disabled={!rejectReason.trim()}
            variant="contained"
            color="error"
            sx={{ textTransform: "none" }}
          >
            {t("admin.stories.rejectSubmit")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!selectedStory} onClose={() => setSelectedStory(null)} maxWidth="md" fullWidth>
        {selectedStory && (
          <>
            <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 16, fontWeight: 600 }}>
              {selectedStory.title}
              <IconButton size="small" onClick={() => setSelectedStory(null)}>
                <CloseOutlined fontSize="small" />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography sx={{ fontSize: 10, color: COLORS.textSecondary }}>{t("admin.stories.detailCreator")}</Typography>
                  <Typography
                    sx={{ fontSize: 13, fontWeight: 500, color: COLORS.secondary, cursor: selectedStory.specialistId ? "pointer" : "default" }}
                    onClick={() =>
                      selectedStory.specialistId &&
                      navigate(`/${lang}/admin/psychologists/${selectedStory.specialistId}`)
                    }
                  >
                    {getCreatorName(selectedStory.specialistId)}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography sx={{ fontSize: 10, color: COLORS.textSecondary }}>{t("admin.stories.detailCreated")}</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 500 }}>{selectedStory.createdAt.toLocaleDateString()}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography sx={{ fontSize: 10, color: COLORS.textSecondary }}>{t("admin.stories.colPurchases")}</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 500 }}>{selectedStory.purchaseCount}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography sx={{ fontSize: 10, color: COLORS.textSecondary }}>{t("admin.stories.detailReviews")}</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
                    {feedbackLoading
                      ? t("admin.common.loading")
                      : avgRatingFor(selectedStoryFeedback) != null
                        ? `★${avgRatingFor(selectedStoryFeedback)!.toFixed(1)} (${selectedStoryFeedback.length})`
                        : t("admin.stories.detailNoReviews")}
                  </Typography>
                </Grid>
              </Grid>

              {selectedStory.status === "rejected" && selectedStory.rejectionReason && (
                <Typography sx={{ fontSize: 12, color: "#A32D2D", mb: 2 }}>
                  {t("admin.stories.detailRejectionReason")}: {selectedStory.rejectionReason}
                </Typography>
              )}

              <Typography sx={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary, mb: 1.5 }}>
                {t("admin.stories.detailPages")} ({selectedStory.spreadCount})
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {selectedStory.pages.map((page) => (
                  <Box key={page.pageNumber} sx={{ display: "flex", gap: 1.5, border: `0.5px solid ${COLORS.border}`, borderRadius: "8px", p: 1.5 }}>
                    <Box
                      sx={{
                        width: 60,
                        height: 80,
                        borderRadius: "4px",
                        flexShrink: 0,
                        backgroundImage: page.imageUrl ? `url(${page.imageUrl})` : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        background: page.imageUrl ? undefined : "linear-gradient(135deg, #1a3a5c, #0f2847)",
                      }}
                    />
                    <Typography sx={{ fontSize: 12, color: COLORS.textSecondary, lineHeight: 1.6 }}>
                      {page.text || "—"}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedStory(null)} sx={{ textTransform: "none" }}>
                {t("admin.stories.detailClose")}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
