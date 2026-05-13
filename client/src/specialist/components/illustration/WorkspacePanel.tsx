import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { IllustrationJob, VisualBibleArtefact } from "../../../types/illustration";
import type { PageCardViewModel } from "../../hooks/useIllustrationWorkspaceState";
import { useSpecialistDeskUi } from "../../../i18n/specialistDeskUi";
import { COLORS } from "../../../theme";
import { DRAFT_B, FONTS } from "../draftB/tokens";
import PageCard from "./PageCard";
import PublishBar from "./publish/PublishBar";
import VisualBibleCard from "./VisualBibleCard";

interface Props {
  storyId: string;
  visualBibleVersion: number;
  visualBible: VisualBibleArtefact | null;
  visualBibleVersionsDesc: VisualBibleArtefact[];
  visualBibleRegenJob: IllustrationJob | null;
  pages: PageCardViewModel[];
  readOnly: boolean;
  allApproved: boolean;
  canPreview: boolean;
  showMarkReady: boolean;
  showPublish: boolean;
  onGeneratePage: (pageNumber: number) => Promise<void>;
  onApprovePage: (pageNumber: number) => Promise<void>;
  onRejectPage: (pageNumber: number, note: string) => Promise<void>;
  onRegenerateScenePlan: (pageNumber: number, feedbackNote?: string) => Promise<void>;
  onRegenerateAllScenePlans: () => Promise<void>;
  onGenerateAllPageImages: () => Promise<void>;
  onMarkReady: () => Promise<void>;
  onPreviewClick: () => void;
  onPublishClick: () => void;
}

export default function WorkspacePanel({
  storyId,
  visualBibleVersion,
  visualBible,
  visualBibleVersionsDesc,
  visualBibleRegenJob,
  pages,
  readOnly,
  allApproved,
  canPreview,
  showMarkReady,
  showPublish,
  onGeneratePage,
  onApprovePage,
  onRejectPage,
  onRegenerateScenePlan,
  onRegenerateAllScenePlans,
  onGenerateAllPageImages,
  onMarkReady,
  onPreviewClick,
  onPublishClick,
}: Props) {
  const desk = useSpecialistDeskUi();
  const [batchBusy, setBatchBusy] = useState<"plans" | "images" | null>(null);

  const vbRegenBusy =
    visualBibleRegenJob !== null &&
    (visualBibleRegenJob.status === "pending" || visualBibleRegenJob.status === "running");

  const sectionTitle = allApproved
    ? desk.illPagesTitleApproved(pages.length)
    : desk.illPagesTitleMixed(pages.length);

  const runBatchPlans = async () => {
    setBatchBusy("plans");
    try {
      await onRegenerateAllScenePlans();
    } finally {
      setBatchBusy(null);
    }
  };

  const runBatchImages = async () => {
    setBatchBusy("images");
    try {
      await onGenerateAllPageImages();
    } finally {
      setBatchBusy(null);
    }
  };

  return (
    <Stack spacing={3}>
      <VisualBibleCard
        storyId={storyId}
        readOnly={readOnly}
        currentVersion={visualBibleVersion}
        visualBible={visualBible}
        visualBibleVersionsDesc={visualBibleVersionsDesc}
        visualBibleRegenBusy={vbRegenBusy}
        visualBibleRegenJobId={visualBibleRegenJob?.id ?? null}
      />

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 2,
          pt: 0.5,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="overline"
            sx={{
              display: "block",
              color: COLORS.primary,
              fontFamily: FONTS.mono,
              fontWeight: 700,
              letterSpacing: "0.1em",
              mb: 0.5,
            }}
          >
            {desk.illPagesEyebrow}
          </Typography>
          <Typography
            component="h2"
            sx={{
              m: 0,
              fontFamily: `'Playfair Display', Georgia, serif`,
              fontWeight: 700,
              fontSize: { xs: 22, sm: 26 },
              color: DRAFT_B.ink,
              letterSpacing: "-0.02em",
            }}
          >
            {sectionTitle}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end">
          <Button
            size="small"
            variant="text"
            disabled={readOnly || batchBusy !== null}
            onClick={() => void runBatchPlans()}
            sx={{ color: DRAFT_B.inkSoft, textTransform: "none", fontWeight: 600 }}
          >
            {batchBusy === "plans" ? "…" : desk.illRegenAllPlans}
          </Button>
          <Button
            size="small"
            variant="text"
            disabled={readOnly || batchBusy !== null}
            onClick={() => void runBatchImages()}
            sx={{ color: DRAFT_B.inkSoft, textTransform: "none", fontWeight: 600 }}
          >
            {batchBusy === "images" ? "…" : desk.illGenerateAllImages}
          </Button>
        </Stack>
      </Box>

      <Stack spacing={3}>
        {pages.map((page) => (
          <PageCard
            key={page.pageNumber}
            storyId={storyId}
            page={page}
            readOnly={readOnly}
            currentVisualBibleVersion={visualBibleVersion}
            onGenerate={() => onGeneratePage(page.pageNumber)}
            onApprove={() => onApprovePage(page.pageNumber)}
            onReject={(note) => onRejectPage(page.pageNumber, note)}
            onRegenerateScenePlan={(feedbackNote) =>
              onRegenerateScenePlan(page.pageNumber, feedbackNote)
            }
          />
        ))}
      </Stack>

      <PublishBar
        pages={pages}
        readOnly={readOnly}
        allApproved={allApproved}
        canPreview={canPreview}
        showMarkReady={showMarkReady}
        showPublish={showPublish}
        onPreviewClick={onPreviewClick}
        onPublishClick={onPublishClick}
        onMarkReady={onMarkReady}
      />
    </Stack>
  );
}
