import { useState } from "react";
import { Box, Typography, Button, CircularProgress, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useLangNavigate } from "../i18n/navigation";
import { useTranslation } from "../i18n/useTranslation";
import { useLanguage } from "../i18n/context/useLanguage";
import { useMyCart } from "../hooks/useMyCart";
import { removeFromCart, checkout } from "../api/caregiverApi";
import { getPreviewSubtitleKey } from "../utils/previewSubtitle";

function formatPrice(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

export default function CartPage() {
  const t = useTranslation();
  const navigate = useLangNavigate();
  const { direction } = useLanguage();
  const { items, loading, error, totalCents } = useMyCart();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const currency = items[0]?.currency ?? "ILS";

  const handleRemove = async (cartItemId: string) => {
    setRemovingId(cartItemId);
    try {
      await removeFromCart(cartItemId);
    } catch {
      // useMyCart's onSnapshot listener will re-sync regardless
    } finally {
      setRemovingId(null);
    }
  };

  const handleCheckout = async () => {
    setCheckingOut(true);
    setCheckoutError(null);
    try {
      const result = await checkout({ cartItemIds: items.map((i) => i.cartItemId) });
      window.location.href = result.checkoutUrl;
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : t("pages.cart.checkoutError");
      setCheckoutError(msg);
      setCheckingOut(false);
    }
  };

  return (
    <Box
      dir={direction}
      sx={{
        minHeight: "100vh",
        backgroundColor: "#F7F2EC",
        pt: { xs: 9, md: 10 },
        pb: 8,
        px: { xs: 2, md: 4 },
      }}
    >
      <Box sx={{ maxWidth: 760, mx: "auto" }}>
        <Typography
          sx={{
            fontFamily: "'Playfair Display', serif",
            fontSize: { xs: 26, md: 32 },
            fontWeight: 700,
            color: "#3C1C28",
            mb: 3,
          }}
        >
          {t("pages.cart.title")}
        </Typography>

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress sx={{ color: "#824D5C" }} />
          </Box>
        )}

        {error && !loading && (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <Typography sx={{ fontSize: 14, color: "error.main" }}>{error}</Typography>
          </Box>
        )}

        {!loading && !error && items.length === 0 && (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <Typography sx={{ fontSize: 36, mb: 2 }}>🛒</Typography>
            <Typography sx={{ fontWeight: 600, mb: 1, color: "#3C1C28" }}>
              {t("pages.cart.emptyTitle")}
            </Typography>
            <Typography sx={{ fontSize: 14, color: "#9a8a92", mb: 3 }}>
              {t("pages.cart.emptyBody")}
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate("/books")}
              sx={{
                backgroundColor: "#824D5C",
                "&:hover": { backgroundColor: "#6f404d" },
                textTransform: "none",
                borderRadius: "12px",
                px: 3,
              }}
            >
              {t("pages.cart.browseCta")}
            </Button>
          </Box>
        )}

        {!loading && !error && items.length > 0 && (
          <>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 3 }}>
              {items.map((item) => (
                <Box
                  key={item.cartItemId}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 2,
                    background: "#fff",
                    borderRadius: "16px",
                    border: "1px solid #ede5df",
                    boxShadow: "0 2px 12px rgba(28,17,24,0.05)",
                  }}
                >
                  <Box
                    sx={{
                      width: 54,
                      height: 70,
                      borderRadius: "10px",
                      background: item.coverImageUrl
                        ? `url(${item.coverImageUrl}) center/cover no-repeat`
                        : "linear-gradient(145deg, #3d1a2a 0%, #2a1435 40%, #16093a 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      flexShrink: 0,
                    }}
                  >
                    {!item.coverImageUrl && "📖"}
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#3C1C28", mb: 0.5 }} noWrap>
                      {item.templateTitle}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: "#9a8a92", mb: 0.5 }}>
                      {(() => {
                        const subtitle = getPreviewSubtitleKey(item.childFirstName);
                        return t(subtitle.key, subtitle.params);
                      })()}
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#824D5C" }}>
                      {formatPrice(item.priceCents, item.currency)}
                    </Typography>
                  </Box>

                  <IconButton
                    size="small"
                    disabled={removingId === item.cartItemId}
                    onClick={() => handleRemove(item.cartItemId)}
                    aria-label={t("pages.cart.removeCta")}
                    sx={{ color: "#9a8a92", flexShrink: 0 }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                p: 2,
                background: "#fff",
                borderRadius: "16px",
                border: "1px solid #ede5df",
                mb: 2,
              }}
            >
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#3C1C28" }}>
                {t("pages.cart.totalLabel")}
              </Typography>
              <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#824D5C" }}>
                {formatPrice(totalCents, currency)}
              </Typography>
            </Box>

            {checkoutError && (
              <Typography sx={{ fontSize: 13, color: "error.main", mb: 2, textAlign: "center" }}>
                {checkoutError}
              </Typography>
            )}

            <Button
              fullWidth
              variant="contained"
              disabled={checkingOut}
              onClick={handleCheckout}
              sx={{
                backgroundColor: "#824D5C",
                "&:hover": { backgroundColor: "#6f404d" },
                textTransform: "none",
                borderRadius: "12px",
                py: 1.25,
                fontWeight: 600,
              }}
            >
              {checkingOut ? (
                <CircularProgress size={20} sx={{ color: "#fff" }} />
              ) : (
                t("pages.cart.checkoutCta")
              )}
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
}
