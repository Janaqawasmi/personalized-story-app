import { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { useTranslation } from "../../i18n/useTranslation";
import { useLangNavigate } from "../../i18n/navigation";
import SectionHeader from "./SectionHeader";
import StarField from "./StarField";

type Gender = "girl" | "boy";
type StyleKey = "fantasy" | "watercolor" | "cozy";

const SPREAD_TEXT: Record<StyleKey, Record<Gender, (name: string) => string>> = {
  fantasy: {
    girl: (n) =>
      `Once upon a time, ${n} looked up at the night sky and felt the stars watching over her...`,
    boy: (n) =>
      `Once upon a time, ${n} looked up at the night sky and felt the stars watching over him...`,
  },
  watercolor: {
    girl: (n) =>
      `In a valley painted in every color of the rainbow, ${n} discovered that her worries were just passing clouds...`,
    boy: (n) =>
      `In a valley painted in every color of the rainbow, ${n} discovered that his worries were just passing clouds...`,
  },
  cozy: {
    girl: (n) =>
      `On a rainy afternoon, wrapped in her favorite blanket, ${n} found a magical book that knew her name...`,
    boy: (n) =>
      `On a rainy afternoon, wrapped in his favorite blanket, ${n} found a magical book that knew his name...`,
  },
};

const BG: Record<StyleKey, string> = {
  fantasy: "linear-gradient(145deg, #2d1b69, #0f2847, #0a1628)",
  watercolor: "linear-gradient(145deg, #1a3a28, #0f4020, #06280f)",
  cozy: "linear-gradient(145deg, #4a2010, #281008, #180604)",
};

export default function PersonalizationDemo() {
  const t = useTranslation();
  const navigate = useLangNavigate();

  const [childName, setChildName] = useState("Yael");
  const [gender, setGender] = useState<Gender>("girl");
  const [style, setStyle] = useState<StyleKey>("fantasy");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const displayName = childName.trim() || t("home.personalize_demo.name_placeholder");
  const rawText = SPREAD_TEXT[style][gender](displayName);
  const parts = rawText.split(displayName);

  const handleGenerate = () => {
    setLoading(true);
    setDone(false);
    setTimeout(() => {
      setLoading(false);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    }, 1200);
  };

  const ctaLabel = loading
    ? t("home.personalize_demo.cta_loading")
    : done
      ? t("home.personalize_demo.cta_done")
      : t("home.personalize_demo.cta");

  const styleLabel =
    style === "fantasy"
      ? `✨ ${t("home.personalize_demo.style_fantasy")}`
      : style === "watercolor"
        ? `🎨 ${t("home.personalize_demo.style_watercolor")}`
        : `🏠 ${t("home.personalize_demo.style_cozy")}`;

  return (
    <Box component="section" sx={{ background: "#f7f2ec", py: 2 }}>
      <Box sx={{ py: 12, px: { xs: 4, md: 8 }, maxWidth: "1200px", mx: "auto" }}>
        <SectionHeader
          label={t("home.personalize_demo.label")}
          title={t("home.personalize_demo.title")}
          subtitle={t("home.personalize_demo.subtitle")}
          align="center"
        />
        <Box
          sx={{
            mt: 7,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 7.5,
            alignItems: "center",
          }}
        >
          <Box
            sx={{
              background: "#fff",
              borderRadius: "24px",
              p: "36px",
              border: "1.5px solid #D0C8C0",
              boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
            }}
          >
            <Typography
              sx={{ fontFamily: "Playfair Display, serif", fontSize: "20px", fontWeight: 700, mb: 3 }}
            >
              ✨ {t("home.personalize_demo.form_title")}
            </Typography>

            <Box sx={{ mb: 2.25 }}>
              <Typography
                sx={{
                  fontSize: "12px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  color: "text.secondary",
                  mb: 1,
                }}
              >
                {t("home.personalize_demo.name_label")}
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                placeholder={t("home.personalize_demo.name_placeholder")}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "12px",
                    background: "#f7f2ec",
                    fontSize: "14px",
                    "&:hover fieldset": { borderColor: "#B07A8A" },
                    "&.Mui-focused fieldset": { borderColor: "#824D5C" },
                  },
                }}
              />
            </Box>

            <Box sx={{ mb: 2.25 }}>
              <Typography
                sx={{
                  fontSize: "12px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  color: "text.secondary",
                  mb: 1,
                }}
              >
                {t("home.personalize_demo.gender_label")}
              </Typography>
              <ToggleButtonGroup
                value={gender}
                exclusive
                onChange={(_, v) => v && setGender(v)}
                fullWidth
                size="small"
                sx={{
                  gap: 1,
                  "& .MuiToggleButtonGroup-grouped": {
                    border: "1.5px solid #D0C8C0 !important",
                    borderRadius: "12px !important",
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: "13px",
                    "&.Mui-selected": {
                      background: "rgba(130,77,92,0.06)",
                      borderColor: "#B07A8A !important",
                      color: "#824D5C",
                    },
                  },
                }}
              >
                <ToggleButton value="girl">
                  👧 {t("home.personalize_demo.gender_girl")}
                </ToggleButton>
                <ToggleButton value="boy">
                  👦 {t("home.personalize_demo.gender_boy")}
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography
                sx={{
                  fontSize: "12px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  color: "text.secondary",
                  mb: 1,
                }}
              >
                {t("home.personalize_demo.style_label")}
              </Typography>
              <ToggleButtonGroup
                value={style}
                exclusive
                onChange={(_, v) => v && setStyle(v)}
                fullWidth
                size="small"
                sx={{
                  gap: 1,
                  "& .MuiToggleButtonGroup-grouped": {
                    border: "1.5px solid #D0C8C0 !important",
                    borderRadius: "12px !important",
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: "12px",
                    "&.Mui-selected": {
                      background: "rgba(130,77,92,0.06)",
                      borderColor: "#B07A8A !important",
                      color: "#824D5C",
                    },
                  },
                }}
              >
                <ToggleButton value="fantasy">
                  🌟 {t("home.personalize_demo.style_fantasy")}
                </ToggleButton>
                <ToggleButton value="watercolor">
                  🎨 {t("home.personalize_demo.style_watercolor")}
                </ToggleButton>
                <ToggleButton value="cozy">
                  🏠 {t("home.personalize_demo.style_cozy")}
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Button
              fullWidth
              variant="contained"
              onClick={handleGenerate}
              disabled={loading}
              sx={{
                background: done
                  ? "#4CAF50"
                  : "linear-gradient(135deg, #824D5C 0%, #B07A8A 100%)",
                borderRadius: "14px",
                py: 1.75,
                fontSize: "15px",
                fontWeight: 700,
                textTransform: "none",
                transition: "all 0.2s",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 8px 24px rgba(130,77,92,0.3)",
                },
              }}
            >
              {ctaLabel}
            </Button>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Box
              sx={{
                background: BG[style],
                borderRadius: "20px",
                p: 3,
                minHeight: "220px",
                position: "relative",
                overflow: "hidden",
                display: "flex",
                alignItems: "flex-end",
              }}
            >
              <StarField count={24} />
              <Box sx={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.15)" }} />
              <Box sx={{ position: "relative", zIndex: 2 }}>
                <Typography
                  sx={{
                    fontFamily: "Playfair Display, serif",
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#fff",
                    lineHeight: 1.4,
                    mb: 1,
                  }}
                >
                  {parts[0]}
                  <Box component="span" sx={{ color: "#F9CB42", fontStyle: "italic" }}>
                    {displayName}
                  </Box>
                  {parts.slice(1).join(displayName)}
                </Typography>
                <Typography sx={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>
                  {styleLabel} · {t("home.personalize_demo.spread_suffix")}
                </Typography>
              </Box>
            </Box>

            {[
              {
                icon: "🔓",
                title: t("home.personalize_demo.free_badge"),
                sub: t("home.personalize_demo.free_sub"),
              },
              {
                icon: "🔒",
                title: t("home.personalize_demo.locked_badge"),
                sub: t("home.personalize_demo.locked_sub"),
              },
            ].map((item, i) => (
              <Box
                key={i}
                sx={{
                  background: "#fff",
                  borderRadius: "16px",
                  p: "16px 20px",
                  border: "1.5px solid #D0C8C0",
                  display: "flex",
                  alignItems: "center",
                  gap: 1.75,
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: "12px",
                    background: "rgba(130,77,92,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </Box>
                <Box>
                  <Typography sx={{ fontSize: "13px", fontWeight: 700, mb: 0.25 }}>
                    {item.title}
                  </Typography>
                  <Typography sx={{ fontSize: "12px", color: "text.secondary" }}>{item.sub}</Typography>
                </Box>
              </Box>
            ))}

            <Button
              variant="outlined"
              fullWidth
              onClick={() => navigate("/books")}
              sx={{
                borderRadius: "14px",
                py: 1.5,
                fontSize: "14px",
                fontWeight: 600,
                textTransform: "none",
                borderColor: "#D0C8C0",
                color: "text.primary",
                "&:hover": { borderColor: "#824D5C", color: "#824D5C" },
              }}
            >
              {t("home.featured.browse_all")} →
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
