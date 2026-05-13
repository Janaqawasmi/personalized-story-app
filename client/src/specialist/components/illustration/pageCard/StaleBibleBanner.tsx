import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { COLORS } from "../../../../theme";
import { DRAFT_B, FONTS } from "../../draftB/tokens";

interface Props {
  message: string;
  actionLabel: string;
  disabled: boolean;
  onAction: () => void | Promise<void>;
}

export default function StaleBibleBanner({
  message,
  actionLabel,
  disabled,
  onAction,
}: Props) {
  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 1.5,
        justifyContent: "space-between",
        p: 1.5,
        borderRadius: 2,
        bgcolor: String(COLORS.warningSoft).trim(),
        border: `1px solid ${DRAFT_B.borderSoft}`,
      }}
    >
      <Typography
        variant="body2"
        sx={{ color: DRAFT_B.inkSoft, fontFamily: FONTS.sans, flex: "1 1 200px" }}
      >
        {message}
      </Typography>
      <Button
        size="small"
        variant="text"
        disabled={disabled}
        onClick={() => void onAction()}
        sx={{
          color: DRAFT_B.inkSoft,
          textTransform: "none",
          fontWeight: 600,
          flexShrink: 0,
          marginInlineStart: "auto",
        }}
      >
        {actionLabel}
      </Button>
    </Box>
  );
}
