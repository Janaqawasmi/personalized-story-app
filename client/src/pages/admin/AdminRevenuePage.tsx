import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import {
  fetchAdminPrintOrderStoryContent,
  listAdminPrintOrders,
  updateAdminPrintOrderStatus,
  type AdminPrintOrderItem,
  type AdminPrintOrderStoryContent,
} from "../../api/adminPrintOrders";
import type { PrintOrderStatus } from "../../types/commerce";
import { getPrintOrderStatusLabel } from "../../utils/purchaseOptions";
import { COLORS } from "../../theme";

const PRINT_ORDER_STATUSES: PrintOrderStatus[] = [
  "order_received",
  "in_preparation",
  "ready",
  "shipped",
  "completed",
  "cancelled",
];

function formatCreatedAt(value: string | null): string {
  if (!value) return "Unknown";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatPrice(amountCents: number | undefined, currency: string | undefined): string {
  if (typeof amountCents !== "number" || !Number.isFinite(amountCents)) return "Unknown";
  const amount = (amountCents / 100).toFixed(2);
  return currency ? `${amount} ${currency}` : amount;
}

function formatAddress(order: AdminPrintOrderItem): string {
  const s = order.shippingDetails;
  if (!s) return "No shipping details";
  const parts = [
    s.streetAddress,
    s.buildingOrHouseNumber,
    s.apartment,
    s.city,
    s.postalCode,
  ].filter(Boolean);
  return parts.join(", ");
}

export default function AdminRevenuePage() {
  const [orders, setOrders] = useState<AdminPrintOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [viewingOrder, setViewingOrder] = useState<AdminPrintOrderItem | null>(null);
  const [viewingContent, setViewingContent] = useState<AdminPrintOrderStoryContent | null>(null);
  const [viewingLoading, setViewingLoading] = useState(false);
  const [viewingError, setViewingError] = useState<string | null>(null);

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

  const handleViewStory = async (order: AdminPrintOrderItem) => {
    setViewingOrder(order);
    setViewingContent(null);
    setViewingError(null);
    setViewingLoading(true);
    try {
      const content = await fetchAdminPrintOrderStoryContent({
        caregiverUid: order.caregiverUid,
        purchaseId: order.purchaseId,
      });
      setViewingContent(content);
    } catch (err) {
      setViewingError(err instanceof Error ? err.message : "Failed to load story content");
    } finally {
      setViewingLoading(false);
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
                    gridTemplateColumns: { xs: "1fr", md: "1.4fr 1.2fr auto" },
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
                      Buyer: {order.buyerName || order.buyerEmail || order.caregiverUid}
                      {order.buyerEmail && order.buyerName ? ` (${order.buyerEmail})` : ""}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                      Template: `{order.templateId}`
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                      Preview: `{order.previewId}`
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                      Personalized story: `{order.personalizedStoryId || "none"}`
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
                      Price: {formatPrice(order.amountCents, order.currency)}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                      Payment: {order.paymentStatus}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                      Purchased: {formatCreatedAt(order.purchasedAt ?? order.createdAt)}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                      Contact: {order.shippingDetails?.fullName || "Unknown"}
                      {order.shippingDetails?.phoneNumber ? ` · ${order.shippingDetails.phoneNumber}` : ""}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                      Address: {formatAddress(order)}
                    </Typography>
                    {order.shippingDetails?.deliveryNotes && (
                      <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                        Notes: {order.shippingDetails.deliveryNotes}
                      </Typography>
                    )}
                  </Stack>

                  <Stack spacing={1} sx={{ alignItems: { xs: "stretch", md: "flex-end" } }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleViewStory(order)}
                      sx={{ textTransform: "none", whiteSpace: "nowrap" }}
                    >
                      View story
                    </Button>
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
                  </Stack>
                </Box>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>

      <Dialog open={!!viewingOrder} onClose={() => setViewingOrder(null)} fullWidth maxWidth="sm">
        <DialogTitle>
          {viewingContent?.title || viewingOrder?.storyTitle || "Story content"}
        </DialogTitle>
        <DialogContent sx={{ maxHeight: "70vh" }}>
          {viewingLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress sx={{ color: COLORS.secondary }} />
            </Box>
          ) : viewingError ? (
            <Typography sx={{ fontSize: 13, color: COLORS.error }}>{viewingError}</Typography>
          ) : viewingContent ? (
            <Stack spacing={2}>
              <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                Source: {viewingContent.source === "personalized" ? "Personalized story" : "Original template"}
                {viewingContent.childName ? ` · Child: ${viewingContent.childName}` : ""}
              </Typography>
              {viewingContent.pages.map((page) => (
                <Box
                  key={page.pageNumber}
                  sx={{ display: "flex", gap: 2, alignItems: "flex-start", pb: 2, borderBottom: `1px solid ${COLORS.border}` }}
                >
                  <Box
                    component="img"
                    src={page.imageUrl ?? undefined}
                    alt={`Page ${page.pageNumber}`}
                    sx={{
                      width: 96,
                      height: 96,
                      objectFit: "cover",
                      borderRadius: "8px",
                      flexShrink: 0,
                      bgcolor: "#f0eae5",
                    }}
                  />
                  <Box>
                    <Typography sx={{ fontSize: 11, color: COLORS.textSecondary, mb: 0.5 }}>
                      Page {page.pageNumber}
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: COLORS.textPrimary }}>{page.text}</Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          ) : null}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
