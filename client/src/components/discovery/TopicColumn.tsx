import { Box, Typography } from "@mui/material";
import { columnTitle, itemStyle, activeItem } from "./columnStyles";

const TOPICS: Record<string, string[]> = {
  רגשי: ["פחדים", "חרדה", "רגשות", "ביטחון עצמי"],
  משפחתי: ["תינוק חדש", "גירושין", "קנאה בין אחים", "שינוי בבית"],
  חברתי: ["חברות", "חרם", "ביישנות", "גבולות"],
  טיפולי: ["ADHD", "אוטיזם", "פוביות", "ויסות רגשי"],
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
  if (!category) return null;

  return (
    <Box>
      <Typography sx={columnTitle}>נושא</Typography>

      {TOPICS[category]?.map((topic) => (
        <Box
          key={topic}
          sx={selectedTopic === topic ? { ...itemStyle, ...activeItem } as any : itemStyle}
          onClick={() => onSelect(topic)}
        >
          {topic}
        </Box>
      ))}
    </Box>
  );
}
