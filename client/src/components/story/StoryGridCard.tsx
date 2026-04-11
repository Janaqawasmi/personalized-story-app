import { Box, Typography, Button, IconButton } from "@mui/material";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import type { StoryTopic } from "../../constants/topicColors";
import { STORY_TOPIC_TAG_STYLES } from "../../constants/topicColors";
import StarField from "../home/StarField";
import { useTranslation } from "../../i18n/useTranslation";
import { useFavorite } from "../../hooks/useFavorite";

interface StoryGridCardProps {
  id: string;
  title: string;
  ageRange: string;
  topic: StoryTopic;
  description: string;
  price: number;
  isNew?: boolean;
  coverGradient: string;
  coverImage: string | null;
  onClick: (id: string) => void;
}

export default function StoryGridCard({
  id,
  title,
  ageRange,
  topic,
  description,
  price,
  isNew = false,
  coverGradient,
  coverImage,
  onClick,
}: StoryGridCardProps) {
  const t = useTranslation();
  const colors = STORY_TOPIC_TAG_STYLES[topic];

  const { isFavorite, toggle, loading: favoriteLoading } = useFavorite(id, {
    storyId: id,
    title,
    coverImage: coverImage ?? null,
    ageGroup: ageRange || null,
    category: topic || null,
    topic: topic || null,
  });

  return (
    <Box
      onClick={() => onClick(id)}
      sx={{
        borderRadius: "20px",
        overflow: "hidden",
        border: "1.5px solid #D0C8C0",
        background: "#fff",
        cursor: "pointer",
        transition: "all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "&:hover": {
          transform: "translateY(-8px)",
          boxShadow: "0 24px 56px rgba(0,0,0,0.13)",
          borderColor: "#B07A8A",
        },
      }}
    >
      <Box
        sx={{
          height: "210px",
          background: coverGradient,
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "flex-end",
          p: "20px",
        }}
      >
        {coverImage ? (
          <Box
            component="img"
            src={coverImage}
            alt={title}
            sx={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center top",
              zIndex: 0,
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : null}

        <StarField count={coverImage ? 10 : 22} />

        <Box
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)",
          }}
        />

        {isNew && (
          <Box
            sx={{
              position: "absolute",
              top: 14,
              insetInlineStart: 14,
              zIndex: 5,
              background: "linear-gradient(135deg, #824D5C, #B07A8A)",
              color: "#fff",
              fontSize: "10px",
              fontWeight: 700,
              px: 1.25,
              py: 0.4,
              borderRadius: "20px",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
            }}
          >
            {t("home.featured.badge_new")}
          </Box>
        )}

        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            void toggle();
          }}
          disabled={favoriteLoading}
          size="small"
          aria-label="toggle favorite"
          sx={{
            position: "absolute",
            top: 10,
            insetInlineEnd: 10,
            zIndex: 5,
            width: 32,
            height: 32,
            bgcolor: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(4px)",
            border: "0.5px solid rgba(255,255,255,0.95)",
            transition: "background 0.15s",
            "&:hover": { bgcolor: "#fff" },
            "&:disabled": { opacity: 0.5 },
          }}
        >
          {isFavorite ? (
            <FavoriteIcon sx={{ fontSize: 16, color: "#D4537E" }} />
          ) : (
            <FavoriteBorderIcon sx={{ fontSize: 16, color: "text.secondary" }} />
          )}
        </IconButton>

        <Box sx={{ position: "relative", zIndex: 2 }}>
          <Typography
            sx={{
              fontFamily: "Playfair Display, serif",
              fontSize: "16px",
              fontWeight: 700,
              color: "#fff",
              lineHeight: 1.3,
              mb: 0.6,
            }}
          >
            {title}
          </Typography>
          <Box
            sx={{
              fontSize: "11px",
              color: "rgba(255,255,255,0.65)",
              background: "rgba(255,255,255,0.12)",
              px: 1.25,
              py: 0.25,
              borderRadius: "20px",
              display: "inline-block",
            }}
          >
            {ageRange}
          </Box>
        </Box>
      </Box>

      <Box sx={{ p: "18px" }}>
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            background: colors.bg,
            color: colors.color,
            border: `1px solid ${colors.border}`,
            fontSize: "11px",
            fontWeight: 700,
            px: 1.25,
            py: 0.4,
            borderRadius: "20px",
            mb: 1.25,
          }}
        >
          <Box
            sx={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: colors.dot,
              flexShrink: 0,
            }}
          />
          {t(`home.featured.filter_${topic}`)}
        </Box>

        <Typography
          sx={{
            fontSize: "13px",
            color: "text.secondary",
            lineHeight: 1.55,
            mb: 1.75,
          }}
        >
          {description}
        </Typography>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pt: 1.5,
            borderTop: "1px solid #D0C8C0",
          }}
        >
          <Typography sx={{ fontSize: "15px", fontWeight: 700, color: "#824D5C" }}>
            ₪{price}{" "}
            <Box component="span" sx={{ fontSize: "12px", color: "text.secondary", fontWeight: 400 }}>
              {t("home.featured.price_suffix")}
            </Box>
          </Typography>
          <Button
            variant="contained"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onClick(id);
            }}
            sx={{
              background: "linear-gradient(135deg, #824D5C, #B07A8A)",
              borderRadius: "50px",
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "none",
              px: 2,
              py: 0.875,
              boxShadow: "none",
              "&:hover": { transform: "scale(1.06)", boxShadow: "none" },
              transition: "all 0.2s",
            }}
          >
            {t("home.featured.cta_view")}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
