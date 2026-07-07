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
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import { COLORS, ADMIN_STATUS_COLORS } from "../../theme";
import { useTranslation } from "../../i18n/useTranslation";
import { listAdminSpecialists } from "../../api/adminSpecialists";
import { listAdminFeedback, type AdminFeedbackItem } from "../../api/adminFeedback";

const STORY_STATUS_KEY_MAP: Record<string, keyof typeof ADMIN_STATUS_COLORS> = {
  approved: "approved",
  published: "published",
  rejected: "rejected",
};

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
  const [topicFilter, setTopicFilter] = useState("");

  const [selectedStory, setSelectedStory] = useState<StoryTemplateRow | null>(null);
  const [selectedStoryFeedback, setSelectedStoryFeedback] = useState<AdminFeedbackItem[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "story_templates"),
      (snap) => {
        const items = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          const createdAtRaw = data.createdAt as { toDate?: () => Date } | undefined;
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
            status: String(data.status ?? "approved"),
            purchaseCount: Number(data.purchaseCount ?? 0),
            createdAt: createdAtRaw?.toDate?.() ?? new Date(),
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

  const topicOptions = useMemo(
    () => Array.from(new Set(allStories.map((s) => s.topic).filter((x) => x && x !== "—"))).sort(),
    [allStories],
  );

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allStories
      .filter((s) => !q || s.title.toLowerCase().includes(q))
      .filter((s) => !topicFilter || s.topic === topicFilter)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [allStories, search, topicFilter]);

  const getCreatorName = (specialistId: string | null) => {
    if (!specialistId) return "—";
    return specialistNames.get(specialistId) ?? specialistId;
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

  const statusChipStyle = (status: string) =>
    (STORY_STATUS_KEY_MAP[status] && ADMIN_STATUS_COLORS[STORY_STATUS_KEY_MAP[status]]) || {
      bg: COLORS.background,
      fg: COLORS.textSecondary,
    };

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

            {loading && (
              <Typography sx={{ fontSize: 12, color: COLORS.textSecondary, mt: 2 }}>
                {t("admin.common.loading")}
              </Typography>
            )}

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
                  <Box sx={{ bgcolor: chip.bg, color: chip.fg, fontSize: 10, px: "8px", py: "2px", borderRadius: "10px", width: "fit-content" }}>
                    {story.status}
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
                        background: page.imageUrl
                          ? undefined
                          : `linear-gradient(135deg, ${COLORS.secondary}, ${COLORS.primary})`,
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
