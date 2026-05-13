import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ScenePlanArtefact } from "../../../../types/illustration";
import type { SpecialistDeskUi } from "../../../../i18n/specialistDeskUi.types";
import type { PageCardViewModel } from "../../../hooks/useIllustrationWorkspaceState";
import { DRAFT_B } from "../../draftB/tokens";
import { PageStatusBadge } from "../shared/pageStatusBadge";
import PageCardVersionPicker from "../PageCardVersionPicker";

type Desk = Pick<
  SpecialistDeskUi,
  | "illPageNumber"
  | "illStatusPlanOnly"
  | "illStatusGenerating"
  | "illStatusAwaiting"
  | "illStatusApproved"
  | "illStatusRejected"
>;

interface Props {
  storyId: string;
  page: PageCardViewModel;
  desk: Desk;
  scenePlan: ScenePlanArtefact | null;
}

export default function PageCardHead({ storyId, page, desk, scenePlan }: Props) {
  const title = scenePlan?.title ?? desk.illPageNumber(page.pageNumber);
  return (
    <Stack
      direction="row"
      alignItems="flex-start"
      justifyContent="space-between"
      gap={1.5}
      flexWrap="wrap"
    >
      <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap" sx={{ minWidth: 0 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "10px",
            bgcolor: DRAFT_B.cream,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: `'Playfair Display', Georgia, serif`,
            fontWeight: 700,
            fontSize: 16,
            color: DRAFT_B.ink,
            flexShrink: 0,
          }}
        >
          {page.pageNumber}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily: `'Playfair Display', Georgia, serif`,
              fontWeight: 700,
              fontSize: 18,
              lineHeight: 1.25,
              color: DRAFT_B.ink,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </Typography>
          <Box sx={{ mt: 0.25 }}>
            <PageCardVersionPicker
              storyId={storyId}
              pageNumber={page.pageNumber}
              currentImageVersion={page.imageVersion}
              currentScenePlanVersion={page.scenePlanVersion}
              imageVersionsDesc={page.imageVersionsDesc}
            />
          </Box>
        </Box>
      </Stack>
      <Box sx={{ flexShrink: 0, marginInlineStart: "auto" }}>
        <PageStatusBadge status={page.subStatus} desk={desk} />
      </Box>
    </Stack>
  );
}
