import React from "react";
import {
  Box,
  Typography,
  Card,
  IconButton,
  Chip,
  Button,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { useFavorite } from "../hooks/useFavorite";
import { useLanguage } from "../i18n/context/useLanguage";
import { useLangNavigate } from "../i18n/navigation";
import type { Story } from "../api/stories";

/** Story fields needed for topic styling, cover, and favorites (extends API `Story`). */
export type StoryGridCardStory = Story & {
  coverImageUrl?: string;
  primaryTopic?: string;
  specificSituation?: string;
  ageGroup?: string;
  generationConfig?: { targetAgeGroup?: string };
  category?: string | null;
  /** Human-readable topic for the chip (e.g. related stories) */
  topicLabel?: string | null;
};

// ─── Topic config ───────────────────────────────────────────────────────────

interface TopicStyle {
  accentColor: string;
  accentText: string;
  iconPath: string;
  coverBg: string;
}

const TOPIC_STYLES: Record<string, TopicStyle> = {
  fear: {
    accentColor: "#534AB7",
    accentText: "#3C3489",
    iconPath:
      "M24 4C13 4 4 13 4 24s9 20 20 20 20-9 20-20S35 4 24 4zm0 5a7 7 0 110 14A7 7 0 0124 9zm-8 23c1.8-2.5 4.7-4 8-4s6.2 1.5 8 4H16z",
    coverBg: "#EDE8FD",
  },
  anxiety: {
    accentColor: "#0F6E56",
    accentText: "#085041",
    iconPath:
      "M24 6C14.1 6 6 14.1 6 24s8.1 18 18 18 18-8.1 18-18S33.9 6 24 6zm1 27h-2v-2h2v2zm0-6h-2c0-7 7-6.5 7-12 0-3.9-3.1-7-7-7s-7 3.1-7 7h-2c0-5 4-9 9-9s9 4 9 9c0 6.5-7 6.5-7 12z",
    coverBg: "#E1F5EE",
  },
  confidence: {
    accentColor: "#993C1D",
    accentText: "#712B13",
    iconPath: "M24 4l5.5 11.1 12.3 1.8-8.9 8.7 2.1 12.2L24 32.1l-11 5.7 2.1-12.2-8.9-8.7 12.3-1.8z",
    coverBg: "#FAECE7",
  },
  grief: {
    accentColor: "#185FA5",
    accentText: "#0C447C",
    iconPath: "M24 6L9 18v20h30V18L24 6zm2 24h-4v-8h4v8zm0-12h-4v-4h4v4z",
    coverBg: "#E6F1FB",
  },
  change: {
    accentColor: "#854F0B",
    accentText: "#633806",
    iconPath: "M12 36c0-6.6 5.4-12 12-12s12 5.4 12 12H12zm12-14C19.8 22 16 18.2 16 14s3.8-8 8-8 8 3.8 8 8-3.8 8-8 8z",
    coverBg: "#FAEEDA",
  },
  anger: {
    accentColor: "#A32D2D",
    accentText: "#791F1F",
    iconPath:
      "M40 8H8L4 24l4 4v12h32V28l4-4L40 8zm-4 28H12v-8h24v8zm2.3-12H9.7L8 16h32l-1.7 8z",
    coverBg: "#FCEBEB",
  },
  default: {
    accentColor: "#534AB7",
    accentText: "#3C3489",
    iconPath:
      "M6 10v28l18-8 18 8V10L24 4 6 10zm16 17.8l-12 5.3V14l12-6v19.8zm4 0V8l12 6v19.1l-12-5.3z",
    coverBg: "#EDE8FD",
  },
};

function getTopicStyle(story: StoryGridCardStory): TopicStyle {
  const key = (
    story.primaryTopic ||
    story.topicKey ||
    story.specificSituation ||
    (story.category as string) ||
    "default"
  )
    .toLowerCase()
    .trim();

  for (const [k, v] of Object.entries(TOPIC_STYLES)) {
    if (k === "default") continue;
    if (key.includes(k)) return v;
  }
  return TOPIC_STYLES.default;
}

function getCoverUrl(story: StoryGridCardStory): string | undefined {
  const url = story.coverImageUrl || story.coverImage;
  return url?.trim() ? url : undefined;
}

// ─── Cover illustration ─────────────────────────────────────────────────────

interface CoverIllustrationProps {
  story: StoryGridCardStory;
  topicStyle: TopicStyle;
}

function CoverIllustration({ story, topicStyle }: CoverIllustrationProps) {
  const coverUrl = getCoverUrl(story);

  if (coverUrl) {
    return (
      <Box
        component="img"
        src={coverUrl}
        alt={story.title}
        sx={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
    );
  }

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: topicStyle.coverBg,
      }}
    >
      <svg
        width="64"
        height="64"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: 0.45 }}
      >
        <path d={topicStyle.iconPath} fill={topicStyle.accentColor} />
      </svg>
    </Box>
  );
}

function getAboutStoryLabel(language: string): string {
  switch (language) {
    case "he":
      return "על הסיפור הזה";
    case "ar":
      return "عن هذه القصة";
    default:
      return "About the Story";
  }
}

