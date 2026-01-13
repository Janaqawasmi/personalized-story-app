import { Box, Typography, useTheme } from "@mui/material";
import { useLangNavigate } from "../i18n/navigation";
import { useTranslation } from "../i18n/useTranslation";

const categories = [
  {
    id: "emotional",
    image: "/images/categories/emotional.jpg",
    color: "#E6F4F1",
  },
  {
    id: "family",
    image: "/images/categories/family.jpg",
    color: "#F3EFEA",
  },
  {
    id: "social",
    image: "/images/categories/social.jpg",
    color: "#EEF2F8",
  },
  {
    id: "educational",
    image: "/images/categories/educational.jpg",
    color: "#F6F3FF",
  },
];

export default function CategoryEntrySection() {
  const navigate = useLangNavigate();
  const theme = useTheme();
  const t = useTranslation();

  return (
    <Box sx={{ py: 10 }}>
      {/* Title */}
      <Typography
        variant="h4"
        textAlign="center"
        sx={{ fontWeight: 800, mb: 1 }}
      >
        {t("home.categories.title")}
      </Typography>

      <Typography
        textAlign="center"
        sx={{ color: theme.palette.text.secondary, mb: 6 }}
      >
        {t("home.categories.subtitle")}
      </Typography>

      {/* Cards */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "1fr 1fr",
            md: "1fr 1fr 1fr 1fr",
          },
          gap: 4,
        }}
      >
        {categories.map((cat) => (
          <Box
            key={cat.id}
            onClick={() => navigate(`/categories/${cat.id}`)}
            sx={{
              cursor: "pointer",
              borderRadius: 4,
              overflow: "hidden",
              background: cat.color,
              transition: "transform 0.3s ease, box-shadow 0.3s ease",
              "&:hover": {
                transform: "translateY(-6px)",
                boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
              },
            }}
          >
            {/* Image */}
            <Box
              sx={{
                height: 180,
                backgroundImage: `url(${cat.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />

            {/* Text */}
            <Box sx={{ p: 3, textAlign: "right" }}>
              <Typography sx={{ fontWeight: 800, fontSize: "1.1rem" }}>
                {t(`home.categories.${cat.id}.title`)}
              </Typography>

              <Typography sx={{ color: theme.palette.text.secondary, fontSize: "0.9rem" }}>
                {t(`home.categories.${cat.id}.subtitle`)}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
