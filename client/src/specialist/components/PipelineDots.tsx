import Box from "@mui/material/Box";
import type { StoryStatus } from "../../types/story";
import { COLORS } from "../../theme";
import { getStoryPipelineUiState } from "../utils/storyPipeline";

/** Small progress-dot indicator shared by the table row and the mobile card. */
export default function PipelineDots({
  status,
  dotCount,
}: {
  status: StoryStatus;
  dotCount: number;
}) {
  const n = dotCount;
  const ui = getStoryPipelineUiState(status);

  if (ui.kind === "archived") {
    return (
      <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", flexShrink: 0 }}>
        {Array.from({ length: n }).map((_, i) => (
          <Box
            key={i}
            sx={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              bgcolor: COLORS.border,
              flexShrink: 0,
            }}
          />
        ))}
      </Box>
    );
  }

  const cur = ui.emphasisStepIndex;
  const isPublished = status === "published";

  return (
    <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", flexShrink: 0 }}>
      {Array.from({ length: n }).map((_, i) => {
        let bg = COLORS.border;
        let shadow: string | undefined;
        if (isPublished) {
          bg = COLORS.success;
        } else if (i < cur) {
          bg = COLORS.primary;
        } else if (i === cur) {
          bg = status === "awaiting_review" ? COLORS.warning : COLORS.primary;
          shadow =
            status === "awaiting_review"
              ? "0 0 0 3px rgba(176,132,51,0.18)"
              : "0 0 0 3px rgba(97,120,145,0.2)";
        }
        return (
          <Box
            key={i}
            sx={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              bgcolor: bg,
              boxShadow: shadow,
              flexShrink: 0,
            }}
          />
        );
      })}
    </Box>
  );
}
