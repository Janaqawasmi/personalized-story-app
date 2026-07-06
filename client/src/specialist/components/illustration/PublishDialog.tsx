import { useState, useEffect } from "react";
import Alert from "@mui/material/Alert";
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
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import { publishStoryToLibrary, type PublishStoryRequestBody } from "../../../api/illustrationApi";
import { fetchSituationsByTopic } from "../../../api/referenceData";
import type { Story } from "../../../types/story";
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

const LANG_META: Record<LangKey, { label: string; hasFallback: boolean }> = {
  he: { label: "Hebrew", hasFallback: true },
  ar: { label: "Arabic", hasFallback: true },
  en: { label: "English", hasFallback: false },
};
const LANG_ORDER: LangKey[] = ["he", "ar", "en"];

type LangCompletion = "filled" | "fallback" | "optional-empty";

function completionFor(lang: LangKey, value: string): LangCompletion {
  if (value.trim() !== "") return "filled";
  return LANG_META[lang].hasFallback ? "fallback" : "optional-empty";
}

const COMPLETION_STYLE: Record<LangCompletion, { icon: React.ReactNode; color: string; note: string }> = {
  filled: {
    icon: <CheckCircleIcon sx={{ fontSize: 14 }} />,
    color: COLORS.success,
    note: "Filled in by the specialist.",
  },
  fallback: {
    icon: <ErrorOutlineIcon sx={{ fontSize: 14 }} />,
    color: COLORS.warning,
    note: "Empty — will fall back to the brief's creative vision (or the story title).",
  },
  "optional-empty": {
    icon: <RemoveCircleOutlineIcon sx={{ fontSize: 14 }} />,
    color: COLORS.textMuted,
    note: "Optional, recommended — no automatic translation exists, so it stays blank until filled in.",
  },
};

