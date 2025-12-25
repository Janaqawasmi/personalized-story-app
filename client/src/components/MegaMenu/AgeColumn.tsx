// src/components/MegaMenu/AgeColumn.tsx
import { Box } from "@mui/material";
import { AGE_GROUPS } from "./data";
import { AgeColumnProps } from "./types";
import * as s from "./styles";

export function AgeColumn({ selectedAge, onSelectAge }: AgeColumnProps) {
  return (
    <Box sx={s.column}>
      <Box sx={s.columnHeader}>גיל</Box>
      <Box sx={s.helperText}>פילטר אופציונלי (אפשר לבחור גם בהמשך)</Box>

      {/* כל הגילאים */}
      <Box
        sx={{
          ...s.item,
          ...(selectedAge === null && s.itemActive),
        }}
        onClick={() => onSelectAge(null)}
      >
        כל הגילאים
      </Box>

      {AGE_GROUPS.map((age) => (
        <Box
          key={age.id}
          sx={{
            ...s.item,
            ...(selectedAge === age.id && s.itemActive),
          }}
          onClick={() => onSelectAge(age.id)}
        >
          {age.label}
        </Box>
      ))}
    </Box>
  );
}
