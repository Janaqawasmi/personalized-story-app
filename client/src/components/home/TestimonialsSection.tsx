import { Box, Typography } from "@mui/material";
import { useTranslation } from "../../i18n/useTranslation";
import SectionHeader from "./SectionHeader";

const TESTIMONIALS = [
  {
    quoteKey: "home.testimonials.t1_quote",
    nameKey: "home.testimonials.t1_name",
    roleKey: "home.testimonials.t1_role",
    color: "#824D5C",
    initial: "S",
  },
  {
    quoteKey: "home.testimonials.t2_quote",
    nameKey: "home.testimonials.t2_name",
    roleKey: "home.testimonials.t2_role",
    color: "#617891",
    initial: "D",
  },
  {
    quoteKey: "home.testimonials.t3_quote",
    nameKey: "home.testimonials.t3_name",
    roleKey: "home.testimonials.t3_role",
    color: "#9C8576",
    initial: "R",
  },
];

export default function TestimonialsSection() {
  const t = useTranslation();

  return (
    <Box component="section" sx={{ py: 12, px: { xs: 4, md: 8 }, background: "#E5DFD9" }}>
      <Box sx={{ maxWidth: "1200px", mx: "auto" }}>
        <Box sx={{ textAlign: "center", mb: 6 }}>
          <SectionHeader
            label={t("home.testimonials.label")}
            title={t("home.testimonials.title")}
            align="center"
          />
        </Box>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3,1fr)" },
            gap: 2.5,
          }}
        >
          {TESTIMONIALS.map((tc, i) => (
            <Box
              key={i}
              sx={{
                background: "#fff",
                borderRadius: "20px",
                p: "28px",
                border: "1.5px solid #D0C8C0",
                transition: "all 0.25s",
                "&:hover": {
                  transform: "translateY(-3px)",
                  boxShadow: "0 12px 32px rgba(0,0,0,0.08)",
                },
              }}
            >
              <Typography sx={{ color: "#F9CB42", fontSize: "14px", mb: 1.75 }} aria-hidden>
                ★★★★★
              </Typography>
              <Typography sx={{ fontSize: "14px", color: "text.primary", lineHeight: 1.65, mb: 2.5, fontStyle: "italic" }}>
                &ldquo;{t(tc.quoteKey)}&rdquo;
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.25,
                  pt: 2,
                  borderTop: "1px solid #D0C8C0",
                }}
              >
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    background: tc.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#fff",
                    flexShrink: 0,
                  }}
                >
                  {tc.initial}
                </Box>
                <Box>
                  <Typography sx={{ fontSize: "13px", fontWeight: 700 }}>{t(tc.nameKey)}</Typography>
                  <Typography sx={{ fontSize: "12px", color: "text.secondary" }}>{t(tc.roleKey)}</Typography>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
