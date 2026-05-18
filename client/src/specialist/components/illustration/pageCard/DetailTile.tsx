import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { COLORS } from "../../../../theme";
import { DRAFT_B, FONTS } from "../../draftB/tokens";

export type DetailTileAccent = "secondary" | "warning";

const ACCENT: Record<DetailTileAccent, string> = {
  secondary: COLORS.secondary,
  warning: COLORS.warning,
};

interface Props {
  accent: DetailTileAccent;
  label: string;
  children: string;
}

export default function DetailTile({ accent, label, children }: Props) {
  const bar = ACCENT[accent];
  return (
    <Box
      sx={{
        p: 2,
        bgcolor: DRAFT_B.cream,
        borderRadius: "10px",
        borderInlineStart: `3px solid ${bar}`,
      }}
    >
      <Typography
        variant="overline"
        sx={{
          display: "block",
          color: bar,
          fontWeight: 700,
          letterSpacing: "0.06em",
          fontFamily: FONTS.sans,
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ color: DRAFT_B.ink, lineHeight: 1.65, fontFamily: FONTS.sans }}
      >
        {children}
      </Typography>
    </Box>
  );
}
