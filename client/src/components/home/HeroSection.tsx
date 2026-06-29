import { useRef, useState } from "react";
import { Box, Typography, Button, Stack } from "@mui/material";
import { useTranslation } from "../../i18n/useTranslation";
import { useLangNavigate } from "../../i18n/navigation";
import { useLanguage } from "../../i18n/context/useLanguage";
import videoPoster from "../../assets/video-poster.jpeg";

const VIDEO_SRC = `${process.env.PUBLIC_URL}/assets/dammah-intro.mp4`;

export default function HeroSection() {
  const t = useTranslation();
  const navigate = useLangNavigate();
  const { isRTL } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showPlayOverlay, setShowPlayOverlay] = useState(true);

  const ctaArrow = isRTL ? "←" : "→";

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
            {t("home.hero.cta_primary")} {ctaArrow}
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
              columnGap: 1.25,
              "& .MuiButton-startIcon": {
                margin: 0,
                marginInlineEnd: 0,
              },
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
          p: { md: "32px 32px 32px 16px", lg: "40px 40px 40px 20px" },
          background: "linear-gradient(135deg, #f9f4ef 0%, #ede5dc 100%)",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "400px",
            height: "400px",
            background:
              "radial-gradient(circle, rgba(130,77,92,0.06) 0%, transparent 70%)",
            borderRadius: "50%",
          },
        }}
      >
        <Box
          sx={{
            position: "relative",
            zIndex: 2,
            width: "100%",
          }}
        >
          <Box
            sx={{
              width: "100%",
              borderRadius: "20px",
              overflow: "hidden",
              border: "2px solid rgba(130,77,92,0.14)",
              boxShadow:
                "0 24px 64px rgba(60,28,40,0.14), 0 8px 24px rgba(60,28,40,0.08)",
              background: "#1a0a14",
              aspectRatio: "16/9",
              position: "relative",
            }}
          >
            <Box
              component="video"
              ref={videoRef}
              muted
              loop
              playsInline
              preload="none"
              poster={videoPoster}
              onPlaying={() => setShowPlayOverlay(false)}
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            >
              <source src={VIDEO_SRC} type="video/mp4" />
            </Box>

            {showPlayOverlay && (
              <Box
                onClick={() => void videoRef.current?.play()}
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  zIndex: 2,
                  "&:hover .play-icon": { transform: "scale(1.1)" },
                }}
              >
                <Box
                  className="play-icon"
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.15)",
                    border: "2px solid rgba(255,255,255,0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: "18px",
                    transition: "transform 0.2s",
                  }}
                >
                  ▶
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
