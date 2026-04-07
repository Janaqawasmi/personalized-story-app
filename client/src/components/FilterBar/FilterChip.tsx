import React from "react";
import { Box } from "@mui/material";
import { chipBaseSx, chipActiveSx, chipLockedSx, dotSx } from "./FilterBar.styles";

interface Props {
  label: string;
  isActive?: boolean;
  isLocked?: boolean;
  dotColor?: string;
  onClick?: () => void;
}

const FilterChip: React.FC<Props> = ({ label, isActive, isLocked, dotColor, onClick }) => {
  const sx = isLocked ? chipLockedSx : isActive ? chipActiveSx : chipBaseSx;
  return (
    <Box
      component="button"
      type="button"
      sx={sx}
      onClick={isLocked ? undefined : onClick}
      disabled={isLocked}
      role={isLocked ? undefined : "radio"}
      aria-checked={isLocked ? undefined : isActive}
    >
      {dotColor ? <Box sx={dotSx(dotColor)} aria-hidden /> : null}
      {label}
    </Box>
  );
};

export default FilterChip;
