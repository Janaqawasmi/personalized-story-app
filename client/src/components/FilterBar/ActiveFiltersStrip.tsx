import React from "react";
import { Box } from "@mui/material";
import {
  activeStripSx,
  activeTagSx,
  activeTagXSx,
  clearAllBtnSx,
  dotSx,
} from "./FilterBar.styles";
import type { FilterGroup } from "./types";
import { useTranslation } from "../../i18n/useTranslation";

interface Props {
  groups: FilterGroup[];
  onClearAll: () => void;
}

const ActiveFiltersStrip: React.FC<Props> = ({ groups, onClearAll }) => {
  const t = useTranslation();

  const activeTags = groups
    .filter((g) => g.value !== "")
    .map((g) => {
      const opt = g.options.find((o) => o.value === g.value);
      return {
        key: g.key,
        label: opt?.label ?? g.value,
        dotColor: opt?.dotColor,
        onRemove: () => g.onChange(""),
      };
    });

  if (activeTags.length === 0) return null;

  return (
    <Box sx={activeStripSx}>
      {activeTags.map((tag) => (
        <Box key={tag.key} sx={activeTagSx}>
          {tag.dotColor ? <Box sx={dotSx(tag.dotColor)} aria-hidden /> : null}
          {tag.label}
          <Box
            component="button"
            type="button"
            sx={activeTagXSx}
            onClick={tag.onRemove}
            aria-label={t("filters.removeAria", { label: tag.label })}
          >
            ✕
          </Box>
        </Box>
      ))}
      <Box component="button" type="button" sx={clearAllBtnSx} onClick={onClearAll}>
        {t("filters.clear")}
      </Box>
    </Box>
  );
};

export default ActiveFiltersStrip;
