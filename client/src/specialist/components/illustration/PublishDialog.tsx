import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import { publishStoryToLibrary, type PublishStoryRequestBody } from "../../../api/illustrationApi";
import { fetchSituationsByTopic } from "../../../api/referenceData";
import type { Story } from "../../../types/story";
import { useSpecialistDeskUi } from "../../../i18n/specialistDeskUi";
import { useLanguage } from "../../../i18n/context/useLanguage";
import { COLORS } from "../../../theme";
import { DRAFT_B, FONTS } from "../draftB/tokens";

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

type LangKey = "he" | "ar" | "en";
const LANG_ORDER: LangKey[] = ["he", "ar", "en"];

/** Prefers the currently active dashboard language, not a fixed language. */
function pickSituationLabel(s: SituationOption, lang: LangKey): string {
  const byLang: Record<LangKey, string | undefined> = { he: s.label_he, ar: s.label_ar, en: s.label_en };
  return byLang[lang] || s.label_he || s.label_en || s.label_ar || s.id;
}

export default function PublishDialog({ open, onClose, story, onPublished }: Props) {
  const desk = useSpecialistDeskUi();
  const { language } = useLanguage();
  const LANG_LABEL = desk.illPubFormLanguageNames;

  const [activeLang, setActiveLang] = useState<LangKey>(language);
  const [he, setHe] = useState("");
  const [ar, setAr] = useState("");
  const [en, setEn] = useState("");

  const [situations, setSituations] = useState<SituationOption[]>([]);
  const [situationsLoading, setSituationsLoading] = useState(false);
  const [selectedSituationId, setSelectedSituationId] = useState("");
  const [proposalLabelHe, setProposalLabelHe] = useState("");
  const [proposalLabelAr, setProposalLabelAr] = useState("");
  const [proposalLabelEn, setProposalLabelEn] = useState("");
  const [proposalReason, setProposalReason] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const valuesByLang: Record<LangKey, { value: string; setValue: (v: string) => void }> = {
    he: { value: he, setValue: setHe },
    ar: { value: ar, setValue: setAr },
    en: { value: en, setValue: setEn },
  };

  useEffect(() => {
    if (!open) return;
    // No auto-fill: every language starts blank — the specialist writes each
    // description explicitly rather than reviewing text the system guessed.
    setHe("");
    setAr("");
    setEn("");
    setActiveLang(language);
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
  }, [open, story.storyType, language]);

  const isOther = selectedSituationId === OTHER_VALUE;
  const hasProposalLabel = Boolean(
    proposalLabelHe.trim() || proposalLabelAr.trim() || proposalLabelEn.trim(),
  );
  const situationChosen = selectedSituationId !== "";

  const missingRequirement: string | null = !situationChosen
    ? desk.illPubFormSituationLabel
    : isOther && !hasProposalLabel
      ? desk.illPubFormSituationLabel
      : null;
  const canPublish = missingRequirement === null;

  const anyDescriptionFilled = LANG_ORDER.some((l) => valuesByLang[l].value.trim() !== "");

  async function handlePublish() {
    setBusy(true);
    setErr(null);
    const body: PublishStoryRequestBody = {
      shortDescriptionHe: he.trim() || undefined,
      shortDescriptionAr: ar.trim() || undefined,
      shortDescriptionEn: en.trim() || undefined,
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
  }

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontFamily: FONTS.sans, fontWeight: 700, pb: 0.5 }}>
        {desk.illPubFormTitle}
        <Typography sx={{ fontFamily: FONTS.sans, fontWeight: 400, fontSize: 13, color: DRAFT_B.inkMuted, mt: 0.5 }}>
          {desk.illPubFormSubtitle}
        </Typography>
      </DialogTitle>
      <DialogContent>
        {/* ── Publishing checklist ─────────────────────────────────────────── */}
        <Box
          data-testid="publish-checklist"
          sx={{ border: `1px solid ${DRAFT_B.border}`, borderRadius: "10px", mb: 2.5, overflow: "hidden" }}
        >
          {[
            {
              label: desk.illPubFormChecklistDescriptionLabel,
              done: anyDescriptionFilled,
              doneText: desk.illPubFormStatusComplete,
              pendingText: desk.illPubFormStatusMissing,
              blocking: false,
            },
            {
              label: desk.illPubFormSituationLabel,
              done: canPublish,
              doneText: desk.illPubFormStatusComplete,
              pendingText: desk.illPubFormStatusRequired,
              blocking: true,
            },
          ].map((row, i) => (
            <Stack
              key={row.label}
              data-testid={`publish-checklist-row-${i}`}
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{
                px: 1.5,
                py: 0.75,
                borderTop: i > 0 ? `1px solid ${DRAFT_B.border}` : "none",
              }}
            >
              <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600, color: DRAFT_B.ink }}>
                {row.label}
              </Typography>
              <Chip
                icon={
                  row.done ? (
                    <CheckCircleIcon sx={{ fontSize: 13 }} />
                  ) : row.blocking ? (
                    <ErrorOutlineIcon sx={{ fontSize: 13 }} />
                  ) : (
                    <RemoveCircleOutlineIcon sx={{ fontSize: 13 }} />
                  )
                }
                label={row.done ? row.doneText : row.pendingText}
                size="small"
                sx={{
                  height: 22,
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  bgcolor: row.done ? COLORS.successSoft : row.blocking ? COLORS.warningSoft : DRAFT_B.primarySoft,
                  color: row.done ? COLORS.success : row.blocking ? COLORS.warning : DRAFT_B.inkMuted,
                }}
              />
            </Stack>
          ))}
        </Box>

        {/* ── Public description — one tab per language, none pre-filled ──── */}
        <Tabs
          value={activeLang}
          onChange={(_, v: LangKey) => setActiveLang(v)}
          sx={{
            minHeight: 36,
            mb: 1.5,
            borderBottom: `1px solid ${DRAFT_B.border}`,
            "& .MuiTab-root": { minHeight: 36, textTransform: "none", fontWeight: 600, fontSize: "0.8125rem" },
          }}
        >
          {LANG_ORDER.map((lang) => (
            <Tab key={lang} value={lang} label={LANG_LABEL[lang]} />
          ))}
        </Tabs>
        <TextField
          label={desk.illPubFormDescriptionFieldLabel}
          value={valuesByLang[activeLang].value}
          onChange={(e) => valuesByLang[activeLang].setValue(e.target.value)}
          multiline
          minRows={4}
          maxRows={6}
          fullWidth
          helperText={desk.illPubFormDescriptionHelper}
          inputProps={{ dir: "auto" }}
        />

        {/* ── Situation (required) ─────────────────────────────────────────── */}
        <Divider sx={{ my: 2.5 }} />
        <Typography
          data-testid="publish-situation-heading"
          sx={{ fontFamily: FONTS.sans, fontWeight: 700, fontSize: 14, mb: 0.5 }}
        >
          {desk.illPubFormSituationLabel}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: "0.8125rem" }}>
          {desk.illPubFormSituationHelper}
        </Typography>
        <TextField
          select
          label={desk.illPubFormSituationFieldLabel}
          value={selectedSituationId}
          onChange={(e) => setSelectedSituationId(e.target.value)}
          fullWidth
          disabled={situationsLoading}
          InputProps={{
            endAdornment: situationsLoading ? (
              <CircularProgress size={16} sx={{ mr: 2 }} />
            ) : undefined,
          }}
          helperText={situationsLoading ? undefined : desk.illPubFormSituationOtherHint}
        >
          {situations.map((s) => (
            <MenuItem key={s.id} value={s.id}>
              {pickSituationLabel(s, language)}
            </MenuItem>
          ))}
          <MenuItem value={OTHER_VALUE}>{desk.illPubFormSituationOtherOption}</MenuItem>
        </TextField>
        {!situationChosen ? (
          <Typography variant="caption" sx={{ color: COLORS.warning, display: "block", mt: 0.5 }}>
            {desk.illPubFormSituationMissing}
          </Typography>
        ) : null}

        {isOther ? (
          <Box
            sx={{
              mt: 2,
              p: 2,
              borderRadius: "12px",
              border: `1px solid ${COLORS.warning}`,
              bgcolor: DRAFT_B.warningSoft,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Chip
                label={desk.illPubFormOtherBadge}
                size="small"
                sx={{ bgcolor: COLORS.warning, color: "#fff", fontWeight: 700, fontSize: "0.7rem" }}
              />
            </Stack>
            <Typography variant="body2" sx={{ mb: 2, fontSize: "0.8125rem", color: DRAFT_B.inkSoft }}>
              {desk.illPubFormOtherBody}
            </Typography>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
              <TextField
                label={desk.illPubFormOtherLabelField(LANG_LABEL.he)}
                value={proposalLabelHe}
                onChange={(e) => setProposalLabelHe(e.target.value)}
                fullWidth
              />
              <TextField
                label={desk.illPubFormOtherLabelField(LANG_LABEL.ar)}
                value={proposalLabelAr}
                onChange={(e) => setProposalLabelAr(e.target.value)}
                fullWidth
              />
              <TextField
                label={desk.illPubFormOtherLabelField(LANG_LABEL.en)}
                value={proposalLabelEn}
                onChange={(e) => setProposalLabelEn(e.target.value)}
                fullWidth
              />
            </Stack>
            <TextField
              label={desk.illPubFormOtherReason}
              value={proposalReason}
              onChange={(e) => setProposalReason(e.target.value)}
              multiline
              minRows={2}
              fullWidth
              sx={{ mt: 1.5 }}
            />
            {!hasProposalLabel ? (
              <Typography variant="caption" sx={{ color: COLORS.error, display: "block", mt: 0.75 }}>
                {desk.illPubFormOtherMissingLabel}
              </Typography>
            ) : null}
          </Box>
        ) : null}

        {err ? (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setErr(null)}>
            {err}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, display: "flex", justifyContent: "space-between", width: "100%" }}>
        <Typography
          data-testid="publish-footer-status"
          sx={{
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: canPublish ? COLORS.success : COLORS.warning,
          }}
        >
          {canPublish ? desk.illPubFormFooterReady : desk.illPubFormFooterMissing(missingRequirement!)}
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <Button onClick={onClose} disabled={busy} sx={{ textTransform: "none" }}>
            {desk.headerCancel}
          </Button>
          <Button
            variant="contained"
            disabled={busy || !canPublish}
            onClick={() => void handlePublish()}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            {busy ? desk.illPubFormPublishing : desk.illPubFormPublishButton}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
