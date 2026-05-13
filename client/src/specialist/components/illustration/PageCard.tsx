import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { PageCardViewModel } from "../../hooks/useIllustrationWorkspaceState";
import { useIllustrationDevPanelsGate } from "../../hooks/useIsAdminOrDevPanelEnabled";
import DeveloperPanel from "./DeveloperPanel";
import PageCardImage from "./PageCardImage";
import PageCardManuscript from "./PageCardManuscript";
import PageCardScenePlan from "./PageCardScenePlan";
import PageCardVersionPicker from "./PageCardVersionPicker";

interface Props {
  storyId: string;
  page: PageCardViewModel;
  readOnly: boolean;
  currentVisualBibleVersion: number;
  onGenerate: () => void;
  onApprove: () => void;
  onReject: (feedbackNote: string) => void;
  onRegenerateScenePlan: (feedbackNote?: string) => Promise<void>;
}

export default function PageCard({
  storyId,
  page,
  readOnly,
  currentVisualBibleVersion,
  onGenerate,
  onApprove,
  onReject,
  onRegenerateScenePlan,
}: Props) {
  const devGate = useIllustrationDevPanelsGate();
  const showDevPanel = devGate.ready && devGate.allowed;
  const spv = page.scenePlanVersion;
  const imageGenHint =
    page.subStatus === "generating_image"
      ? `Generating illustration for page ${page.pageNumber}…`
      : undefined;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2} divider={<Divider flexItem />}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            gap={1}
          >
            <Typography variant="overline">Page {page.pageNumber}</Typography>
            <PageCardVersionPicker
              storyId={storyId}
              pageNumber={page.pageNumber}
              currentImageVersion={page.imageVersion}
              currentScenePlanVersion={page.scenePlanVersion}
              imageVersionsDesc={page.imageVersionsDesc}
            />
          </Stack>
          <PageCardManuscript text={page.text} />
          {spv === null ? (
            <Typography variant="body2" color="text.secondary">
              Scene plan unavailable.
            </Typography>
          ) : (
            <PageCardScenePlan
              storyId={storyId}
              pageNumber={page.pageNumber}
              scenePlanVersion={spv}
              readOnly={readOnly}
              scenePlanRegenBusy={page.scenePlanRegenBusy}
              visualBibleIsStale={page.visualBibleIsStale}
              onRegenerateScenePlan={onRegenerateScenePlan}
            />
          )}
          <PageCardImage
            storyId={storyId}
            page={page}
            readOnly={readOnly}
            activeImageJobHint={imageGenHint}
            onGenerate={onGenerate}
            onApprove={onApprove}
            onReject={onReject}
          />
          {showDevPanel && spv !== null ? (
            <DeveloperPanel
              storyId={storyId}
              pageNumber={page.pageNumber}
              scenePlanVersion={spv}
              imageVersion={page.imageVersion}
              currentVisualBibleVersion={currentVisualBibleVersion}
            />
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
