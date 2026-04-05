// client/src/components/brief/BriefValidationSummary.tsx
//
// Shown above "Save & continue" when required fields are incomplete.
// Each item scrolls to and focuses the corresponding field group.

import React from "react";
import { Alert, Box, Button, Typography } from "@mui/material";
import { COLORS } from "../../theme";

export interface BriefMissingField {
  label: string;
  /** Must match the `id` on the field group's legend (or focusable anchor). */
  targetId: string;
}

const SUMMARY_BG = "#FBF6EC";
const SUMMARY_BORDER = "#E8D9C4";

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
  if (missing.length === 0) return null;

  return (
    <Alert
      severity="warning"
      role="status"
      aria-live="polite"
      icon={false}
      sx={{
        mb: 2,
        borderRadius: 2,
        backgroundColor: SUMMARY_BG,
        border: `1px solid ${SUMMARY_BORDER}`,
        "& .MuiAlert-message": { width: "100%" },
      }}
    >
      <Typography variant="body2" fontWeight={700} color={COLORS.textPrimary} mb={1}>
        To continue, complete:
      </Typography>
      <Box component="ul" sx={{ m: 0, pl: 2.25, listStyleType: "disc" }}>
        {missing.map((m) => (
          <Box component="li" key={m.targetId} sx={{ mb: 0.5, "&:last-child": { mb: 0 } }}>
            <Button
              type="button"
              variant="text"
              onClick={() => scrollToBriefField(m.targetId)}
              sx={{
                p: 0,
                minWidth: 0,
                justifyContent: "flex-start",
                textAlign: "left",
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.875rem",
                color: COLORS.primary,
                verticalAlign: "baseline",
                "&:hover": { backgroundColor: "transparent", textDecoration: "underline" },
              }}
            >
              {m.label}
            </Button>
          </Box>
        ))}
      </Box>
    </Alert>
  );
}
