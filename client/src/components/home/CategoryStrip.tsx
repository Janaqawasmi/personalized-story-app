import { Box, Typography } from "@mui/material";
import { useTranslation } from "../../i18n/useTranslation";
import { useLangNavigate } from "../../i18n/navigation";

const CATEGORIES = [
  {
    key: "fear",
    color: "#AB7534",
    bg: "rgba(171,117,52,0.1)",
    border: "rgba(171,117,52,0.2)",
    topic: "fear",
  },
  {
    key: "anxiety",
    color: "#c9b41a",
    bg: "rgba(246,229,96,0.15)",
    border: "rgba(246,229,96,0.3)",
    topic: "anxiety",
  },
  {
    key: "confidence",
    color: "#4d9928",
    bg: "rgba(193,217,147,0.2)",
    border: "rgba(193,217,147,0.4)",
    topic: "confidence",
  },
  {
    key: "grief",
    color: "#FA5185",
    bg: "rgba(250,81,133,0.1)",
    border: "rgba(250,81,133,0.2)",
    topic: "grief",
  },
  {
    key: "change",
    color: "#d68c1a",
    bg: "rgba(240,184,84,0.15)",
    border: "rgba(240,184,84,0.3)",
    topic: "change",
  },
  {
    key: "anger",
    color: "#A32D2D",
    bg: "rgba(163,45,45,0.1)",
    border: "rgba(163,45,45,0.2)",
    topic: "anger",
  },
] as const;

export default function CategoryStrip() {
  const t = useTranslation();
  const navigate = useLangNavigate();

  return (
    <Box
      sx={{
        px: { xs: 4, md: 8 },
        py: 4,
        background: "#fff",
        borderTop: "1px solid #D0C8C0",
        borderBottom: "1px solid #D0C8C0",
      }}
    >
      <Typography
        sx={{
          fontSize: "11px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "1.5px",
          color: "text.secondary",
          mb: 2,
        }}
      >
        {t("home.categories.label")}
      </Typography>
      <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap" }}>
        {CATEGORIES.map((cat) => (
          <Box
            key={cat.key}
            component="button"
            type="button"
            onClick={() => navigate(`/books?topic=${cat.topic}`)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              px: 2,
              py: 1,
              borderRadius: "50px",
              background: cat.bg,
              border: `1.5px solid ${cat.border}`,
              color: cat.color,
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
              fontFamily: "inherit",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
              },
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: cat.color,
                flexShrink: 0,
              }}
            />
            {t(`home.categories.${cat.key}`)}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
