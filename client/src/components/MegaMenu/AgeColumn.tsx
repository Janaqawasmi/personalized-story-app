// src/components/MegaMenu/AgeColumn.tsx
import { Box } from "@mui/material";
import { AGE_GROUPS } from "./data";
import { AgeColumnProps } from "./types";
import * as s from "./styles";
import { useTranslation } from "../../i18n/useTranslation";

export function AgeColumn({ selectedAge, onSelectAge }: AgeColumnProps) {
  const t = useTranslation();
  
  return (
    <Box sx={s.column}>
      <Box sx={s.columnHeader}>{t("megaMenu.age")}</Box>

      {AGE_GROUPS.map((age) => (
        <Box
          key={age.id}
          component="a"
          sx={[
            s.item,
            selectedAge === age.id && s.itemActive,
          ]}
          onClick={(e) => {
            e.preventDefault();
            onSelectAge(age.id);
          }}
        >
          {age.label}
        </Box>
      ))}
    </Box>
  );
}
