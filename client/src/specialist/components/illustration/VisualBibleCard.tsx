import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RefreshIcon from "@mui/icons-material/Refresh";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { COLORS, DESIGN_TOKENS } from "../../../theme";
import type { EnvironmentEntry, VisualBibleArtefact } from "../../../types/illustration";
import {
  patchVisualBible,
  regenerateVisualBible,
  type VisualBiblePatchFields,
} from "../../../api/illustrationApi";
import { useSpecialistDeskUi } from "../../../i18n/specialistDeskUi";
import { DRAFT_B, FONTS } from "../draftB/tokens";
import CancelJobButton from "./CancelJobButton";
import { ChipTone } from "./shared/ChipTone";

const CARD_SHADOW =
  "0 1px 0 rgba(42,36,33,.02), 0 8px 24px -20px rgba(42,36,33,.08)";

const MANDATED_NO_TEXT_HINT =
  "text, letters, words, captions, labels, speech bubbles, logos of any kind";

function paletteToChips(palette: string): string[] {
  return palette
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function chipsToPalette(chips: string[]): string {
  return chips.join(", ");
}

function paletteSwatchColor(token: string): string {
  const t = token.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(t)) return t;
  return DRAFT_B.border;
}

interface Props {
  storyId: string;
  readOnly: boolean;
  currentVersion: number;
  visualBible: VisualBibleArtefact | null;
  visualBibleVersionsDesc: VisualBibleArtefact[];
  visualBibleRegenBusy: boolean;
  /** Active VB regen job id for cancellation UI */
  visualBibleRegenJobId?: string | null;
}

function VbSectionTitle({
  title,
  hint,
  count,
  tone = "default",
}: {
  title: string;
  hint?: string;
  count?: number;
  tone?: "default" | "avoid";
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "baseline",
        gap: 1,
        flexWrap: "wrap",
        mb: 1,
      }}
    >
      <Typography
        component="h3"
        sx={{
          m: 0,
          fontFamily: FONTS.sans,
          fontSize: 12,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontWeight: 700,
          color: tone === "avoid" ? COLORS.error : DRAFT_B.inkSoft,
        }}
      >
        {title}
      </Typography>
      {typeof count === "number" ? (
        <Typography
          component="span"
          sx={{ fontSize: 11.5, color: DRAFT_B.inkMuted, fontWeight: 600 }}
        >
          · {count}
        </Typography>
      ) : null}
      {hint ? (
        <Typography
          component="span"
          sx={{ fontSize: 12, color: DRAFT_B.inkMuted, fontStyle: "italic" }}
        >
          — {hint}
        </Typography>
      ) : null}
    </Box>
  );
}

function VbReadParagraph({ children }: { children: ReactNode }) {
  return (
    <Typography
      component="p"
      sx={{
        m: 0,
        color: DRAFT_B.ink,
        fontSize: 14,
        lineHeight: 1.65,
        fontFamily: FONTS.sans,
      }}
    >
      {children}
    </Typography>
  );
}

function AnchorPill({ children }: { children: ReactNode }) {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        px: 1.375,
        py: 0.625,
        bgcolor: DRAFT_B.cream,
        color: DRAFT_B.inkSoft,
        borderRadius: 2,
        fontSize: 12.5,
        fontWeight: 500,
        border: `1px solid ${DRAFT_B.borderSoft}`,
      }}
    >
      {children}
    </Box>
  );
}

function AvoidPill({ children }: { children: ReactNode }) {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        px: 1.375,
        py: 0.625,
        bgcolor: COLORS.errorSoft,
        color: "#7a3838",
        borderRadius: 2,
        fontSize: 12.5,
        fontWeight: 500,
        border: "1px solid #e5cccc",
      }}
    >
      {children}
    </Box>
  );
}

