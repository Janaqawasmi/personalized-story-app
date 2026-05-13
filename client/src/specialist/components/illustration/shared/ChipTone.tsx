import Box from "@mui/material/Box";
import Chip, { type ChipProps } from "@mui/material/Chip";
import type { SxProps, Theme } from "@mui/material/styles";
import { COLORS } from "../../../../theme";
import { DRAFT_B } from "../../draftB/tokens";

/** Visual tones for illustration workspace chips (matches design chrome.jsx). */
export type IllustrationChipTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "error"
  | "rose"
  | "ghost";

function trimToken(value: string): string {
  return value.trim();
}

const STATUS_DOT_SX = {
  display: "inline-block",
  width: 6,
  height: 6,
  borderRadius: 999,
  flexShrink: 0,
  marginInlineEnd: 0.75,
} as const;

export interface ChipToneProps extends Omit<ChipProps, "color" | "variant" | "size"> {
  tone?: IllustrationChipTone;
  /** Handoff: sm = 22px, md = 26px row height. */
  chipSize?: "sm" | "md";
  outlined?: boolean;
  sx?: SxProps<Theme>;
}

/**
 * MUI Chip styled with COLORS + DRAFT_B only (no new palette).
 * Optional leading status dot matches the HTML prototype.
 */
export function ChipTone({
  tone = "neutral",
  chipSize = "sm",
  outlined = false,
  sx,
  icon,
  ...chipProps
}: ChipToneProps) {
  const height = chipSize === "sm" ? 22 : 26;
  const primarySoft = trimToken(COLORS.primarySoft);
  const successSoft = trimToken(COLORS.successSoft);
  const warningSoft = trimToken(COLORS.warningSoft);

  const palette: Record<
    IllustrationChipTone,
    { bg: string; fg: string; dot: string | null }
  > = {
    neutral: {
      bg: DRAFT_B.borderSoft,
      fg: DRAFT_B.inkSoft,
      dot: null,
    },
    info: {
      bg: primarySoft,
      fg: COLORS.primaryDark,
      dot: COLORS.primary,
    },
    success: {
      bg: successSoft,
      fg: "#3f5739",
      dot: COLORS.success,
    },
    warning: {
      bg: warningSoft,
      fg: "#6e5320",
      dot: COLORS.warning,
    },
    error: {
      bg: COLORS.errorSoft,
      fg: "#7a3838",
      dot: COLORS.error,
    },
    rose: {
      bg: DRAFT_B.roseSoft,
      fg: DRAFT_B.rose,
      dot: DRAFT_B.rose,
    },
    ghost: {
      bg: "transparent",
      fg: DRAFT_B.inkMuted,
      dot: null,
    },
  };

  const t = palette[tone];
  const showDot = !outlined && t.dot !== null;
  const dotEl =
    showDot && t.dot ? (
      <Box component="span" sx={{ ...STATUS_DOT_SX, bgcolor: t.dot }} aria-hidden />
    ) : null;
  const composedIcon =
    dotEl || icon ? (
      <Box
        component="span"
        sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}
      >
        {dotEl}
        {icon}
      </Box>
    ) : undefined;

  return (
    <Chip
      size="small"
      variant="filled"
      {...chipProps}
      icon={composedIcon as ChipProps["icon"]}
      sx={[
        {
          height,
          minHeight: height,
          px: 0.25,
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.01em",
          color: t.fg,
          bgcolor: outlined ? "transparent" : t.bg,
          border: `1px solid ${outlined ? DRAFT_B.border : "transparent"}`,
          "& .MuiChip-label": { px: 0.75 },
          "& .MuiChip-icon": {
            marginInlineStart: 0.5,
            marginInlineEnd: 0,
            color: "inherit",
          },
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    />
  );
}
