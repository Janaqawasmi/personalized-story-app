import { Box, Typography } from "@mui/material";
import { useTranslation } from "../../i18n/useTranslation";
import { useLanguage } from "../../i18n/context/useLanguage";
import SectionHeader from "./SectionHeader";

const STEPS = [
  { num: "01", icon: "📚", titleKey: "home.how.step1_title", descKey: "home.how.step1_desc" },
  { num: "02", icon: "✏️", titleKey: "home.how.step2_title", descKey: "home.how.step2_desc" },
  { num: "03", icon: "✨", titleKey: "home.how.step3_title", descKey: "home.how.step3_desc" },
  { num: "04", icon: "🎁", titleKey: "home.how.step4_title", descKey: "home.how.step4_desc" },
];

export default function HowItWorksSection() {
  const t = useTranslation();
  const { direction } = useLanguage();
  const isRTL = direction === "rtl";

  return (
    <Box
      component="section"
      sx={{
        py: 12,
        px: { xs: 4, md: 8 },
        maxWidth: "1200px",
        mx: "auto",
      }}
    >
      <SectionHeader
        label={t("home.how.label")}
        title={t("home.how.title")}
        subtitle={t("home.how.subtitle")}
      />
      <Box sx={{ mt: 7.5 }}>
        <Box
          sx={{
            display: { xs: "none", md: "block" },
            position: "relative",
            "&::before": {
              content: '""',
              position: "absolute",
              top: "68px",
              left: "12.5%",
              right: "12.5%",
              height: "1px",
              background:
                "linear-gradient(90deg, transparent, #D0C8C0 20%, #D0C8C0 80%, transparent)",
            },
          }}
        >
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 3 }}>
            {STEPS.map((step) => (
              <Box
                key={step.num}
                sx={{
                  background: "#fff",
                  borderRadius: "20px",
                  p: "28px 24px",
                  border: "1.5px solid #D0C8C0",
                  position: "relative",
                  transition: "all 0.25s",
                  "&:hover": {
                    borderColor: "#B07A8A",
                    transform: "translateY(-4px)",
                    boxShadow: "0 12px 32px rgba(130,77,92,0.12)",
                  },
                }}
              >
                <Typography
                  sx={{
                    position: "absolute",
                    top: 16,
                    ...(isRTL ? { left: 16 } : { right: 16 }),
                    fontFamily: "Playfair Display, serif",
                    fontSize: "36px",
                    fontWeight: 700,
                    color: "#D0C8C0",
                    lineHeight: 1,
                    userSelect: "none",
                  }}
                >
                  {step.num}
                </Typography>
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: "16px",
                    background: "linear-gradient(135deg, #824D5C 0%, #B07A8A 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "22px",
                    mb: 2.25,
                    position: "relative",
                    zIndex: 2,
                  }}
                >
                  {step.icon}
                </Box>
                <Typography sx={{ fontSize: "15px", fontWeight: 700, mb: 1, color: "text.primary" }}>
                  {t(step.titleKey)}
                </Typography>
                <Typography sx={{ fontSize: "13px", color: "text.secondary", lineHeight: 1.55 }}>
                  {t(step.descKey)}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Box sx={{ display: { xs: "flex", md: "none" }, flexDirection: "column", gap: 2 }}>
          {STEPS.map((step) => (
            <Box key={step.num} sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: "14px",
                  flexShrink: 0,
                  background: "linear-gradient(135deg, #824D5C 0%, #B07A8A 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                }}
              >
                {step.icon}
              </Box>
              <Box>
                <Typography sx={{ fontSize: "15px", fontWeight: 700, mb: 0.5 }}>
                  {t(step.titleKey)}
                </Typography>
                <Typography sx={{ fontSize: "13px", color: "text.secondary", lineHeight: 1.55 }}>
                  {t(step.descKey)}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
