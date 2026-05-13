import { useCallback, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  approvePageImage,
  generatePageImage,
  markIllustrationReadyToPublish,
  openIllustrationWorkspace,
  regenerateScenePlan,
  rejectPageImage,
} from "../../../api/illustrationApi";
import type { Story } from "../../../types/story";
import { useSpecialistDeskUi } from "../../../i18n/specialistDeskUi";
import { useIllustrationWorkspaceState } from "../../hooks/useIllustrationWorkspaceState";
import LoadingPanel from "./LoadingPanel";
import CtaPanel from "./panels/CtaPanel";
import PendingPanel from "./panels/PendingPanel";
import WorkspacePreview from "./WorkspacePreview";
import CancelJobButton from "./CancelJobButton";

interface Props {
  story: Story;
}

export default function IllustrationsTabV2({ story }: Props) {
  const desk = useSpecialistDeskUi();
  const vm = useIllustrationWorkspaceState(story.id);
  const [actionError, setActionError] = useState<string | null>(null);

  const runOpen = useCallback(async () => {
    setActionError(null);
    try {
      await openIllustrationWorkspace(story.id);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
  }, [story.id]);

  const handleGeneratePage = useCallback(
    async (pageNumber: number) => {
      setActionError(null);
      try {
        await generatePageImage(story.id, pageNumber);
      } catch (e) {
        setActionError(e instanceof Error ? e.message : String(e));
      }
    },
    [story.id],
  );

  const handleApprovePage = useCallback(
    async (pageNumber: number) => {
      setActionError(null);
      try {
        await approvePageImage(story.id, pageNumber);
      } catch (e) {
        setActionError(e instanceof Error ? e.message : String(e));
      }
    },
    [story.id],
  );

  const handleRegenerateScenePlan = useCallback(
    async (pageNumber: number, feedbackNote?: string) => {
      setActionError(null);
      try {
        await regenerateScenePlan(story.id, pageNumber, feedbackNote);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setActionError(msg);
        throw e;
      }
    },
    [story.id],
  );

  const handleRejectPage = useCallback(
    async (pageNumber: number, note: string) => {
      setActionError(null);
      try {
        await rejectPageImage(story.id, pageNumber, note);
      } catch (e) {
        setActionError(e instanceof Error ? e.message : String(e));
      }
    },
    [story.id],
  );

  const handleMarkReady = useCallback(async () => {
    await markIllustrationReadyToPublish(story.id);
  }, [story.id]);

  const handleRegenerateAllScenePlans = useCallback(async () => {
    if (vm.kind !== "ready") return;
    setActionError(null);
    try {
      for (const p of vm.pages) {
        await regenerateScenePlan(story.id, p.pageNumber);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setActionError(msg);
      throw e;
    }
  }, [story.id, vm]);

  const handleGenerateAllPageImages = useCallback(async () => {
    if (vm.kind !== "ready") return;
    setActionError(null);
    const targets = vm.pages.filter(
      (p) =>
        p.subStatus === "plan_only" ||
        p.subStatus === "needs_revision" ||
        p.subStatus === "awaiting_review",
    );
    try {
      for (const p of targets) {
        await generatePageImage(story.id, p.pageNumber);
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
      throw e;
    }
  }, [story.id, vm]);

  if (
    story.status !== "approved" &&
    story.status !== "illustration_workspace" &&
    story.status !== "illustration_ready" &&
    story.status !== "published"
  ) {
    return (
      <Box sx={{ px: { xs: 2, sm: 3, md: 5 }, pt: 4, pb: 8 }}>
        <Typography variant="body2" color="text.secondary">
          Open this tab when the story is approved to start illustrations.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 2, sm: 3, md: 5 }, pt: 4, pb: 8 }}>
      <Stack spacing={3}>
        {actionError ? (
          <Typography variant="body2" color="error">
            {actionError}
          </Typography>
        ) : null}

        {vm.kind === "loading" ? (
          <LoadingPanel message={desk.workspaceStillLoading} />
        ) : null}

        {vm.kind === "illustration_metadata_incomplete" ? (
          <Alert severity="warning">{desk.illustrationsTabIncompleteMetadata}</Alert>
        ) : null}

        {vm.kind === "cta" ? (
          <CtaPanel
            pageCount={story.pages?.length ?? 0}
            disabled={false}
            onOpen={() => void runOpen()}
          />
        ) : null}

        {vm.kind === "pending" ? (
          <Stack spacing={1}>
            <PendingPanel variant="pending" />
            <CancelJobButton storyId={story.id} jobId={vm.jobId} />
          </Stack>
        ) : null}

        {vm.kind === "running" ? (
          <Stack spacing={1}>
            <PendingPanel variant="running" progressHint={vm.progressHint} />
            <CancelJobButton storyId={story.id} jobId={vm.jobId} />
          </Stack>
        ) : null}

        {vm.kind === "failed" ? (
          <PendingPanel variant="failed" error={vm.error} onRetry={() => void runOpen()} />
        ) : null}

        {vm.kind === "ready" ? (
          <WorkspacePreview
            story={story}
            storyId={story.id}
            visualBibleVersion={vm.visualBibleVersion}
            visualBible={vm.visualBible}
            visualBibleVersionsDesc={vm.visualBibleVersionsDesc}
            visualBibleRegenJob={vm.visualBibleRegenJob}
            pages={vm.pages}
            readOnly={vm.readOnly}
            allApproved={vm.allApproved}
            previewModel={vm.previewModel}
            onGeneratePage={handleGeneratePage}
            onApprovePage={handleApprovePage}
            onRejectPage={handleRejectPage}
            onRegenerateScenePlan={handleRegenerateScenePlan}
            onRegenerateAllScenePlans={handleRegenerateAllScenePlans}
            onGenerateAllPageImages={handleGenerateAllPageImages}
            onMarkReady={handleMarkReady}
          />
        ) : null}
      </Stack>
    </Box>
  );
}
