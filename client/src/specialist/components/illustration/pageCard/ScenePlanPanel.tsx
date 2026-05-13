import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MessageOutlinedIcon from "@mui/icons-material/MessageOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { ScenePlanArtefact } from "../../../../types/illustration";
import type { SpecialistDeskUi } from "../../../../i18n/specialistDeskUi.types";
import { DRAFT_B, FONTS } from "../../draftB/tokens";
import DetailTile from "./DetailTile";
import StaleBibleBanner from "./StaleBibleBanner";

type Desk = Pick<
  SpecialistDeskUi,
  | "illStaleBibleBanner"
  | "illStaleBibleAction"
  | "illSecAltPlan"
  | "illSecSuggestChange"
  | "illIntentLabel"
  | "illDetailLabel"
  | "headerCancel"
  | "illRejectFeedbackLabel"
  | "illScenePlanLoading"
  | "illScenePlanUpdating"
>;

interface Props {
  sp: ScenePlanArtefact | null;
  readOnly: boolean;
  scenePlanRegenBusy: boolean;
  visualBibleIsStale: boolean;
  desk: Desk;
  onRegenerateScenePlan: (feedbackNote?: string) => Promise<void>;
}

export default function ScenePlanPanel({
  sp,
  readOnly,
  scenePlanRegenBusy,
  visualBibleIsStale,
  desk,
  onRegenerateScenePlan,
}: Props) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const runRegen = async (feedbackNote?: string) => {
    setErr(null);
    setBusy(true);
    try {
      await onRegenerateScenePlan(feedbackNote);
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
        <Skeleton variant="rounded" height={120} sx={{ borderRadius: 2 }} />
        <Typography variant="body2" sx={{ color: DRAFT_B.inkMuted, fontFamily: FONTS.sans }}>
          {desk.illScenePlanUpdating}
        </Typography>
      </Stack>
    );
  }

  if (!sp) {
    return (
      <Typography variant="body2" sx={{ color: DRAFT_B.inkMuted, fontFamily: FONTS.sans }}>
        {desk.illScenePlanLoading}
      </Typography>
    );
  }

  const regenDisabled = readOnly || busy;

  return (
    <Stack spacing={1.5}>
      {visualBibleIsStale && !readOnly ? (
        <StaleBibleBanner
          message={desk.illStaleBibleBanner}
          actionLabel={desk.illStaleBibleAction}
          disabled={busy || scenePlanRegenBusy}
          onAction={() => void runRegen(undefined)}
        />
      ) : null}

      <Typography
        variant="body2"
        component="p"
        sx={{
          m: 0,
          whiteSpace: "pre-wrap",
          color: DRAFT_B.ink,
          fontSize: "14.5px",
          lineHeight: 1.7,
          fontFamily: FONTS.sans,
        }}
      >
        {sp.prose}
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: 1.5,
        }}
      >
        <DetailTile accent="secondary" label={desk.illIntentLabel}>
          {sp.emotionalIntent}
        </DetailTile>
        <DetailTile accent="warning" label={desk.illDetailLabel}>
          {sp.keyVisibleDetail}
        </DetailTile>
      </Box>

      {err ? (
        <Typography variant="body2" sx={{ color: "error.main" }}>
          {err}
        </Typography>
      ) : null}

      {!readOnly ? (
        <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
          <Button
            size="small"
            variant="text"
            startIcon={<RefreshIcon />}
            disabled={regenDisabled}
            onClick={() => void runRegen(undefined)}
            sx={{ color: DRAFT_B.inkSoft, textTransform: "none", fontWeight: 600 }}
          >
            {desk.illSecAltPlan}
          </Button>
          <Button
            size="small"
            variant="text"
            startIcon={<MessageOutlinedIcon />}
            disabled={regenDisabled}
            onClick={() => setNoteOpen(true)}
            sx={{ color: DRAFT_B.inkSoft, textTransform: "none", fontWeight: 600 }}
          >
            {desk.illSecSuggestChange}
          </Button>
        </Stack>
      ) : null}

      <Dialog open={noteOpen} onClose={() => setNoteOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{desk.illSecSuggestChange}</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label={desk.illRejectFeedbackLabel}
            fullWidth
            multiline
            minRows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteOpen(false)}>{desk.headerCancel}</Button>
          <Button variant="contained" disabled={busy} onClick={() => void runRegen(note.trim())}>
            {desk.illSecSuggestChange}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
