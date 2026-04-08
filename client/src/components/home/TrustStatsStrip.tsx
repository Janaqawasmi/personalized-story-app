import { Box, Typography } from "@mui/material";
import { useTranslation } from "../../i18n/useTranslation";

export default function TrustStatsStrip() {
  const t = useTranslation();

  const stats = [
    { num: t("home.trust.stat1_num"), desc: t("home.trust.stat1_desc") },
    { num: t("home.trust.stat2_num"), desc: t("home.trust.stat2_desc") },
    { num: t("home.trust.stat3_num"), desc: t("home.trust.stat3_desc") },
    { num: t("home.trust.stat4_num"), desc: t("home.trust.stat4_desc") },
  ];

  return (
    <Box
      sx={{
        background: "linear-gradient(135deg, #824D5C 0%, #617891 100%)",
        py: 10,
        px: { xs: 4, md: 8 },
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          top: "-80px",
          right: "-80px",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.05)",
        },
      }}
    >
      <Box
        sx={{
          maxWidth: "1200px",
          mx: "auto",
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2,1fr)", md: "repeat(4,1fr)" },
          gap: 4,
          position: "relative",
          zIndex: 2,
        }}
      >
        {stats.map((s, i) => (
          <Box key={i} sx={{ textAlign: "center" }}>
            <Typography
              sx={{
                fontFamily: "Playfair Display, serif",
                fontSize: { xs: "36px", md: "44px" },
                fontWeight: 700,
                color: "#fff",
                lineHeight: 1,
                mb: 1,
              }}
            >
              {s.num}
            </Typography>
            <Typography sx={{ fontSize: "14px", color: "rgba(255,255,255,0.7)", lineHeight: 1.4 }}>
              {s.desc}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
