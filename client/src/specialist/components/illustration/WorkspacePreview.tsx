import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { PageCardViewModel } from "../../hooks/useIllustrationWorkspaceState";
import PageCard from "./PageCard";
import VisualBibleCard from "./VisualBibleCard";

interface Props {
  storyId: string;
  visualBibleVersion: number;
  pages: PageCardViewModel[];
  readOnly: boolean;
  allApproved: boolean;
  onGeneratePage: (pageNumber: number) => Promise<void>;
  onApprovePage: (pageNumber: number) => Promise<void>;
  onRejectPage: (pageNumber: number, note: string) => Promise<void>;
  onRegenerateScenePlan: (pageNumber: number, feedbackNote?: string) => Promise<void>;
  onMarkReady: () => Promise<void>;
}

export default function WorkspacePreview({
  storyId,
  visualBibleVersion,
  pages,
  readOnly,
  allApproved,
  onGeneratePage,
  onApprovePage,
  onRejectPage,
  onRegenerateScenePlan,
  onMarkReady,
}: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [markBusy, setMarkBusy] = useState(false);
  const [markErr, setMarkErr] = useState<string | null>(null);

  return (
    <Stack spacing={3}>
      {readOnly ? (
        <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
          This story is marked ready to publish. Illustrations are locked.
        </Typography>
      ) : null}

      <VisualBibleCard storyId={storyId} version={visualBibleVersion} />

      <Typography variant="subtitle1" fontWeight={700} sx={{ pt: 1 }}>
        Pages
      </Typography>

      <Stack spacing={3}>
        {pages.map((page) => (
          <PageCard
            key={page.pageNumber}
            storyId={storyId}
            page={page}
            readOnly={readOnly}
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
          <Button
            variant="contained"
            color="primary"
            disabled={readOnly || !allApproved || markBusy}
            onClick={() => {
              setMarkErr(null);
              setConfirmOpen(true);
            }}
          >
            Mark as ready to publish
          </Button>
          {markErr ? (
            <Typography variant="body2" color="error">
              {markErr}
            </Typography>
          ) : null}
        </Stack>
      </Box>

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
