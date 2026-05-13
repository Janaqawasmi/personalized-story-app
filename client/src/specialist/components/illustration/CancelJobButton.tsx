import { useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { cancelIllustrationJob } from "../../../api/illustrationApi";

interface Props {
  storyId: string;
  jobId: string;
  label?: string;
}

export default function CancelJobButton({ storyId, jobId, label = "Cancel" }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <>
      <Button size="small" color="inherit" variant="outlined" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Dialog open={open} onClose={() => !busy && setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Cancel job?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Cancel illustration generation? Work in progress may still finish on the server; the
            result will be discarded and the page will return to plan-only when cancellation is
            observed.
          </Typography>
          {err ? (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              {err}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={busy}>
            Back
          </Button>
          <Button
            color="warning"
            variant="contained"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setErr(null);
              try {
                await cancelIllustrationJob(storyId, jobId);
                setOpen(false);
              } catch (e) {
                setErr(e instanceof Error ? e.message : String(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Cancelling…" : "Confirm cancel"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
