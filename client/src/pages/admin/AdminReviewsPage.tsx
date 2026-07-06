import { useEffect, useMemo, useState } from "react";
import {
  Box,
  MenuItem,
  Select,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Paper,
} from "@mui/material";
import { COLORS } from "../../theme";
import { useTranslation } from "../../i18n/useTranslation";
import {
  listAdminFeedback,
  updateAdminFeedbackFeature,
  type AdminFeedbackItem,
} from "../../api/adminFeedback";

type SortKey = "date" | "rating";

export default function AdminReviewsPage() {
  const t = useTranslation();
  const [items, setItems] = useState<AdminFeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storyFilter, setStoryFilter] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listAdminFeedback()
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load feedback");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const storyOptions = useMemo(
    () =>
      Array.from(new Set(items.map((i) => i.storyTitle).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [items],
  );

  const visibleItems = useMemo(() => {
    let rows = storyFilter ? items.filter((i) => i.storyTitle === storyFilter) : items;
    rows = [...rows].sort((a, b) => {
      if (sortKey === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
    return rows;
  }, [items, storyFilter, sortKey]);

  const handleToggleFeatured = async (item: AdminFeedbackItem, checked: boolean) => {
    setSavingId(item.feedbackId);
    const prevItems = items;
    setItems((prev) =>
      prev.map((i) => (i.feedbackId === item.feedbackId ? { ...i, isFeatured: checked } : i)),
    );
    try {
      await updateAdminFeedbackFeature({
        feedbackId: item.feedbackId,
        isFeatured: checked,
        useRealName: item.useRealName,
      });
    } catch (err) {
      setItems(prevItems);
      setError(err instanceof Error ? err.message : "Failed to update feedback");
    } finally {
      setSavingId(null);
    }
  };

  const handleUseRealNameChange = async (item: AdminFeedbackItem, useRealName: boolean) => {
    if (useRealName === item.useRealName) return;
    setSavingId(item.feedbackId);
    const prevItems = items;
    setItems((prev) =>
      prev.map((i) =>
        i.feedbackId === item.feedbackId ? { ...i, useRealName, resolvedDisplayName: null } : i,
      ),
    );
    try {
      const result = await updateAdminFeedbackFeature({
        feedbackId: item.feedbackId,
        isFeatured: item.isFeatured,
        useRealName,
      });
      setItems((prev) =>
        prev.map((i) =>
          i.feedbackId === item.feedbackId
            ? {
                ...i,
                useRealName: result.useRealName,
                resolvedDisplayName: result.resolvedDisplayName,
              }
            : i,
        ),
      );
    } catch (err) {
      setItems(prevItems);
      setError(err instanceof Error ? err.message : "Failed to update feedback");
    } finally {
      setSavingId(null);
    }
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
        {t("admin.reviews.sectionEyebrow")}
      </Typography>

      <Paper elevation={0} sx={{ p: 2, border: `0.5px solid ${COLORS.border}`, borderRadius: "12px", bgcolor: "#fff" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5, mb: 2 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary }}>
            {t("admin.reviews.title")}
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Select
              size="small"
              value={storyFilter}
              onChange={(e) => setStoryFilter(e.target.value)}
              displayEmpty
              sx={{ fontSize: 12, minWidth: 160 }}
            >
              <MenuItem value="" sx={{ fontSize: 12 }}>
                {t("admin.reviews.allStories")}
              </MenuItem>
              {storyOptions.map((title) => (
                <MenuItem key={title} value={title} sx={{ fontSize: 12 }}>
                  {title}
                </MenuItem>
              ))}
            </Select>
            <Select
              size="small"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              sx={{ fontSize: 12, minWidth: 120 }}
            >
              <MenuItem value="date" sx={{ fontSize: 12 }}>
                {t("admin.reviews.sortDate")}
              </MenuItem>
              <MenuItem value="rating" sx={{ fontSize: 12 }}>
                {t("admin.reviews.sortRating")}
              </MenuItem>
            </Select>
          </Box>
        </Box>

        {error && (
          <Typography sx={{ fontSize: 12, color: "error.main", mb: 2 }}>{error}</Typography>
        )}

        {/* Horizontal scroll on mobile keeps columns readable instead of crushing them */}
        <Box sx={{ overflowX: "auto" }}>
          <Box sx={{ minWidth: 760 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1.5fr 60px 100px 2fr 90px 2fr",
                gap: 1,
                px: 1,
                pb: 1,
                borderBottom: `0.5px solid ${COLORS.border}`,
              }}
            >
              {[
                t("admin.reviews.colStory"),
                t("admin.reviews.colRating"),
                t("admin.reviews.colShift"),
                t("admin.reviews.colReview"),
                t("admin.reviews.colDate"),
                t("admin.reviews.colFeature"),
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

            {!loading && visibleItems.length === 0 && (
              <Typography sx={{ fontSize: 12, color: COLORS.textSecondary, mt: 2 }}>
                {t("admin.reviews.empty")}
              </Typography>
            )}

            {visibleItems.map((item, i) => {
              const isLast = i === visibleItems.length - 1;
              return (
                <Box
                  key={item.feedbackId}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1.5fr 60px 100px 2fr 90px 2fr",
                    gap: 1,
                    px: 1,
                    py: 1.25,
                    borderBottom: isLast ? "none" : `0.5px solid ${COLORS.border}`,
                    alignItems: "center",
                  }}
                >
                  <Box>
                    <Typography sx={{ fontSize: 12, fontWeight: 500, color: COLORS.textPrimary }}>
                      {item.storyTitle || "—"}
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: COLORS.textSecondary }}>
                      {item.childName || "—"}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: COLORS.textPrimary }}>
                    {item.rating != null ? `★${item.rating}` : "—"}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                    {item.emotionalShift
                      ? `${item.emotionalShift.before} → ${item.emotionalShift.after}`
                      : "—"}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 12,
                      color: COLORS.textSecondary,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {item.reviewText || "—"}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: COLORS.textSecondary }}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—"}
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Switch
                        size="small"
                        checked={item.isFeatured}
                        disabled={savingId === item.feedbackId}
                        onChange={(e) => void handleToggleFeatured(item, e.target.checked)}
                      />
                      <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={item.useRealName ? "real" : "anonymous"}
                        disabled={savingId === item.feedbackId}
                        onChange={(_e, value) => {
                          if (value === null) return;
                          void handleUseRealNameChange(item, value === "real");
                        }}
                      >
                        <ToggleButton value="anonymous" sx={{ fontSize: 11, px: 1, py: 0.25 }}>
                          {t("admin.reviews.nameAnonymous")}
                        </ToggleButton>
                        <ToggleButton value="real" sx={{ fontSize: 11, px: 1, py: 0.25 }}>
                          {t("admin.reviews.nameReal")}
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Box>
                    <Typography sx={{ fontSize: 10, color: COLORS.textSecondary, pl: "42px" }}>
                      {item.useRealName
                        ? item.resolvedDisplayName || t("admin.reviews.nameRealMissing")
                        : t("admin.reviews.nameAnonymousPreview")}
                    </Typography>
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
