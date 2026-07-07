import { useEffect, useState } from "react";
import { Box, Paper, Typography, Select, MenuItem } from "@mui/material";
import { COLORS } from "../../theme";
import { useTranslation } from "../../i18n/useTranslation";
import { listAdminAuditLog, type AdminAuditLogEntry } from "../../api/adminAuditLog";
import AdminPagination from "./components/AdminPagination";

const ACTION_OPTIONS = [
  "brief.created",
  "brief.updated",
  "draft.updated",
  "draft.approved",
  "damma_brief.submitted",
  "damma_brief.feedback_submitted",
  "generation.requested",
  "generation.started",
  "generation.completed",
  "generation.failed",
  "user.disabled",
  "user.enabled",
  "specialist.disabled",
  "specialist.enabled",
];

export default function AdminAuditLogPage() {
  const t = useTranslation();
  const [items, setItems] = useState<AdminAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState("");

  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    setCursorStack([null]);
    setPageIndex(0);
  }, [actionFilter]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listAdminAuditLog({ cursor: cursorStack[pageIndex], action: actionFilter || undefined })
      .then((page) => {
        if (cancelled) return;
        setItems(page.items);
        setNextCursor(page.nextCursor);
        setHasMore(page.hasMore);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load audit log");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cursorStack/pageIndex intentionally drive refetch, not the other way around
  }, [pageIndex, actionFilter]);

  const handleNext = () => {
    if (!hasMore || !nextCursor) return;
    setCursorStack((prev) => [...prev.slice(0, pageIndex + 1), nextCursor]);
    setPageIndex((i) => i + 1);
  };

  const handlePrev = () => {
    if (pageIndex === 0) return;
    setPageIndex((i) => i - 1);
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
        {t("admin.auditLog.sectionEyebrow")}
      </Typography>

      <Paper elevation={0} sx={{ p: 2, border: `0.5px solid ${COLORS.border}`, borderRadius: "12px", bgcolor: "#fff" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5, mb: 2 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary }}>
            {t("admin.auditLog.title")}
          </Typography>
          <Select
            size="small"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            displayEmpty
            sx={{ fontSize: 12, minWidth: 200 }}
          >
            <MenuItem value="" sx={{ fontSize: 12 }}>{t("admin.auditLog.actionAll")}</MenuItem>
            {ACTION_OPTIONS.map((action) => (
              <MenuItem key={action} value={action} sx={{ fontSize: 12 }}>{action}</MenuItem>
            ))}
          </Select>
        </Box>

        {error && (
          <Typography sx={{ fontSize: 12, color: "error.main", mb: 2 }}>{error}</Typography>
        )}

        <Box sx={{ overflowX: "auto" }}>
          <Box sx={{ minWidth: 720 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "150px 1fr 1.4fr 130px",
                gap: 1,
                px: 1,
                pb: 1,
                borderBottom: `0.5px solid ${COLORS.border}`,
              }}
            >
              {[
                t("admin.auditLog.colTime"),
                t("admin.auditLog.colAction"),
                t("admin.auditLog.colActor"),
                t("admin.auditLog.colResource"),
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

            {!loading && items.length === 0 && !error && (
              <Typography sx={{ fontSize: 12, color: COLORS.textSecondary, mt: 2 }}>
                {t("admin.auditLog.empty")}
              </Typography>
            )}

            {!loading &&
              items.map((entry, i) => {
                const isLast = i === items.length - 1;
                return (
                  <Box
                    key={entry.id}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "150px 1fr 1.4fr 130px",
                      gap: 1,
                      px: 1,
                      py: 1,
                      borderBottom: isLast ? "none" : `0.5px solid ${COLORS.border}`,
                      alignItems: "center",
                    }}
                  >
                    <Typography sx={{ fontSize: 11, color: COLORS.textSecondary }}>
                      {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : "—"}
                    </Typography>
                    <Box
                      sx={{
                        bgcolor: COLORS.background,
                        color: COLORS.textPrimary,
                        fontSize: 10,
                        px: "8px",
                        py: "2px",
                        borderRadius: "10px",
                        width: "fit-content",
                        fontFamily: "monospace",
                      }}
                    >
                      {entry.action}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 12, color: COLORS.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {entry.actor.displayName || entry.actor.email || entry.actor.uid}
                      </Typography>
                      <Typography sx={{ fontSize: 10, color: COLORS.textMuted }}>{entry.actor.role}</Typography>
                    </Box>
                    <Typography sx={{ fontSize: 11, color: COLORS.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {entry.resourceType}/{entry.resourceId}
                    </Typography>
                  </Box>
                );
              })}
          </Box>
        </Box>

        <AdminPagination
          onPrev={handlePrev}
          onNext={handleNext}
          hasPrev={pageIndex > 0}
          hasNext={hasMore}
          loading={loading}
        />
      </Paper>
    </Box>
  );
}
