import { useCallback, useState } from "react";
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
import { useIllustrationWorkspaceState } from "../../hooks/useIllustrationWorkspaceState";
import ErrorPanel from "./ErrorPanel";
import LoadingPanel from "./LoadingPanel";
import PanelACta from "./PanelACta";
import WorkspacePreview from "./WorkspacePreview";
import CancelJobButton from "./CancelJobButton";

interface Props {
  story: Story;
}

export default function IllustrationsTabV2({ story }: Props) {
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
          <LoadingPanel message="Loading…" />
        ) : null}

        {vm.kind === "cta" ? (
          <PanelACta disabled={false} onOpen={runOpen} />
        ) : null}

        {vm.kind === "pending" ? (
          <Stack spacing={1}>
            <LoadingPanel message="Queued — starting illustration workspace…" />
            <CancelJobButton storyId={story.id} jobId={vm.jobId} />
          </Stack>
        ) : null}

        {vm.kind === "running" ? (
          <Stack spacing={1}>
            <LoadingPanel
              message={vm.progressHint ?? "Generating illustration workspace…"}
            />
            <CancelJobButton storyId={story.id} jobId={vm.jobId} />
          </Stack>
        ) : null}

        {vm.kind === "failed" ? (
          <ErrorPanel error={vm.error} onRetry={runOpen} />
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
            onMarkReady={handleMarkReady}
          />
        ) : null}
      </Stack>
    </Box>
  );
}
