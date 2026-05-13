import { useState, useEffect } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { publishStoryToLibrary, type PublishStoryRequestBody } from "../../../api/illustrationApi";
import type { Story } from "../../../types/story";

interface Props {
  open: boolean;
  onClose: () => void;
  story: Story;
  onPublished: (templateId: string) => void;
}

export default function PublishDialog({ open, onClose, story, onPublished }: Props) {
  const creativeHe = story.brief.section2?.creativeVision?.trim() ?? "";
  const [he, setHe] = useState("");
  const [ar, setAr] = useState("");
  const [topicHe, setTopicHe] = useState("");
  const [topicAr, setTopicAr] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const fallback = creativeHe || story.title;
    setHe(fallback);
    setAr(fallback);
    setTopicHe("");
    setTopicAr("");
    setErr(null);
  }, [open, creativeHe, story.title]);

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} fullWidth maxWidth="md">
      <DialogTitle>Publish to library</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Customer-facing copy for the public catalog. Hebrew and Arabic fields are optional; empty
          values fall back to the brief.
        </Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <Stack spacing={2} flex={1}>
            <Typography variant="subtitle2">Hebrew</Typography>
            <TextField
              label="Short description"
              value={he}
              onChange={(e) => setHe(e.target.value)}
              multiline
              minRows={3}
              fullWidth
            />
            <TextField
              label="Display topic"
              value={topicHe}
              onChange={(e) => setTopicHe(e.target.value)}
              fullWidth
            />
          </Stack>
          <Stack spacing={2} flex={1}>
            <Typography variant="subtitle2">Arabic</Typography>
            <TextField
              label="Short description"
              value={ar}
              onChange={(e) => setAr(e.target.value)}
              multiline
              minRows={3}
              fullWidth
            />
            <TextField
              label="Display topic"
              value={topicAr}
              onChange={(e) => setTopicAr(e.target.value)}
              fullWidth
            />
          </Stack>
        </Stack>
        {err ? (
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            {err}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setErr(null);
            const body: PublishStoryRequestBody = {
              shortDescriptionHe: he.trim() || undefined,
              shortDescriptionAr: ar.trim() || undefined,
              displayTopicHe: topicHe.trim() || undefined,
              displayTopicAr: topicAr.trim() || undefined,
            };
            try {
              const { templateId } = await publishStoryToLibrary(story.id, body);
              onPublished(templateId);
              onClose();
            } catch (e) {
              setErr(e instanceof Error ? e.message : String(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Publishing…" : "Publish"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
