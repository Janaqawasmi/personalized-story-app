import { useEffect, useMemo, useState } from "react";
import { Box, Paper, Typography, Avatar, TextField } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { COLORS, ADMIN_STATUS_COLORS } from "../../theme";
import { useTranslation } from "../../i18n/useTranslation";
import { listAdminSpecialists, type AdminSpecialistListItem } from "../../api/adminSpecialists";

const STATUS_LABEL_KEYS = {
  active: "admin.psychologists.statusActive" as const,
  disabled: "admin.psychologists.statusDisabled" as const,
};

export default function AdminPsychologistsPage() {
  const t = useTranslation();
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const [specialists, setSpecialists] = useState<AdminSpecialistListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    listAdminSpecialists()
      .then((rows) => {
        if (!cancelled) setSpecialists(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load specialists");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleSpecialists = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return specialists;
    return specialists.filter(
      (s) => s.displayName.toLowerCase().includes(q) || (s.email ?? "").toLowerCase().includes(q),
    );
  }, [specialists, search]);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const getRatingColor = (rating: number | null) =>
    rating == null
      ? COLORS.textSecondary
      : rating >= 4
        ? ADMIN_STATUS_COLORS.approved.fg
        : rating >= 3
          ? ADMIN_STATUS_COLORS.pending.fg
          : ADMIN_STATUS_COLORS.failed.fg;

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
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5, mb: 2 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary }}>
            {t("admin.psychologists.leaderboard")}
          </Typography>
          <TextField
            size="small"
            placeholder={t("admin.psychologists.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ fontSize: 12, minWidth: 220 }}
          />
        </Box>

        {error && <Typography sx={{ fontSize: 12, color: "error.main", mb: 2 }}>{error}</Typography>}

        {/* Horizontal scroll on mobile keeps columns readable instead of crushing them */}
        <Box sx={{ overflowX: "auto" }}>
          <Box sx={{ minWidth: 620 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "2.5fr 100px 120px 100px 100px",
                gap: 1,
                px: 1,
                pb: 1,
                borderBottom: `0.5px solid ${COLORS.border}`,
              }}
            >
              {[
                t("admin.psychologists.colCreator"),
                t("admin.psychologists.colStories"),
                t("admin.psychologists.colPurchases"),
                t("admin.psychologists.colRating"),
                t("admin.psychologists.colStatus"),
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

            {!loading && visibleSpecialists.length === 0 && (
              <Typography sx={{ fontSize: 12, color: COLORS.textSecondary, mt: 2 }}>
                {t("admin.psychologists.empty")}
              </Typography>
            )}

            {visibleSpecialists.map((p, i) => {
              const status = ADMIN_STATUS_COLORS[p.status] ?? ADMIN_STATUS_COLORS.active;
              const labelKey = STATUS_LABEL_KEYS[p.status] ?? STATUS_LABEL_KEYS.active;
              const isLast = i === visibleSpecialists.length - 1;
              return (
                <Box
                  key={p.id}
                  onClick={() => p.isRealAccount && navigate(`/${lang}/admin/psychologists/${p.id}`)}
                  title={p.isRealAccount ? undefined : t("admin.psychologists.systemAccountHint")}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "2.5fr 100px 120px 100px 100px",
                    gap: 1,
                    px: 1,
                    py: 1,
                    borderBottom: isLast ? "none" : `0.5px solid ${COLORS.border}`,
                    alignItems: "center",
                    cursor: p.isRealAccount ? "pointer" : "default",
                    opacity: p.isRealAccount ? 1 : 0.6,
                    "&:hover": { bgcolor: p.isRealAccount ? `${COLORS.secondary}0A` : "transparent" },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                    <Avatar sx={{ width: 28, height: 28, bgcolor: COLORS.secondary, fontSize: 11, flexShrink: 0 }}>
                      {getInitials(p.displayName)}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 500, color: COLORS.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p.displayName}
                      </Typography>
                      <Typography sx={{ fontSize: 10, color: COLORS.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p.joinedAt ? t("admin.psychologists.joined", { date: new Date(p.joinedAt).toLocaleDateString() }) : p.email}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography sx={{ fontSize: 12, color: COLORS.textPrimary }}>{p.storyCount}</Typography>
                  <Typography sx={{ fontSize: 12, color: COLORS.textPrimary }}>
                    {p.totalPurchases.toLocaleString()}
                  </Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: getRatingColor(p.avgRating) }}>
                    {p.avgRating != null ? `★${p.avgRating.toFixed(1)}` : "—"}
                  </Typography>
                  <Box
                    sx={{
                      bgcolor: status.bg,
                      color: status.fg,
                      fontSize: 10,
                      px: "8px",
                      py: "2px",
                      borderRadius: "10px",
                      display: "inline-block",
                      width: "fit-content",
                    }}
                  >
                    {t(labelKey)}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
