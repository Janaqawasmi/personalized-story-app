// PilotIllustrationPanel — admin-only per-scene dual-variant illustration view.
//
// Used inside IllustrationsTab when the signed-in user has role="admin". For
// each page in the story we show variant C (figurative scene director) and
// variant D (literal scene director) side-by-side, with their structured
// prompts inspectable and a Copy Prompt button for external-model testing.
//
// Lifecycle visible in the UI:
//   1. Style Bible — auto-loaded on mount; rendered as a collapsed
//      expander at the top.
//   2. Avatar     — explicit "Generate Avatar" step. Until the avatar exists,
//      page generation buttons are disabled. Re-rolling is allowed but warns
//      that prior runs become non-comparable.
//   3. Pages      — each page shows two columns (C / D) with Generate /
//      Re-generate buttons and a history dropdown for prior runs.

import React, { useEffect, useMemo, useState } from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Tooltip from "@mui/material/Tooltip";
import Divider from "@mui/material/Divider";
import Snackbar from "@mui/material/Snackbar";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ImageIcon from "@mui/icons-material/Image";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import RefreshIcon from "@mui/icons-material/Refresh";
import ZoomInIcon from "@mui/icons-material/ZoomIn";

import type { Story } from "../../types/story";
import { COLORS, DESIGN_TOKENS } from "../../theme";
import * as api from "../../api/specialistStories";
import type {
  PilotAvatar,
  PilotIllustrationRun,
  PilotStyleBible,
  PilotVariant,
} from "../../api/specialistStories";

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

function variantLabel(v: PilotVariant): string {
  return v === "C" ? "Variant C — figurative" : "Variant D — literal";
}

/**
 * Groups raw runs into a structure the UI can render efficiently:
 *   byPage[pageNumber][variant] = [run, run, ...]  // ordered runIndex asc
 */
function indexRuns(runs: PilotIllustrationRun[]): Map<
  number,
  Record<PilotVariant, PilotIllustrationRun[]>
> {
  const byPage = new Map<
    number,
    Record<PilotVariant, PilotIllustrationRun[]>
  >();
  for (const run of runs) {
    let perPage = byPage.get(run.pageNumber);
    if (!perPage) {
      perPage = { C: [], D: [] };
      byPage.set(run.pageNumber, perPage);
    }
    perPage[run.variant].push(run);
  }
  // Sort by runIndex asc so [0] is oldest, [length-1] is newest.
  // Array.from avoids needing downlevelIteration for Map.values() on es5.
  Array.from(byPage.values()).forEach((perPage) => {
    perPage.C.sort((a: PilotIllustrationRun, b: PilotIllustrationRun) => a.runIndex - b.runIndex);
    perPage.D.sort((a: PilotIllustrationRun, b: PilotIllustrationRun) => a.runIndex - b.runIndex);
  });
  return byPage;
}

async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback for older browsers
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

// ---------------------------------------------------------------------------
// Image dialog (zoom preview)
// ---------------------------------------------------------------------------

