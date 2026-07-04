import { useState, useEffect } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { publishStoryToLibrary, type PublishStoryRequestBody } from "../../../api/illustrationApi";
import { fetchSituationsByTopic } from "../../../api/referenceData";
import type { Story } from "../../../types/story";

interface Props {
  open: boolean;
  onClose: () => void;
  story: Story;
  onPublished: (templateId: string) => void;
}

interface SituationOption {
  id: string;
  label_he?: string;
  label_ar?: string;
  label_en?: string;
}

const OTHER_VALUE = "__other__";

export default function PublishDialog({ open, onClose, story, onPublished }: Props) {
  const creativeHe = story.brief.section2?.creativeVision?.trim() ?? "";
  const [he, setHe] = useState("");
  const [ar, setAr] = useState("");
  const [topicHe, setTopicHe] = useState("");
  const [topicAr, setTopicAr] = useState("");

  const [situations, setSituations] = useState<SituationOption[]>([]);
  const [situationsLoading, setSituationsLoading] = useState(false);
  const [selectedSituationId, setSelectedSituationId] = useState("");
  const [proposalLabelHe, setProposalLabelHe] = useState("");
  const [proposalLabelAr, setProposalLabelAr] = useState("");
  const [proposalLabelEn, setProposalLabelEn] = useState("");
  const [proposalReason, setProposalReason] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const fallback = creativeHe || story.title;
    setHe(fallback);
    setAr(fallback);
    setTopicHe("");
    setTopicAr("");
    setSelectedSituationId("");
    setProposalLabelHe("");
    setProposalLabelAr("");
    setProposalLabelEn("");
    setProposalReason("");
    setErr(null);

    setSituationsLoading(true);
    fetchSituationsByTopic(story.storyType)
      .then((items) => setSituations(items as SituationOption[]))
      .catch(() => setSituations([]))
      .finally(() => setSituationsLoading(false));
  }, [open, creativeHe, story.title, story.storyType]);

  const isOther = selectedSituationId === OTHER_VALUE;
  const hasProposalLabel = Boolean(
    proposalLabelHe.trim() || proposalLabelAr.trim() || proposalLabelEn.trim(),
  );
  const canPublish =
    (selectedSituationId !== "" && !isOther) || (isOther && hasProposalLabel);

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

        <Typography variant="subtitle2" sx={{ mt: 3 }}>
          Situation
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          This is what the public catalog filters and searches by — it must be a known situation, not
          the free-text clinical trigger. Required to publish.
        </Typography>
        <TextField
          select
          label="Situation"
          value={selectedSituationId}
          onChange={(e) => setSelectedSituationId(e.target.value)}
          fullWidth
          disabled={situationsLoading}
          helperText={situationsLoading ? "Loading situations…" : undefined}
        >
          {situations.map((s) => (
            <MenuItem key={s.id} value={s.id}>
              {s.label_he || s.label_en || s.label_ar || s.id}
            </MenuItem>
          ))}
          <MenuItem value={OTHER_VALUE}>Other — request new situation</MenuItem>
        </TextField>

        {isOther ? (
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              No existing situation fits. Enter at least one label — this will be saved as a pending
              request for admin/clinical-manager review, not published as the situation itself.
            </Typography>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Label (Hebrew)"
                value={proposalLabelHe}
                onChange={(e) => setProposalLabelHe(e.target.value)}
                fullWidth
              />
              <TextField
                label="Label (Arabic)"
                value={proposalLabelAr}
                onChange={(e) => setProposalLabelAr(e.target.value)}
                fullWidth
              />
              <TextField
                label="Label (English)"
                value={proposalLabelEn}
                onChange={(e) => setProposalLabelEn(e.target.value)}
                fullWidth
              />
            </Stack>
            <TextField
              label="Reason (optional)"
              value={proposalReason}
              onChange={(e) => setProposalReason(e.target.value)}
              multiline
              minRows={2}
              fullWidth
            />
          </Stack>
        ) : null}

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
          disabled={busy || !canPublish}
          onClick={async () => {
            setBusy(true);
            setErr(null);
            const body: PublishStoryRequestBody = {
              shortDescriptionHe: he.trim() || undefined,
              shortDescriptionAr: ar.trim() || undefined,
              displayTopicHe: topicHe.trim() || undefined,
              displayTopicAr: topicAr.trim() || undefined,
              ...(isOther
                ? {
                    situationProposal: {
                      labelHe: proposalLabelHe.trim() || undefined,
                      labelAr: proposalLabelAr.trim() || undefined,
                      labelEn: proposalLabelEn.trim() || undefined,
                      reason: proposalReason.trim() || undefined,
                    },
                  }
                : { situationId: selectedSituationId }),
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
