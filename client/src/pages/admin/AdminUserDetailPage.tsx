import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Paper, Typography, Avatar, Grid, IconButton } from "@mui/material";
import { ArrowBackOutlined } from "@mui/icons-material";
import { COLORS } from "../../theme";
import { useTranslation } from "../../i18n/useTranslation";
import { getAdminUser, type AdminUserDetail } from "../../api/adminUsers";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Paper elevation={0} sx={{ p: "14px 16px", border: `0.5px solid ${COLORS.border}`, borderRadius: "12px", bgcolor: "#fff" }}>
      <Typography sx={{ fontSize: 11, color: COLORS.textSecondary, mb: 0.75 }}>{label}</Typography>
      <Typography sx={{ fontSize: 22, fontWeight: 500, color: COLORS.textPrimary }}>{value}</Typography>
    </Paper>
  );
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  completed: { bg: "#EAF3DE", color: "#3B6D11" },
  paid: { bg: "#EAF3DE", color: "#3B6D11" },
  pending: { bg: "#FAEEDA", color: "#854F0B" },
  generation_in_progress: { bg: "#FAEEDA", color: "#854F0B" },
  generation_partially_failed: { bg: "#F4E2E2", color: "#A32D2D" },
  failed: { bg: "#F4E2E2", color: "#A32D2D" },
  refunded: { bg: "#E6F1FB", color: "#185FA5" },
};

export default function AdminUserDetailPage() {
  const t = useTranslation();
  const navigate = useNavigate();
  const { lang, uid } = useParams<{ lang: string; uid: string }>();
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          <Paper elevation={0} sx={{ p: 2.5, border: `0.5px solid ${COLORS.border}`, borderRadius: "12px", bgcolor: "#fff", mb: 2, display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar sx={{ width: 56, height: 56, bgcolor: COLORS.secondary, fontSize: 20 }}>
              {getInitials(detail.user.displayName ?? detail.user.email ?? "?")}
            </Avatar>
            <Box>
              <Typography sx={{ fontSize: 17, fontWeight: 600, color: COLORS.textPrimary }}>
                {detail.user.displayName ?? "—"}
              </Typography>
              <Typography sx={{ fontSize: 13, color: COLORS.textSecondary }}>{detail.user.email ?? "—"}</Typography>
              <Typography sx={{ fontSize: 11, color: COLORS.textSecondary, mt: 0.25 }}>
                {detail.user.createdAt
                  ? t("admin.psychologists.joined", { date: new Date(detail.user.createdAt).toLocaleDateString() })
                  : null}
              </Typography>
            </Box>
          </Paper>

          <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <StatCard label={t("admin.userDetail.purchaseCount")} value={String(detail.user.purchaseCount)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <StatCard
                label={t("admin.userDetail.freePreview")}
                value={detail.user.freePreviewUsed ? t("admin.userDetail.used") : t("admin.userDetail.notUsed")}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <StatCard label={t("admin.userDetail.language")} value={detail.user.language?.toUpperCase() ?? "—"} />
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
                  const chip = STATUS_STYLES[p.status] ?? { bg: "#EEE", color: COLORS.textSecondary };
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
                      <Box sx={{ bgcolor: chip.bg, color: chip.color, fontSize: 10, px: "8px", py: "2px", borderRadius: "10px", width: "fit-content" }}>
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
    </Box>
  );
}
