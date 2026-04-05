// client/src/components/brief/BriefProgressIndicator.tsx
//
// Horizontal step indicator for the Story Brief form.
// Shows all 5 sections with labels, highlights the current section,
// and shows completion state per section.
//
// Spec UI requirement §21.1:
//   "Show the 5 sections with labels, highlight the current section,
//    show completion state per section."

import React from "react";
import { Box, Typography } from "@mui/material";
import { COLORS } from "../../theme";

// ============================================================================
// Constants
// ============================================================================

const SECTION_LABELS: Record<number, { full: string; short: string }> = {
  1: { full: "Age & Story Scope",         short: "Scope"         },
  2: { full: "Clinical Foundation",        short: "Foundation"    },
  3: { full: "Therapeutic Architecture",   short: "Architecture"  },
  4: { full: "Story World",                short: "Story World"   },
  5: { full: "Personalization",            short: "Config"        },
};

// ============================================================================
// Props
// ============================================================================

interface Props {
  /** Which section is currently active (1–5). */
  currentSection: number;
  /** Index corresponds to section number minus 1 (e.g. [0] = section 1). */
  sectionCompletion: boolean[];
  /**
   * If provided, clicking a completed or past section navigates to it.
   * Receives the section number (1–5).
   */
  onNavigate?: (section: number) => void;
}

// ============================================================================
// Component
// ============================================================================

export default function BriefProgressIndicator({
  currentSection,
  sectionCompletion,
  onNavigate,
}: Props) {
  const sections = [1, 2, 3, 4, 5];

  return (
    <Box
      role="navigation"
      aria-label="Brief sections progress"
      sx={{ mb: 4 }}
    >
      <Box
        display="flex"
        alignItems="flex-start"
        sx={{ position: "relative" }}
      >
        {sections.map((num, i) => {
          const isCompleted = sectionCompletion[i] ?? false;
          const isCurrent = currentSection === num;
          const isPast = currentSection > num;
          const isClickable = (isCompleted || isPast) && !!onNavigate;

          return (
            <React.Fragment key={num}>
              {/* ── Step ─────────────────────────────────────────────── */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  flexShrink: 0,
                  // Fixed width so connecting lines flex between them
                  width: { xs: 40, sm: 68 },
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {/* Circle */}
                <Box
                  role={isClickable ? "button" : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  aria-label={
                    isClickable
                      ? `Go to section ${num}: ${SECTION_LABELS[num].full}`
                      : undefined
                  }
                  aria-current={isCurrent ? "step" : undefined}
                  onClick={() => isClickable && onNavigate?.(num)}
                  onKeyDown={(e) => {
                    if (isClickable && (e.key === "Enter" || e.key === " ")) {
                      onNavigate?.(num);
                    }
                  }}
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    border: `2px solid ${
                      isCompleted
                        ? COLORS.success
                        : isCurrent
                        ? COLORS.primary
                        : COLORS.border
                    }`,
                    backgroundColor: isCompleted
                      ? COLORS.success
                      : isCurrent
                      ? COLORS.primary
                      : COLORS.surface,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: isClickable ? "pointer" : "default",
                    transition: "all 0.2s ease",
                    mb: 0.75,
                    "&:hover": isClickable
                      ? { transform: "scale(1.08)", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }
                      : {},
                    "&:focus-visible": {
                      outline: `2px solid ${COLORS.primary}`,
                      outlineOffset: 2,
                    },
                  }}
                >
                  {isCompleted ? (
                    // Checkmark
                    <Box
                      component="span"
                      aria-hidden="true"
                      sx={{
                        display: "block",
                        width: 9,
                        height: 6,
                        borderLeft: "2px solid white",
                        borderBottom: "2px solid white",
                        transform: "rotate(-45deg) translateY(-1px)",
                      }}
                    />
                  ) : (
                    <Typography
                      component="span"
                      sx={{
                        fontSize: "0.78rem",
                        fontWeight: isCurrent ? 700 : 500,
                        lineHeight: 1,
                        color: isCurrent ? "white" : COLORS.textSecondary,
                      }}
                    >
                      {num}
                    </Typography>
                  )}
                </Box>

                {/* Label — hidden on xs, shown from sm */}
                <Typography
                  variant="caption"
                  sx={{
                    textAlign: "center",
                    lineHeight: 1.3,
                    fontSize: "0.68rem",
                    fontWeight: isCurrent ? 700 : 400,
                    color: isCurrent
                      ? COLORS.primary
                      : isCompleted
                      ? COLORS.textSecondary
                      : COLORS.border,
                    maxWidth: 64,
                    display: { xs: "none", sm: "block" },
                    transition: "color 0.2s ease",
                    cursor: isClickable ? "pointer" : "default",
                  }}
                  onClick={() => isClickable && onNavigate?.(num)}
                  aria-hidden="true"
                >
                  {SECTION_LABELS[num].short}
                </Typography>
              </Box>

              {/* ── Connector line (not after last step) ─────────────── */}
              {i < sections.length - 1 && (
                <Box
                  aria-hidden="true"
                  sx={{
                    flex: 1,
                    height: 2,
                    // Align with the vertical center of the 30px circle
                    mt: "14px",
                    backgroundColor: sectionCompletion[i] ? COLORS.success : COLORS.border,
                    transition: "background-color 0.3s ease",
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </Box>

      {/* Mobile: current section label shown below the track */}
      <Box
        sx={{
          display: { xs: "flex", sm: "none" },
          justifyContent: "center",
          mt: 1,
        }}
      >
        <Typography variant="caption" fontWeight={700} color={COLORS.primary}>
          {SECTION_LABELS[currentSection]?.full ?? ""}
        </Typography>
      </Box>
    </Box>
  );
}
