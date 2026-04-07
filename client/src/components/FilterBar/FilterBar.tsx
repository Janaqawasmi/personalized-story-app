import React from "react";
import { Box, Typography } from "@mui/material";
import FilterChip from "./FilterChip";
import FilterDropdown from "./FilterDropdown";
import ActiveFiltersStrip from "./ActiveFiltersStrip";
import { filterBarSx, filterLabelSx, dividerSx } from "./FilterBar.styles";
import type { FilterBarProps } from "./types";
import { useLanguage } from "../../i18n/context/useLanguage";

const FilterBar: React.FC<FilterBarProps> = ({ lockedFilters = [], groups, onClearAll }) => {
  const { isRTL } = useLanguage();

  return (
    <>
      <Box sx={{ ...filterBarSx, direction: isRTL ? "rtl" : "ltr" }}>
        {lockedFilters.map((lf, i) => (
          <React.Fragment key={`locked-${i}`}>
            <FilterChip label={lf.label} isLocked dotColor={lf.dotColor} />
            <Box sx={dividerSx} />
          </React.Fragment>
        ))}

        {groups.map((group, gi) => (
          <React.Fragment key={group.key}>
            {gi > 0 ? <Box sx={dividerSx} /> : null}
            <Typography component="span" sx={filterLabelSx}>
              {group.label}
            </Typography>

            {group.type === "chips"
              ? group.options.map((opt) => (
                  <FilterChip
                    key={`${group.key}-${opt.value || "__all"}`}
                    label={opt.label}
                    isActive={group.value === opt.value}
                    dotColor={opt.dotColor}
                    onClick={() => group.onChange(opt.value)}
                  />
                ))
              : null}

            {group.type === "dropdown" ? <FilterDropdown group={group} /> : null}
          </React.Fragment>
        ))}
      </Box>

      {onClearAll ? <ActiveFiltersStrip groups={groups} onClearAll={onClearAll} /> : null}
    </>
  );
};

export default FilterBar;
