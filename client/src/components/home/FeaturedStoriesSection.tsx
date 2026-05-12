import { useState } from "react";
import { Box, Typography, Button } from "@mui/material";
import { useTranslation } from "../../i18n/useTranslation";
import { useLangNavigate } from "../../i18n/navigation";
import { useLanguage } from "../../i18n/context/useLanguage";
import { useFeaturedStories } from "../../hooks/useFeaturedStories";
import { STORY_TOPIC_TAG_STYLES, type StoryTopic } from "../../constants/topicColors";
import StoryGridCard from "../StoryGridCard";

type FilterValue = "all" | StoryTopic;

const FILTERS: { value: FilterValue; labelKey: string }[] = [
  { value: "all", labelKey: "home.featured.filter_all" },
  { value: "fear", labelKey: "home.featured.filter_fear" },
  { value: "anxiety", labelKey: "home.featured.filter_anxiety" },
  { value: "confidence", labelKey: "home.featured.filter_confidence" },
  { value: "grief", labelKey: "home.featured.filter_grief" },
  { value: "change", labelKey: "home.featured.filter_change" },
  { value: "anger", labelKey: "home.featured.filter_anger" },
];

export default function FeaturedStoriesSection() {
  const t = useTranslation();
  const navigate = useLangNavigate();
  const { isRTL } = useLanguage();
  const arrow = isRTL ? "←" : "→";

  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");

  const { stories, loading } = useFeaturedStories();

  const filtered =
    activeFilter === "all"
      ? stories
      : stories.filter((s) => s.topic === activeFilter);

  const handleCardClick = (id: string) => {
    navigate(`/stories/${id}`);
  };

  if (loading) {
    return (
      <Box
        component="section"
        sx={{ background: "#fff", py: 12, px: { xs: 4, md: 8 } }}
      >
        <Box
          sx={{
            maxWidth: "1200px",
            mx: "auto",
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
            gap: 3,
          }}
        >
          {[1, 2, 3].map((i) => (
            <Box
              key={i}
              sx={{
                borderRadius: "20px",
                height: "340px",
                background: "#f0ebe5",
                animation: "pulse 1.5s ease-in-out infinite",
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box component="section" sx={{ background: "#fff", py: 12, px: { xs: 4, md: 8 } }}>
      <Box sx={{ maxWidth: "1200px", mx: "auto" }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", md: "flex-end" },
            mb: 5,
            flexDirection: { xs: "column", md: "row" },
            gap: { xs: 2, md: 0 },
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "2px",
                color: "#824D5C",
                mb: 1.25,
                display: "block",
              }}
            >
              {t("home.featured.eyebrow")}
            </Typography>
            <Typography
              variant="h2"
              sx={{
                fontFamily: "Playfair Display, serif",
                fontSize: { xs: "28px", md: "38px" },
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: "-0.5px",
              }}
            >
              {t("home.featured.title")}{" "}
              <Box component="em" sx={{ fontStyle: "italic", color: "#824D5C" }}>
                {t("home.featured.title_em")}
              </Box>
            </Typography>
          </Box>

          <Button
            variant="outlined"
            onClick={() => navigate("/books")}
            sx={{
              borderRadius: "50px",
              px: 2.5,
              py: 1.25,
              fontSize: "13px",
              fontWeight: 700,
              textTransform: "none",
              borderColor: "#D0C8C0",
              color: "text.primary",
              whiteSpace: "nowrap",
              "&:hover": {
                borderColor: "#824D5C",
                color: "#824D5C",
                background: "transparent",
              },
            }}
          >
            {t("home.featured.browse_all")} {arrow}
          </Button>
        </Box>

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 4.5 }}>
          {FILTERS.map((f) => {
            const isActive = activeFilter === f.value;
            const colors = f.value !== "all" ? STORY_TOPIC_TAG_STYLES[f.value as StoryTopic] : null;

            return (
              <Box
                key={f.value}
                component="button"
                type="button"
                onClick={() => setActiveFilter(f.value)}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.625,
                  px: 1.75,
                  py: 0.75,
                  borderRadius: "50px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  border: "1.5px solid",
                  transition: "all 0.2s",
                  ...(isActive && f.value === "all" && {
                    background: "rgba(130,77,92,0.08)",
                    borderColor: "#B07A8A",
                    color: "#824D5C",
                  }),
                  ...(isActive && f.value !== "all" && colors && {
                    background: colors.bg,
                    borderColor: colors.border,
                    color: colors.color,
                    transform: "translateY(-1px)",
                    boxShadow: "0 3px 10px rgba(0,0,0,0.08)",
                  }),
                  ...(!isActive && {
                    background: "transparent",
                    borderColor: "#D0C8C0",
                    color: "text.secondary",
                    "&:hover": {
                      borderColor: "#B07A8A",
                      color: "#824D5C",
                      transform: "translateY(-1px)",
                    },
                  }),
                }}
              >
                {f.value !== "all" && colors && (
                  <Box
                    sx={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: colors.dot,
                      flexShrink: 0,
                    }}
                  />
                )}
                {t(f.labelKey)}
              </Box>
            );
          })}
        </Box>

        {filtered.length === 0 ? (
          <Typography
            sx={{
              textAlign: "center",
              color: "text.secondary",
              fontSize: "15px",
              py: 8,
            }}
          >
            {t("home.featured.empty")}
          </Typography>
        ) : (
          <Box
            sx={{
              display: { xs: "flex", sm: "grid" },
              gridTemplateColumns: {
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
              },
              flexDirection: { xs: "row", sm: "row" },
              overflowX: { xs: "auto", sm: "visible" },
              scrollSnapType: { xs: "x mandatory", sm: "none" },
              gap: 3,
              pb: { xs: 2, sm: 0 },
              "&::-webkit-scrollbar": { display: "none" },
              msOverflowStyle: "none",
              scrollbarWidth: "none",
            }}
          >
            {filtered.map((story) => (
              <Box
                key={story.id}
                sx={{
                  scrollSnapAlign: { xs: "start", sm: "unset" },
                  minWidth: { xs: "280px", sm: "unset" },
                  flex: { xs: "0 0 auto", sm: "unset" },
                }}
              >
                <StoryGridCard
                  story={{
                    id: story.id,
                    title: story.title,
                    shortDescription: story.description,
                    price: story.price,
                    isNew: story.isNew,
                    coverGradient: story.coverGradient,
                    coverImage: story.coverImage ?? undefined,
                    ageRange: story.ageRange,
                    topicKey: story.topic,
                    topicLabel: t(`home.featured.filter_${story.topic}`),
                  }}
                  variant="featured"
                  onClick={handleCardClick}
                />
              </Box>
            ))}
          </Box>
        )}

        <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
          <Button
            variant="outlined"
            onClick={() => navigate("/books")}
            sx={{
              borderRadius: "50px",
              px: 4,
              py: 1.625,
              fontSize: "14px",
              fontWeight: 700,
              textTransform: "none",
              borderColor: "#D0C8C0",
              color: "text.primary",
              "&:hover": {
                borderColor: "#824D5C",
                color: "#824D5C",
                background: "transparent",
                transform: "translateY(-1px)",
              },
              transition: "all 0.2s",
            }}
          >
            {t("home.featured.see_all")} {arrow}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