function getAgeLabel(story: StoryGridCardStory, language: string): string {
  const raw =
    story.ageGroup || story.targetAgeGroup || story.generationConfig?.targetAgeGroup;

  if (!raw) return "";

  const cleaned = String(raw).replace(/ages?\s*/i, "").trim();

  switch (language) {
    case "he":
      return `גילאי ${cleaned}`;
    case "ar":
      return `الأعمار ${cleaned}`;
    default:
      return `Ages ${cleaned}`;
  }
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface StoryGridCardProps {
  story: StoryGridCardStory;
  /** Called after navigating to the story (e.g. scroll to top on related stories). */
  onView?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function StoryGridCard({
  story,
  onView,
}: StoryGridCardProps) {
  const theme = useTheme();
  const navigate = useLangNavigate();
  const { language, isRTL } = useLanguage();

  const coverUrl = getCoverUrl(story);
  const { isFavorite, toggle, loading: favoriteLoading } = useFavorite(story.id, {
    storyId: story.id,
    title: story.title,
    coverImage: coverUrl || null,
    ageGroup: story.ageGroup ?? story.targetAgeGroup ?? null,
    category: story.category ?? null,
    topic: story.topicKey ?? story.primaryTopic ?? story.specificSituation ?? null,
  });

  const topicStyle = getTopicStyle(story);
  const aboutStoryLabel = getAboutStoryLabel(language);
  const ageLabel = getAgeLabel(story, language);

  const topicBadgeLabel =
    (story.topicLabel && story.topicLabel.trim()) ||
    story.primaryTopic ||
    story.topicKey ||
    story.specificSituation ||
    "";

  const handleView = () => {
    navigate(`/stories/${story.id}`);
    onView?.();
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    void toggle();
  };

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: "18px",
        overflow: "hidden",
        border: "0.5px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        cursor: "pointer",
        transition: "transform 0.18s ease, border-color 0.18s ease",
        "&:hover": {
          transform: "translateY(-4px)",
          borderColor: alpha(topicStyle.accentColor, 0.4),
        },
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <Box
        sx={{
          position: "relative",
          height: 200,
          flexShrink: 0,
          overflow: "hidden",
          bgcolor: topicStyle.coverBg,
        }}
        onClick={handleView}
      >
        <CoverIllustration story={story} topicStyle={topicStyle} />

        <IconButton
          onClick={handleFavorite}
          disabled={favoriteLoading}
          size="small"
          aria-label="toggle favorite"
          sx={{
            position: "absolute",
            top: 10,
            insetInlineEnd: 10,
            width: 32,
            height: 32,
            bgcolor: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(4px)",
            border: "0.5px solid rgba(255,255,255,0.95)",
            transition: "background 0.15s",
            "&:hover": {
              bgcolor: "#fff",
            },
          }}
        >
          {isFavorite ? (
            <FavoriteIcon sx={{ fontSize: 16, color: "#D4537E" }} />
          ) : (
            <FavoriteBorderIcon sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
          )}
        </IconButton>

        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            bgcolor: topicStyle.accentColor,
          }}
        />
      </Box>

      <Box
        sx={{
          p: "18px 18px 18px",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          direction: isRTL ? "rtl" : "ltr",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1,
            gap: 1,
          }}
        >
          {topicBadgeLabel && (
            <Chip
              label={topicBadgeLabel}
              size="small"
              sx={{
                height: 22,
                fontSize: "0.68rem",
                fontWeight: 500,
                bgcolor: alpha(topicStyle.accentColor, 0.1),
                color: topicStyle.accentText,
                border: "none",
                borderRadius: "6px",
                "& .MuiChip-label": { px: 1 },
                textTransform: "capitalize",
                maxWidth: "60%",
              }}
            />
          )}
          {ageLabel && (
            <Typography
              variant="caption"
              sx={{
                fontSize: "0.7rem",
                color: "text.disabled",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {ageLabel}
            </Typography>
          )}
        </Box>

        <Typography
          variant="h6"
          onClick={handleView}
          sx={{
            fontSize: "1.05rem",
            fontWeight: 500,
            color: "text.primary",
            lineHeight: 1.28,
            mb: 1,
            cursor: "pointer",
            "&:hover": { color: topicStyle.accentColor },
            transition: "color 0.15s",
          }}
        >
          {story.title}
        </Typography>

        {story.shortDescription && (
          <Typography
            variant="body2"
            sx={{
              fontSize: "0.78rem",
              color: "text.secondary",
              lineHeight: 1.6,
              mb: 2,
              flex: 1,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {story.shortDescription}
          </Typography>
        )}

        <Box sx={{ mt: "auto" }}>
          <Button
            onClick={handleView}
            fullWidth
            disableElevation
            sx={{
              borderRadius: "10px",
              fontSize: "0.8rem",
              fontWeight: 500,
              py: "9px",
              bgcolor: topicStyle.accentColor,
              color: "#fff",
              border: "none",
              textTransform: "none",
              transition: "background 0.15s, opacity 0.15s",
              "&:hover": {
                bgcolor: topicStyle.accentColor,
                opacity: 0.88,
              },
            }}
          >
            {aboutStoryLabel}
          </Button>
        </Box>
      </Box>
    </Card>
  );
}
