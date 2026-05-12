// client/src/specialist/components/IllustrationsTab.tsx
//
// PLACEHOLDER — the v1 illustration pipeline has been removed (cleanup PR 1
// of the v2 redesign). The full Illustrations tab UI is rebuilt in Phase 2
// and beyond per docs/illustration/spec.md §12. Until then this tab shows a
// "under construction" panel so the rest of the workspace keeps working.

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

import type { Story } from "../../types/story";
import { COLORS, DESIGN_TOKENS } from "../../theme";

interface Props {
  story: Story;
  onStoryUpdate: (story: Story) => void;
}

export default function IllustrationsTab(_props: Props) {
  return (
    <Box sx={{ px: { xs: 2, sm: 3, md: 5 }, pt: 6, pb: 8 }}>
      <Stack alignItems="center" spacing={2.5} sx={{ maxWidth: 480, mx: "auto", textAlign: "center" }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            bgcolor: "#eaf0e4",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AutoAwesomeIcon sx={{ fontSize: 26, color: COLORS.success }} />
        </Box>

        <Typography
          variant="h6"
          sx={{ fontFamily: DESIGN_TOKENS.fontDisplay, fontWeight: 700, color: COLORS.textPrimary }}
        >
          Illustration workspace coming soon
        </Typography>

        <Typography variant="body2" sx={{ color: COLORS.textSecondary, lineHeight: 1.7 }}>
          The illustration pipeline is being rebuilt under the v2 specification.
          Approved stories will land here once the new workspace is wired up —
          see <code>docs/illustration/spec.md</code> for the design.
        </Typography>
      </Stack>
    </Box>
  );
}
