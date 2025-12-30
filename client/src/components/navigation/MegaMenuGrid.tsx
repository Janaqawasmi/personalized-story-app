import { Box } from "@mui/material";
import AgeColumn from "../discovery/AgeColumn";
import CategoryColumn from "../discovery/CategoryColumn";
import TopicColumn from "../discovery/TopicColumn";

type Props = {
  selectedAge: string | null;
  selectedCategory: string | null;
  selectedTopic: string | null;
  onSelectAge: (age: string) => void;
  onSelectCategory: (category: string) => void;
  onSelectTopic: (topic: string) => void;
};

export default function MegaMenuGrid({
  selectedAge,
  selectedCategory,
  selectedTopic,
  onSelectAge,
  onSelectCategory,
  onSelectTopic,
}: Props) {
  return (
    <Box
      display="grid"
      gridTemplateColumns="1fr 1fr 1fr"
      gap={6}
      alignItems="flex-start"
      dir="rtl"
    >
      {/* RIGHT → LEFT */}
      <AgeColumn selected={selectedAge} onSelect={onSelectAge} />
      <CategoryColumn selected={selectedCategory} onSelect={onSelectCategory} />
      <TopicColumn
        category={selectedCategory}
        selectedTopic={selectedTopic}
        onSelect={onSelectTopic}
      />
    </Box>
  );
}

