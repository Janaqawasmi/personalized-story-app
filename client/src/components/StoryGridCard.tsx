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
  /** Human-readable topic line (story detail related grid); falls back to formatted `topic` */
  topicLabel?: string | null;
  /** Catalog-style card: uppercase topic, Playfair title, outlined purple CTA */
  catalogVariant?: boolean;
  onClick: () => void;
};

function formatTopicLine(topicLabel: string | null | undefined, topic: string | null | undefined): string | null {
  const raw = (topicLabel || topic || "").trim();
  if (!raw) return null;
  return raw.replace(/_/g, " ").toUpperCase();
}

export default function StoryGridCard({
  storyId,
  title,
  description,
  imageUrl,
  ageGroup,
  category,
  topic,
  topicLabel,
  catalogVariant = false,
  onClick,
}: Props) {
  const theme = useTheme();
  const { language } = useLanguage();

  const buttonText = language === "he" ? "צפו בסיפור" : language === "ar" ? "شاهد القصة" : "View Story";
  const topicLine = catalogVariant ? formatTopicLine(topicLabel, topic) : null;

  const { isFavorite, toggle, loading: favoriteLoading } = useFavorite(storyId, {
    storyId,
    title,
    coverImage: imageUrl || null,
    ageGroup: ageGroup ?? null,
    category: category ?? null,
    topic: topic ?? null,
  });

  const imageAreaSx = catalogVariant
    ? {
        position: "relative" as const,
        height: 240,
        width: "100%",
        backgroundColor: theme.palette.grey[100],
        ...(imageUrl
          ? {
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: "100% auto" as const,
              backgroundRepeat: "no-repeat" as const,
              backgroundPosition: "center" as const,
            }
          : {
              backgroundImage:
                "linear-gradient(145deg, #e8e4f7 0%, #c9c0ee 45%, #b8aee8 100%)",
            }),
      }
    : {
        position: "relative" as const,
        height: 240,
        width: "100%",
        backgroundColor: theme.palette.grey[100],
        backgroundImage: `url(${imageUrl || "/book-placeholder.jpg"})`,
        backgroundSize: "100% auto" as const,
        backgroundRepeat: "no-repeat" as const,
        backgroundPosition: "center" as const,
      };

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
        minHeight: catalogVariant ? 360 : 380,
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
      <Box sx={imageAreaSx}>
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
          gap: catalogVariant ? 1 : 1.2,
          flexGrow: 1,
          textAlign: "center",
        }}
      >
        {catalogVariant && topicLine && (
          <Typography
            sx={{
              fontSize: "0.65rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "#888",
              lineHeight: 1.3,
            }}
          >
            {topicLine}
          </Typography>
        )}

        {/* Title */}
        <Typography
          sx={{
            fontSize: catalogVariant ? "1.05rem" : "0.95rem",
            fontWeight: catalogVariant ? 600 : 600,
            fontFamily: catalogVariant ? "'Playfair Display', Georgia, serif" : "inherit",
            lineHeight: 1.4,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {title}
        </Typography>

        {catalogVariant && ageGroup && (
          <Typography sx={{ fontSize: "0.8rem", color: theme.palette.text.secondary, lineHeight: 1.4 }}>
            {ageGroup}
          </Typography>
        )}

        {/* Situation (now has space) */}
        {!catalogVariant && description && (
          <Typography
            sx={{
              fontSize: "0.85rem",
              color: theme.palette.text.secondary,
              lineHeight: 1.6,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              minHeight: "2.8em", // 🔹 reserves space
            }}
          >
            {description}
          </Typography>
        )}

        {/* Button pushed DOWN */}
        <Button
          variant={catalogVariant ? "outlined" : "contained"}
          onClick={onClick}
          sx={{
            mt: "auto",
            alignSelf: "center",
            px: 2.8,
            py: 0.7,
            fontSize: "0.82rem",
            fontWeight: 500,
            borderRadius: 6,
            textTransform: "none",
            ...(catalogVariant
              ? {
                  borderWidth: 1.5,
                  borderColor: "#7F77DD",
                  color: "#534AB7",
                  backgroundColor: "transparent",
                  "&:hover": {
                    borderWidth: 1.5,
                    borderColor: "#6a62c9",
                    backgroundColor: "rgba(127, 119, 221, 0.06)",
                  },
                }
              : {
                  backgroundColor: theme.palette.primary.main,
                  "&:hover": {
                    backgroundColor: theme.palette.primary.dark,
                  },
                }),
          }}
        >
          {buttonText}
        </Button>
      </Box>
    </Card>
  );
}
