import { Box } from "@mui/material";
import { MegaSelection, AgeId } from "./types";
import { AgeColumn } from "./AgeColumn";
import { CategoryColumn } from "./CategoryColumn";
import { TopicColumn } from "./TopicColumn";
import * as s from "./styles";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onApply: (selection: MegaSelection) => void;
  value: MegaSelection;
};

export function MegaMenu({ isOpen, onClose, onApply, value }: Props) {
  if (!isOpen) return null;

  return (
    <>
      <Box sx={s.overlay} onClick={onClose} />
      <Box
        sx={{
          position: "fixed",
          top: 64, // height of AppBar
          left: 0,
          right: 0,
          zIndex: 1301, // must be higher than AppBar
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Box sx={s.panel}>
          <Box sx={s.header}>
            <Box sx={s.title}>עיון בסיפורים</Box>
            <Box sx={s.subtitle}>בחרו גיל, קטגוריה ונושא</Box>
          </Box>
          <Box sx={s.grid}>
            <AgeColumn
              selectedAge={value.age}
              onSelectAge={(age: AgeId) => {
                onApply({ ...value, age });
              }}
            />
            <CategoryColumn
              topics={[]}
              selectedTopicKey={value.category}
              onSelect={(category) => {
                onApply({ ...value, category });
              }}
              lang="he"
            />
            <TopicColumn
              situations={[]}
              selectedTopicKey={value.category}
              selectedSituation={value.topic}
              onSelect={(topic) => {
                onApply({ ...value, topic });
              }}
              lang="he"
            />
          </Box>
        </Box>
      </Box>
    </>
  );
}
