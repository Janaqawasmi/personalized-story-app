import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import StoryGridCard from "../../../components/StoryGridCard";
import { useTranslation } from "../../../i18n/useTranslation";
import { COLORS } from "../../../theme";
import type { RelatedStoryCardVM } from "../types/story";
import { fadeUpVariant } from "../animations/variants";

interface RelatedStoriesProps {
  stories: RelatedStoryCardVM[];
  reducedMotion: boolean;
}

export default function RelatedStories({ stories, reducedMotion }: RelatedStoriesProps) {
  const t = useTranslation();

  if (!stories || stories.length === 0) return null;

  const inner = (
    <Box sx={{ mb: 6 }}>
      <Typography sx={{ fontSize: "22px", fontWeight: 700, mb: 2.5, color: COLORS.textPrimary }}>{t("related.title")}</Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" },
          gap: "20px",
        }}
      >
        {stories.map((s) => (
          <StoryGridCard
            key={s.id}
            catalogVariant
            story={{
              id: s.id,
              title: s.title,
              shortDescription: s.shortDescription,
              coverImage: s.coverImage,
              targetAgeGroup: s.targetAgeGroup,
              topicKey: s.topicKey,
              topicLabel: s.topicLabel ?? null,
            }}
            onView={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          />
        ))}
      </Box>
    </Box>
  );

  if (reducedMotion) {
    return inner;
  }

  return (
    <motion.div variants={fadeUpVariant} initial="hidden" animate="visible">
      {inner}
    </motion.div>
  );
}
