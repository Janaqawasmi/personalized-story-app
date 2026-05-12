/**
 * StoryGridCard — Unified story card component.
 *
 * Visual design follows the former homepage featured card (dark gradient cover,
 * StarField, topic pill, Playfair title overlay, optional price row, bounce-hover).
 *
 * Variants:
 *   "catalog" (default) — browse / search / favorites / related; hides price row and NEW badge
 *   "featured" — homepage featured; shows price row when `price` is a finite number, shows NEW when `isNew`
 */

import React from "react";
import { Box, Typography, Button, IconButton } from "@mui/material";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { useFavorite } from "../hooks/useFavorite";
import { useLanguage } from "../i18n/context/useLanguage";
import { useLangNavigate } from "../i18n/navigation";
import { useTranslation } from "../i18n/useTranslation";
import type { StoryTopic } from "../constants/topicColors";
import { STORY_TOPIC_TAG_STYLES } from "../constants/topicColors";
import StarField from "./home/StarField";
import type { Story } from "../api/stories";

/** Data shape accepted by both catalog (API Story) and featured (FeaturedStory) callers. */
export type StoryGridCardStory = Omit<Story, "coverImage"> & {
  /** Catalog may omit; featured hook uses `null` when no cover. */
  coverImage?: string | null;
  coverImageUrl?: string;
  primaryTopic?: string;
  specificSituation?: string;
  ageGroup?: string;
  generationConfig?: { targetAgeGroup?: string };
  category?: string | null;
  topicLabel?: string | null;
  coverGradient?: string;
  price?: number;
  isNew?: boolean;
  ageRange?: string;
};

export type StoryGridCardVariant = "featured" | "catalog";

interface StoryGridCardProps {
  story: StoryGridCardStory;
  variant?: StoryGridCardVariant;
  /** Override navigation (e.g. featured section). */
  onClick?: (id: string) => void;
  /** Called after navigating (e.g. scroll to top on related stories). */
  onView?: () => void;
}

const VALID_TOPICS: StoryTopic[] = [
  "fear",
  "anxiety",
  "confidence",
  "grief",
  "change",
  "anger",
];

const TOPIC_GRADIENTS: Record<string, string> = {
  fear: "linear-gradient(145deg, #2d1b69, #0f2847, #0a1628)",
  anxiety: "linear-gradient(145deg, #1a3a2a, #0f4020, #061a0a)",
  confidence: "linear-gradient(145deg, #4a1c2a, #1f0a10, #100508)",
  grief: "linear-gradient(145deg, #1a1040, #280a28, #0a0618)",
  change: "linear-gradient(145deg, #2a1a08, #3d2010, #1a0c04)",
  anger: "linear-gradient(145deg, #3d0a0a, #1a0404, #0a0202)",
};

function resolveTopic(story: StoryGridCardStory): StoryTopic {
  const raw = String(
    story.topicKey ||
      story.primaryTopic ||
      story.specificSituation ||
      story.topicLabel ||
      ""
  )
    .toLowerCase()
    .trim();
  return VALID_TOPICS.find((t) => raw.includes(t)) ?? "fear";
}

function getCoverGradient(story: StoryGridCardStory): string {
  if (story.coverGradient) return story.coverGradient;
  const topic = resolveTopic(story);
  return TOPIC_GRADIENTS[topic] ?? TOPIC_GRADIENTS.fear;
}

function getCoverUrl(story: StoryGridCardStory): string | undefined {
  const fromUrl = story.coverImageUrl?.trim();
  if (fromUrl) return fromUrl;
  const fromCover = story.coverImage?.trim();
  if (fromCover) return fromCover;
  return undefined;
}

function getAgeDisplay(story: StoryGridCardStory): string {
  return (
    story.ageRange ||
    story.targetAgeGroup ||
    story.ageGroup ||
    story.generationConfig?.targetAgeGroup ||
    ""
  );
}

function getTopicBadgeLabel(story: StoryGridCardStory): string {
  return (
    (story.topicLabel && story.topicLabel.trim()) ||
    story.primaryTopic ||
    story.topicKey ||
    story.specificSituation ||
    ""
  );
}

function NewBadge({ label }: { label: string }) {
  return (
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
      {label}
    </Box>
  );
}

export default function StoryGridCard({
  story,
  variant = "catalog",
  onClick,
  onView,
}: StoryGridCardProps) {
  const navigate = useLangNavigate();
  const { isRTL } = useLanguage();
  const t = useTranslation();

  const topic = resolveTopic(story);
  const colors = STORY_TOPIC_TAG_STYLES[topic];
  const coverGradient = getCoverGradient(story);
  const coverUrl = getCoverUrl(story);
  const ageDisplay = getAgeDisplay(story);
  const topicBadgeLabel = getTopicBadgeLabel(story);
  const showPrice =
    variant === "featured" && typeof story.price === "number" && Number.isFinite(story.price);
  const starCount = coverUrl ? 10 : 22;

  const { isFavorite, toggle, loading: favoriteLoading } = useFavorite(story.id, {
    storyId: story.id,
    title: story.title,
    coverImage: coverUrl ?? null,
    ageGroup: story.ageGroup ?? story.targetAgeGroup ?? null,
    category: story.category ?? null,
    topic: story.topicKey ?? story.primaryTopic ?? story.specificSituation ?? null,
  });

  const handleView = () => {
    if (onClick) {
      onClick(story.id);
    } else {
      navigate(`/stories/${story.id}`);
    }
    onView?.();
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    void toggle();
  };

  return (
    <Box
      onClick={handleView}
      sx={{
        borderRadius: "20px",
        overflow: "hidden",
        border: "1.5px solid #D0C8C0",
        background: "#fff",
        cursor: "pointer",
        transition: "all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
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
          flexShrink: 0,
        }}
      >
        {coverUrl ? (
          <Box
            component="img"
            src={coverUrl}
            alt={story.title}
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

        <StarField count={starCount} />

        <Box
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.18) 52%, transparent 100%)",
          }}
        />

        {variant === "featured" && story.isNew ? (
          <NewBadge label={t("home.featured.badge_new")} />
        ) : null}

        <IconButton
          onClick={handleFavorite}
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
            {story.title}
          </Typography>
          {ageDisplay ? (
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
              {ageDisplay}
            </Box>
          ) : null}
        </Box>
      </Box>

      <Box
        sx={{
          p: "18px",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          direction: isRTL ? "rtl" : "ltr",
        }}
      >
        {topicBadgeLabel ? (
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
              alignSelf: "flex-start",
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
            {topicBadgeLabel}
          </Box>
        ) : null}

        {story.shortDescription ? (
          <Typography
            sx={{
              fontSize: "13px",
              color: "text.secondary",
              lineHeight: 1.55,
              mb: 1.75,
              flex: 1,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {story.shortDescription}
          </Typography>
        ) : null}

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: showPrice ? "space-between" : "flex-end",
            pt: 1.5,
            borderTop: "1px solid #D0C8C0",
            mt: "auto",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {showPrice ? (
            <Typography sx={{ fontSize: "15px", fontWeight: 700, color: "#824D5C" }}>
              ₪{story.price}{" "}
              <Box
                component="span"
                sx={{ fontSize: "12px", color: "text.secondary", fontWeight: 400 }}
              >
                {t("home.featured.price_suffix")}
              </Box>
            </Typography>
          ) : null}

          <Button
            variant="contained"
            size="small"
            onClick={handleView}
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
