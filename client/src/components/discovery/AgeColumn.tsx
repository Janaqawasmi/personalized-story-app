import { Box, Typography } from "@mui/material";
import { columnTitle, itemStyle, activeItem } from "./columnStyles";
import { useTranslation } from "../../i18n/useTranslation";

const AGE_GROUPS = ["0–3", "3–6", "6–9", "9–12"];

export default function AgeColumn({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (age: string) => void;
}) {
  const t = useTranslation();
  
  return (
    <Box>
      <Typography sx={columnTitle}>{t("discovery.age")}</Typography>

      {AGE_GROUPS.map((age) => (
        <Box
          key={age}
          sx={selected === age ? { ...itemStyle, ...activeItem } as any : itemStyle}
          onClick={() => onSelect(age)}
        >
          {age}
        </Box>
      ))}
    </Box>
  );
}

