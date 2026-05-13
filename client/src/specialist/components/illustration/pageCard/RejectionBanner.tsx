import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { COLORS } from "../../../../theme";
import { DRAFT_B, FONTS } from "../../draftB/tokens";

interface Props {
  header: string;
  note: string;
}

export default function RejectionBanner({ header, note }: Props) {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        bgcolor: COLORS.errorSoft,
        border: `1px solid ${DRAFT_B.borderSoft}`,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          display: "block",
          fontFamily: FONTS.mono,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: COLORS.error,
          mb: 0.5,
        }}
      >
        {header}
      </Typography>
      <Typography
        variant="body2"
        component="p"
        sx={{
          m: 0,
          fontStyle: "italic",
          color: DRAFT_B.inkSoft,
          fontFamily: FONTS.sans,
          lineHeight: 1.6,
        }}
      >
        {note}
      </Typography>
    </Box>
  );
}
