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
import { getAdminUser, setAdminUserDisabled, type AdminUserDetail } from "../../api/adminUsers";
import AdminStatCard from "./components/AdminStatCard";

const STATUS_KEY_MAP: Record<string, keyof typeof ADMIN_STATUS_COLORS> = {
  completed: "completed",
  paid: "paid",
  pending: "pending",
  generation_in_progress: "pending",
  generation_partially_failed: "failed",
  failed: "failed",
  refunded: "refunded",
};

export default function AdminUserDetailPage() {
  const t = useTranslation();
  const navigate = useNavigate();
  const { lang, uid } = useParams<{ lang: string; uid: string }>();
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    getAdminUser(uid)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load user");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const handleToggleDisabled = async () => {
    if (!uid || !detail) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const nextDisabled = !detail.user.disabled;
      await setAdminUserDisabled(uid, nextDisabled);
      setDetail({ ...detail, user: { ...detail.user, disabled: nextDisabled } });
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
        <IconButton size="small" onClick={() => navigate(`/${lang}/admin/users`)}>
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
          {t("admin.userDetail.back")}
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
              {getInitials(detail.user.displayName ?? detail.user.email ?? "?")}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography sx={{ fontSize: 17, fontWeight: 600, color: COLORS.textPrimary }}>
                  {detail.user.displayName ?? "—"}
                </Typography>
                <Box
                  sx={{
                    bgcolor: detail.user.disabled ? ADMIN_STATUS_COLORS.disabled.bg : ADMIN_STATUS_COLORS.active.bg,
                    color: detail.user.disabled ? ADMIN_STATUS_COLORS.disabled.fg : ADMIN_STATUS_COLORS.active.fg,
                    fontSize: 10,
                    px: "8px",
                    py: "2px",
                    borderRadius: "10px",
                  }}
                >
                  {detail.user.disabled ? t("admin.userDetail.statusDisabled") : t("admin.userDetail.statusActive")}
                </Box>
                <Box sx={{ bgcolor: COLORS.background, color: COLORS.textSecondary, fontSize: 10, px: "8px", py: "2px", borderRadius: "10px", textTransform: "capitalize" }}>
                  {detail.user.role}
                </Box>
              </Box>
              <Typography sx={{ fontSize: 13, color: COLORS.textSecondary }}>{detail.user.email ?? "—"}</Typography>
              <Typography sx={{ fontSize: 11, color: COLORS.textSecondary, mt: 0.25 }}>
                {detail.user.createdAt
                  ? t("admin.psychologists.joined", { date: new Date(detail.user.createdAt).toLocaleDateString() })
                  : null}
              </Typography>
            </Box>
            <Button
              size="small"
              variant="outlined"
              color={detail.user.disabled ? "success" : "error"}
              onClick={() => setConfirmOpen(true)}
              sx={{ textTransform: "none" }}
            >
              {detail.user.disabled ? t("admin.userDetail.enableAccount") : t("admin.userDetail.disableAccount")}
            </Button>
          </Paper>

          <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <AdminStatCard label={t("admin.userDetail.purchaseCount")} value={String(detail.user.purchaseCount)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <AdminStatCard
                label={t("admin.userDetail.freePreview")}
                value={detail.user.freePreviewUsed ? t("admin.userDetail.used") : t("admin.userDetail.notUsed")}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <AdminStatCard label={t("admin.userDetail.language")} value={detail.user.language?.toUpperCase() ?? "—"} />
            </Grid>
          </Grid>

          <Paper elevation={0} sx={{ p: 2, border: `0.5px solid ${COLORS.border}`, borderRadius: "12px", bgcolor: "#fff" }}>
            <Typography sx={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary, mb: 2 }}>
              {t("admin.userDetail.purchases")}
            </Typography>

            <Box sx={{ overflowX: "auto" }}>
              <Box sx={{ minWidth: 680 }}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1.2fr 90px 90px 100px 110px",
                    gap: 1,
                    px: 1,
                    pb: 1,
                    borderBottom: `0.5px solid ${COLORS.border}`,
                  }}
                >
                  {[
                    t("admin.userDetail.colStory"),
                    t("admin.userDetail.colChild"),
                    t("admin.userDetail.colFormat"),
                    t("admin.userDetail.colAmount"),
                    t("admin.userDetail.colStatus"),
                    t("admin.userDetail.colDate"),
                  ].map((h, idx) => (
                    <Typography key={idx} sx={{ fontSize: 11, color: COLORS.textSecondary }}>
                      {h}
                    </Typography>
                  ))}
                </Box>

                {detail.purchases.length === 0 && (
                  <Typography sx={{ fontSize: 12, color: COLORS.textSecondary, mt: 2 }}>
                    {t("admin.userDetail.noPurchases")}
                  </Typography>
                )}

                {detail.purchases.map((p, i) => {
                  const isLast = i === detail.purchases.length - 1;
                  const statusKey = STATUS_KEY_MAP[p.status];
                  const chip = (statusKey && ADMIN_STATUS_COLORS[statusKey]) || { bg: COLORS.background, fg: COLORS.textSecondary };
                  return (
                    <Box
                      key={p.purchaseId}
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "2fr 1.2fr 90px 90px 100px 110px",
                        gap: 1,
                        px: 1,
                        py: 1,
                        borderBottom: isLast ? "none" : `0.5px solid ${COLORS.border}`,
                        alignItems: "center",
                      }}
                    >
                      <Typography sx={{ fontSize: 12, fontWeight: 500, color: COLORS.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p.storyTitle || "—"}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>{p.childName || "—"}</Typography>
                      <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>{p.purchaseFormat}</Typography>
                      <Typography sx={{ fontSize: 12, color: COLORS.textPrimary }}>
                        {(p.amountCents / 100).toFixed(2)} {p.currency}
                      </Typography>
                      <Box sx={{ bgcolor: chip.bg, color: chip.fg, fontSize: 10, px: "8px", py: "2px", borderRadius: "10px", width: "fit-content" }}>
                        {p.status}
                      </Box>
                      <Typography sx={{ fontSize: 11, color: COLORS.textSecondary }}>
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—"}
                      </Typography>
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
            {detail.user.disabled ? t("admin.userDetail.enableConfirmTitle") : t("admin.userDetail.disableConfirmTitle")}
          </DialogTitle>
          <DialogContent>
            <Typography sx={{ fontSize: 13, color: COLORS.textSecondary }}>
              {detail.user.disabled
                ? t("admin.userDetail.enableConfirmBody")
                : t("admin.userDetail.disableConfirmBody")}
            </Typography>
            {actionError && (
              <Typography sx={{ fontSize: 12, color: "error.main", mt: 1.5 }}>{actionError}</Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)} sx={{ textTransform: "none" }}>
              {t("admin.userDetail.confirmCancel")}
            </Button>
            <Button
              onClick={handleToggleDisabled}
              disabled={actionLoading}
              variant="contained"
              color={detail.user.disabled ? "success" : "error"}
              sx={{ textTransform: "none" }}
            >
              {t("admin.userDetail.confirmSubmit")}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
