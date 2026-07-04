import { Box, Typography, Button } from "@mui/material";
import { useLanguage } from "../../i18n/context/useLanguage";
import { useTranslation } from "../../i18n/useTranslation";

/**
 * Purely informational. Purchase finalization already happened server-side
 * (webhook/mock-simulate updated the purchase and kicked off story
 * generation) — this page never calls the backend to "confirm" anything.
 */
export default function CheckoutSuccessPage() {
  const t = useTranslation();
  const { direction, language } = useLanguage();

  return (
    <Box
      dir={direction}
      sx={{
        minHeight: "100vh",
        backgroundColor: "#F7F2EC",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
      }}
    >
      <Box
        sx={{
          maxWidth: 420,
          width: "100%",
          background: "#fff",
          borderRadius: "20px",
          border: "1px solid #ede5df",
          boxShadow: "0 2px 12px rgba(28,17,24,0.08)",
          p: 4,
          textAlign: "center",
        }}
      >
        <Typography sx={{ fontSize: 36, mb: 2 }}>🎉</Typography>
        <Typography
          sx={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: "#3C1C28", mb: 1 }}
        >
          {t("pages.checkoutSuccess.title")}
        </Typography>
        <Typography sx={{ fontSize: 14, color: "#9a8a92", mb: 4 }}>
          {t("pages.checkoutSuccess.message")}
        </Typography>
        <Button
          fullWidth
          variant="contained"
          href={`/${language}/my-stories`}
          sx={{
            backgroundColor: "#824D5C",
            "&:hover": { backgroundColor: "#6f404d" },
            textTransform: "none",
            borderRadius: "12px",
            py: 1.25,
            fontWeight: 600,
          }}
        >
          {t("pages.checkoutSuccess.ctaMyStories")}
        </Button>
      </Box>
    </Box>
  );
}
