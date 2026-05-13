import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { PageCardViewModel } from "../../hooks/useIllustrationWorkspaceState";

interface Props {
  page: PageCardViewModel;
  readOnly: boolean;
  activeImageJobHint?: string;
  onGenerate: () => void | Promise<void>;
  onApprove: () => void | Promise<void>;
  onReject: (feedbackNote: string) => void | Promise<void>;
}

export default function PageCardImage({
  page,
  readOnly,
  activeImageJobHint,
  onGenerate,
  onApprove,
  onReject,
}: Props) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [busy, setBusy] = useState(false);

  const disabled = readOnly || busy;

  if (page.subStatus === "generating_image") {
    return (
      <Stack direction="row" spacing={2} alignItems="center" sx={{ py: 2 }}>
        <CircularProgress size={28} />
        <Typography variant="body2" color="text.secondary">
          {activeImageJobHint ?? "Generating illustration…"}
        </Typography>
      </Stack>
    );
  }

  if (page.subStatus === "awaiting_review" && page.imageUrl) {
    return (
      <Stack spacing={2} sx={{ py: 1 }}>
        <Box
          component="img"
          src={page.imageUrl}
          alt={`Page ${page.pageNumber} illustration`}
          sx={{ maxWidth: "100%", borderRadius: 1, border: 1, borderColor: "divider" }}
        />
        {!readOnly ? (
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              color="success"
              disabled={disabled}
              onClick={async () => {
                setBusy(true);
                try {
                  await onApprove();
                } finally {
                  setBusy(false);
                }
              }}
            >
              Approve
            </Button>
            <Button
              variant="outlined"
              color="warning"
              disabled={disabled}
              onClick={() => setRejectOpen(true)}
            >
              Reject
            </Button>
          </Stack>
        ) : null}
        <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Reject illustration</DialogTitle>
          <DialogContent>
            <TextField
              margin="dense"
              label="Feedback note (optional)"
              fullWidth
              multiline
              minRows={2}
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                setBusy(true);
                try {
                  await onReject(rejectNote.trim());
                  setRejectOpen(false);
                  setRejectNote("");
                } finally {
                  setBusy(false);
                }
              }}
              color="warning"
              variant="contained"
            >
              Reject
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    );
  }

  if (page.subStatus === "approved" && page.imageUrl) {
    return (
      <Stack spacing={1} sx={{ py: 1 }}>
        <Box
          component="img"
          src={page.imageUrl}
          alt={`Page ${page.pageNumber} approved`}
          sx={{ maxWidth: "100%", borderRadius: 1, border: 1, borderColor: "divider" }}
        />
        <Typography variant="body2" color="success.main">
          Approved
          {page.imageVersion !== null ? ` · v${page.imageVersion}` : ""}
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={1} sx={{ py: 1 }}>
      {page.rejectionNote ? (
        <Typography variant="body2" color="text.secondary">
          <strong>Previous note:</strong> {page.rejectionNote}
        </Typography>
      ) : null}
      {page.lastError ? (
        <Typography variant="body2" color="error">
          {page.lastError}
        </Typography>
      ) : null}
      <Box
        sx={{
          minHeight: 160,
          borderRadius: 1,
          border: 1,
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "action.hover",
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No illustration yet
        </Typography>
      </Box>
      {!readOnly ? (
        <Button
          variant="contained"
          disabled={disabled}
          onClick={async () => {
            setBusy(true);
            try {
              await Promise.resolve(onGenerate());
            } finally {
              setBusy(false);
            }
          }}
        >
          Generate
        </Button>
      ) : null}
    </Stack>
  );
}
