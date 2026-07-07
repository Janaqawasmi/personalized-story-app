import { Box } from "@mui/material";
import { COLORS } from "../../../theme";
import type { PurchaseTimeseriesDay } from "../../../api/adminAnalytics";

export default function AdminDailyTrendChart({ series }: { series: PurchaseTimeseriesDay[] }) {
  const max = Math.max(1, ...series.map((d) => d.count));
  return (
    <Box sx={{ display: "flex", alignItems: "flex-end", gap: "3px", height: 120, overflowX: "auto" }}>
      {series.map((day) => (
        <Box
          key={day.date}
          title={`${day.date}: ${day.count} purchase${day.count === 1 ? "" : "s"} (₪${(day.revenueCents / 100).toFixed(0)})`}
          sx={{
            flex: "1 0 6px",
            minWidth: 6,
            height: `${Math.max(2, (day.count / max) * 100)}%`,
            bgcolor: day.count > 0 ? COLORS.secondary : COLORS.border,
            borderRadius: "2px 2px 0 0",
          }}
        />
      ))}
    </Box>
  );
}
