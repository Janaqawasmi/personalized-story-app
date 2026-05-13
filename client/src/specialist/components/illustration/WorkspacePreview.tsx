import { useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Snackbar from "@mui/material/Snackbar";
import type { IllustrationJob, VisualBibleArtefact } from "../../../types/illustration";
import type { Story } from "../../../types/story";
import type { PageCardViewModel } from "../../hooks/useIllustrationWorkspaceState";
import type { BookReaderModel } from "../../../components/book/BookReaderModel";
import { useIllustrationDevPanelsGate } from "../../hooks/useIsAdminOrDevPanelEnabled";
import PageCard from "./PageCard";
import VisualBibleCard from "./VisualBibleCard";
import ApprovalPreviewDialog from "./ApprovalPreviewDialog";
import PublishDialog from "./PublishDialog";

interface Props {
  story: Story;
  storyId: string;
  visualBibleVersion: number;
  visualBible: VisualBibleArtefact | null;
  visualBibleVersionsDesc: VisualBibleArtefact[];
  visualBibleRegenJob: IllustrationJob | null;
  pages: PageCardViewModel[];
  readOnly: boolean;
  allApproved: boolean;
  previewModel: BookReaderModel | null;
  onGeneratePage: (pageNumber: number) => Promise<void>;
  onApprovePage: (pageNumber: number) => Promise<void>;
  onRejectPage: (pageNumber: number, note: string) => Promise<void>;
  onRegenerateScenePlan: (pageNumber: number, feedbackNote?: string) => Promise<void>;
  onMarkReady: () => Promise<void>;
}

export default function WorkspacePreview({
  story,
  storyId,
  visualBibleVersion,
  visualBible,
  visualBibleVersionsDesc,
  visualBibleRegenJob,
  pages,
  readOnly,
  allApproved,
  previewModel,
  onGeneratePage,
  onApprovePage,
  onRejectPage,
  onRegenerateScenePlan,
  onMarkReady,
}: Props) {
  const { lang } = useParams<{ lang: string }>();
  const devGate = useIllustrationDevPanelsGate();
  const showDebugLink = devGate.ready && devGate.allowed;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [markBusy, setMarkBusy] = useState(false);
  const [markErr, setMarkErr] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const vbRegenBusy =
    visualBibleRegenJob !== null &&
    (visualBibleRegenJob.status === "pending" || visualBibleRegenJob.status === "running");

  const canPreview =
    !!previewModel &&
    (story.status === "illustration_ready" ||
      (story.status === "illustration_workspace" && allApproved));

  const showMarkReady =
    story.status === "illustration_workspace" && allApproved && !readOnly;
  const showPublish = story.status === "illustration_ready";
  const showPublishedBanner = story.status === "published";
  const publicCatalogUrl =
    lang && story.publishedTemplateId
      ? `/${lang}/stories/${encodeURIComponent(story.publishedTemplateId)}`
      : null;

  return (
    <Stack spacing={3}>
      {readOnly && story.status === "illustration_ready" ? (
        <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
          This story is marked ready to publish. Illustrations are locked.
        </Typography>
      ) : null}

      {showPublishedBanner ? (
        <Typography variant="body2" color="text.secondary">
          Published to the public library.
          {publicCatalogUrl ? (
            <>
              {" "}
              <RouterLink to={publicCatalogUrl}>View on public site</RouterLink>
            </>
          ) : null}
        </Typography>
      ) : null}

      <VisualBibleCard
        storyId={storyId}
        readOnly={readOnly || showPublishedBanner}
        currentVersion={visualBibleVersion}
        visualBible={visualBible}
        visualBibleVersionsDesc={visualBibleVersionsDesc}
        visualBibleRegenBusy={vbRegenBusy}
        visualBibleRegenJobId={visualBibleRegenJob?.id ?? null}
      />

      {showDebugLink && lang ? (
        <Typography variant="body2">
          <RouterLink to={`/${lang}/specialist/stories/${storyId}/illustration/debug`}>
            Open illustration debug table
          </RouterLink>
        </Typography>
      ) : null}

      <Typography variant="subtitle1" fontWeight={700} sx={{ pt: 1 }}>
        Pages
      </Typography>

      <Stack spacing={3}>
        {pages.map((page) => (
          <PageCard
            key={page.pageNumber}
            storyId={storyId}
            page={page}
            readOnly={readOnly || showPublishedBanner}
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

      <Box
        sx={{
          position: "sticky",
          bottom: 0,
          py: 2,
          mt: 2,
          borderTop: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
          {canPreview ? (
            <Button variant="outlined" onClick={() => setPreviewOpen(true)}>
              Preview as published book
            </Button>
          ) : null}
          {showMarkReady ? (
            <Button
              variant="contained"
              color="primary"
              disabled={markBusy}
              onClick={() => {
                setMarkErr(null);
                setConfirmOpen(true);
              }}
            >
              Mark as ready to publish
            </Button>
          ) : null}
          {showPublish ? (
            <Button variant="contained" color="primary" onClick={() => setPublishOpen(true)}>
              Publish to library
            </Button>
          ) : null}
          {markErr ? (
            <Typography variant="body2" color="error">
              {markErr}
            </Typography>
          ) : null}
        </Stack>
      </Box>

      <ApprovalPreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        model={previewModel}
      />

      <PublishDialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        story={story}
        onPublished={(templateId) => {
          setToast(`Published. Template id: ${templateId.slice(0, 8)}…`);
        }}
      />

      <Snackbar
        open={toast !== null}
        autoHideDuration={6000}
        onClose={() => setToast(null)}
        message={toast ?? ""}
      />

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Mark ready to publish?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            All {pages.length} pages are approved. Mark this story ready to publish?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={async () => {
              setMarkBusy(true);
              setMarkErr(null);
              try {
                await onMarkReady();
                setConfirmOpen(false);
              } catch (e) {
                setMarkErr(e instanceof Error ? e.message : String(e));
              } finally {
                setMarkBusy(false);
              }
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
