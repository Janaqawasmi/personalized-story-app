import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import StoryGridCard from "../../../components/StoryGridCard";
import { useLangNavigate } from "../../../i18n/navigation";
import { useTranslation } from "../../../i18n/useTranslation";
import type { RelatedStoryCardVM } from "../types/story";
import { fadeUpVariant } from "../animations/variants";

interface RelatedStoriesProps {
  stories: RelatedStoryCardVM[];
  reducedMotion: boolean;
}

export default function RelatedStories({ stories, reducedMotion }: RelatedStoriesProps) {
  const navigate = useLangNavigate();
  const t = useTranslation();

  if (stories.length === 0) return null;

  const inner = (
    <Box sx={{ mb: 6 }}>
      <Typography sx={{ fontSize: "22px", fontWeight: 700, mb: 2.5 }}>{t("related.title")}</Typography>
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
            storyId={s.id}
            title={s.title}
            description={s.shortDescription}
            imageUrl={s.coverImage}
            ageGroup={s.targetAgeGroup ?? null}
            topic={s.topicKey ?? null}
            category={null}
            onClick={() => {
              navigate(`/stories/${s.id}`);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        ))}
      </Box>
    </Box>
  );

  if (reducedMotion) {
    return inner;
  }

  return (
    <motion.div variants={fadeUpVariant} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}>
      {inner}
    </motion.div>
  );
}
