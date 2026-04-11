import { useEffect, useState } from "react";
import { Box, Paper, Typography } from "@mui/material";
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
  const [rows, setRows] = useState<CaregiverRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "caregivers"),
      (snap) => {
        const items = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            fullName: String(data.fullName ?? "—"),
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

  return (
    <Box sx={{ p: 3 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary, mb: 2 }}>
        {t("admin.users.title")}
      </Typography>
      <Paper elevation={0} sx={{ p: 2, border: `0.5px solid ${COLORS.border}`, borderRadius: "12px", bgcolor: "#fff" }}>
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
        {!loading &&
          rows.map((r, i) => {
            const isLast = i === rows.length - 1;
            return (
              <Box
                key={r.id}
                sx={{
                  display: "grid",
                  gridTemplateColumns: "2fr 2fr 100px 100px",
                  gap: 1,
                  px: 1,
                  py: 1,
                  borderBottom: isLast ? "none" : `0.5px solid ${COLORS.border}`,
                  alignItems: "center",
                }}
              >
                <Typography sx={{ fontSize: 12, color: COLORS.textPrimary }}>{r.fullName}</Typography>
                <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>{r.email}</Typography>
                <Typography sx={{ fontSize: 12, color: COLORS.textPrimary }}>{r.purchaseCount}</Typography>
                <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>{r.role}</Typography>
              </Box>
            );
          })}
      </Paper>
    </Box>
  );
}
