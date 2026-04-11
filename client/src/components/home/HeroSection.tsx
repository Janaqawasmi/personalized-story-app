import { Box, Typography, Button, Stack } from "@mui/material";
import { useTranslation } from "../../i18n/useTranslation";
import { useLangNavigate } from "../../i18n/navigation";
import { useLanguage } from "../../i18n/context/useLanguage";
import StarField from "./StarField";

function FloatChip({
  label,
  color,
  sx,
}: {
  label: string;
  color: string;
  sx?: object;
}) {
  return (
    <Box
      sx={{
        position: "absolute",
        background: "#fff",
        borderRadius: "40px",
        px: 1.75,
        py: 0.75,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        fontSize: "12px",
        fontWeight: 700,
        color,
        whiteSpace: "nowrap",
        zIndex: 10,
        animation: "floatChip 4s ease-in-out infinite",
        ...sx,
      }}
    >
      {label}
    </Box>
  );
}

function BookCardInner({
  title,
  subtitle,
  bg,
  sx,
}: {
  title: string;
  subtitle: string;
  bg: string;
  sx?: object;
}) {
  return (
    <Box
      sx={{
        position: "absolute",
        borderRadius: "16px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
        overflow: "hidden",
        cursor: "pointer",
        transition: "transform 0.4s ease",
        "&:hover": { transform: "scale(1.04) !important" },
        background: bg,
        ...sx,
      }}
    >
      <Box
        sx={{
          width: "100%",
          height: "100%",
          p: "20px 16px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        <StarField count={18} />
        <Typography
          sx={{
            fontFamily: "Playfair Display, serif",
            fontSize: "14px",
            fontWeight: 700,
            color: "#fff",
            lineHeight: 1.3,
            position: "relative",
            zIndex: 2,
            whiteSpace: "pre-line",
          }}
        >
          {title}
        </Typography>
        <Typography
          sx={{
            fontSize: "11px",
            color: "rgba(255,255,255,0.6)",
            position: "relative",
            zIndex: 2,
          }}
        >
          {subtitle}
        </Typography>
      </Box>
    </Box>
  );
}

export default function HeroSection() {
  const t = useTranslation();
  const navigate = useLangNavigate();
  const { isRTL } = useLanguage();

  const rot = (deg: number) => (isRTL ? -deg : deg);

  return (
    <Box
      component="section"
      sx={{
        minHeight: "92vh",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          px: { xs: 4, md: 8 },
          py: { xs: 8, md: 10 },
          position: "relative",
          zIndex: 2,
        }}
      >
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.75,
            background: "#fff",
            border: "1.5px solid #D0C8C0",
            borderRadius: "50px",
            px: 1.75,
            py: 0.75,
            fontSize: "12px",
            fontWeight: 700,
            color: "#824D5C",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            mb: 3,
            width: "fit-content",
          }}
        >
          <Box
            sx={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#824D5C",
              animation: "badgePulse 2s infinite",
              "@keyframes badgePulse": {
                "0%,100%": { opacity: 1, transform: "scale(1)" },
                "50%": { opacity: 0.5, transform: "scale(1.3)" },
              },
            }}
          />
          {t("home.hero.badge")}
        </Box>

        <Typography
          variant="h1"
          sx={{
            fontFamily: "Playfair Display, serif",
            fontSize: { xs: "36px", md: "52px", lg: "58px" },
            fontWeight: 700,
            lineHeight: 1.12,
            letterSpacing: "-1px",
            mb: 2.75,
            color: "text.primary",
          }}
        >
          {t("home.hero.title_line1")}
          <br />
          {t("home.hero.title_line2")}
          <br />
          <Box
            component="em"
            sx={{
              fontStyle: "italic",
              color: "#824D5C",
              position: "relative",
              "&::after": {
                content: '""',
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "3px",
                background: "linear-gradient(90deg, #824D5C, #B07A8A)",
                borderRadius: "2px",
                opacity: 0.4,
              },
            }}
          >
            {t("home.hero.title_em")}
          </Box>
        </Typography>

        <Typography
          sx={{
            fontSize: "16px",
            color: "text.secondary",
            lineHeight: 1.65,
            mb: 4.5,
            maxWidth: "420px",
          }}
        >
          {t("home.hero.subtitle")}
        </Typography>

        <Stack direction="row" gap={1.75} flexWrap="wrap" alignItems="center">
          <Button
            variant="contained"
            onClick={() => navigate("/books")}
            sx={{
              background: "linear-gradient(135deg, #824D5C 0%, #B07A8A 100%)",
              borderRadius: "50px",
              px: 3.5,
              py: 1.75,
              fontSize: "15px",
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
            {t("home.hero.cta_primary")} →
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate("/books")}
            startIcon={
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #824D5C, #B07A8A)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: "10px",
                  flexShrink: 0,
                }}
              >
                ▶
              </Box>
            }
            sx={{
              borderRadius: "50px",
              px: 3,
              py: 1.625,
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
            {t("home.hero.cta_preview")}
          </Button>
        </Stack>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            mt: 4.5,
            pt: 3.5,
            borderTop: "1px solid #D0C8C0",
          }}
        >
          <Box sx={{ display: "flex" }}>
            {["#824D5C", "#617891", "#B07A8A", "#9C8576"].map((bg, i) => (
              <Box
                key={i}
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  border: "2px solid #E5DFD9",
                  background: bg,
                  mr: "-10px",
                  fontSize: "11px",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  zIndex: 4 - i,
                }}
              >
                {["S", "M", "L", "R"][i]}
              </Box>
            ))}
          </Box>
          <Typography sx={{ fontSize: "13px", color: "text.secondary", ml: 1.5 }}>
            <strong>{t("home.hero.trust_count")}</strong> {t("home.hero.trust_text")}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          position: "relative",
          display: { xs: "none", md: "flex" },
          alignItems: "center",
          justifyContent: "center",
          p: "48px 48px 48px 24px",
          background: "linear-gradient(135deg, #f9f4ef 0%, #ede5dc 100%)",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "400px",
            height: "400px",
            background: "radial-gradient(circle, rgba(130,77,92,0.08) 0%, transparent 70%)",
            borderRadius: "50%",
          },
        }}
      >
        <FloatChip
          label={`😊 ${t("home.hero.chip_confidence")}`}
          color="#824D5C"
          sx={
            isRTL
              ? { top: "8%", left: "5%", animationDelay: "0s" }
              : { top: "8%", right: "5%", animationDelay: "0s" }
          }
        />
        <FloatChip
          label={`📖 ${t("home.hero.chip_free_spreads")}`}
          color="#617891"
          sx={
            isRTL
              ? { bottom: "20%", right: "0%", animationDelay: "1.5s" }
              : { bottom: "20%", left: "0%", animationDelay: "1.5s" }
          }
        />
        <FloatChip
          label={`✨ ${t("home.hero.chip_cbt")}`}
          color="#4d7c4d"
          sx={
            isRTL
              ? { top: "45%", left: "-2%", animationDelay: "0.8s" }
              : { top: "45%", right: "-2%", animationDelay: "0.8s" }
          }
        />

        <Box sx={{ position: "relative", width: 340, height: 400 }}>
          <BookCardInner
            title={"The Brave\nLittle Heart"}
            subtitle="Ages 4–8 · Confidence"
            bg="linear-gradient(145deg, #4a1a2a, #1a0a14)"
            sx={{
              width: 175,
              height: 235,
              top: "50%",
              left: "68%",
              transform: `translate(-50%,-50%) rotate(${rot(7)}deg)`,
              zIndex: 1,
            }}
          />
          <BookCardInner
            title={"Mia and the\nWorry Cloud"}
            subtitle="Ages 3–7 · Anxiety"
            bg="linear-gradient(145deg, #1a3a2a, #0d2418)"
            sx={{
              width: 180,
              height: 240,
              top: "52%",
              left: "32%",
              transform: `translate(-50%,-50%) rotate(${rot(-10)}deg)`,
              zIndex: 2,
            }}
          />
          <BookCardInner
            title={"Noah Finds\nHis Courage"}
            subtitle="Ages 4–9 · Fear"
            bg="linear-gradient(145deg, #2d1b69, #0f2847)"
            sx={{
              width: 200,
              height: 260,
              top: "50%",
              left: "50%",
              transform: `translate(-50%,-52%) rotate(${rot(-3)}deg)`,
              zIndex: 3,
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