function ImageZoomDialog({
  open,
  src,
  onClose,
}: {
  open: boolean;
  src: string | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg">
      <DialogContent sx={{ p: 0, bgcolor: "#000" }}>
        {src ? (
          <Box
            component="img"
            src={src}
            alt="run preview"
            sx={{ display: "block", maxWidth: "90vw", maxHeight: "90vh" }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Style Bible expander
// ---------------------------------------------------------------------------

function StyleBibleSection({ bible }: { bible: PilotStyleBible | null }) {
  if (!bible) {
    return (
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        Style Bible is loading — Claude is reading the story…
      </Alert>
    );
  }
  return (
    <Accordion
      disableGutters
      sx={{
        borderRadius: 2,
        border: `1px solid ${COLORS.border}`,
        boxShadow: "none",
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <AutoAwesomeIcon fontSize="small" sx={{ color: COLORS.primary }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Style Bible
          </Typography>
          <Chip
            size="small"
            label={`${Object.keys(bible.environmentRegistry).length} environment(s)`}
            sx={{ fontSize: "0.7rem" }}
          />
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1.5}>
          <KeyValueRow label="Character anchor" value={bible.characterAnchor} />
          <KeyValueRow label="Style guide" value={bible.styleGuide} />
          <KeyValueRow
            label="Consistency anchors"
            value={bible.consistencyAnchors.join(" • ")}
          />
          <KeyValueRow label="Palette" value={bible.palette} />
          <KeyValueRow
            label="Avoid"
            value={bible.avoidList.join(" • ")}
          />
          <Divider sx={{ my: 1 }} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textPrimary }}>
            Environment registry
          </Typography>
          {Object.entries(bible.environmentRegistry).map(([key, entry]) => (
            <Box
              key={key}
              sx={{
                p: 1.5,
                bgcolor: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 1.5,
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.primary }}>
                {key}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, color: COLORS.textPrimary }}>
                <strong>Atmosphere:</strong> {entry.atmosphere}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, color: COLORS.textPrimary }}>
                <strong>Layout:</strong> {entry.spatialLayout}
              </Typography>
            </Box>
          ))}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

function KeyValueRow({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ color: COLORS.textPrimary, mt: 0.25 }}>
        {value}
      </Typography>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Avatar card
// ---------------------------------------------------------------------------

function AvatarCard({
  avatar,
  hasAnyRuns,
  onGenerated,
}: {
  avatar: PilotAvatar | null;
  hasAnyRuns: boolean;
  onGenerated: (avatar: PilotAvatar) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(false);

  async function handleClick(): Promise<void> {
    if (hasAnyRuns && avatar) {
      const ok = window.confirm(
        "Re-rolling the avatar will produce a different reference image. " +
          "Existing C-vs-D runs will still be visible, but they were generated " +
          "against the previous avatar — comparisons across avatars are not valid.\n\nProceed?",
      );
      if (!ok) return;
    }
    setBusy(true);
    setError(null);
    try {
      const next = await api.generatePilotAvatar(getStoryIdFromUrl());
      onGenerated(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate avatar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box
      sx={{
        p: 2,
        bgcolor: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 2,
      }}
    >
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-start">
        <Box
          sx={{
            width: 120,
            height: 120,
            borderRadius: 1.5,
            border: `1px dashed ${COLORS.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "#fafafa",
            position: "relative",
            overflow: "hidden",
            cursor: avatar ? "zoom-in" : "default",
          }}
          onClick={() => avatar && setZoom(true)}
        >
          {avatar ? (
            <Box component="img" src={avatar.url} alt="avatar" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <ImageIcon sx={{ color: COLORS.border, fontSize: 40 }} />
          )}
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: COLORS.textPrimary }}>
            Character avatar
          </Typography>
          <Typography variant="caption" sx={{ color: COLORS.textSecondary, display: "block", mt: 0.25 }}>
            One image per story. Reused as the reference for every page generation across both variants.
          </Typography>

          {avatar && (
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Chip size="small" label={`seed ${avatar.seed}`} variant="outlined" />
              <Chip
                size="small"
                label={new Date(avatar.generatedAt).toLocaleString()}
                variant="outlined"
              />
            </Stack>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 1, borderRadius: 1.5 }}>
              {error}
            </Alert>
          )}

          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
            <Button
              variant="contained"
              size="small"
              disabled={busy}
              onClick={handleClick}
              startIcon={busy ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon fontSize="small" />}
              sx={{
                bgcolor: COLORS.primary,
                "&:hover": { bgcolor: COLORS.primaryDark },
                fontWeight: 700,
              }}
            >
              {busy ? "Generating…" : avatar ? "Re-generate avatar" : "Generate avatar"}
            </Button>
          </Stack>
        </Box>
      </Stack>

      <ImageZoomDialog open={zoom} src={avatar?.url ?? null} onClose={() => setZoom(false)} />
    </Box>
  );
}

// The avatar card needs the storyId. Rather than thread it through every prop
// layer when the Panel already knows it, we attach it to a hidden data attr
// at the panel root and read it from the URL when triggering the request.
function getStoryIdFromUrl(): string {
  // Routes use /:lang/specialist/stories/:storyId/... — pull the last
  // non-empty segment that looks like a story id (caller passes it via a
  // wrapper anyway; this is a defensive fallback).
  const segments = window.location.pathname.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? "";
}

// ---------------------------------------------------------------------------
// Per-variant column for a single page
// ---------------------------------------------------------------------------

function VariantColumn({
  storyId,
  pageNumber,
  variant,
  runs,
  canGenerate,
  onRunFinished,
  onCopied,
}: {
  storyId: string;
  pageNumber: number;
  variant: PilotVariant;
  runs: PilotIllustrationRun[];
  canGenerate: boolean;
  onRunFinished: (run: PilotIllustrationRun) => void;
  onCopied: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);

  const selected = useMemo(() => {
    if (runs.length === 0) return null;
    if (selectedRunId) {
      return runs.find((r) => r.id === selectedRunId) ?? runs[runs.length - 1] ?? null;
    }
    return runs[runs.length - 1] ?? null;
  }, [runs, selectedRunId]);

  async function handleGenerate(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const newRuns = await api.generatePilotRun(storyId, pageNumber, variant);
      const newest = newRuns[newRuns.length - 1];
      if (newest) {
        onRunFinished(newest);
        setSelectedRunId(newest.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy(text: string): Promise<void> {
    try {
      await copyToClipboard(text);
      onCopied();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Copy failed.");
    }
  }

  return (
    <Box
      sx={{
        p: 1.5,
        flex: 1,
        minWidth: 0,
        bgcolor: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 2,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: COLORS.textPrimary }}>
          {variantLabel(variant)}
        </Typography>
        {runs.length > 1 && (
          <Select
            size="small"
            value={selected?.id ?? ""}
            onChange={(e) => setSelectedRunId(String(e.target.value))}
            sx={{ minWidth: 110, fontSize: "0.8rem" }}
          >
            {runs.map((r) => (
              <MenuItem key={r.id} value={r.id}>
                v{r.runIndex} · {r.imageStatus}
              </MenuItem>
            ))}
          </Select>
        )}
      </Stack>

      <Box
        sx={{
          aspectRatio: "1 / 1",
          borderRadius: 1.5,
          border: `1px dashed ${COLORS.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#fafafa",
          position: "relative",
          overflow: "hidden",
          cursor: selected?.imageUrl ? "zoom-in" : "default",
        }}
        onClick={() => selected?.imageUrl && setZoomSrc(selected.imageUrl)}
      >
        {selected?.imageUrl ? (
          <Box
            component="img"
            src={selected.imageUrl}
            alt={`page ${pageNumber} ${variant}`}
            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : selected?.imageStatus === "generating" ? (
          <Stack alignItems="center" spacing={1}>
            <CircularProgress size={28} sx={{ color: COLORS.primary }} />
            <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
              Generating…
            </Typography>
          </Stack>
        ) : selected?.imageStatus === "failed" ? (
          <Stack alignItems="center" spacing={1} sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="caption" sx={{ color: COLORS.error, fontWeight: 700 }}>
              Failed
            </Typography>
            <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
              {selected.errorMessage ?? "Unknown error."}
            </Typography>
          </Stack>
        ) : (
          <Stack alignItems="center" spacing={1} sx={{ color: COLORS.border }}>
            <ImageIcon sx={{ fontSize: 36 }} />
            <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
              Not generated yet
            </Typography>
          </Stack>
        )}

        {selected?.imageUrl && (
          <Box sx={{ position: "absolute", top: 6, right: 6 }}>
            <ZoomInIcon sx={{ color: "rgba(255,255,255,0.85)", fontSize: 22 }} />
          </Box>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 1, borderRadius: 1.5 }}>
          {error}
        </Alert>
      )}

      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
        <Tooltip title={canGenerate ? "" : "Generate the avatar first."}>
          <span>
            <Button
              variant="contained"
              size="small"
              disabled={!canGenerate || busy}
              onClick={handleGenerate}
              startIcon={busy ? <CircularProgress size={14} color="inherit" /> : <RefreshIcon fontSize="small" />}
              sx={{
                bgcolor: COLORS.primary,
                "&:hover": { bgcolor: COLORS.primaryDark },
                fontWeight: 700,
              }}
            >
              {busy ? "Generating…" : runs.length === 0 ? "Generate" : "Re-generate"}
            </Button>
          </span>
        </Tooltip>
        <Tooltip title="Copy the final prompt sent to Seedream to your clipboard.">
          <span>
            <IconButton
              size="small"
              disabled={!selected?.finalPromptToImageModel}
              onClick={() => selected && handleCopy(selected.finalPromptToImageModel)}
              sx={{ border: `1px solid ${COLORS.border}` }}
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {selected && (
        <Accordion
          disableGutters
          sx={{
            mt: 1.5,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 1.5,
            boxShadow: "none",
            "&:before": { display: "none" },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 36 }}>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              View full prompt
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <Stack spacing={1.5}>
              <PromptBlock title="Scene direction (Claude call 1)" text={selected.sceneDirection} />
              <PromptBlock title="Structured prompt (Claude call 2)" text={selected.scenePromptStructured} />
              <PromptBlock
                title="Final prompt sent to Seedream"
                text={selected.finalPromptToImageModel}
                copyable
                onCopy={handleCopy}
              />
            </Stack>
          </AccordionDetails>
        </Accordion>
      )}

      <ImageZoomDialog open={!!zoomSrc} src={zoomSrc} onClose={() => setZoomSrc(null)} />
    </Box>
  );
}

function PromptBlock({
  title,
  text,
  copyable,
  onCopy,
}: {
  title: string;
  text: string;
  copyable?: boolean;
  onCopy?: (text: string) => void;
}) {
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary }}>
          {title}
        </Typography>
        {copyable && onCopy && (
          <Button size="small" startIcon={<ContentCopyIcon fontSize="small" />} onClick={() => onCopy(text)}>
            Copy
          </Button>
        )}
      </Stack>
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1.25,
          fontSize: "0.78rem",
          fontFamily: "ui-monospace, SFMono-Regular, monospace",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          bgcolor: "#f7f7f8",
          border: `1px solid ${COLORS.border}`,
          borderRadius: 1.25,
          maxHeight: 220,
          overflow: "auto",
        }}
      >
        {text || "—"}
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Per-page card
// ---------------------------------------------------------------------------

function PagePanel({
  storyId,
  pageNumber,
  pageText,
  runsC,
  runsD,
  canGenerate,
  onRunFinished,
  onCopied,
}: {
  storyId: string;
  pageNumber: number;
  pageText: string;
  runsC: PilotIllustrationRun[];
  runsD: PilotIllustrationRun[];
  canGenerate: boolean;
  onRunFinished: (run: PilotIllustrationRun) => void;
  onCopied: () => void;
}) {
  const [bothBusy, setBothBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerateBoth(): Promise<void> {
    setBothBusy(true);
    setError(null);
    try {
      const newRuns = await api.generatePilotRun(storyId, pageNumber, "both");
      for (const r of newRuns) onRunFinished(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setBothBusy(false);
    }
  }

  return (
    <Box
      sx={{
        p: 2,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 2,
        bgcolor: "#fff",
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
        <Chip
          label={`Page ${pageNumber}`}
          size="small"
          sx={{ bgcolor: COLORS.primary, color: "#fff", fontWeight: 700 }}
        />
        <Tooltip title={canGenerate ? "" : "Generate the avatar first."}>
          <span>
            <Button
              variant="outlined"
              size="small"
              disabled={!canGenerate || bothBusy}
              onClick={handleGenerateBoth}
              startIcon={bothBusy ? <CircularProgress size={14} /> : <AutoAwesomeIcon fontSize="small" />}
            >
              {bothBusy ? "Generating C + D…" : "Generate both variants"}
            </Button>
          </span>
        </Tooltip>
      </Stack>

      <Typography
        variant="body2"
        sx={{ color: COLORS.textSecondary, mb: 2, whiteSpace: "pre-wrap", lineHeight: 1.6 }}
      >
        {pageText}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 1.5, borderRadius: 1.5 }}>
          {error}
        </Alert>
      )}

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        alignItems="stretch"
      >
        <VariantColumn
          storyId={storyId}
          pageNumber={pageNumber}
          variant="C"
          runs={runsC}
          canGenerate={canGenerate}
          onRunFinished={onRunFinished}
          onCopied={onCopied}
        />
        <VariantColumn
          storyId={storyId}
          pageNumber={pageNumber}
          variant="D"
          runs={runsD}
          canGenerate={canGenerate}
          onRunFinished={onRunFinished}
          onCopied={onCopied}
        />
      </Stack>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export interface PilotIllustrationPanelProps {
  story: Story;
}

export default function PilotIllustrationPanel({
  story,
}: PilotIllustrationPanelProps) {
  const [styleBible, setStyleBible] = useState<PilotStyleBible | null>(null);
  const [avatar, setAvatar] = useState<PilotAvatar | null>(null);
  const [runs, setRuns] = useState<PilotIllustrationRun[]>([]);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [copySnackbar, setCopySnackbar] = useState(false);

  // Initial load: kick off both Style Bible (auto-generates on first call) and
  // the runs list in parallel. Also reads the avatar off the story doc — it
  // arrives in props.story already.
  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setBootstrapping(true);
      setLoadError(null);
      try {
        const storyAvatarRaw = (story as unknown as { pilotAvatar?: PilotAvatar | null }).pilotAvatar;
        if (storyAvatarRaw && typeof storyAvatarRaw === "object") {
          setAvatar(storyAvatarRaw as PilotAvatar);
        }
        const [bible, runList] = await Promise.all([
          api.getPilotStyleBible(story.id),
          api.listPilotRuns(story.id),
        ]);
        if (cancelled) return;
        setStyleBible(bible);
        setRuns(runList);
      } catch (e) {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : "Failed to load pilot data.");
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [story.id]);

  const byPage = useMemo(() => indexRuns(runs), [runs]);
  const hasAnyRuns = runs.length > 0;
  const canGenerate = avatar !== null;

  function handleRunFinished(run: PilotIllustrationRun): void {
    setRuns((prev) => {
      // Replace if the doc id already exists (e.g. status update), otherwise append.
      const idx = prev.findIndex((r) => r.id === run.id);
      if (idx === -1) return [...prev, run];
      const next = [...prev];
      next[idx] = run;
      return next;
    });
  }

  function handleAvatarGenerated(next: PilotAvatar): void {
    setAvatar(next);
  }

  return (
    <Box sx={{ px: { xs: 2, sm: 3, md: 5 }, pt: 3, pb: 8 }}>
      <Stack spacing={1} sx={{ mb: 3 }}>
        <Typography
          variant="h5"
          sx={{ fontFamily: DESIGN_TOKENS.fontDisplay, fontWeight: 700, color: COLORS.textPrimary }}
        >
          Illustration pilot
        </Typography>
        <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
          Per-scene generation with two prompt variants (C — figurative, D — literal).
          Visible to admin only. Generate the avatar once, then run both variants per page and compare.
        </Typography>
      </Stack>

      {loadError && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {loadError}
        </Alert>
      )}

      {bootstrapping ? (
        <Stack alignItems="center" sx={{ py: 8 }}>
          <CircularProgress size={28} sx={{ color: COLORS.primary }} />
          <Typography variant="caption" sx={{ mt: 1.5, color: COLORS.textSecondary }}>
            Loading pilot data…
          </Typography>
        </Stack>
      ) : (
        <Stack spacing={3}>
          <StyleBibleSection bible={styleBible} />

          <AvatarCard
            avatar={avatar}
            hasAnyRuns={hasAnyRuns}
            onGenerated={handleAvatarGenerated}
          />

          {!canGenerate && (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Generate the character avatar above before kicking off any per-page runs.
              Both variants must share the same avatar for the comparison to be valid.
            </Alert>
          )}

          {(story.pages ?? []).map((p) => {
            const perPage = byPage.get(p.pageNumber) ?? { C: [], D: [] };
            return (
              <PagePanel
                key={p.pageNumber}
                storyId={story.id}
                pageNumber={p.pageNumber}
                pageText={p.text}
                runsC={perPage.C}
                runsD={perPage.D}
                canGenerate={canGenerate}
                onRunFinished={handleRunFinished}
                onCopied={() => setCopySnackbar(true)}
              />
            );
          })}
        </Stack>
      )}

      <Snackbar
        open={copySnackbar}
        autoHideDuration={2000}
        onClose={() => setCopySnackbar(false)}
        message="Prompt copied to clipboard"
      />
    </Box>
  );
}
