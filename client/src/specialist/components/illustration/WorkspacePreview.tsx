import { useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Snackbar from "@mui/material/Snackbar";
import type { IllustrationJob, VisualBibleArtefact } from "../../../types/illustration";
import type { Story } from "../../../types/story";
import type { PageCardViewModel } from "../../hooks/useIllustrationWorkspaceState";
import type { BookReaderModel } from "../../../components/book/BookReaderModel";
import { useIllustrationDevPanelsGate } from "../../hooks/useIsAdminOrDevPanelEnabled";
import ApprovalPreviewDialog from "./ApprovalPreviewDialog";
import PublishDialog from "./PublishDialog";
import GalleryPanel from "./panels/GalleryPanel";
import WorkspacePanel from "./WorkspacePanel";

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
  onRegenerateAllScenePlans: () => Promise<void>;
  onGenerateAllPageImages: () => Promise<void>;
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
  onRegenerateAllScenePlans,
  onGenerateAllPageImages,
  onMarkReady,
}: Props) {
  const { lang } = useParams<{ lang: string }>();
  const devGate = useIllustrationDevPanelsGate();
  const showDebugLink = devGate.ready && devGate.allowed;
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const canPreview = !!previewModel;
  const previewVariant =
    allApproved || story.status === "published" || story.status === "illustration_ready"
      ? ("final" as const)
      : previewModel && previewModel.pages.some((p) => p.imageUrl)
        ? ("work_in_progress" as const)
        : ("manuscript_only" as const);

  const showMarkReady =
    story.status === "illustration_workspace" && allApproved && !readOnly;
  const showPublish = story.status === "illustration_ready";
  const showPublishedBanner = story.status === "published";
  const publicCatalogUrl =
    lang && story.publishedTemplateId
      ? `/${lang}/stories/${encodeURIComponent(story.publishedTemplateId)}`
      : null;

  const panelReadOnly = readOnly || showPublishedBanner;

  const showGalleryHero =
    story.status === "illustration_ready" || story.status === "published";

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

      {showDebugLink && lang ? (
        <Typography variant="body2">
          <RouterLink to={`/${lang}/specialist/stories/${storyId}/illustration/debug`}>
            Open illustration debug table
          </RouterLink>
        </Typography>
      ) : null}

      {showGalleryHero && lang ? (
        <GalleryPanel
          published={story.status === "published"}
          storyTitle={story.title?.trim() ?? ""}
          storyId={storyId}
          lang={lang}
          pages={pages}
          canPreview={canPreview}
          onPreviewClick={() => setPreviewOpen(true)}
          onPublishClick={() => setPublishOpen(true)}
        />
      ) : null}

      <WorkspacePanel
        storyId={storyId}
        visualBibleVersion={visualBibleVersion}
        visualBible={visualBible}
        visualBibleVersionsDesc={visualBibleVersionsDesc}
        visualBibleRegenJob={visualBibleRegenJob}
        pages={pages}
        readOnly={panelReadOnly}
        allApproved={allApproved}
        canPreview={canPreview}
        showMarkReady={showMarkReady}
        showPublish={showPublish}
        onGeneratePage={onGeneratePage}
        onApprovePage={onApprovePage}
        onRejectPage={onRejectPage}
        onRegenerateScenePlan={onRegenerateScenePlan}
        onRegenerateAllScenePlans={onRegenerateAllScenePlans}
        onGenerateAllPageImages={onGenerateAllPageImages}
        onMarkReady={onMarkReady}
        onPreviewClick={() => setPreviewOpen(true)}
        onPublishClick={() => setPublishOpen(true)}
      />

      <ApprovalPreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        model={previewModel}
        variant={previewVariant}
        onPublishFromPreview={
          showPublish
            ? () => {
                setPreviewOpen(false);
                setPublishOpen(true);
              }
            : undefined
        }
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
    </Stack>
  );
}
