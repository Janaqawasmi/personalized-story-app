/**
 * Text Variants Review Page (Phase 3)
 *
 * Specialist self-review gate for gendered text personalization.
 * Route: /:lang/specialist/templates/:templateId/text-variants
 *
 * Flow:
 *   1. Load variant status for the template.
 *   2. If none generated yet → show "Generate variants" button.
 *   3. Per page: original text, editable masculine/feminine textareas, approve button.
 *   4. When all pages are approved → "Activate text personalization" finalizes and
 *      flips textPersonalizationReady = true on the template.
 *
 * The template's pages[].textTemplate is only updated on finalize — until then
 * the public caregiver flow remains unaffected.
 */

import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  Stack,
  TextField,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import { useParams } from "react-router-dom";
import { useLangNavigate } from "../../i18n/navigation";
import {
  getTextVariants,
  generateTextVariants,
  updateTextVariant,
  approveTextVariant,
  finalizeTextVariants,
  type TextVariantDoc,
  type TextVariantsResponse,
} from "../../api/specialistTemplatesApi";
import { COLORS } from "../../theme";

const CHILD_NAME_PLACEHOLDER = "{{CHILD_NAME}}";

function hasPlaceholder(text: string): boolean {
  return text.includes(CHILD_NAME_PLACEHOLDER);
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-page variant card
// ─────────────────────────────────────────────────────────────────────────────

interface PageVariantCardProps {
  variant: TextVariantDoc;
  onSaveAndApprove: (
    pageNumber: number,
    masculine: string,
    feminine: string,
  ) => Promise<void>;
  disabled: boolean;
}

function PageVariantCard({ variant, onSaveAndApprove, disabled }: PageVariantCardProps) {
  const [masculine, setMasculine] = useState(variant.masculine);
  const [feminine, setFeminine] = useState(variant.feminine);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Reset local state if parent pushes updated variant (e.g. after re-generate).
  useEffect(() => {
    setMasculine(variant.masculine);
    setFeminine(variant.feminine);
    setErr(null);
  }, [variant.masculine, variant.feminine]);

  const isApproved = variant.reviewStatus === "approved";
  const isDirty = masculine !== variant.masculine || feminine !== variant.feminine;

  const mOk = hasPlaceholder(masculine);
  const fOk = hasPlaceholder(feminine);
  const canApprove = mOk && fOk && !busy && !disabled;

  async function handleApprove() {
    setBusy(true);
    setErr(null);
    try {
      await onSaveAndApprove(variant.pageNumber, masculine, feminine);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box
      sx={{
        border: `1px solid ${isApproved ? COLORS.success ?? "#4caf50" : "#e0e0e0"}`,
        borderRadius: 2,
        p: 2.5,
        bgcolor: isApproved ? "rgba(76,175,80,0.04)" : "#fff",
      }}
    >
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        {isApproved ? (
          <CheckCircleOutlineIcon sx={{ fontSize: 18, color: "success.main" }} />
        ) : (
          <RadioButtonUncheckedIcon sx={{ fontSize: 18, color: "text.disabled" }} />
        )}
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Page {variant.pageNumber}
        </Typography>
        {isApproved && (
          <Chip label="Approved" color="success" size="small" />
        )}
        {!isApproved && !isDirty && (
          <Chip label="Pending review" size="small" variant="outlined" />
        )}
        {isDirty && (
          <Chip label="Edited — not yet approved" size="small" color="warning" variant="outlined" />
        )}
      </Stack>

      {/* Original text */}
      <Typography
        variant="caption"
        sx={{ color: "text.secondary", display: "block", mb: 0.5 }}
      >
        Original text
      </Typography>
      <Box
        sx={{
          bgcolor: "#f9f7f5",
          border: "1px solid #e0e0e0",
          borderRadius: 1,
          p: 1.25,
          mb: 2,
          fontSize: 13,
          fontFamily: "monospace",
          whiteSpace: "pre-wrap",
          direction: "rtl",
        }}
      >
        {variant.originalText || "(empty)"}
      </Box>

      {/* Editable variants */}
      <Stack spacing={2}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              Masculine variant
            </Typography>
            {!mOk && (
              <Chip
                label={`Missing ${CHILD_NAME_PLACEHOLDER}`}
                size="small"
                color="error"
                variant="outlined"
              />
            )}
          </Stack>
          <TextField
            multiline
            fullWidth
            minRows={3}
            value={masculine}
            onChange={(e) => setMasculine(e.target.value)}
            disabled={disabled || busy}
            inputProps={{ dir: "rtl", style: { fontFamily: "monospace", fontSize: 13 } }}
            size="small"
          />
        </Box>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              Feminine variant
            </Typography>
            {!fOk && (
              <Chip
                label={`Missing ${CHILD_NAME_PLACEHOLDER}`}
                size="small"
                color="error"
                variant="outlined"
              />
            )}
          </Stack>
          <TextField
            multiline
            fullWidth
            minRows={3}
            value={feminine}
            onChange={(e) => setFeminine(e.target.value)}
            disabled={disabled || busy}
            inputProps={{ dir: "rtl", style: { fontFamily: "monospace", fontSize: 13 } }}
            size="small"
          />
        </Box>
      </Stack>

      {err && (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {err}
        </Alert>
      )}

      <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1.5 }}>
        <Button
          variant={isApproved && !isDirty ? "outlined" : "contained"}
          color={isApproved && !isDirty ? "success" : "primary"}
          disabled={!canApprove}
          size="small"
          onClick={handleApprove}
          startIcon={busy ? <CircularProgress size={14} /> : undefined}
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          {busy
            ? "Saving…"
            : isApproved && !isDirty
            ? "Approved ✓"
            : isDirty
            ? "Save & approve"
            : "Approve"}
        </Button>
      </Stack>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function TextVariantsReviewPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useLangNavigate();

  const [state, setState] = useState<TextVariantsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    if (!templateId) return;
    try {
      const result = await getTextVariants(templateId);
      setState(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => { load(); }, [load]);

  async function handleGenerate() {
    if (!templateId) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await generateTextVariants(templateId);
      setState(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveAndApprove(
    pageNumber: number,
    masculine: string,
    feminine: string,
  ) {
    if (!templateId) return;
    // Save edits if changed, then approve.
    await updateTextVariant(templateId, pageNumber, { masculine, feminine });
    await approveTextVariant(templateId, pageNumber);
    // Refresh state so the card reflects the new reviewStatus.
    const result = await getTextVariants(templateId);
    setState(result);
  }

  async function handleFinalize() {
    if (!templateId) return;
    setFinalizing(true);
    setFinalizeError(null);
    try {
      await finalizeTextVariants(templateId);
      setDone(true);
    } catch (e) {
      setFinalizeError(e instanceof Error ? e.message : String(e));
    } finally {
      setFinalizing(false);
    }
  }

  // ── Derived state ───────────────────────────────────────────────────────────
  const variants = state?.variants ?? [];
  const totalPages = variants.length;
  const approvedCount = variants.filter((v) => v.reviewStatus === "approved").length;
  const allApproved = totalPages > 0 && approvedCount === totalPages;
  const hasVariants = state?.textVariantStatus === "pending_review" || variants.length > 0;

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (done) {
    return (
      <Box sx={{ maxWidth: 640, mx: "auto", mt: 8, textAlign: "center", px: 3 }}>
        <CheckCircleOutlineIcon sx={{ fontSize: 56, color: "success.main", mb: 2 }} />
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Text personalization activated
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          All variants approved. Caregivers can now personalize this story with their child's name.
        </Typography>
        <Button
          variant="outlined"
          onClick={() => navigate("/specialist/stories")}
          sx={{ textTransform: "none" }}
        >
          Back to stories
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", px: 3, py: 4 }}>
      {/* Header */}
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Text Variant Review
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 0.5 }}>
        Template: <code>{templateId}</code>
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3, fontSize: 14 }}>
        Review masculine and feminine variants for every page. Both variants must contain{" "}
        <code>{CHILD_NAME_PLACEHOLDER}</code>. Approve each page, then activate text personalization.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Generate button — shown when no variants exist yet or to re-generate */}
      {!hasVariants ? (
        <Box sx={{ mb: 4 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            No variants generated yet. Click below to generate masculine and feminine text
            variants for all pages using AI. You can edit them before approving.
          </Alert>
          <Button
            variant="contained"
            startIcon={generating ? <CircularProgress size={16} color="inherit" /> : <AutoFixHighIcon />}
            disabled={generating}
            onClick={handleGenerate}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            {generating ? "Generating variants…" : "Generate variants with AI"}
          </Button>
        </Box>
      ) : (
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            {approvedCount} / {totalPages} pages approved
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={generating ? <CircularProgress size={14} color="inherit" /> : <AutoFixHighIcon />}
            disabled={generating || finalizing}
            onClick={handleGenerate}
            sx={{ textTransform: "none" }}
          >
            {generating ? "Re-generating…" : "Re-generate all"}
          </Button>
        </Stack>
      )}

      {/* Page cards */}
      <Stack spacing={2.5}>
        {variants.map((variant) => (
          <PageVariantCard
            key={variant.pageNumber}
            variant={variant}
            onSaveAndApprove={handleSaveAndApprove}
            disabled={finalizing}
          />
        ))}
      </Stack>

      {/* Finalize bar */}
      {hasVariants && (
        <>
          <Divider sx={{ mt: 4, mb: 3 }} />
          {finalizeError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {finalizeError}
            </Alert>
          )}
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box sx={{ flex: 1 }}>
              {allApproved ? (
                <Typography variant="body2" color="success.main" fontWeight={600}>
                  All {totalPages} pages approved — ready to activate.
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {totalPages - approvedCount} page(s) still need approval.
                </Typography>
              )}
            </Box>
            <Button
              variant="contained"
              color="success"
              disabled={!allApproved || finalizing}
              onClick={handleFinalize}
              startIcon={finalizing ? <CircularProgress size={16} color="inherit" /> : undefined}
              sx={{ textTransform: "none", fontWeight: 700, flexShrink: 0 }}
            >
              {finalizing ? "Activating…" : "Activate text personalization"}
            </Button>
          </Stack>
        </>
      )}
    </Box>
  );
}
