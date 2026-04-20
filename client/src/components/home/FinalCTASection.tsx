import { Box, Typography, Button, Stack } from "@mui/material";
import { useTranslation } from "../../i18n/useTranslation";
import { useLangNavigate } from "../../i18n/navigation";
import { useLanguage } from "../../i18n/context/useLanguage";

export default function FinalCTASection() {
  const t = useTranslation();
  const navigate = useLangNavigate();
  const { isRTL } = useLanguage();
  const ctaArrow = isRTL ? "←" : "→";

  return (
    <Box component="section" sx={{ py: 12, px: { xs: 4, md: 8 }, background: "#fff" }}>
      <Box sx={{ maxWidth: "680px", mx: "auto", textAlign: "center" }}>
        <Box
          sx={{
            fontSize: "56px",
            mb: 3,
            animation: "floatBook 3s ease-in-out infinite",
            "@keyframes floatBook": {
              "0%,100%": { transform: "translateY(0)" },
              "50%": { transform: "translateY(-10px)" },
            },
          }}
          aria-hidden
        >
          📖
        </Box>
        <Typography
          variant="h2"
          sx={{
            fontFamily: "Playfair Display, serif",
            fontSize: { xs: "28px", md: "44px" },
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: "-0.5px",
            mb: 2,
          }}
        >
          {t("home.cta_final.title_line1")}
          <br />
          {t("home.cta_final.title_line2")}
        </Typography>
        <Typography sx={{ fontSize: "16px", color: "text.secondary", lineHeight: 1.6, mb: 4.5 }}>
          {t("home.cta_final.subtitle")}
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} gap={1.75} justifyContent="center">
          <Button
            variant="contained"
            onClick={() => navigate("/books")}
            sx={{
              background: "linear-gradient(135deg, #824D5C 0%, #B07A8A 100%)",
              borderRadius: "50px",
              px: 4.5,
              py: 2,
              fontSize: "16px",
              fontWeight: 700,
              textTransform: "none",
              boxShadow: "0 4px 20px rgba(130,77,92,0.25)",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 8px 28px rgba(130,77,92,0.35)",
              },
              transition: "all 0.2s",
            }}
          >
            {t("home.cta_final.cta_primary")} {ctaArrow}
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate("/books")}
            sx={{
              borderRadius: "50px",
              px: 3.5,
              py: 1.875,
              fontSize: "15px",
              fontWeight: 600,
              textTransform: "none",
              borderColor: "#D0C8C0",
              color: "text.primary",
              "&:hover": {
                borderColor: "#824D5C",
                color: "#824D5C",
                background: "transparent",
              },
            }}
          >
            {t("home.cta_final.cta_secondary")}
          </Button>
        </Stack>
        <Typography sx={{ fontSize: "12px", color: "text.secondary", mt: 2 }}>
          {t("home.cta_final.note")}
        </Typography>
      </Box>
    </Box>
  );
}
