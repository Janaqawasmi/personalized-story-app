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
import { useEffect, useMemo, useState } from "react";
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
import { useTranslation } from "../../i18n/useTranslation";
import AdminPagination from "./components/AdminPagination";

const PRINT_ORDER_STATUSES: PrintOrderStatus[] = [
  "order_received",
  "in_preparation",
  "ready",
  "shipped",
  "completed",
  "cancelled",
];

const PAGE_SIZE = 10;

function formatCreatedAt(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatPrice(amountCents: number | undefined, currency: string | undefined): string {
  if (typeof amountCents !== "number" || !Number.isFinite(amountCents)) return "—";
  const amount = (amountCents / 100).toFixed(2);
  return currency ? `${amount} ${currency}` : amount;
}

function formatAddress(order: AdminPrintOrderItem): string {
  const s = order.shippingDetails;
  if (!s) return "";
  const parts = [s.streetAddress, s.buildingOrHouseNumber, s.apartment, s.city, s.postalCode].filter(Boolean);
  return parts.join(", ");
}

// Renders an id as monospace inline text instead of literal backtick
// characters in the string (the previous version printed `${id}` verbatim).
function MonoId({ children }: { children: string }) {
  return (
    <Box component="span" sx={{ fontFamily: "monospace", fontSize: "0.95em" }}>
      {children}
    </Box>
  );
}

export default function AdminPrintOrdersPage() {
  const t = useTranslation();
  const [orders, setOrders] = useState<AdminPrintOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

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

  const pageCount = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  const visibleOrders = useMemo(
    () => orders.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [orders, page],
  );

  const handleStatusChange = async (order: AdminPrintOrderItem, status: PrintOrderStatus) => {
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
      <Paper elevation={0} sx={{ p: 3, border: `0.5px solid ${COLORS.border}`, borderRadius: "12px", bgcolor: "#fff" }}>
        <Typography sx={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, mb: 1 }}>
          {t("admin.printOrders.title")}
        </Typography>
        <Typography sx={{ fontSize: 13, color: COLORS.textSecondary, mb: 3 }}>
          {t("admin.printOrders.subtitle")}
        </Typography>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress sx={{ color: COLORS.secondary }} />
          </Box>
        ) : error ? (
          <Typography sx={{ fontSize: 13, color: COLORS.error }}>{error}</Typography>
        ) : orders.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: COLORS.textSecondary }}>
            {t("admin.printOrders.empty")}
          </Typography>
        ) : (
          <>
            <Stack spacing={2}>
              {visibleOrders.map((order) => (
                <Paper
                  key={order.purchaseId}
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: "12px",
                    border: `1px solid ${COLORS.border}`,
                    bgcolor: COLORS.background,
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
                        {order.storyTitle || t("admin.printOrders.untitledStory")}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                        {t("admin.printOrders.colPurchase")}: <MonoId>{order.purchaseId}</MonoId>
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                        {t("admin.printOrders.colBuyer")}: {order.buyerName || order.buyerEmail || order.caregiverUid}
                        {order.buyerEmail && order.buyerName ? ` (${order.buyerEmail})` : ""}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                        {t("admin.printOrders.colTemplate")}: <MonoId>{order.templateId}</MonoId>
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                        {t("admin.printOrders.colPreview")}: <MonoId>{order.previewId}</MonoId>
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                        {t("admin.printOrders.colPersonalized")}:{" "}
                        <MonoId>{order.personalizedStoryId || t("admin.printOrders.none")}</MonoId>
                      </Typography>
                    </Stack>

                    <Stack spacing={0.75}>
                      <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                        {t("admin.printOrders.colType")}:{" "}
                        {order.itemType === "personalized"
                          ? t("admin.printOrders.typePersonalized")
                          : t("admin.printOrders.typeTemplate")}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                        {t("admin.printOrders.colChild")}: {order.childName || "—"}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                        {t("admin.printOrders.colPrice")}: {formatPrice(order.amountCents, order.currency)}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                        {t("admin.printOrders.colPayment")}: {order.paymentStatus}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                        {t("admin.printOrders.colPurchased")}: {formatCreatedAt(order.purchasedAt ?? order.createdAt)}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                        {t("admin.printOrders.colContact")}: {order.shippingDetails?.fullName || "—"}
                        {order.shippingDetails?.phoneNumber ? ` · ${order.shippingDetails.phoneNumber}` : ""}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                        {t("admin.printOrders.colAddress")}: {formatAddress(order) || "—"}
                      </Typography>
                      {order.shippingDetails?.deliveryNotes && (
                        <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                          {t("admin.printOrders.colNotes")}: {order.shippingDetails.deliveryNotes}
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
                        {t("admin.printOrders.viewStory")}
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

            <AdminPagination
              onPrev={() => setPage((p) => Math.max(0, p - 1))}
              onNext={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              hasPrev={page > 0}
              hasNext={page < pageCount - 1}
              rangeLabel={t("admin.pagination.pageOf", { page: page + 1, total: pageCount })}
            />
          </>
        )}
      </Paper>

      <Dialog open={!!viewingOrder} onClose={() => setViewingOrder(null)} fullWidth maxWidth="sm">
        <DialogTitle>{viewingContent?.title || viewingOrder?.storyTitle || t("admin.printOrders.storyContent")}</DialogTitle>
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
                {t("admin.printOrders.dialogSource")}:{" "}
                {viewingContent.source === "personalized"
                  ? t("admin.printOrders.typePersonalized")
                  : t("admin.printOrders.typeTemplate")}
                {viewingContent.childName ? ` · ${t("admin.printOrders.colChild")}: ${viewingContent.childName}` : ""}
              </Typography>
              {viewingContent.pages.map((page) => (
                <Box
                  key={page.pageNumber}
                  sx={{ display: "flex", gap: 2, alignItems: "flex-start", pb: 2, borderBottom: `1px solid ${COLORS.border}` }}
                >
                  <Box
                    component="img"
                    src={page.imageUrl ?? undefined}
                    alt={`${t("admin.printOrders.dialogPage")} ${page.pageNumber}`}
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
                      {t("admin.printOrders.dialogPage")} {page.pageNumber}
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
