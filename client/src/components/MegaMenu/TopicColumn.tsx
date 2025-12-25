import { Box } from "@mui/material";
import { ReferenceSituation } from "../../hooks/useReferenceData";
import * as s from "./styles";

type Props = {
  situations: ReferenceSituation[];
  selectedTopicKey: string | null;
  selectedSituation: string | null;
  onSelect: (id: string) => void;
  lang: "he" | "en" | "ar";
};

export function TopicColumn({
  situations,
  selectedTopicKey,
  selectedSituation,
  onSelect,
  lang,
}: Props) {
  if (!selectedTopicKey) {
    return (
      <Box sx={{ ...s.column, opacity: 0.4 }}>
        <Box sx={s.columnHeader}>נושא</Box>
        <Box sx={s.helperText}>בחרו קטגוריה</Box>
      </Box>
    );
  }

  const filtered = situations.filter(
    (s) => s.topicKey === selectedTopicKey
  );

  return (
    <Box sx={s.column}>
      <Box sx={s.columnHeader}>נושא</Box>

      {filtered.map((situation) => (
        <Box
          key={situation.id}
          sx={[
            s.item,
            selectedSituation === situation.id && s.itemActive,
          ]}
          onClick={() => onSelect(situation.id)}
        >
          {situation.label_he}
        </Box>
      ))}
    </Box>
  );
}
