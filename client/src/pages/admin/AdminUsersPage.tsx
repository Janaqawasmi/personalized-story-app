import { useEffect, useState } from "react";
import { Box, Paper, Typography, Avatar, TextField } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { COLORS, ADMIN_STATUS_COLORS } from "../../theme";
import { useTranslation } from "../../i18n/useTranslation";
import { listAdminUsers, type AdminUserListItem } from "../../api/adminUsers";
import AdminPagination from "./components/AdminPagination";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AdminUsersPage() {
  const t = useTranslation();
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const [items, setItems] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Debounce free-text input into the committed `search` term that actually
  // drives the server query, so we don't refetch on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim().toLowerCase()), 400);
    return () => clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    setCursorStack([null]);
    setPageIndex(0);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listAdminUsers({ cursor: cursorStack[pageIndex], search: search || undefined })
      .then((page) => {
        if (cancelled) return;
        setItems(page.items);
        setNextCursor(page.nextCursor);
        setHasMore(page.hasMore);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load users");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cursorStack/pageIndex drive refetch, not the reverse
  }, [pageIndex, search]);

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
        {t("admin.users.sectionEyebrow")}
      </Typography>

      <Paper elevation={0} sx={{ p: 2, border: `0.5px solid ${COLORS.border}`, borderRadius: "12px", bgcolor: "#fff" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5, mb: 2 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary }}>
            {t("admin.users.listTitle")}
          </Typography>
          <TextField
            size="small"
            placeholder={t("admin.users.searchPlaceholder")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            sx={{ fontSize: 12, minWidth: 220 }}
          />
        </Box>

        {error && <Typography sx={{ fontSize: 12, color: "error.main", mb: 2 }}>{error}</Typography>}

        <Box sx={{ overflowX: "auto" }}>
          <Box sx={{ minWidth: 620 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "2.5fr 90px 100px 100px",
                gap: 1,
                px: 1,
                pb: 1,
                borderBottom: `0.5px solid ${COLORS.border}`,
              }}
            >
              {[
                t("admin.users.colUser"),
                t("admin.users.colRole"),
                t("admin.users.colPurchases"),
                t("admin.users.colStatus"),
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

            {!loading && items.length === 0 && (
              <Typography sx={{ fontSize: 12, color: COLORS.textSecondary, mt: 2 }}>
                {t("admin.users.empty")}
              </Typography>
            )}

            {!loading &&
              items.map((u, i) => {
                const isLast = i === items.length - 1;
                const statusChip = u.disabled ? ADMIN_STATUS_COLORS.disabled : ADMIN_STATUS_COLORS.active;
                return (
                  <Box
                    key={u.uid}
                    onClick={() => navigate(`/${lang}/admin/users/${u.uid}`)}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "2.5fr 90px 100px 100px",
                      gap: 1,
                      px: 1,
                      py: 1,
                      borderBottom: isLast ? "none" : `0.5px solid ${COLORS.border}`,
                      alignItems: "center",
                      cursor: "pointer",
                      "&:hover": { bgcolor: `${COLORS.secondary}0A` },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                      <Avatar sx={{ width: 28, height: 28, bgcolor: COLORS.secondary, fontSize: 11, flexShrink: 0 }}>
                        {getInitials(u.displayName || u.email || "?")}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 500, color: COLORS.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {u.displayName || u.email || u.uid}
                        </Typography>
                        <Typography sx={{ fontSize: 10, color: COLORS.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {u.email}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography sx={{ fontSize: 12, color: COLORS.textSecondary, textTransform: "capitalize" }}>
                      {u.role}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: COLORS.textPrimary }}>{u.purchaseCount}</Typography>
                    <Box
                      sx={{
                        bgcolor: statusChip.bg,
                        color: statusChip.fg,
                        fontSize: 10,
                        px: "8px",
                        py: "2px",
                        borderRadius: "10px",
                        width: "fit-content",
                      }}
                    >
                      {u.disabled ? t("admin.users.statusDisabled") : t("admin.users.statusActive")}
                    </Box>
                  </Box>
                );
              })}
          </Box>
        </Box>

        <AdminPagination onPrev={handlePrev} onNext={handleNext} hasPrev={pageIndex > 0} hasNext={hasMore} loading={loading} />
      </Paper>
    </Box>
  );
}
