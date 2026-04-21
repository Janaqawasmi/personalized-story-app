import React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import type { PostValidationFlag } from "../../../types/agent1Result";
import { COLORS } from "../../../theme";
import { CHECK_TYPE_LABELS, countUndismissedFlags, mustNeverFlaggedForIndex } from "./shared";
import { DRAFT_B } from "./tokens";

export interface SafetyPanelProps {
  flags: PostValidationFlag[];
  dismissedFlags: Set<number>;
  onToggleFlag: (index: number) => void;
  onFlagHover: (index: number | null) => void;
  onGoToPassage: (flagIndex: number) => void;
  mustNeverList: string[];
  readOnly: boolean;
}

export default function SafetyPanel({
  flags,
  dismissedFlags,
  onToggleFlag,
  onFlagHover,
  onGoToPassage,
  mustNeverList,
  readOnly,
}: SafetyPanelProps) {
  const theme = useTheme();
  const undismissed = countUndismissedFlags(flags, dismissedFlags);

  return (
    <Box>
      {flags.length === 0 ? (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <ShieldOutlinedIcon sx={{ fontSize: 20, color: COLORS.success }} />
          <Typography variant="body2" sx={{ color: COLORS.success, fontWeight: 600, fontSize: "13px" }}>
            No safety concerns detected
          </Typography>
        </Stack>
      ) : undismissed > 0 ? (
        <Box
          sx={{
            background: alpha(COLORS.error, 0.07),
            border: `1px solid ${alpha(COLORS.error, 0.2)}`,
            borderRadius: 1,
            p: 1.5,
            mb: 2,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "14px", color: "error.dark" }}>
            {undismissed} finding{undismissed === 1 ? "" : "s"} awaiting review
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, fontSize: "11.5px" }}>
            Each finding gates approval until dismissed or addressed in the prose.
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            background: alpha(COLORS.success, 0.08),
            border: `1px solid ${alpha(COLORS.success, 0.25)}`,
            borderRadius: 1,
            p: 1.5,
            mb: 2,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "14px", color: "success.dark" }}>
            All findings reviewed
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, fontSize: "11.5px" }}>
            You may proceed when other readiness checks pass.
          </Typography>
        </Box>
      )}

      {flags.map((flag, i) => {
        const isDismissed = dismissedFlags.has(i);
        return (
          <Box
            key={i}
            data-flag={i}
            tabIndex={0}
            sx={{
              mb: 1.5,
              p: 1.5,
              borderRadius: 1,
              border: "1px solid",
              borderColor: DRAFT_B.border,
              borderLeft: isDismissed ? `3px solid ${DRAFT_B.border}` : `3px solid ${COLORS.error}`,
              opacity: isDismissed ? 0.5 : 1,
              background: isDismissed
                ? theme.palette.action.disabledBackground
                : "white",
            }}
            onMouseEnter={() => onFlagHover(i)}
            onMouseLeave={() => onFlagHover(null)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onGoToPassage(i);
              if (e.key === "d" || e.key === "D") onToggleFlag(i);
            }}
          >
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 0.75 }}>
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                <Box
                  sx={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    bgcolor: COLORS.error,
                    color: "#fff",
                    fontSize: "10px",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {i + 1}
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "13px" }}>
                  {CHECK_TYPE_LABELS[flag.checkType]}
                </Typography>
              </Stack>
              <Typography
                variant="caption"
                sx={{
                  fontSize: "10px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color:
                    flag.severity === "likely_violation" ? "error.main" : "warning.main",
                }}
              >
                {flag.severity === "likely_violation" ? "Likely violation" : "Review recommended"}
              </Typography>
            </Stack>

            <Typography
              variant="body2"
              sx={{
                fontStyle: "italic",
                fontSize: "12px",
                borderLeft: `2px solid ${alpha(COLORS.error, 0.4)}`,
                pl: 1,
                my: 0.75,
              }}
            >
              &ldquo;{flag.passage}&rdquo;
            </Typography>

            <Typography
              variant="caption"
              sx={{
                fontSize: "11.5px",
                color: DRAFT_B.inkSoft,
                lineHeight: 1.55,
                display: "block",
              }}
            >
              {flag.reasoning}
            </Typography>

            {!readOnly && (
              <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
                <Button size="small" variant="outlined" color="primary" onClick={() => onGoToPassage(i)}>
                  Go to passage
                </Button>
                <Button size="small" variant="outlined" color="inherit" onClick={() => onToggleFlag(i)}>
                  {isDismissed ? "Restore" : "Dismiss"}
                </Button>
              </Stack>
            )}
          </Box>
        );
      })}

      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: 3, mb: 1 }}>
        <ShieldOutlinedIcon sx={{ fontSize: 18, color: DRAFT_B.inkMuted }} />
        <Typography
          variant="caption"
          sx={{
            fontSize: "10.5px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.6px",
            color: DRAFT_B.inkMuted,
          }}
        >
          MUST-NEVER LIST
        </Typography>
      </Stack>

      {mustNeverList.length === 0 ? (
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "11.5px" }}>
          No must-never items defined.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {mustNeverList.map((item, idx) => {
            const flagged = mustNeverFlaggedForIndex(idx, item, flags);
            return (
              <Stack key={idx} direction="row" alignItems="flex-start">
                {flagged ? (
                  <WarningAmberIcon color="warning" sx={{ fontSize: 16, flexShrink: 0 }} />
                ) : (
                  <CheckCircleIcon color="success" sx={{ fontSize: 16, flexShrink: 0 }} />
                )}
                <Typography variant="caption" sx={{ fontSize: "11.5px", color: DRAFT_B.inkSoft, ml: 1 }}>
                  {item}
                </Typography>
              </Stack>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
