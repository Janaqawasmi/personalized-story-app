import React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RefreshIcon from "@mui/icons-material/Refresh";

import type { StoryStatus } from "../../../types/story";
import { COLORS } from "../../../theme";
import { DRAFT_B } from "./tokens";

export interface ReadinessCheck {
  ok: boolean;
  label: string;
}

export interface ApproveBarProps {
  checks: ReadinessCheck[];
  canApprove: boolean;
  status: StoryStatus;
  regenCount: number;
  regenRemaining: number;
  onRegenerate: () => void;
  onApprove: () => void;
}

const R = 17;
const CIRC = 2 * Math.PI * R;

export default function ApproveBar({
  checks,
  canApprove,
  status,
  regenCount: _regenCount,
  regenRemaining,
  onRegenerate,
  onApprove,
}: ApproveBarProps) {
  const okCount = checks.filter((c) => c.ok).length;
  const total = checks.length;
  const offset = CIRC * (1 - okCount / Math.max(total, 1));
  const strokeColor = okCount === total ? COLORS.success : COLORS.primary;

  const firstFailing = checks.find((c) => !c.ok);
  const approveTooltip =
    firstFailing?.label ??
    (!canApprove && status === "awaiting_review"
      ? "Opening workspace for review… try again in a moment"
      : "");

  if (status === "archived") return null;

  /** Approved state is shown as a manuscript stamp in DraftTabB (Direction B mock). */
  if (status === "approved") return null;

  return (
    <Box
      sx={{
        position: "sticky",
        bottom: "16px",
        mx: "40px",
        mb: 2,
        mt: "24px",
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(8px)",
        border: `1px solid ${DRAFT_B.border}`,
        borderRadius: "12px",
        px: 2.5,
        py: 1.5,
        boxShadow: "0 4px 24px rgba(60,50,40,0.10)",
        display: "flex",
        alignItems: "center",
        gap: 2,
        flexWrap: "wrap",
      }}
    >
      <Box
        sx={{ width: 42, height: 42, flexShrink: 0 }}
        aria-label={`${okCount} of ${total} readiness checks passed`}
      >
        <svg width="42" height="42" viewBox="0 0 42 42">
          <circle cx="21" cy="21" r={R} fill="none" stroke={DRAFT_B.borderSoft} strokeWidth="4" />
          <circle
            cx="21"
            cy="21"
            r={R}
            fill="none"
            stroke={strokeColor}
            strokeWidth="4"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 21 21)"
          />
          <text
            x="21"
            y="21"
            dominantBaseline="middle"
            textAnchor="middle"
            fill={DRAFT_B.ink}
            fontSize="11"
            fontWeight={700}
          >
            {okCount}/{total}
          </text>
        </svg>
      </Box>

      <Box sx={{ ml: 1.5, mr: 2, minWidth: 0 }}>
        <Typography sx={{ fontSize: "13px", fontWeight: 700, color: DRAFT_B.ink }}>
          {okCount === total ? "Ready to approve" : "Readiness checklist"}
        </Typography>
        <Typography sx={{ fontSize: "11px", color: DRAFT_B.inkMuted }}>
          {okCount === total
            ? "All gates passed."
            : `${total - okCount} item${total - okCount === 1 ? "" : "s"} remaining`}
        </Typography>
      </Box>

      <Box sx={{ width: 1, alignSelf: "stretch", background: DRAFT_B.border, mx: 1 }} />

      <Box sx={{ flex: 1, display: "flex", flexWrap: "wrap", gap: 0.75, minWidth: 120 }}>
        {checks.map((check, i) =>
          check.ok ? (
            <Chip
              key={i}
              icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
              label={check.label}
              size="small"
              sx={{
                background: DRAFT_B.successSoft,
                color: "#4a5f3f",
                fontWeight: 600,
                fontSize: "11px",
              }}
            />
          ) : (
            <Chip
              key={i}
              label={check.label}
              size="small"
              variant="outlined"
              sx={{ color: DRAFT_B.inkMuted, borderColor: DRAFT_B.border, fontSize: "11px" }}
            />
          ),
        )}
      </Box>

      <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
        <Typography sx={{ fontSize: "11px", color: DRAFT_B.inkMuted }}>{regenRemaining} regen left</Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon />}
          disabled={regenRemaining === 0 || status === "awaiting_review"}
          onClick={onRegenerate}
        >
          Regenerate
        </Button>
        {!canApprove && approveTooltip ? (
          <Tooltip title={approveTooltip}>
            <span style={{ display: "inline-block" }}>
              <Button
                variant="contained"
                disabled
                sx={{
                  background: COLORS.success,
                  "&:hover": { background: "#388E3C" },
                  height: 42,
                  fontWeight: 700,
                }}
              >
                Mark approved
              </Button>
            </span>
          </Tooltip>
        ) : (
          <Button
            variant="contained"
            disabled={!canApprove}
            onClick={onApprove}
            sx={{
              background: COLORS.success,
              "&:hover": { background: "#388E3C" },
              height: 42,
              fontWeight: 700,
            }}
          >
            Mark approved
          </Button>
        )}
      </Box>
    </Box>
  );
}
