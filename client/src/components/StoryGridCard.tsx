import {
  Card,
  Box,
  Typography,
  Button,
  useTheme,
  IconButton,
} from "@mui/material";
import { useLanguage } from "../i18n/context/useLanguage";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { useFavorite } from "../hooks/useFavorite";

type Props = {
  storyId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  ageGroup?: string | null;
  category?: string | null;
  topic?: string | null;
  onClick: () => void;
};

export default function StoryGridCard({
  storyId,
  title,
  description,
  imageUrl,
  ageGroup,
  category,
  topic,
  onClick,
}: Props) {
  const theme = useTheme();
  const { language } = useLanguage();
  
  const buttonText = language === "he" ? "צפו בסיפור" : language === "ar" ? "شاهد القصة" : "View Story";

  const { isFavorite, toggle, loading: favoriteLoading } = useFavorite(storyId, {
    storyId,
    title,
    coverImage: imageUrl || null,
    ageGroup: ageGroup ?? null,
    category: category ?? null,
    topic: topic ?? null,
  });

  return (
    <Card
      elevation={0}
      sx={{
        position: "relative",
        backgroundColor: "transparent",
        borderRadius: 6,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 380,                // 🔹 smaller card
        overflow: "hidden",
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        transition: "all 0.3s ease",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
        },
      }}
    >
      {/* Image */}
      <Box
        sx={{
          position: "relative",
          height: 240,                  // 🔹 taller to better match book cover aspect ratio
          width: "100%",
          backgroundColor: theme.palette.grey[100], // Subtle background to fill space
          backgroundImage: `url(${imageUrl || "/book-placeholder.jpg"})`,
          backgroundSize: "100% auto",  // Fill width completely, height scales proportionally
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
      >
        {/* Favorite toggle (top-right overlay) */}
        <IconButton
          aria-label="toggle favorite"
          disabled={favoriteLoading}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle();
          }}
          sx={{
            position: "absolute",
            top: 10,
            right: 10,
            backgroundColor: "rgba(255,255,255,0.92)",
            border: `1px solid ${theme.palette.divider}`,
            "&:hover": { backgroundColor: "rgba(255,255,255,1)" },
          }}
        >
          {isFavorite ? (
            <FavoriteIcon sx={{ color: theme.palette.error.main }} />
          ) : (
            <FavoriteBorderIcon sx={{ color: theme.palette.text.secondary }} />
          )}
        </IconButton>
      </Box>

      {/* Content */}
      <Box
        sx={{
          px: 3,
          pt: 2,
          pb: 2.5,
          display: "flex",
          flexDirection: "column",
          gap: 1.2,
          flexGrow: 1,
          textAlign: "center",
        }}
      >
        {/* Title */}
        <Typography
          sx={{
            fontSize: "0.95rem",
            fontWeight: 600,
            lineHeight: 1.4,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {title}
        </Typography>

        {/* Situation (now has space) */}
        {description && (
          <Typography
            sx={{
              fontSize: "0.85rem",
              color: theme.palette.text.secondary,
              lineHeight: 1.6,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              minHeight: "2.8em",        // 🔹 reserves space
            }}
          >
            {description}
          </Typography>
        )}

        {/* Button pushed DOWN */}
        <Button
          variant="contained"
          onClick={onClick}
          sx={{
            mt: "auto",                 // 🔹 pushes button to bottom
            alignSelf: "center",
            px: 2.8,
            py: 0.7,
            fontSize: "0.82rem",
            fontWeight: 500,
            borderRadius: 6,
            textTransform: "none",
            backgroundColor: theme.palette.primary.main,
            "&:hover": {
              backgroundColor: theme.palette.primary.dark,
            },
          }}
        >
          {buttonText}
        </Button>
      </Box>
    </Card>
  );
}
