import type { ReactNode } from "react";
import { Box, type SxProps, type Theme } from "@mui/material";
import { COLORS } from "../../theme";

/** Matches the Story Brief form page canvas (frost + soft wash). */
export const SPECIALIST_PAGE_BG_LAYERS = [
  "linear-gradient(180deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0) 38%)",
  "radial-gradient(ellipse 90% 55% at 50% -8%, rgba(97, 120, 145, 0.06) 0%, transparent 55%)",
  `linear-gradient(180deg, ${COLORS.background} 0%, #E2DCD4 100%)`,
].join(", ");

export const specialistMainPaperSx: SxProps<Theme> = {
  width: "100%",
  p: { xs: 2.5, sm: 3.5, md: 4 },
  border: "1px solid rgba(208, 200, 192, 0.55)",
  borderRadius: 2.5,
  backgroundColor: COLORS.surface,
  boxShadow: `
    0 1px 2px rgba(0, 0, 0, 0.05),
    0 24px 64px -24px rgba(97, 120, 145, 0.14)
  `,
};

type Props = {
  children: ReactNode;
  /** Max width of inner content column */
  maxWidth?: number;
};

export default function SpecialistPortalShell({ children, maxWidth = 960 }: Props) {
  return (
    <Box
      component="main"
      sx={{
        py: { xs: 3, sm: 5, md: 6 },
        px: { xs: 2, sm: 3.5, md: 5 },
        minHeight: "calc(100vh - 80px)",
        boxSizing: "border-box",
        backgroundColor: COLORS.background,
        backgroundImage: SPECIALIST_PAGE_BG_LAYERS,
        backgroundRepeat: "no-repeat",
      }}
    >
      <Box sx={{ maxWidth, mx: "auto", width: "100%" }}>{children}</Box>
    </Box>
  );
}
