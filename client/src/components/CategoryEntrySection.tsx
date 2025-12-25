import { Box, Typography, useTheme } from "@mui/material";
import { useNavigate } from "react-router-dom";

const categories = [
  {
    id: "emotional",
    title: "רגשי",
    subtitle: "פחדים, חרדה, ביטוי רגשי",
    image: "/images/categories/emotional.jpg",
    color: "#E6F4F1",
  },
  {
    id: "family",
    title: "משפחתי",
    subtitle: "אחים, גירושין, שינויים",
    image: "/images/categories/family.jpg",
    color: "#F3EFEA",
  },
  {
    id: "social",
    title: "חברתי",
    subtitle: "חברות, שייכות, ביטחון",
    image: "/images/categories/social.jpg",
    color: "#EEF2F8",
  },
  {
    id: "educational",
    title: "לימודי",
    subtitle: "גן, בית ספר, למידה",
    image: "/images/categories/educational.jpg",
    color: "#F6F3FF",
  },
];

export default function CategoryEntrySection() {
  const navigate = useNavigate();
  const theme = useTheme();

  return (
    <Box sx={{ py: 10 }}>
      {/* Title */}
      <Typography
        variant="h4"
        textAlign="center"
        sx={{ fontWeight: 800, mb: 1 }}
      >
        עיון לפי קטגוריה
      </Typography>

      <Typography
        textAlign="center"
        sx={{ color: theme.palette.text.secondary, mb: 6 }}
      >
        התחילו מהעולם שמתאים לילד שלכם
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
                {cat.title}
              </Typography>

              <Typography sx={{ color: theme.palette.text.secondary, fontSize: "0.9rem" }}>
                {cat.subtitle}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
