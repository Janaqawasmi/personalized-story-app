import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { PageCardViewModel } from "../../hooks/useIllustrationWorkspaceState";
import PageCardImage from "./PageCardImage";
import PageCardManuscript from "./PageCardManuscript";
import PageCardScenePlan from "./PageCardScenePlan";

interface Props {
  storyId: string;
  page: PageCardViewModel;
  readOnly: boolean;
  activeImageJobHint?: string;
  onGenerate: () => void;
  onApprove: () => void;
  onReject: (feedbackNote: string) => void;
}

export default function PageCard({
  storyId,
  page,
  readOnly,
  activeImageJobHint,
  onGenerate,
  onApprove,
  onReject,
}: Props) {
  const spv = page.scenePlanVersion;
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2} divider={<Divider flexItem />}>
          <Typography variant="overline">Page {page.pageNumber}</Typography>
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
            />
          )}
          <PageCardImage
            page={page}
            readOnly={readOnly}
            activeImageJobHint={activeImageJobHint}
            onGenerate={onGenerate}
            onApprove={onApprove}
            onReject={onReject}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
