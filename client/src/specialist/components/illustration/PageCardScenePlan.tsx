import { useEffect, useState } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Popover from "@mui/material/Popover";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebase";
import type { ScenePlanArtefact } from "../../../types/illustration";
import { STORIES_COLLECTION } from "../../../types/story";

const SUB = "scenePlans";

interface Props {
  storyId: string;
  pageNumber: number;
  scenePlanVersion: number;
  readOnly: boolean;
  scenePlanRegenBusy: boolean;
  onRegenerateScenePlan: (feedbackNote?: string) => Promise<void>;
}

export default function PageCardScenePlan({
  storyId,
  pageNumber,
  scenePlanVersion,
  readOnly,
  scenePlanRegenBusy,
  onRegenerateScenePlan,
}: Props) {
  const [sp, setSp] = useState<ScenePlanArtefact | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const popoverOpen = Boolean(anchor);

  useEffect(() => {
    const ref = doc(db, STORIES_COLLECTION, storyId, SUB, `${pageNumber}-${scenePlanVersion}`);
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setSp(snap.data() as ScenePlanArtefact);
      }
    });
  }, [storyId, pageNumber, scenePlanVersion]);

  const runRegen = async (feedbackNote?: string) => {
    setErr(null);
    setBusy(true);
    try {
      await onRegenerateScenePlan(feedbackNote);
      setAnchor(null);
      setNoteOpen(false);
      setNote("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (scenePlanRegenBusy) {
    return (
      <Stack spacing={1}>
        <Typography variant="subtitle2" fontWeight={700}>
          Scene plan
        </Typography>
        <Skeleton variant="rounded" height={120} />
        <Typography variant="body2" color="text.secondary">
          Updating scene plan…
        </Typography>
      </Stack>
    );
  }

  if (!sp) {
    return (
      <Typography variant="body2" color="text.secondary">
        Loading scene plan…
      </Typography>
    );
  }

  const regenDisabled = readOnly || busy;

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" fontWeight={700}>
        Scene plan
      </Typography>
      <Typography variant="subtitle1" fontWeight={600}>
        {sp.title}
      </Typography>
      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
        {sp.prose}
      </Typography>
      <Typography variant="body2">
        <strong>Emotional intent:</strong> {sp.emotionalIntent}
      </Typography>
      <Typography variant="body2">
        <strong>Key visible detail:</strong> {sp.keyVisibleDetail}
      </Typography>
      {err ? (
        <Typography variant="body2" color="error">
          {err}
        </Typography>
      ) : null}
      {!readOnly ? (
        <Box>
          <Button
            size="small"
            variant="outlined"
            disabled={regenDisabled}
            onClick={(e) => setAnchor(e.currentTarget)}
          >
            Regenerate scene plan
          </Button>
          <Popover
            open={popoverOpen}
            anchorEl={anchor}
            onClose={() => setAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          >
            <Stack spacing={1} sx={{ p: 2, minWidth: 220 }}>
              <Button
                size="small"
                variant="contained"
                disabled={busy}
                onClick={() => runRegen(undefined)}
              >
                Regenerate
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={busy}
                onClick={() => {
                  setAnchor(null);
                  setNoteOpen(true);
                }}
              >
                Regenerate with note…
              </Button>
            </Stack>
          </Popover>
          <Dialog open={noteOpen} onClose={() => setNoteOpen(false)} fullWidth maxWidth="sm">
            <DialogTitle>Regenerate with feedback</DialogTitle>
            <DialogContent>
              <TextField
                margin="dense"
                label="Feedback note"
                fullWidth
                multiline
                minRows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setNoteOpen(false)}>Cancel</Button>
              <Button
                variant="contained"
                disabled={busy}
                onClick={() => runRegen(note.trim())}
              >
                Regenerate
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      ) : null}
      <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: "divider" }}>
        <AccordionSummary>
          <Typography variant="caption" color="text.secondary">
            Developer view
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1}>
            <Typography variant="caption" component="pre" sx={{ whiteSpace: "pre-wrap" }}>
              {JSON.stringify(sp.director, null, 2)}
            </Typography>
            {sp.structuredPrompt ? (
              <Typography variant="caption" component="pre" sx={{ whiteSpace: "pre-wrap" }}>
                {JSON.stringify(sp.structuredPrompt, null, 2)}
              </Typography>
            ) : (
              <Typography variant="caption" color="text.secondary">
                Structured prompt not generated yet.
              </Typography>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Stack>
  );
}
