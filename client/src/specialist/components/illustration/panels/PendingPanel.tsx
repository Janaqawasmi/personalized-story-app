import type { ReactNode } from "react";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useSpecialistDeskUi } from "../../../../i18n/specialistDeskUi";
import { COLORS } from "../../../../theme";
import { DRAFT_B, FONTS } from "../../draftB/tokens";

export type PendingPanelVariant = "pending" | "running" | "failed";

interface Props {
  variant: PendingPanelVariant;
  /** Shown in the Scene plans stage card when variant is `running`. */
  progressHint?: string;
  /** Shown when variant is `failed`. */
  error?: string;
  onRetry?: () => void;
}

function StageRow({
  icon,
  label,
  meta,
  state,
}: {
  icon: ReactNode;
  label: string;
  meta: string;
  state: "done" | "busy" | "idle";
}) {
  const palette =
    state === "done"
      ? { fg: COLORS.success, bg: COLORS.successSoft }
      : state === "busy"
        ? { fg: COLORS.primary, bg: COLORS.primarySoft }
        : { fg: DRAFT_B.inkMuted, bg: DRAFT_B.cream };

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.25}
      sx={{
        p: "10px 12px",
        bgcolor: palette.bg,
        borderRadius: "8px",
        minWidth: 0,
      }}
    >
      <Box
        sx={{
          width: 24,
          height: 24,
          borderRadius: 999,
          bgcolor: COLORS.surface,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: palette.fg,
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: DRAFT_B.ink }}>{label}</Typography>
        <Typography
          sx={{ fontSize: 11.5, color: DRAFT_B.inkMuted, fontFamily: FONTS.mono }}
          noWrap
        >
          {meta}
        </Typography>
      </Box>
    </Stack>
  );
}

export default function PendingPanel({ variant, progressHint, error, onRetry }: Props) {
  const desk = useSpecialistDeskUi();

  if (variant === "failed") {
    return (
      <Box
        sx={{
          width: "100%",
          bgcolor: COLORS.surface,
          border: `1px solid ${COLORS.error}`,
          borderRadius: "14px",
          px: { xs: 2.5, sm: 4.5 },
          py: { xs: 3, sm: 4 },
        }}
      >
        <Stack spacing={2}>
          <Typography
            component="h2"
            sx={{
              m: 0,
              fontFamily: `'Playfair Display', Georgia, serif`,
              fontWeight: 700,
              fontSize: 22,
              color: DRAFT_B.ink,
              letterSpacing: "-0.02em",
            }}
          >
            {desk.illGenFailedTitle}
          </Typography>
          <Typography variant="body2" sx={{ color: DRAFT_B.inkSoft }}>
            {error ?? ""}
          </Typography>
          {onRetry ? (
            <Button variant="outlined" onClick={onRetry} sx={{ alignSelf: "flex-start", textTransform: "none" }}>
              {desk.workspaceTryAgain}
            </Button>
          ) : null}
        </Stack>
      </Box>
    );
  }

  const busy = variant === "running";
  const stage2Meta = busy ? (progressHint ?? desk.illGenSub) : desk.illGenStage2PendingMeta;

  return (
    <Box
      sx={{
        width: "100%",
        bgcolor: COLORS.surface,
        border: `1px solid ${DRAFT_B.border}`,
        borderRadius: "14px",
        px: { xs: 2.5, sm: 4.5 },
        py: { xs: 3, sm: 4 },
      }}
    >
      <Stack direction="row" spacing={1.75} alignItems="center" sx={{ mb: 2.5 }}>
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            bgcolor: COLORS.primarySoft,
            color: COLORS.primary,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <CircularProgress size={26} thickness={4} sx={{ color: COLORS.primary }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            component="h2"
            sx={{
              m: 0,
              fontFamily: `'Playfair Display', Georgia, serif`,
              fontWeight: 700,
              fontSize: 22,
              color: DRAFT_B.ink,
              letterSpacing: "-0.02em",
            }}
          >
            {desk.illGenTitle}
          </Typography>
          <Typography sx={{ color: DRAFT_B.inkMuted, fontSize: 13.5, mt: 0.25 }}>
            {busy ? desk.illGenSub : desk.illGenPendingQueue}
          </Typography>
        </Box>
      </Stack>

      <LinearProgress
        variant="indeterminate"
        sx={{
          height: 8,
          borderRadius: 999,
          bgcolor: DRAFT_B.borderSoft,
          mb: 2.25,
          "& .MuiLinearProgress-bar": {
            borderRadius: 999,
            background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.secondary})`,
          },
        }}
      />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: 1.25,
          pt: 2,
          borderTop: `1px solid ${DRAFT_B.borderSoft}`,
        }}
      >
        <StageRow
          state="done"
          label={desk.illGenStage1Label}
          meta={desk.illGenStage1Meta}
          icon={<CheckCircleOutlineIcon sx={{ fontSize: 16 }} />}
        />
        <StageRow
          state={busy ? "busy" : "idle"}
          label={desk.illGenStage2Label}
          meta={stage2Meta}
          icon={
            busy ? (
              <CircularProgress size={12} thickness={5} sx={{ color: COLORS.primary }} />
            ) : (
              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: DRAFT_B.border }} />
            )
          }
        />
      </Box>
    </Box>
  );
}
