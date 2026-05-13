import { useState } from "react";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import PageCardComparisonModal from "./PageCardComparisonModal";

interface Props {
  storyId: string;
  pageNumber: number;
  currentImageVersion: number | null;
  currentScenePlanVersion: number | null;
  imageVersionsDesc: number[];
}

export default function PageCardVersionPicker({
  storyId,
  pageNumber,
  currentImageVersion,
  currentScenePlanVersion,
  imageVersionsDesc,
}: Props) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [compareVersion, setCompareVersion] = useState<number | null>(null);

  const open = Boolean(anchor);

  if (
    imageVersionsDesc.length <= 1 ||
    currentImageVersion === null ||
    currentScenePlanVersion === null
  ) {
    return null;
  }

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
      >
        v{currentImageVersion} of {imageVersionsDesc.length} ▾
      </Button>
      <Menu anchorEl={anchor} open={open} onClose={() => setAnchor(null)}>
        <MenuItem disabled sx={{ opacity: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Compare with a prior version (read-only)
          </Typography>
        </MenuItem>
        {imageVersionsDesc.map((v) => (
          <MenuItem
            key={v}
            disabled={v === currentImageVersion}
            onClick={() => {
              setAnchor(null);
              if (v !== currentImageVersion) setCompareVersion(v);
            }}
          >
            Image v{v}
            {v === currentImageVersion ? " (current)" : ""}
          </MenuItem>
        ))}
      </Menu>
      {compareVersion !== null ? (
        <PageCardComparisonModal
          open
          onClose={() => setCompareVersion(null)}
          storyId={storyId}
          pageNumber={pageNumber}
          currentImageVersion={currentImageVersion}
          currentScenePlanVersion={currentScenePlanVersion}
          compareImageVersion={compareVersion}
        />
      ) : null}
    </>
  );
}
