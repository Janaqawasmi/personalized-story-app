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
import { Box, Tooltip, Typography } from "@mui/material";
import { COLORS } from "../../theme";

// ============================================================================
// Constants
// ============================================================================

const SECTION_LABELS: Record<number, { full: string; short: string }> = {
  1: { full: "Age & Story Scope",         short: "Scope"         },
  2: { full: "Clinical Foundation",        short: "Foundation"    },
  3: { full: "Therapeutic Architecture",   short: "Architecture"  },
  4: { full: "Story World",                short: "Story World"   },
  // Short label: still paired with Tooltip + aria full name (UX: avoid opaque “Config”).
  5: { full: "Personalization",            short: "Personalize"   },
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
      sx={{ mb: { xs: 4, md: 5 } }}
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
          const lockedFuture = num > currentSection && !isClickable;
          const fullName = SECTION_LABELS[num].full;

          const stepAriaLabel = isClickable
            ? `Go to section ${num}: ${fullName}`
            : isCurrent
              ? `Current section ${num}: ${fullName}`
              : lockedFuture
                ? `Section ${num}: ${fullName}. Locked until you can open this step.`
                : `Section ${num}: ${fullName}`;

          return (
            <React.Fragment key={num}>
              {/* ── Step ─────────────────────────────────────────────── */}
              <Tooltip title={fullName} placement="top" arrow enterTouchDelay={450}>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    flexShrink: 0,
                    width: { xs: 44, sm: 76, md: 84 },
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  {/* Circle */}
                  <Box
                    role={isClickable ? "button" : undefined}
                    tabIndex={isClickable ? 0 : undefined}
                    aria-label={stepAriaLabel}
                    aria-current={isCurrent ? "step" : undefined}
                    aria-disabled={isClickable ? undefined : lockedFuture ? true : undefined}
                    onClick={() => isClickable && onNavigate?.(num)}
                    onKeyDown={(e) => {
                      if (isClickable && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
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
                      cursor: isClickable ? "pointer" : lockedFuture ? "not-allowed" : "default",
                      opacity: lockedFuture ? 0.48 : 1,
                      transition: "all 0.2s ease",
                      mb: 0.75,
                      ...(isClickable
                        ? {
                            "&:hover": {
                              transform: "scale(1.08)",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                            },
                          }
                        : {
                            "&:hover": {
                              transform: "none",
                              boxShadow: "none",
                            },
                          }),
                      "&:focus-visible": isClickable
                        ? {
                            outline: `2px solid ${COLORS.primary}`,
                            outlineOffset: 2,
                          }
                        : {},
                    }}
                  >
                    {isCompleted ? (
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
                        aria-hidden="true"
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

                  {/* Short label — full name in Tooltip + circle aria-label (spec §21) */}
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
                          : lockedFuture
                            ? COLORS.border
                            : COLORS.textSecondary,
                      maxWidth: 64,
                      display: { xs: "none", sm: "block" },
                      transition: "color 0.2s ease",
                      cursor: isClickable ? "pointer" : lockedFuture ? "not-allowed" : "default",
                      pointerEvents: isClickable ? "auto" : "none",
                      userSelect: "none",
                    }}
                    onClick={() => isClickable && onNavigate?.(num)}
                    aria-hidden="true"
                  >
                    {SECTION_LABELS[num].short}
                  </Typography>
                </Box>
              </Tooltip>

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

      {/* Mobile: full section name (short labels hidden on xs; tooltips on each step still expose full names). */}
      <Box
        sx={{
          display: { xs: "flex", sm: "none" },
          flexDirection: "column",
          alignItems: "center",
          mt: 1,
          gap: 0.25,
        }}
      >
        <Typography variant="caption" color={COLORS.textSecondary} sx={{ fontWeight: 600 }}>
          Section {currentSection} of 5
        </Typography>
        <Typography variant="caption" fontWeight={700} color={COLORS.primary} textAlign="center" px={1}>
          {SECTION_LABELS[currentSection]?.full ?? ""}
        </Typography>
      </Box>
    </Box>
  );
}