function PaletteSwatches({ tokens }: { tokens: string[] }) {
  return (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
      {tokens.map((raw) => {
        const hex = paletteSwatchColor(raw);
        return (
          <Box
            key={raw}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 1,
              py: 0.625,
              pr: 1.375,
              pl: 0.625,
              borderRadius: 999,
              bgcolor: COLORS.surface,
              border: `1px solid ${DRAFT_B.border}`,
            }}
          >
            <Box
              sx={{
                width: 18,
                height: 18,
                borderRadius: 999,
                bgcolor: hex,
                border: "1px solid rgba(0,0,0,.08)",
                flexShrink: 0,
              }}
            />
            <Typography
              component="span"
              sx={{ fontSize: 12.5, color: DRAFT_B.ink, fontWeight: 500 }}
            >
              {raw}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

function EnvironmentCard({
  name,
  atmosphere,
  spatialLayout,
  atmosphereLabel,
  layoutLabel,
}: {
  name: string;
  atmosphere: string;
  spatialLayout: string;
  atmosphereLabel: string;
  layoutLabel: string;
}) {
  return (
    <Box
      sx={{
        p: "12px 14px",
        bgcolor: DRAFT_B.cream,
        border: `1px solid ${DRAFT_B.borderSoft}`,
        borderRadius: "10px",
      }}
    >
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: COLORS.primary,
          fontFamily: FONTS.mono,
          mb: 0.75,
        }}
      >
        {name}
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          columnGap: 1.75,
          rowGap: 0.5,
          fontSize: 13,
          lineHeight: 1.55,
        }}
      >
        <Typography
          component="span"
          sx={{ color: DRAFT_B.inkMuted, fontWeight: 600 }}
        >
          {atmosphereLabel}
        </Typography>
        <Typography component="span" sx={{ color: DRAFT_B.ink }}>
          {atmosphere}
        </Typography>
        <Typography
          component="span"
          sx={{ color: DRAFT_B.inkMuted, fontWeight: 600 }}
        >
          {layoutLabel}
        </Typography>
        <Typography component="span" sx={{ color: DRAFT_B.ink }}>
          {spatialLayout}
        </Typography>
      </Box>
    </Box>
  );
}

