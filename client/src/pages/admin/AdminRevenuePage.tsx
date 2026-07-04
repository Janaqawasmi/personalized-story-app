import {
  Box,
  CircularProgress,
  FormControl,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import {
  listAdminPrintOrders,
  updateAdminPrintOrderStatus,
  type AdminPrintOrderItem,
} from "../../api/adminPrintOrders";
import type { PrintOrderStatus } from "../../types/commerce";
import { getPrintOrderStatusLabel } from "../../utils/purchaseOptions";
import { COLORS } from "../../theme";

const PRINT_ORDER_STATUSES: PrintOrderStatus[] = [
  "paid_pending_preparation",
  "preparing_file",
  "sent_to_print",
  "printed",
  "shipped",
  "delivered",
  "cancelled",
];

function formatCreatedAt(value: string | null): string {
  if (!value) return "Unknown";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function AdminRevenuePage() {
  const [orders, setOrders] = useState<AdminPrintOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    listAdminPrintOrders()
      .then((items) => {
        if (!cancelled) {
          setOrders(items);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load print orders");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleStatusChange = async (
    order: AdminPrintOrderItem,
    status: PrintOrderStatus,
  ) => {
    setUpdatingId(order.purchaseId);
    try {
      await updateAdminPrintOrderStatus({
        caregiverUid: order.caregiverUid,
        purchaseId: order.purchaseId,
        status,
      });
      setOrders((prev) =>
        prev.map((item) =>
          item.purchaseId === order.purchaseId ? { ...item, printOrderStatus: status } : item,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update print order");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper
        elevation={0}
        sx={{ p: 3, border: `0.5px solid ${COLORS.border}`, borderRadius: "12px", bgcolor: "#fff" }}
      >
        <Typography sx={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, mb: 1 }}>
          Print orders
        </Typography>
        <Typography sx={{ fontSize: 13, color: COLORS.textSecondary, mb: 3 }}>
          Monitor paid print purchases and update fulfillment status.
        </Typography>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress sx={{ color: COLORS.secondary }} />
          </Box>
        ) : error ? (
          <Typography sx={{ fontSize: 13, color: COLORS.error }}>{error}</Typography>
        ) : orders.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: COLORS.textSecondary }}>
            No paid print orders yet.
          </Typography>
        ) : (
          <Stack spacing={2}>
            {orders.map((order) => (
              <Paper
                key={order.purchaseId}
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: "12px",
                  border: `1px solid ${COLORS.border}`,
                  bgcolor: "#FCFBFA",
                }}
              >
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1.4fr 1fr auto" },
                    gap: 2,
                    alignItems: "start",
                  }}
                >
                  <Stack spacing={0.75}>
                    <Typography sx={{ fontSize: 15, fontWeight: 700, color: COLORS.textPrimary }}>
                      {order.storyTitle || "Untitled story"}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                      Purchase: `{order.purchaseId}`
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                      Buyer: {order.buyerEmail || order.caregiverUid}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                      Template: `{order.templateId}`
                    </Typography>
                  </Stack>

                  <Stack spacing={0.75}>
                    <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                      Type: {order.itemType === "personalized" ? "Personalized" : "Original template"}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                      Child: {order.childName || "N/A"}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                      Format: Print
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                      Payment: {order.paymentStatus}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                      Created: {formatCreatedAt(order.createdAt)}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                      Shipping/contact: {order.shippingAddress || order.phoneNumber || order.deliveryNotes || "Needs admin follow-up"}
                    </Typography>
                  </Stack>

                  <FormControl size="small" sx={{ minWidth: 220 }}>
                    <Select
                      value={order.printOrderStatus}
                      disabled={updatingId === order.purchaseId}
                      onChange={(event) =>
                        handleStatusChange(order, event.target.value as PrintOrderStatus)
                      }
                    >
                      {PRINT_ORDER_STATUSES.map((status) => (
                        <MenuItem key={status} value={status}>
                          {getPrintOrderStatusLabel(status)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
