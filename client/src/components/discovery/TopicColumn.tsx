import { Box, Typography } from "@mui/material";
import { columnTitle, itemStyle, activeItem } from "./columnStyles";
import { useTranslation } from "../../i18n/useTranslation";

// Topic keys organized by category
const TOPICS: Record<string, string[]> = {
  emotional: ["fears", "anxiety", "emotions", "self_confidence"],
  family: ["new_baby", "divorce", "sibling_jealousy", "home_change"],
  social: ["friendship", "bullying", "shyness", "boundaries"],
  therapeutic: ["adhd", "autism", "phobias", "emotional_regulation"],
};

export default function TopicColumn({
  category,
  selectedTopic,
  onSelect,
}: {
  category: string | null;
  selectedTopic?: string | null;
  onSelect: (topic: string) => void;
}) {
  const t = useTranslation();
  
  if (!category) return null;

  return (
    <Box>
      <Typography sx={columnTitle}>{t("discovery.topic")}</Typography>

      {TOPICS[category]?.map((topicKey) => {
        const label = t(`discovery.topics.${category}.${topicKey}`);
        return (
          <Box
            key={topicKey}
            sx={selectedTopic === topicKey ? { ...itemStyle, ...activeItem } as any : itemStyle}
            onClick={() => onSelect(topicKey)}
          >
            {label}
          </Box>
        );
      })}
    </Box>
  );
}
