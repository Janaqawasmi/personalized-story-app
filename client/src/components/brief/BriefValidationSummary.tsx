// client/src/components/brief/BriefValidationSummary.tsx
//
// Shown above "Save & continue" when required fields are incomplete.
// Each item scrolls to and focuses the corresponding field group.

import React from "react";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { COLORS } from "../../theme";

export interface BriefMissingField {
  label: string;
  /** Must match the `id` on the field group's legend (or focusable anchor). */
  targetId: string;
}

const ACCENT = COLORS.secondary;
const PANEL_BG = "#FAF8F6";
const ROW_BG = "#FFFFFF";
const ROW_BG_HOVER = "#F3F0EC";

/** Scroll to a brief field and move focus into its fieldset for keyboard users. */
export function scrollToBriefField(targetId: string): void {
  const el = document.getElementById(targetId);
  if (!el) return;

  el.scrollIntoView({ behavior: "smooth", block: "center" });

  window.setTimeout(() => {
    const fieldset = el.closest("fieldset");
    const focusable =
      fieldset?.querySelector<HTMLElement>(
        "button, a[href], input:not([type='hidden']), textarea, select, [tabindex]:not([tabindex='-1'])",
      ) ?? null;

    const target = focusable ?? el;
    if (target instanceof HTMLElement) {
      if (target === el && !target.hasAttribute("tabindex")) {
        target.setAttribute("tabindex", "-1");
      }
      target.focus({ preventScroll: true });
    }
  }, 350);
}

interface Props {
  missing: BriefMissingField[];
}

export default function BriefValidationSummary({ missing }: Props) {
  const theme = useTheme();
  const rtl = theme.direction === "rtl";

  if (missing.length === 0) return null;

  return (
    <Box
      component="section"
      role="status"
      aria-live="polite"
      aria-label="Required fields still to complete"
      sx={{
        mb: 2.5,
        borderRadius: 2.5,
        border: `1px solid ${COLORS.border}`,
        borderInlineStart: `4px solid ${ACCENT}`,
        backgroundColor: PANEL_BG,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        overflow: "hidden",
      }}
    >
      <Stack
        direction="row"
        alignItems="flex-start"
        spacing={1.5}
        sx={{ px: 2.25, pt: 2, pb: 1.5 }}
      >
        <Box
          sx={{
            mt: 0.25,
            width: 40,
            height: 40,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            backgroundColor: "rgba(130, 77, 92, 0.12)",
            color: ACCENT,
          }}
          aria-hidden
        >
          <PlaylistAddCheckIcon sx={{ fontSize: 22 }} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="overline"
            sx={{
              display: "block",
              letterSpacing: 0.8,
              fontWeight: 700,
              color: COLORS.textSecondary,
              lineHeight: 1.4,
              mb: 0.25,
            }}
          >
            Almost there
          </Typography>
          <Typography variant="body1" fontWeight={700} color={COLORS.textPrimary} sx={{ mb: 0.5 }}>
            To continue, complete:
          </Typography>
          <Typography variant="caption" color={COLORS.textSecondary} display="block" lineHeight={1.5}>
            Select a field below to scroll to it and start filling it in.
          </Typography>
        </Box>
      </Stack>

      <Stack component="ol" spacing={1} sx={{ listStyle: "none", m: 0, p: 0, px: 2, pb: 2 }}>
        {missing.map((m, index) => (
          <Box component="li" key={m.targetId}>
            <ButtonBase
              type="button"
              focusRipple
              onClick={() => scrollToBriefField(m.targetId)}
              aria-label={`Go to ${m.label}`}
              sx={{
                width: "100%",
                display: "flex",
                alignItems: "stretch",
                textAlign: "start",
                borderRadius: 2,
                border: `1px solid ${COLORS.border}`,
                backgroundColor: ROW_BG,
                transition: "background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
                overflow: "hidden",
                "&:hover": {
                  backgroundColor: ROW_BG_HOVER,
                  borderColor: COLORS.primary,
                  boxShadow: "0 2px 8px rgba(97, 120, 145, 0.12)",
                },
                "&.Mui-focusVisible": {
                  outline: `2px solid ${COLORS.primary}`,
                  outlineOffset: 2,
                },
              }}
            >
              <Box
                sx={{
                  width: 36,
                  minHeight: 48,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  backgroundColor: "rgba(97, 120, 145, 0.08)",
                  color: COLORS.primary,
                  fontWeight: 800,
                  fontSize: "0.8rem",
                  fontVariantNumeric: "tabular-nums",
                }}
                aria-hidden
              >
                {index + 1}
              </Box>
              <Box
                sx={{
                  flex: 1,
                  minWidth: 0,
                  py: 1.25,
                  px: 1.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                }}
              >
                <Typography
                  component="span"
                  variant="body2"
                  fontWeight={600}
                  color={COLORS.textPrimary}
                  sx={{ lineHeight: 1.4 }}
                >
                  {m.label}
                </Typography>
                <ChevronRightIcon
                  sx={{
                    fontSize: 22,
                    color: COLORS.textSecondary,
                    flexShrink: 0,
                    opacity: 0.85,
                    transform: rtl ? "scaleX(-1)" : undefined,
                  }}
                  aria-hidden
                />
              </Box>
            </ButtonBase>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
