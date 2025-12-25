import { Box } from "@mui/material";
import { ReferenceTopic } from "../../hooks/useReferenceData";
import * as s from "./styles";

type Props = {
  topics: ReferenceTopic[];
  selectedTopicKey: string | null;
  onSelect: (id: string) => void;
  lang: "he" | "en" | "ar";
};

export function CategoryColumn({
  topics,
  selectedTopicKey,
  onSelect,
  lang,
}: Props) {
  return (
    <Box sx={s.column}>
      <Box sx={s.columnHeader}>קטגוריה</Box>

      {topics.map((topic) => (
        <Box
          key={topic.id}
          sx={{
            ...s.item,
            ...(selectedTopicKey === topic.id ? s.itemActive : {}),
          }}
          onClick={() => onSelect(topic.id)}
        >
          {topic[`label_${lang}` as const]}
        </Box>
      ))}
    </Box>
  );
}
