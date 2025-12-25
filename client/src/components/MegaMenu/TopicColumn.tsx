import { Box, useTheme } from "@mui/material";
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
  const theme = useTheme();
  
  if (!selectedTopicKey) {
    return (
      <Box sx={s.column}>
        <Box sx={s.columnHeader}>נושא</Box>
        <Box sx={{ fontSize: "0.875rem", color: theme.palette.text.secondary, py: 1 }}>
          בחרו קטגוריה
        </Box>
      </Box>
    );
  }

  const filtered = situations.filter(
    (s) => s.topicKey === selectedTopicKey && s.active
  );

  return (
    <Box sx={s.column}>
      <Box sx={s.columnHeader}>נושא</Box>

      {filtered.map((situation) => (
        <Box
          key={situation.id}
          component="a"
          sx={[
            s.item,
            selectedSituation === situation.id && s.itemActive,
          ]}
          onClick={(e) => {
            e.preventDefault();
            onSelect(situation.id);
          }}
        >
          {situation.label_he}
        </Box>
      ))}
    </Box>
  );
}
