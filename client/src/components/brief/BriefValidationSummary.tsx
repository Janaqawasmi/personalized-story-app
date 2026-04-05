// client/src/components/brief/BriefValidationSummary.tsx
//
// Shown above "Save & continue" when required fields are incomplete.
// Each item scrolls to and focuses the corresponding field group.

import React from "react";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import { Box, ButtonBase, Chip, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { COLORS } from "../../theme";

export interface BriefMissingField {
  label: string;
  /** Must match the `id` on the field group's legend (or focusable anchor). */
  targetId: string;
}

const PANEL_BG = "#FAF8F6";
const ROW_BG = "#FFFFFF";
const ROW_BG_HOVER = "#F3F0EC";
const ROSE_ACCENT = COLORS.secondary;
const BLUE_TINT = "rgba(97, 120, 145, 0.08)";
const ROSE_TINT = "rgba(130, 77, 92, 0.12)";

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
  const missingCount = missing.length;

  if (missingCount === 0) return null;

  return (
    <Box
      component="section"
      role="status"
      aria-live="polite"
      aria-label="Required fields still to complete"
      sx={{
        mb: 2.5,
        borderRadius: 3,
        border: `1px solid rgba(208, 200, 192, 0.75)`,
        borderInlineStart: `4px solid ${ROSE_ACCENT}`,
        background: `linear-gradient(180deg, ${PANEL_BG} 0%, #FFFDFC 100%)`,
        boxShadow: `
          0 1px 2px rgba(0,0,0,0.04),
          0 10px 24px rgba(97, 120, 145, 0.08)
        `,
        overflow: "hidden",
      }}
    >
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        spacing={1.5}
        sx={{ px: 2.25, pt: 2.25, pb: 1.75 }}
      >
        <Stack direction="row" spacing={1.5} sx={{ minWidth: 0, flex: 1 }}>
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
              backgroundColor: ROSE_TINT,
              color: ROSE_ACCENT,
              boxShadow: "inset 0 0 0 1px rgba(130, 77, 92, 0.06)",
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
                letterSpacing: 0.9,
                fontWeight: 800,
                color: COLORS.textSecondary,
                lineHeight: 1.4,
                mb: 0.25,
              }}
            >
              Almost there
            </Typography>
            <Typography
              variant="body1"
              fontWeight={800}
              color={COLORS.textPrimary}
              sx={{ mb: 0.5, letterSpacing: "-0.01em" }}
            >
              To continue, complete:
            </Typography>
            <Typography
              variant="caption"
              color={COLORS.textSecondary}
              display="block"
              lineHeight={1.5}
              sx={{ maxWidth: 560 }}
            >
              Select a field below to scroll to it and start filling it in.
            </Typography>
          </Box>
        </Stack>
        <Chip
          label={missingCount === 1 ? "1 field left" : `${missingCount} fields left`}
          size="small"
          sx={{
            mt: 0.25,
            flexShrink: 0,
            height: 28,
            borderRadius: 999,
            backgroundColor: BLUE_TINT,
            color: COLORS.primary,
            border: "1px solid rgba(97, 120, 145, 0.16)",
            fontWeight: 700,
            "& .MuiChip-label": { px: 1.25 },
          }}
        />
      </Stack>

      <Stack
        component="ol"
        spacing={1}
        sx={{
          listStyle: "none",
          m: 0,
          p: 0,
          px: 2,
          pb: 2,
          borderTop: "1px solid rgba(208, 200, 192, 0.45)",
        }}
      >
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
                mt: index === 0 ? 1.25 : 0,
                borderRadius: 2.5,
                border: `1px solid ${COLORS.border}`,
                backgroundColor: ROW_BG,
                transition:
                  "transform 0.18s ease, background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
                overflow: "hidden",
                "&:hover": {
                  backgroundColor: ROW_BG_HOVER,
                  borderColor: COLORS.primary,
                  boxShadow: "0 8px 18px rgba(97, 120, 145, 0.12)",
                  transform: "translateY(-1px)",
                  "& .brief-validation-chevron": {
                    opacity: 1,
                    transform: rtl ? "scaleX(-1) translateX(-2px)" : "translateX(2px)",
                  },
                },
                "@media (prefers-reduced-motion: reduce)": {
                  transition: "background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
                  "&:hover": { transform: "none" },
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
                  backgroundColor: BLUE_TINT,
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
                  className="brief-validation-chevron"
                  sx={{
                    fontSize: 22,
                    color: COLORS.textSecondary,
                    flexShrink: 0,
                    opacity: 0.72,
                    transform: rtl ? "scaleX(-1)" : undefined,
                    transition: "transform 0.15s ease, opacity 0.15s ease",
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
