import { Box, Typography } from "@mui/material";
import { columnTitle, itemStyle, activeItem } from "./columnStyles";

const CATEGORIES = ["רגשי", "משפחתי", "חברתי", "טיפולי"];

export default function CategoryColumn({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (cat: string) => void;
}) {
  return (
    <Box>
      <Typography sx={columnTitle}>קטגוריה</Typography>

      {CATEGORIES.map((cat) => (
        <Box
          key={cat}
          sx={selected === cat ? { ...itemStyle, ...activeItem } as any : itemStyle}
          onClick={() => onSelect(cat)}
        >
          {cat}
        </Box>
      ))}
    </Box>
  );
}
