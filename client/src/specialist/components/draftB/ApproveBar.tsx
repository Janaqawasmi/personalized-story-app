import React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import CheckIcon from "@mui/icons-material/Check";
import RefreshIcon from "@mui/icons-material/Refresh";

import type { StoryStatus } from "../../../types/story";
import { COLORS } from "../../../theme";
import { DRAFT_B, FONTS } from "./tokens";

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

/** Matches Direction B mock + screenshot: 3 columns — edits+must-never | safety | word count */
function checklistColumns(checks: ReadinessCheck[]): [ReadinessCheck[], ReadinessCheck[], ReadinessCheck[]] {
  if (checks.length >= 4) {
    return [
      [checks[0], checks[3]],
      [checks[1]],
      [checks[2]],
    ];
  }
  return [[], checks, []];
}

function ChecklistRow({ ok, label }: ReadinessCheck) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        minHeight: 22,
      }}
    >
      {ok ? (
        <Box
          sx={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            bgcolor: COLORS.success,
            color: "#fff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <CheckIcon sx={{ fontSize: 9 }} />
        </Box>
      ) : (
        <Box
          sx={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            border: `1.5px solid ${DRAFT_B.border}`,
            flexShrink: 0,
          }}
        />
      )}
      <Typography
        component="span"
        sx={{
          fontSize: "11.5px",
          fontWeight: ok ? 600 : 500,
          color: ok ? "#4a5f3f" : DRAFT_B.inkMuted,
          lineHeight: 1.35,
          fontFamily: FONTS.sans,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

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
  const pct = Math.round((okCount / Math.max(total, 1)) * 100);
  const filledArc = (pct / 100) * CIRC;
  /** Full green ring only when every gate passes; otherwise slate (matches reference screenshot at 3/4). */
  const ringColor = okCount === total ? COLORS.success : COLORS.primary;

  const firstFailing = checks.find((c) => !c.ok);
  const approveTooltip =
    firstFailing?.label ??
    (!canApprove && status === "awaiting_review"
      ? "Opening workspace for review… try again in a moment"
      : "");

  const [col1, col2, col3] = checklistColumns(checks);

  if (status === "archived") return null;

  if (status === "approved") return null;

  return (
    <Box
      sx={{
        position: "sticky",
        bottom: "16px",
        mx: "40px",
        mb: 2,
        mt: "24px",
        fontFamily: FONTS.sans,
        background: "#fff",
        border: `1px solid ${DRAFT_B.border}`,
        borderRadius: "14px",
        px: "18px",
        py: "14px",
        boxShadow: "0 4px 12px rgba(60,50,40,0.08), 0 20px 48px rgba(60,50,40,0.12)",
        display: "flex",
        alignItems: "center",
        gap: "18px",
        flexWrap: { xs: "wrap", lg: "nowrap" },
      }}
    >
      {/* Gauge + title (grouped like screenshot) */}
      <Box sx={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
        <Box sx={{ width: 42, height: 42, flexShrink: 0 }} aria-label={`${okCount} of ${total} readiness checks passed`}>
          <svg width="42" height="42" viewBox="0 0 42 42">
            <circle cx="21" cy="21" r={R} fill="none" stroke={DRAFT_B.borderSoft} strokeWidth="4" />
            <circle
              cx="21"
              cy="21"
              r={R}
              fill="none"
              stroke={ringColor}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${filledArc} ${CIRC}`}
              transform="rotate(-90 21 21)"
              style={{ transition: "stroke-dasharray 0.3s ease" }}
            />
            <text
              x="21"
              y="21"
              dominantBaseline="middle"
              textAnchor="middle"
              fill={DRAFT_B.ink}
              fontSize="11"
              fontWeight={700}
              fontFamily="inherit"
            >
              {okCount}/{total}
            </text>
          </svg>
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: "13px", fontWeight: 700, color: DRAFT_B.ink, lineHeight: 1.25 }}>
            {okCount === total ? "Ready to approve" : "Readiness checklist"}
          </Typography>
          <Typography sx={{ fontSize: "11px", color: DRAFT_B.inkMuted, fontWeight: 500, mt: "2px" }}>
            {okCount === total
              ? "All gates passed."
              : `${total - okCount} item${total - okCount === 1 ? "" : "s"} remaining`}
          </Typography>
        </Box>
      </Box>

      {/* Vertical divider */}
      <Box
        sx={{
          width: "1px",
          alignSelf: "stretch",
          minHeight: 44,
          backgroundColor: DRAFT_B.borderSoft,
          flexShrink: 0,
          display: { xs: "none", sm: "block" },
        }}
      />

      {/* 3-column checklist */}
      <Box
        sx={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
          gap: { xs: 1.5, sm: 2 },
          columnGap: 3,
          minWidth: 0,
        }}
      >
        <Stack spacing={1}>
          {col1.map((c, i) => (
            <ChecklistRow key={`c1-${i}`} {...c} />
          ))}
        </Stack>
        <Stack spacing={1}>
          {col2.map((c, i) => (
            <ChecklistRow key={`c2-${i}`} {...c} />
          ))}
        </Stack>
        <Stack spacing={1}>
          {col3.map((c, i) => (
            <ChecklistRow key={`c3-${i}`} {...c} />
          ))}
        </Stack>
      </Box>

      {/* Actions */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexShrink: 0,
          ml: { xs: 0, md: "auto" },
          flexWrap: "wrap",
        }}
      >
        <Typography
          sx={{
            fontSize: "10.5px",
            color: DRAFT_B.inkMuted,
            fontWeight: 600,
            mr: 0.5,
            textAlign: "right",
          }}
        >
          {regenRemaining} regen left
        </Typography>
        <Button
          variant="outlined"
          size="medium"
          startIcon={<RefreshIcon sx={{ fontSize: 18 }} />}
          disabled={regenRemaining === 0 || status === "awaiting_review"}
          onClick={onRegenerate}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            fontSize: "13px",
            color: COLORS.primary,
            borderColor: DRAFT_B.border,
            backgroundColor: "#fff",
            "&:hover": {
              borderColor: DRAFT_B.border,
              backgroundColor: DRAFT_B.primarySoft,
            },
          }}
        >
          Regenerate
        </Button>
        {!canApprove && approveTooltip ? (
          <Tooltip title={approveTooltip}>
            <span style={{ display: "inline-block" }}>
              <Button
                variant="contained"
                disabled
                startIcon={<CheckIcon sx={{ fontSize: 18 }} />}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "14px",
                  height: 42,
                  px: "22px",
                  backgroundColor: COLORS.success,
                  color: "#fff",
                  opacity: 0.55,
                  "&.Mui-disabled": { color: "#fff", backgroundColor: COLORS.success },
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
            startIcon={<CheckIcon sx={{ fontSize: 18 }} />}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              fontSize: "14px",
              height: 42,
              px: "22px",
              backgroundColor: COLORS.success,
              color: "#fff",
              boxShadow: canApprove ? `0 2px 0 ${COLORS.success}cc` : undefined,
              "&:hover": {
                backgroundColor: "#4e6847",
              },
              "&.Mui-disabled": {
                backgroundColor: COLORS.success,
                color: "#fff",
                opacity: 0.5,
              },
            }}
          >
            Mark approved
          </Button>
        )}
      </Box>
    </Box>
  );
}
