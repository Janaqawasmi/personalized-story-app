import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Grid,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { ArrowBackOutlined } from "@mui/icons-material";
import { COLORS, ADMIN_STATUS_COLORS } from "../../theme";
import { useTranslation } from "../../i18n/useTranslation";
import { getAdminSpecialist, setAdminSpecialistDisabled, type AdminSpecialistDetail } from "../../api/adminSpecialists";
import AdminStatCard from "./components/AdminStatCard";

const STORY_STATUS_KEY_MAP: Record<string, keyof typeof ADMIN_STATUS_COLORS> = {
  approved: "approved",
  published: "published",
  pending_review: "pending",
  rejected: "rejected",
};

export default function AdminSpecialistDetailPage() {
  const t = useTranslation();
  const navigate = useNavigate();
  const { lang, specialistId } = useParams<{ lang: string; specialistId: string }>();
  const [detail, setDetail] = useState<AdminSpecialistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!specialistId) return;
    let cancelled = false;
    getAdminSpecialist(specialistId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load specialist");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [specialistId]);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const handleToggleDisabled = async () => {
    if (!specialistId || !detail) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const nextDisabled = detail.specialist.status !== "disabled";
      await setAdminSpecialistDisabled(specialistId, nextDisabled);
      setDetail({ ...detail, specialist: { ...detail.specialist, status: nextDisabled ? "disabled" : "active" } });
      setConfirmOpen(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update account status");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <IconButton size="small" onClick={() => navigate(`/${lang}/admin/psychologists`)}>
          <ArrowBackOutlined sx={{ fontSize: 18, transform: lang === "he" || lang === "ar" ? "scaleX(-1)" : "none" }} />
        </IconButton>
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 500,
            color: COLORS.textSecondary,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          {t("admin.specialistDetail.back")}
        </Typography>
      </Box>

      {loading && (
        <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>{t("admin.common.loading")}</Typography>
      )}

      {error && <Typography sx={{ fontSize: 12, color: "error.main" }}>{error}</Typography>}

      {!loading && !error && detail && (
        <>
          <Paper elevation={0} sx={{ p: 2.5, border: `0.5px solid ${COLORS.border}`, borderRadius: "12px", bgcolor: "#fff", mb: 2, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <Avatar sx={{ width: 56, height: 56, bgcolor: COLORS.secondary, fontSize: 20 }}>
              {getInitials(detail.specialist.displayName)}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography sx={{ fontSize: 17, fontWeight: 600, color: COLORS.textPrimary }}>
                  {detail.specialist.displayName}
                </Typography>
                <Box
                  sx={{
                    bgcolor: ADMIN_STATUS_COLORS[detail.specialist.status === "disabled" ? "disabled" : "active"].bg,
                    color: ADMIN_STATUS_COLORS[detail.specialist.status === "disabled" ? "disabled" : "active"].fg,
                    fontSize: 10,
                    px: "8px",
                    py: "2px",
                    borderRadius: "10px",
                  }}
                >
                  {detail.specialist.status === "disabled"
                    ? t("admin.psychologists.statusDisabled")
                    : t("admin.psychologists.statusActive")}
                </Box>
              </Box>
              <Typography sx={{ fontSize: 13, color: COLORS.textSecondary }}>
                {detail.specialist.email ?? "—"}
              </Typography>
              <Typography sx={{ fontSize: 11, color: COLORS.textSecondary, mt: 0.25 }}>
                {detail.specialist.joinedAt
                  ? t("admin.psychologists.joined", { date: new Date(detail.specialist.joinedAt).toLocaleDateString() })
                  : null}
              </Typography>
            </Box>
            {detail.specialist.isRealAccount && (
              <Button
                size="small"
                variant="outlined"
                color={detail.specialist.status === "disabled" ? "success" : "error"}
                onClick={() => setConfirmOpen(true)}
                sx={{ textTransform: "none" }}
              >
                {detail.specialist.status === "disabled"
                  ? t("admin.specialistDetail.enableAccount")
                  : t("admin.specialistDetail.disableAccount")}
              </Button>
            )}
          </Paper>

          <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <AdminStatCard label={t("admin.specialistDetail.storyCount")} value={String(detail.stats.storyCount)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <AdminStatCard
                label={t("admin.specialistDetail.totalPurchases")}
                value={detail.stats.totalPurchases.toLocaleString()}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <AdminStatCard
                label={t("admin.specialistDetail.avgRating")}
                value={detail.stats.avgRating != null ? `★${detail.stats.avgRating.toFixed(1)}` : "—"}
              />
            </Grid>
          </Grid>

          <Paper elevation={0} sx={{ p: 2, border: `0.5px solid ${COLORS.border}`, borderRadius: "12px", bgcolor: "#fff" }}>
            <Typography sx={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary, mb: 2 }}>
              {t("admin.specialistDetail.stories")}
            </Typography>

            <Box sx={{ overflowX: "auto" }}>
              <Box sx={{ minWidth: 680 }}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1.2fr 90px 90px 110px 100px 90px",
                    gap: 1,
                    px: 1,
                    pb: 1,
                    borderBottom: `0.5px solid ${COLORS.border}`,
                  }}
                >
                  {[
                    t("admin.specialistDetail.colTitle"),
                    t("admin.specialistDetail.colTopic"),
                    t("admin.specialistDetail.colAge"),
                    t("admin.specialistDetail.colPurchases"),
                    t("admin.specialistDetail.colRating"),
                    t("admin.specialistDetail.colPublished"),
                    t("admin.specialistDetail.colStatus"),
                  ].map((h, idx) => (
                    <Typography key={idx} sx={{ fontSize: 11, color: COLORS.textSecondary }}>
                      {h}
                    </Typography>
                  ))}
                </Box>

                {detail.stories.length === 0 && (
                  <Typography sx={{ fontSize: 12, color: COLORS.textSecondary, mt: 2 }}>
                    {t("admin.specialistDetail.empty")}
                  </Typography>
                )}

                {detail.stories.map((s, i) => {
                  const isLast = i === detail.stories.length - 1;
                  return (
                    <Box
                      key={s.id}
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "2fr 1.2fr 90px 90px 110px 100px 90px",
                        gap: 1,
                        px: 1,
                        py: 1,
                        borderBottom: isLast ? "none" : `0.5px solid ${COLORS.border}`,
                        alignItems: "center",
                      }}
                    >
                      <Typography sx={{ fontSize: 12, fontWeight: 500, color: COLORS.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {s.title || "—"}
                      </Typography>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 12, color: COLORS.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {s.primaryTopic || "—"}
                        </Typography>
                        {s.language && (
                          <Typography sx={{ fontSize: 10, color: COLORS.textMuted }}>
                            {s.language.toUpperCase()}
                          </Typography>
                        )}
                      </Box>
                      <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>{s.ageGroup ?? "—"}</Typography>
                      <Typography sx={{ fontSize: 12, color: COLORS.textPrimary }}>{s.purchaseCount}</Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 600, color: COLORS.textPrimary }}>
                        {s.avgRating != null
                          ? `★${s.avgRating.toFixed(1)} (${s.reviewCount})`
                          : "—"}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: COLORS.textSecondary }}>
                        {s.publishedAt
                          ? new Date(s.publishedAt).toLocaleDateString()
                          : s.approvedAt
                            ? new Date(s.approvedAt).toLocaleDateString()
                            : "—"}
                      </Typography>
                      {(() => {
                        const statusKey = STORY_STATUS_KEY_MAP[s.status];
                        const chip = (statusKey && ADMIN_STATUS_COLORS[statusKey]) || {
                          bg: COLORS.background,
                          fg: COLORS.textSecondary,
                        };
                        return (
                          <Box
                            sx={{
                              bgcolor: chip.bg,
                              color: chip.fg,
                              fontSize: 10,
                              px: "8px",
                              py: "2px",
                              borderRadius: "10px",
                              width: "fit-content",
                            }}
                          >
                            {s.status}
                          </Box>
                        );
                      })()}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Paper>
        </>
      )}

      {detail && (
        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontSize: 15, fontWeight: 600 }}>
            {detail.specialist.status === "disabled"
              ? t("admin.specialistDetail.enableConfirmTitle")
              : t("admin.specialistDetail.disableConfirmTitle")}
          </DialogTitle>
          <DialogContent>
            <Typography sx={{ fontSize: 13, color: COLORS.textSecondary }}>
              {detail.specialist.status === "disabled"
                ? t("admin.specialistDetail.enableConfirmBody")
                : t("admin.specialistDetail.disableConfirmBody")}
            </Typography>
            {actionError && (
              <Typography sx={{ fontSize: 12, color: "error.main", mt: 1.5 }}>{actionError}</Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)} sx={{ textTransform: "none" }}>
              {t("admin.specialistDetail.confirmCancel")}
            </Button>
            <Button
              onClick={handleToggleDisabled}
              disabled={actionLoading}
              variant="contained"
              color={detail.specialist.status === "disabled" ? "success" : "error"}
              sx={{ textTransform: "none" }}
            >
              {t("admin.specialistDetail.confirmSubmit")}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
