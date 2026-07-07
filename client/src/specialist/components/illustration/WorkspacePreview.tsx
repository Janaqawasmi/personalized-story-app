import { useState } from "react";
import { useParams } from "react-router-dom";
import Stack from "@mui/material/Stack";
import Snackbar from "@mui/material/Snackbar";
import type { IllustrationJob, VisualBibleArtefact } from "../../../types/illustration";
import type { Story, StoryStatus } from "../../../types/story";
import type { PageCardViewModel } from "../../hooks/useIllustrationWorkspaceState";
import type { BookReaderModel } from "../../../components/book/BookReaderModel";
import ApprovalPreviewDialog from "./ApprovalPreviewDialog";
import IllustrationProgressHeader from "./IllustrationProgressHeader";
import PublishDialog from "./PublishDialog";
import ApprovedIllustrationsGrid from "./panels/ApprovedIllustrationsGrid";
import WorkspacePanel from "./WorkspacePanel";

interface Props {
  story: Story;
  storyId: string;
  /** Live status from the Firestore-subscribed hook — use for all CTA/banner
   *  visibility instead of `story.status`, which is a one-shot REST snapshot
   *  that never refreshes after illustration/publish mutations. */
  liveStatus: StoryStatus;
  /** Live `publishedTemplateId`, paired with `liveStatus`. */
  livePublishedTemplateId: string | null;
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
  liveStatus,
  livePublishedTemplateId,
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const canPreview = !!previewModel;
  const previewVariant =
    allApproved || liveStatus === "published" || liveStatus === "illustration_ready"
      ? ("final" as const)
      : previewModel && previewModel.pages.some((p) => p.imageUrl)
        ? ("work_in_progress" as const)
        : ("manuscript_only" as const);

  const showMarkReady =
    liveStatus === "illustration_workspace" && allApproved && !readOnly;
  const showPublish = liveStatus === "illustration_ready";
  const isPublished = liveStatus === "published";
  const publicCatalogUrl =
    lang && livePublishedTemplateId
      ? `/${lang}/stories/${encodeURIComponent(livePublishedTemplateId)}`
      : null;
  const reopenHref = lang ? `/${lang}/specialist/stories/${storyId}/story` : null;

  const panelReadOnly = readOnly || isPublished;

  // Both "illustration_ready" and "published" are handled entirely by
  // IllustrationProgressHeader (single status/action card) + the approved
  // grid directly below — no separate banner or hero card repeats the same
  // readiness/published message.
  const showApprovedGrid = liveStatus === "illustration_ready" || isPublished;

  const approvedPageCount = pages.filter((p) => p.subStatus === "approved").length;

  return (
    <Stack spacing={3}>
      <IllustrationProgressHeader
        approvedCount={approvedPageCount}
        totalCount={pages.length}
        liveStatus={liveStatus}
        canPreview={canPreview}
        showPublish={showPublish}
        onPreviewClick={() => setPreviewOpen(true)}
        onPublishClick={() => setPublishOpen(true)}
        publicCatalogUrl={publicCatalogUrl}
        reopenHref={reopenHref}
      />

      {showApprovedGrid ? <ApprovedIllustrationsGrid pages={pages} /> : null}

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
        onPublished={() => {
          setToast("Story published to catalog.");
        }}
      />

      <Snackbar
        open={toast !== null}
        autoHideDuration={8000}
        onClose={() => setToast(null)}
        message={toast ?? ""}
      />
    </Stack>
  );
}
