import { Box } from "@mui/material";
import { ReferenceTopic } from "../../hooks/useReferenceData";
import * as s from "./styles";

type Props = {
  topics: ReferenceTopic[];
  selectedTopicKey: string | null;
  onSelect: (id: string) => void;
  lang: "he" | "en" | "ar";
  onAllBooksClick?: () => void;
};

export function CategoryColumn({
  topics,
  selectedTopicKey,
  onSelect,
  lang,
  onAllBooksClick,
}: Props) {
  // Filter only active topics
  const activeTopics = topics.filter((topic) => topic.active);

  return (
    <Box sx={s.column}>
      <Box sx={s.columnHeader}>קטגוריה</Box>

      {onAllBooksClick && (
        <Box
          component="a"
          sx={[s.item, { fontWeight: 600 }]}
          onClick={(e) => {
            e.preventDefault();
            onAllBooksClick();
          }}
        >
          כל הסיפורים
        </Box>
      )}

      {activeTopics.map((topic) => (
        <Box
          key={topic.id}
          component="a"
          sx={[
            s.item,
            selectedTopicKey === topic.id && s.itemActive,
          ]}
          onClick={(e) => {
            e.preventDefault();
            onSelect(topic.id);
          }}
        >
          {topic.label_he}
        </Box>
      ))}
    </Box>
  );
}