export default function VisualBibleCard({
  storyId,
  readOnly,
  currentVersion,
  visualBible,
  visualBibleVersionsDesc,
  visualBibleRegenBusy,
  visualBibleRegenJobId = null,
}: Props) {
  const desk = useSpecialistDeskUi();
  const [selectedVersion, setSelectedVersion] = useState(currentVersion);
  const [editing, setEditing] = useState(false);
  const [confirmRegenOpen, setConfirmRegenOpen] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [regenBusy, setRegenBusy] = useState(false);

  const [draftAnchor, setDraftAnchor] = useState("");
  const [draftSheet, setDraftSheet] = useState("");
  const [draftStyle, setDraftStyle] = useState("");
  const [draftPaletteChips, setDraftPaletteChips] = useState<string[]>([]);
  const [draftAnchors, setDraftAnchors] = useState<string[]>([]);
  const [draftAvoidRest, setDraftAvoidRest] = useState<string[]>([]);
  const [draftEnvs, setDraftEnvs] = useState<Record<string, EnvironmentEntry>>({});

  useEffect(() => {
    setSelectedVersion(currentVersion);
  }, [currentVersion]);

  const displayArtefact = useMemo(() => {
    return (
      visualBibleVersionsDesc.find((v) => v.version === selectedVersion) ?? visualBible
    );
  }, [visualBible, visualBibleVersionsDesc, selectedVersion]);

  const openEditor = useCallback(() => {
    if (!visualBible) return;
    setDraftAnchor(visualBible.characterAnchor);
    setDraftSheet(visualBible.characterSheet);
    setDraftStyle(visualBible.styleGuide);
    setDraftPaletteChips(paletteToChips(visualBible.palette));
    setDraftAnchors([...visualBible.consistencyAnchors]);
    const avoid = [...visualBible.avoidList];
    setDraftAvoidRest(avoid.length > 1 ? avoid.slice(1) : []);
    setDraftEnvs({ ...visualBible.environmentRegistry });
    setSaveErr(null);
    setEditing(true);
  }, [visualBible]);

  const mandatedLine = displayArtefact?.avoidList[0] ?? MANDATED_NO_TEXT_HINT;

  const dirty = useMemo(() => {
    if (!visualBible || !editing) return false;
    const palEq =
      chipsToPalette(draftPaletteChips) === visualBible.palette;
    const envEq =
      JSON.stringify(draftEnvs) === JSON.stringify(visualBible.environmentRegistry);
    const avoidEq =
      [mandatedLine, ...draftAvoidRest].join("\0") ===
      visualBible.avoidList.join("\0");
    return (
      draftAnchor !== visualBible.characterAnchor ||
      draftSheet !== visualBible.characterSheet ||
      draftStyle !== visualBible.styleGuide ||
      !palEq ||
      JSON.stringify(draftAnchors) !== JSON.stringify(visualBible.consistencyAnchors) ||
      !avoidEq ||
      !envEq
    );
  }, [
    visualBible,
    editing,
    draftAnchor,
    draftSheet,
    draftStyle,
    draftPaletteChips,
    draftAnchors,
    draftAvoidRest,
    draftEnvs,
    mandatedLine,
  ]);

  const save = async () => {
    if (!visualBible) return;
    setSaveErr(null);
    setSaveBusy(true);
    const body: VisualBiblePatchFields = {
      characterAnchor: draftAnchor,
      characterSheet: draftSheet,
      styleGuide: draftStyle,
      palette: chipsToPalette(draftPaletteChips),
      consistencyAnchors: draftAnchors,
      avoidList: [mandatedLine, ...draftAvoidRest],
      environmentRegistry: draftEnvs,
    };
    try {
      await patchVisualBible(storyId, body);
      setEditing(false);
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaveBusy(false);
    }
  };

  const runRegen = async () => {
    setRegenBusy(true);
    setSaveErr(null);
    try {
      await regenerateVisualBible(storyId);
      setConfirmRegenOpen(false);
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : String(e));
    } finally {
      setRegenBusy(false);
    }
  };

  const cardShellSx = {
    bgcolor: COLORS.surface,
    border: `1px solid ${DRAFT_B.border}`,
    borderRadius: "14px",
    overflow: "hidden" as const,
    boxShadow: CARD_SHADOW,
  };

  if (visualBibleRegenBusy) {
    return (
      <Box sx={cardShellSx}>
        <Box
          sx={{
            px: 2.75,
            py: 2,
            background: `linear-gradient(180deg, ${DESIGN_TOKENS.parchment} 0%, ${COLORS.surface} 100%)`,
            borderBottom: `1px solid ${DRAFT_B.borderSoft}`,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: "12px",
                bgcolor: COLORS.primary,
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: `'Playfair Display', Georgia, serif`,
                fontSize: 20,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              VB
            </Box>
            <Typography
              sx={{
                fontFamily: `'Playfair Display', Georgia, serif`,
                fontSize: 22,
                fontWeight: 700,
                color: DRAFT_B.ink,
                letterSpacing: "-0.02em",
              }}
            >
              {desk.illVbTitle}
            </Typography>
          </Stack>
        </Box>
        <Box sx={{ px: 2.75, py: 2.5 }}>
          <Skeleton variant="rounded" height={160} sx={{ borderRadius: 2 }} />
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ color: DRAFT_B.inkSoft }}>
              {desk.illVbRegenerating}
            </Typography>
            {visualBibleRegenJobId ? (
              <CancelJobButton storyId={storyId} jobId={visualBibleRegenJobId} />
            ) : null}
          </Stack>
        </Box>
      </Box>
    );
  }

  if (!displayArtefact) {
    return (
      <Typography variant="body2" sx={{ color: DRAFT_B.inkMuted }}>
        {desk.illVbLoading}
      </Typography>
    );
  }

  const isViewingOlder = selectedVersion !== currentVersion;
  const canEdit = !readOnly && !isViewingOlder;
  const handEdited = displayArtefact.source === "specialist_edited";
  const paletteTokens = paletteToChips(displayArtefact.palette);
  const envEntries = Object.entries(displayArtefact.environmentRegistry);

  return (
    <Box sx={cardShellSx}>
      <Box
        sx={{
          px: "22px",
          py: 2,
          background: `linear-gradient(180deg, ${DESIGN_TOKENS.parchment} 0%, ${COLORS.surface} 100%)`,
          borderBottom: `1px solid ${DRAFT_B.borderSoft}`,
          display: "flex",
          alignItems: "flex-start",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: "12px",
            bgcolor: COLORS.primary,
            color: "#fff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: `'Playfair Display', Georgia, serif`,
            fontSize: 20,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          VB
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack
            direction="row"
            alignItems="center"
            gap={1}
            flexWrap="wrap"
            sx={{ mb: 0.5 }}
          >
            <Typography
              component="h2"
              sx={{
                m: 0,
                fontFamily: `'Playfair Display', Georgia, serif`,
                fontSize: 22,
                fontWeight: 700,
                color: DRAFT_B.ink,
                letterSpacing: "-0.02em",
              }}
            >
              {desk.illVbTitle}
            </Typography>
            <ChipTone
              tone="info"
              chipSize="sm"
              label={desk.illVbVersion(displayArtefact.version)}
            />
            {handEdited ? (
              <ChipTone tone="rose" chipSize="sm" label={desk.illVbEditedTag} />
            ) : null}
            {isViewingOlder ? (
              <Chip size="small" label={desk.illVbHistoricalView} color="warning" variant="outlined" />
            ) : null}
          </Stack>
          <Typography
            sx={{
              m: 0,
              color: DRAFT_B.inkMuted,
              fontSize: 13.5,
              lineHeight: 1.55,
              maxWidth: 640,
              fontFamily: FONTS.sans,
            }}
          >
            {desk.illVbSubtitle}
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center" sx={{ mt: 1.5 }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="vb-version-label">{desk.illVbVersionField}</InputLabel>
              <Select
                labelId="vb-version-label"
                label={desk.illVbVersionField}
                value={selectedVersion}
                onChange={(e) => setSelectedVersion(Number(e.target.value))}
              >
                {visualBibleVersionsDesc.map((v) => (
                  <MenuItem key={v.version} value={v.version}>
                    v{v.version} · {v.source === "llm_generated" ? "LLM" : "Edited"}
                    {v.version === currentVersion ? " (current)" : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Box>
        <Stack direction="row" spacing={1} flexShrink={0} flexWrap="wrap">
          {canEdit && !editing ? (
            <Button
              size="small"
              variant="outlined"
              startIcon={<EditOutlinedIcon />}
              onClick={openEditor}
              sx={{
                borderColor: DRAFT_B.border,
                color: DRAFT_B.ink,
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              {desk.illVbEdit}
            </Button>
          ) : null}
          {canEdit && editing ? (
            <>
              <Button
                size="small"
                variant="contained"
                disabled={!dirty || saveBusy}
                onClick={() => void save()}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                {desk.illVbSave}
              </Button>
              <Button
                size="small"
                variant="text"
                disabled={saveBusy}
                onClick={() => {
                  setEditing(false);
                  setSaveErr(null);
                }}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                {desk.headerCancel}
              </Button>
            </>
          ) : null}
          {canEdit && !editing ? (
            <Button
              size="small"
              variant="text"
              startIcon={<RefreshIcon />}
              disabled={regenBusy}
              onClick={() => setConfirmRegenOpen(true)}
              sx={{
                color: DRAFT_B.inkSoft,
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              {desk.illVbRegenerate}
            </Button>
          ) : null}
        </Stack>
      </Box>

      <Box sx={{ px: "22px", py: "22px" }}>
        {saveErr ? (
          <Alert severity="error" onClose={() => setSaveErr(null)} sx={{ mb: 2 }}>
            {saveErr}
          </Alert>
        ) : null}

        {editing && canEdit ? (
          <Stack spacing={2}>
            <TextField
              label={desk.illVbCharacterAnchor}
              multiline
              minRows={2}
              fullWidth
              value={draftAnchor}
              onChange={(e) => setDraftAnchor(e.target.value)}
              helperText={`${draftAnchor.length} / 240`}
              error={draftAnchor.length > 240}
            />
            <TextField
              label={desk.illVbCharacterSheet}
              multiline
              minRows={4}
              fullWidth
              value={draftSheet}
              onChange={(e) => setDraftSheet(e.target.value)}
            />
            <TextField
              label={desk.illVbStyleGuide}
              multiline
              minRows={3}
              fullWidth
              value={draftStyle}
              onChange={(e) => setDraftStyle(e.target.value)}
            />
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                {desk.illVbPalette} — {desk.illVbPaletteEditorHint}
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mb: 1 }}>
                {draftPaletteChips.map((c, i) => (
                  <Chip
                    key={`${c}-${i}`}
                    label={c}
                    onDelete={() =>
                      setDraftPaletteChips(draftPaletteChips.filter((_, j) => j !== i))
                    }
                  />
                ))}
              </Stack>
              <Button
                size="small"
                onClick={() => {
                  const next = window.prompt("Add palette entry");
                  if (next?.trim()) {
                    setDraftPaletteChips([...draftPaletteChips, next.trim()]);
                  }
                }}
              >
                {desk.illVbAddColour}
              </Button>
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                {desk.illVbAnchors}
              </Typography>
              <Stack spacing={0.5}>
                {draftAnchors.map((a, i) => (
                  <Stack key={i} direction="row" spacing={1} alignItems="center">
                    <TextField
                      size="small"
                      fullWidth
                      value={a}
                      onChange={(e) => {
                        const next = [...draftAnchors];
                        next[i] = e.target.value;
                        setDraftAnchors(next);
                      }}
                    />
                    <Button
                      size="small"
                      onClick={() =>
                        setDraftAnchors(draftAnchors.filter((_, j) => j !== i))
                      }
                    >
                      {desk.illVbRemoveRow}
                    </Button>
                  </Stack>
                ))}
                <Button size="small" onClick={() => setDraftAnchors([...draftAnchors, ""])}>
                  {desk.illVbAddAnchor}
                </Button>
              </Stack>
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                {desk.illVbAvoid}
              </Typography>
              <Chip
                size="small"
                label={mandatedLine}
                sx={{ mb: 1, opacity: 0.85 }}
                color="default"
                variant="outlined"
              />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                {desk.illVbMandatedAvoidHint}
              </Typography>
              <Stack spacing={0.5}>
                {draftAvoidRest.map((a, i) => (
                  <Stack key={i} direction="row" spacing={1} alignItems="center">
                    <TextField
                      size="small"
                      fullWidth
                      value={a}
                      onChange={(e) => {
                        const next = [...draftAvoidRest];
                        next[i] = e.target.value;
                        setDraftAvoidRest(next);
                      }}
                    />
                    <Button
                      size="small"
                      onClick={() =>
                        setDraftAvoidRest(draftAvoidRest.filter((_, j) => j !== i))
                      }
                    >
                      {desk.illVbRemoveRow}
                    </Button>
                  </Stack>
                ))}
                <Button size="small" onClick={() => setDraftAvoidRest([...draftAvoidRest, ""])}>
                  {desk.illVbAddAvoidEntry}
                </Button>
              </Stack>
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {desk.illVbEnvironments}
              </Typography>
              {Object.entries(draftEnvs).map(([key, ent]) => (
                <Accordion key={key} disableGutters elevation={0} sx={{ border: 1, borderColor: "divider", mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>{key}</AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={1}>
                      <TextField
                        label={desk.illVbEnvAtmosphere}
                        multiline
                        minRows={2}
                        fullWidth
                        value={ent.atmosphere}
                        onChange={(e) =>
                          setDraftEnvs({
                            ...draftEnvs,
                            [key]: { ...ent, atmosphere: e.target.value },
                          })
                        }
                      />
                      <TextField
                        label={desk.illVbEnvLayout}
                        multiline
                        minRows={2}
                        fullWidth
                        value={ent.spatialLayout}
                        onChange={(e) =>
                          setDraftEnvs({
                            ...draftEnvs,
                            [key]: { ...ent, spatialLayout: e.target.value },
                          })
                        }
                      />
                      <Button
                        size="small"
                        color="error"
                        onClick={() => {
                          const { [key]: _, ...rest } = draftEnvs;
                          setDraftEnvs(rest);
                        }}
                      >
                        {desk.illVbRemoveEnvironment}
                      </Button>
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ))}
              <Button
                size="small"
                onClick={() => {
                  const name = window.prompt("Environment key (e.g. forest, bedroom)");
                  if (name?.trim() && !draftEnvs[name.trim()]) {
                    setDraftEnvs({
                      ...draftEnvs,
                      [name.trim()]: { atmosphere: "", spatialLayout: "" },
                    });
                  }
                }}
              >
                {desk.illVbAddEnvironment}
              </Button>
            </Box>
          </Stack>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1.1fr 1fr" },
              gap: "22px",
            }}
          >
            <Stack spacing={2.25}>
              <Box>
                <VbSectionTitle
                  title={desk.illVbCharacterAnchor}
                  hint={desk.illVbCharacterHint}
                />
                <VbReadParagraph>{displayArtefact.characterAnchor}</VbReadParagraph>
              </Box>
              <Box>
                <VbSectionTitle title={desk.illVbStyleGuide} />
                <VbReadParagraph>{displayArtefact.styleGuide}</VbReadParagraph>
              </Box>
              <Box>
                <VbSectionTitle
                  title={desk.illVbAnchors}
                  hint={desk.illVbAnchorsHint}
                />
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                  {displayArtefact.consistencyAnchors.map((a) => (
                    <AnchorPill key={a}>{a}</AnchorPill>
                  ))}
                </Box>
              </Box>
            </Stack>
            <Stack spacing={2.25}>
              <Box>
                <VbSectionTitle title={desk.illVbPalette} />
                <PaletteSwatches tokens={paletteTokens} />
              </Box>
              <Box>
                <VbSectionTitle title={desk.illVbEnvironments} count={envEntries.length} />
                <Stack spacing={1}>
                  {envEntries.map(([name, ent]) => (
                    <EnvironmentCard
                      key={name}
                      name={name}
                      atmosphere={ent.atmosphere}
                      spatialLayout={ent.spatialLayout}
                      atmosphereLabel={desk.illVbEnvAtmosphere}
                      layoutLabel={desk.illVbEnvLayout}
                    />
                  ))}
                </Stack>
              </Box>
              <Box>
                <VbSectionTitle title={desk.illVbAvoid} tone="avoid" />
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                  {displayArtefact.avoidList.map((a) => (
                    <AvoidPill key={a}>{a}</AvoidPill>
                  ))}
                </Box>
              </Box>
            </Stack>
          </Box>
        )}
      </Box>

      <Dialog open={confirmRegenOpen} onClose={() => setConfirmRegenOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{desk.illVbRegenDialogTitle}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">{desk.illVbRegenDialogBody}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRegenOpen(false)}>{desk.headerCancel}</Button>
          <Button variant="contained" disabled={regenBusy} onClick={() => void runRegen()}>
            {desk.illVbRegenDialogConfirm}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
