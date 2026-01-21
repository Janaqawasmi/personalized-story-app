import { Box, Typography } from "@mui/material";
import { columnTitle, itemStyle, activeItem } from "./columnStyles";
import { useTranslation } from "../../i18n/useTranslation";

// Category keys that map to translation keys
const CATEGORY_KEYS = ["emotional", "family", "social", "therapeutic"];

export default function CategoryColumn({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (cat: string) => void;
}) {
  const t = useTranslation();
  
  return (
    <Box>
      <Typography sx={columnTitle}>{t("discovery.category")}</Typography>

      {CATEGORY_KEYS.map((key) => {
        const label = t(`home.categories.${key}.title`);
        return (
          <Box
            key={key}
            sx={selected === key ? { ...itemStyle, ...activeItem } as any : itemStyle}
            onClick={() => onSelect(key)}
          >
            {label}
          </Box>
        );
      })}
    </Box>
  );
}