export default function PublishDialog({ open, onClose, story, onPublished }: Props) {
  const creativeHe = story.brief.section2?.creativeVision?.trim() ?? "";
  const [he, setHe] = useState("");
  const [ar, setAr] = useState("");
  const [en, setEn] = useState("");
  const [topicHe, setTopicHe] = useState("");
  const [topicAr, setTopicAr] = useState("");
  const [topicEn, setTopicEn] = useState("");
  const [activeLang, setActiveLang] = useState<LangKey>("he");

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
    // No English fallback — `creativeHe`/`story.title` are Hebrew-authored
    // text, not a translation. Leave blank until the specialist fills it in.
    setEn("");
    setTopicHe("");
    setTopicAr("");
    setTopicEn("");
    setActiveLang("he");
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
  const situationChosen = selectedSituationId !== "";
  const canPublish = (situationChosen && !isOther) || (isOther && hasProposalLabel);

  // Fields keyed by language, mirrored to the exact fallback logic
  // publishStory.ts applies server-side — the preview below must show
  // precisely what will actually be published, not a guess.
  const fieldsByLang: Record<LangKey, { value: string; setValue: (v: string) => void; topic: string; setTopic: (v: string) => void }> = {
    he: { value: he, setValue: setHe, topic: topicHe, setTopic: setTopicHe },
    ar: { value: ar, setValue: setAr, topic: topicAr, setTopic: setTopicAr },
    en: { value: en, setValue: setEn, topic: topicEn, setTopic: setTopicEn },
  };

  const effectiveDescription: Record<LangKey, string> = {
    he: he.trim() || creativeHe || story.title,
    ar: ar.trim() || creativeHe || story.title,
    en: en.trim(),
  };

  const activeSituationLabel = (() => {
    if (isOther) return proposalLabelHe.trim() || proposalLabelEn.trim() || proposalLabelAr.trim() || null;
    const found = situations.find((s) => s.id === selectedSituationId);
    return found ? found.label_he || found.label_en || found.label_ar || found.id : null;
  })();

  const previewTopic = fieldsByLang[activeLang].topic.trim() || activeSituationLabel;
  const previewDescription = effectiveDescription[activeLang];

  async function handlePublish() {
    setBusy(true);
    setErr(null);
    const body: PublishStoryRequestBody = {
      shortDescriptionHe: he.trim() || undefined,
      shortDescriptionAr: ar.trim() || undefined,
      shortDescriptionEn: en.trim() || undefined,
      displayTopicHe: topicHe.trim() || undefined,
      displayTopicAr: topicAr.trim() || undefined,
      displayTopicEn: topicEn.trim() || undefined,
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
    <Dialog open={open} onClose={() => !busy && onClose()} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontFamily: FONTS.sans, fontWeight: 700 }}>Publish to library</DialogTitle>
      <DialogContent>
        <Alert
          severity="info"
          variant="outlined"
          icon={<InfoOutlinedIcon fontSize="small" />}
          sx={{ mb: 2.5, fontSize: "0.8125rem" }}
        >
          This is the customer-facing metadata caregivers will see on the public story detail page,
          in search results, and on catalog cards. Fill in what you can — Hebrew and Arabic fall back
          to the brief automatically when left blank; English does not.
        </Alert>

        {/* ── Public metadata (language tabs) ───────────────────────────── */}
        <Typography sx={{ fontFamily: FONTS.sans, fontWeight: 700, fontSize: 14, mb: 1 }}>
          Public metadata
        </Typography>

        <Tabs
          value={activeLang}
          onChange={(_, v: LangKey) => setActiveLang(v)}
          sx={{
            minHeight: 36,
            borderBottom: `1px solid ${DRAFT_B.border}`,
            "& .MuiTab-root": { minHeight: 36, textTransform: "none", fontWeight: 600, fontSize: "0.8125rem" },
          }}
        >
          {LANG_ORDER.map((lang) => {
            const completion = completionFor(lang, fieldsByLang[lang].value);
            const style = COMPLETION_STYLE[completion];
            return (
              <Tab
                key={lang}
                value={lang}
                label={
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Box component="span" sx={{ color: style.color, display: "inline-flex" }}>
                      {style.icon}
                    </Box>
                    <span>{LANG_META[lang].label}</span>
                  </Stack>
                }
              />
            );
          })}
        </Tabs>

        {LANG_ORDER.map((lang) => {
          if (lang !== activeLang) return null;
          const completion = completionFor(lang, fieldsByLang[lang].value);
          const style = COMPLETION_STYLE[completion];
          return (
            <Box key={lang} sx={{ pt: 2 }}>
              <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1.5 }}>
                <Box component="span" sx={{ color: style.color, display: "inline-flex" }}>
                  {style.icon}
                </Box>
                <Typography variant="caption" sx={{ color: style.color, fontWeight: 600 }}>
                  {style.note}
                </Typography>
              </Stack>
              <Stack spacing={2}>
                <TextField
                  label="Short description"
                  value={fieldsByLang[lang].value}
                  onChange={(e) => fieldsByLang[lang].setValue(e.target.value)}
                  multiline
                  minRows={3}
                  fullWidth
                  helperText={
                    LANG_META[lang].hasFallback
                      ? "The 1–2 sentence summary shown on the public story page and search results. Leave blank to use the brief's creative vision (or the story title)."
                      : "Same summary in English. There is no automatic translation — leave blank to publish without an English description for now."
                  }
                />
                <TextField
                  label="Display topic"
                  value={fieldsByLang[lang].topic}
                  onChange={(e) => fieldsByLang[lang].setTopic(e.target.value)}
                  fullWidth
                  helperText="Optional override for the topic label shown publicly (e.g. on the story card). Leave blank — the public site resolves a topic label from the catalog taxonomy automatically."
                />
              </Stack>
            </Box>
          );
        })}

        {/* ── Public preview ─────────────────────────────────────────────── */}
        <Divider sx={{ my: 3 }} />
        <Typography sx={{ fontFamily: FONTS.sans, fontWeight: 700, fontSize: 14, mb: 1 }}>
          How this will appear publicly
        </Typography>
        <Typography variant="caption" sx={{ color: COLORS.textMuted, display: "block", mb: 1 }}>
          Previewing the {LANG_META[activeLang].label} version, exactly as it will publish (fallbacks
          applied).
        </Typography>
        <Box
          data-testid="publish-public-preview"
          sx={{
            border: `1px solid ${DRAFT_B.border}`,
            borderRadius: "12px",
            bgcolor: DRAFT_B.cream,
            p: 2,
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: "8px",
                bgcolor: DRAFT_B.border,
                flexShrink: 0,
              }}
              aria-hidden
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{ fontFamily: FONTS.serif, fontWeight: 700, fontSize: 16, color: DRAFT_B.ink, lineHeight: 1.25 }}
              >
                {story.title?.trim() || "Untitled story"}
              </Typography>
              {previewTopic ? (
                <Chip
                  label={previewTopic}
                  size="small"
                  sx={{
                    mt: 0.5,
                    mb: 0.5,
                    bgcolor: DRAFT_B.primarySoft,
                    color: DRAFT_B.primaryDark,
                    fontSize: "0.7rem",
                    height: 20,
                  }}
                />
              ) : null}
              <Typography
                sx={{
                  fontSize: "0.8125rem",
                  color: previewDescription ? DRAFT_B.inkSoft : DRAFT_B.inkMuted,
                  fontStyle: previewDescription ? "normal" : "italic",
                  mt: 0.5,
                  lineHeight: 1.5,
                }}
              >
                {previewDescription || "(No description will be shown for this language yet.)"}
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* ── Situation ──────────────────────────────────────────────────── */}
        <Divider sx={{ my: 3 }} />
        <Typography sx={{ fontFamily: FONTS.sans, fontWeight: 700, fontSize: 14, mb: 0.5 }}>
          Situation
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: "0.8125rem" }}>
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
          InputProps={{
            endAdornment: situationsLoading ? (
              <CircularProgress size={16} sx={{ mr: 2 }} />
            ) : undefined,
          }}
          helperText={situationsLoading ? "Loading situations…" : undefined}
        >
          {situations.map((s) => (
            <MenuItem key={s.id} value={s.id}>
              {s.label_he || s.label_en || s.label_ar || s.id}
            </MenuItem>
          ))}
          <MenuItem value={OTHER_VALUE}>Other — request new situation</MenuItem>
        </TextField>
        {!situationChosen ? (
          <Typography variant="caption" sx={{ color: COLORS.warning, display: "block", mt: 0.5 }}>
            Select an existing situation, or choose "Other" to request a new one, before publishing.
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
                label="New situation request"
                size="small"
                sx={{ bgcolor: COLORS.warning, color: "#fff", fontWeight: 700, fontSize: "0.7rem" }}
              />
            </Stack>
            <Typography variant="body2" sx={{ mb: 2, fontSize: "0.8125rem", color: DRAFT_B.inkSoft }}>
              No existing situation fits. Publishing will submit this as a <strong>pending request for
              admin review</strong> — it will not appear as the story's situation, and won't be
              selectable by other stories, until an admin approves it. Enter at least one label below.
            </Typography>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
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
              sx={{ mt: 1.5 }}
            />
            {!hasProposalLabel ? (
              <Typography variant="caption" sx={{ color: COLORS.error, display: "block", mt: 0.75 }}>
                Enter at least one language label to submit this request.
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
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={busy} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Tooltip
          title={!canPublish ? "Select a situation (or describe a new one) before publishing." : ""}
        >
          <span>
            <Button
              variant="contained"
              disabled={busy || !canPublish}
              onClick={() => void handlePublish()}
              startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              {busy ? "Publishing…" : "Publish"}
            </Button>
          </span>
        </Tooltip>
      </DialogActions>
    </Dialog>
  );
}
