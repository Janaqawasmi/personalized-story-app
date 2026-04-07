import React, { useState, useRef, useEffect, useMemo } from "react";
import { Box } from "@mui/material";
import {
  ddAnchorSx,
  ddButtonSx,
  ddButtonSelectedSx,
  ddArrowSx,
  ddPanelSx,
  ddSearchSx,
  ddCategoryLabelSx,
  ddItemSx,
  ddItemActiveSx,
  dotSx,
} from "./FilterBar.styles";
import type { DropdownFilterGroup, FilterOption } from "./types";
import { useTranslation } from "../../i18n/useTranslation";

interface Props {
  group: DropdownFilterGroup;
}

const FilterDropdown: React.FC<Props> = ({ group }) => {
  const t = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const anchorRef = useRef<HTMLDivElement>(null);

  const selected = group.options.find((o) => o.value === group.value);
  const isSelected = group.value !== "";
  const displayLabel = selected?.label ?? group.placeholder;
  const displayDot = selected?.dotColor;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const visibleOptions = useMemo(() => {
    const q = query.toLowerCase().trim();
    return q
      ? group.options.filter((o) => o.label.toLowerCase().includes(q))
      : group.options;
  }, [query, group.options]);

  const groupedOptions = useMemo(() => {
    if (!group.grouped) return null;
    const buckets: Record<string, FilterOption[]> = {};
    visibleOptions.forEach((opt) => {
      if (opt.value === "") return;
      const cat = opt.category ?? "Other";
      if (!buckets[cat]) buckets[cat] = [];
      buckets[cat].push(opt);
    });
    return buckets;
  }, [visibleOptions, group.grouped]);

  const allOption = group.options.find((o) => o.value === "");

  const handleSelect = (val: string) => {
    group.onChange(val);
    setOpen(false);
  };

  const showAllRow =
    allOption &&
    (!query || allOption.label.toLowerCase().includes(query.toLowerCase().trim()));

  return (
    <Box sx={ddAnchorSx} ref={anchorRef}>
      <Box
        component="button"
        type="button"
        sx={isSelected ? ddButtonSelectedSx : ddButtonSx}
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {displayDot ? <Box sx={dotSx(displayDot)} aria-hidden /> : null}
        <span>{displayLabel}</span>
        <Box component="span" sx={ddArrowSx(open)}>
          ▾
        </Box>
      </Box>

      {open ? (
        <Box sx={ddPanelSx} role="listbox">
          {group.searchable ? (
            <Box
              component="input"
              sx={ddSearchSx}
              placeholder={t("filters.search")}
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
              autoFocus
            />
          ) : null}

          {showAllRow ? (
            <Box
              sx={group.value === "" ? ddItemActiveSx : ddItemSx}
              onClick={() => handleSelect("")}
              role="option"
              aria-selected={group.value === ""}
            >
              {allOption.label}
            </Box>
          ) : null}

          {groupedOptions
            ? Object.keys(groupedOptions)
                .sort()
                .map((cat) => (
                  <React.Fragment key={cat}>
                    <Box sx={ddCategoryLabelSx}>{cat}</Box>
                    {groupedOptions[cat].map((opt) => (
                      <Box
                        key={opt.value}
                        sx={group.value === opt.value ? ddItemActiveSx : ddItemSx}
                        onClick={() => handleSelect(opt.value)}
                        role="option"
                        aria-selected={group.value === opt.value}
                      >
                        {opt.dotColor ? <Box sx={dotSx(opt.dotColor)} aria-hidden /> : null}
                        {opt.label}
                      </Box>
                    ))}
                  </React.Fragment>
                ))
            : visibleOptions
                .filter((o) => o.value !== "")
                .map((opt) => (
                  <Box
                    key={opt.value}
                    sx={group.value === opt.value ? ddItemActiveSx : ddItemSx}
                    onClick={() => handleSelect(opt.value)}
                    role="option"
                    aria-selected={group.value === opt.value}
                  >
                    {opt.dotColor ? <Box sx={dotSx(opt.dotColor)} aria-hidden /> : null}
                    {opt.label}
                  </Box>
                ))}
        </Box>
      ) : null}
    </Box>
  );
};

export default FilterDropdown;
