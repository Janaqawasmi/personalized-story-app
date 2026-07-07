import { useEffect, useMemo, useState } from "react";
import { Box, Paper, Typography, TextField } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import { COLORS } from "../../theme";
import { useTranslation } from "../../i18n/useTranslation";

interface CaregiverRow {
  id: string;
  fullName: string;
  email: string;
  purchaseCount: number;
  role: string;
}

export default function AdminUsersPage() {
  const t = useTranslation();
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const [rows, setRows] = useState<CaregiverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "caregivers"),
      (snap) => {
        const items = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          const fullName = typeof data.fullName === "string" ? data.fullName.trim() : "";
          const displayName = typeof data.displayName === "string" ? data.displayName.trim() : "";
          return {
            id: d.id,
            fullName: fullName || displayName || "—",
            email: String(data.email ?? "—"),
            purchaseCount: Number(data.purchaseCount ?? 0),
            role: String(data.role ?? "caregiver"),
          };
        });
        items.sort((a, b) => a.fullName.localeCompare(b.fullName));
        setRows(items);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, []);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.fullName.toLowerCase().includes(q) || r.email.toLowerCase().includes(q),
    );
  }, [rows, search]);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5, mb: 2 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary }}>
          {t("admin.users.title")}
        </Typography>
        <TextField
          size="small"
          placeholder={t("admin.users.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ fontSize: 12, minWidth: 220 }}
        />
      </Box>
      <Paper elevation={0} sx={{ p: 2, border: `0.5px solid ${COLORS.border}`, borderRadius: "12px", bgcolor: "#fff" }}>
        {/* Horizontal scroll on mobile keeps columns readable instead of crushing them */}
        <Box sx={{ overflowX: "auto" }}>
          <Box sx={{ minWidth: 480 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "2fr 2fr 100px 100px",
                gap: 1,
                px: 1,
                pb: 1,
                borderBottom: `0.5px solid ${COLORS.border}`,
              }}
            >
              {[t("admin.users.colName"), t("admin.users.colEmail"), t("admin.users.colPurchases"), t("admin.users.colRole")].map(
                (h, idx) => (
                  <Typography key={idx} sx={{ fontSize: 11, color: COLORS.textSecondary }}>
                    {h}
                  </Typography>
                )
              )}
            </Box>
            {loading && (
              <Typography sx={{ fontSize: 12, color: COLORS.textSecondary, mt: 2 }}>{t("admin.common.loading")}</Typography>
            )}
            {!loading && visibleRows.length === 0 && (
              <Typography sx={{ fontSize: 12, color: COLORS.textSecondary, mt: 2 }}>{t("admin.users.empty")}</Typography>
            )}
            {!loading &&
              visibleRows.map((r, i) => {
                const isLast = i === visibleRows.length - 1;
                return (
                  <Box
                    key={r.id}
                    onClick={() => navigate(`/${lang}/admin/users/${r.id}`)}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "2fr 2fr 100px 100px",
                      gap: 1,
                      px: 1,
                      py: 1,
                      borderBottom: isLast ? "none" : `0.5px solid ${COLORS.border}`,
                      alignItems: "center",
                      cursor: "pointer",
                      "&:hover": { bgcolor: `${COLORS.secondary}0A` },
                    }}
                  >
                    <Typography sx={{ fontSize: 12, color: COLORS.textPrimary }}>{r.fullName}</Typography>
                    <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>{r.email}</Typography>
                    <Typography sx={{ fontSize: 12, color: COLORS.textPrimary }}>{r.purchaseCount}</Typography>
                    <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>{r.role}</Typography>
                  </Box>
                );
              })}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
