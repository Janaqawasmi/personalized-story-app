// client/src/components/brief/BriefForm.tsx
//
// Story Brief form orchestrator.
//
// Manages state for all 5 sections + the pre-brief story type selector.
// Handles:
//   — Section navigation (Save & continue / Back)
//   — Auto-save to localStorage on every section advance
//   — Resume from localStorage on mount
//   — Progress indicator (sections 1–5)
//   — Passing cross-section values to the right child components
//   — Final submission via onSubmit prop
//
// Spec UI requirements §21:
//   1. Progress indicator with labels and completion state per section.
//   2. Save and resume.
//   3. No live story preview (deferred post-pilot).

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Snackbar,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { COLORS } from "../../theme";

import Section1AgeAndScope from "./Section1AgeAndScope";
import Section2ClinicalFoundation from "./Section2ClinicalFoundation";
import Section3TherapeuticArchitecture from "./Section3TherapeuticArchitecture";
import Section4StoryWorld from "./Section4StoryWorld";
import Section5PersonalizationConfig from "./Section5PersonalizationConfig";
import BriefProgressIndicator from "./BriefProgressIndicator";
import ComplexityMeter from "./ComplexityMeter";
import { HardBlockSubmitDialog, HardWarningSubmitDialog } from "./BriefSubmitGateModals";
import BriefSubmitSuccess from "./BriefSubmitSuccess";
import { submitDammaStoryBriefForm } from "../../api/dammaStoryBrief";

import {
  STORY_TYPES,
  createEmptyBrief,
  isSectionComplete,
  normalizeBriefDefaults,
  omitUiOnlyBriefFields,
  PERSONALIZATION_DEFAULT,
  STORY_LENGTH_DEFAULT,
  type AgeAndScope,
  type BriefDefaultsLocaleOptions,
  type ClinicalFoundation,
  type TherapeuticArchitecture,
  type StoryWorld,
  type PersonalizationConfig,
  type CompleteBrief,
  type StoryLanguage,
  type StoryType,
} from "../../types/storyBrief";
import { evaluateBriefSubmitGate, type SubmitGateItem } from "../../validation/briefSubmitGate";
import {
  formatBriefSavedAt,
  translateSubmitGateItems,
  useBriefDateLocale,
  useStoryBriefUi,
} from "../../i18n/storyBriefUi";
import { useLanguage } from "../../i18n/context/useLanguage";
import {
  createNewDraftIdWithEmptyBrief,
  deleteDraftForDraftId,
  loadDraftForDraftId,
  saveDraftForDraftId,
} from "../../utils/briefDraftStorage";
import { ComplexitySignalProvider, useComplexitySignals } from "../../services/complexitySignalTracker";
import { calculateComplexityLoad, type ComplexityLoadResult } from "../../services/complexityBudget";

/**
 * Centered main column (~760–880px per docs/brief-form-ux-notes.md).
 * Avoids full-bleed “stretched” layouts on wide screens.
 */
const BRIEF_FORM_MAX_WIDTH = 840;

/** Page canvas behind the card: frost base + soft wash so the white surface reads as a focused document. */
const BRIEF_PAGE_BG_LAYERS = [
  "linear-gradient(180deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0) 38%)",
  "radial-gradient(ellipse 90% 55% at 50% -8%, rgba(97, 120, 145, 0.06) 0%, transparent 55%)",
  `linear-gradient(180deg, ${COLORS.background} 0%, #E2DCD4 100%)`,
].join(", ");

const briefPageSx = {
  py: { xs: 3, sm: 5, md: 6 },
  px: { xs: 2, sm: 3.5, md: 5 },
  minHeight: "100%",
  boxSizing: "border-box" as const,
  backgroundColor: COLORS.background,
  backgroundImage: BRIEF_PAGE_BG_LAYERS,
  backgroundRepeat: "no-repeat",
};

const briefPaperSx = {
  maxWidth: BRIEF_FORM_MAX_WIDTH,
  width: "100%",
  p: { xs: 2.75, sm: 4, md: 4.5 },
  border: "1px solid rgba(208, 200, 192, 0.55)",
  borderRadius: 2.5,
  backgroundColor: COLORS.surface,
  boxShadow: `
    0 1px 2px rgba(0, 0, 0, 0.05),
    0 24px 64px -24px rgba(97, 120, 145, 0.18)
  `,
};

const briefEmbeddedPaperSx = {
  mx: "auto",
  p: { xs: 2.5, sm: 3.25, md: 3.75 },
  boxShadow: `
    0 1px 2px rgba(0, 0, 0, 0.04),
    0 12px 36px -18px rgba(97, 120, 145, 0.14)
  `,
};

/** Centered brief form page shell. */
function BriefPageShell({
  embedded = false,
  children,
}: {
  embedded?: boolean;
  children: React.ReactNode;
}) {
  if (embedded) {
    return (
      <Paper elevation={0} sx={{ ...briefPaperSx, ...briefEmbeddedPaperSx, width: "100%" }}>
        {children}
      </Paper>
    );
  }

  return (
    <Box component="main" sx={briefPageSx}>
      <Paper elevation={0} sx={{ ...briefPaperSx, mx: "auto" }}>
        {children}
      </Paper>
    </Box>
  );
}

// ============================================================================
// Storage adapter
// ============================================================================

/**
 * Allows BriefForm to be mounted with an external storage backend.
 * When omitted, the form uses briefDraftStorage (the legacy default).
 */
export interface BriefFormStorageAdapter {
  /** Load the initial brief. Called once on mount. */
  load: () => CompleteBrief | null;

  /** Save the brief. Called on section advance, submission prep,
   *  and any other persistence point. */
  save: (brief: CompleteBrief) => void;

  /** Called after successful submission. The adapter handles any
   *  cleanup (e.g., deleting a localStorage draft, or doing nothing
   *  if the store already handled it). */
  onSubmitted: () => void;

  /** Called when the specialist clicks "Create another brief."
   *  Returns the new draftId/storyId to navigate to.
   *  If not provided, the form uses the legacy
   *  createNewDraftIdWithEmptyBrief + navigate behavior. */
  onCreateAnother?: () => string | Promise<string>;
}

// ============================================================================
// Props
// ============================================================================

interface Props {
  /**
   * Called when the psychologist submits the complete brief after safety checks.
   * Must resolve with `{ briefId }` on success (HTTP 2xx equivalent).
   * If omitted, the form POSTs to `/api/admin/damma-story-briefs`.
   */
  onSubmit?: (brief: CompleteBrief) => Promise<{ briefId: string }>;
  storageAdapter?: BriefFormStorageAdapter;
  /** When false, skip the built-in success screen after submit. */
  showSubmitSuccess?: boolean;
  /**
   * Workspace embedding: skip the full-page canvas and use a single card aligned
   * with the specialist dashboard tab panel.
   */
  embedded?: boolean;
  /**
   * Fired when the specialist edits the brief (any section), selects a story type, or advances —
   * not on initial load from storage.
   */
  onUserInteraction?: () => void;
}

// ============================================================================
// Pre-brief: Story Type Selector
// ============================================================================

const CARD_SELECTED_BG = "#EEF2F5";

interface StoryTypeSelectorProps {
  selected: StoryType | null;
  onSelect: (type: StoryType) => void;
  onBegin: () => void;
  compact?: boolean;
}

function StoryTypeSelector({
  selected,
  onSelect,
  onBegin,
  compact = false,
}: StoryTypeSelectorProps) {
  const ui = useStoryBriefUi();

  return (
    <Box>
      {/* Header */}
      <Box mb={compact ? 3.5 : 5}>
        <Typography variant="overline" display="block" color={COLORS.textSecondary} letterSpacing={1} mb={0.5}>
          {ui.preBriefOverline}
        </Typography>
        <Typography variant="h5" fontWeight={700} mb={0.75}>
          {ui.preBriefTitle}
        </Typography>
        <Typography variant="body2" color={COLORS.textSecondary} sx={{ maxWidth: 640 }}>
          {ui.preBriefSubtitle}
        </Typography>
      </Box>

      {/* Story type cards */}
      <Stack spacing={1.25} mb={4}>
        {STORY_TYPES.map((type) => {
          const sel = selected === type;
          // Only Fear & Anxiety is available in the pilot
          const isAvailable = type === "fear_anxiety";
          return (
            <Card
              key={type}
              elevation={0}
              aria-pressed={sel}
              sx={{
                border: sel
                  ? `2px solid ${COLORS.primary}`
                  : `1px solid ${COLORS.border}`,
                backgroundColor: sel ? CARD_SELECTED_BG : COLORS.surface,
                borderRadius: 2.5,
                boxShadow: sel
                  ? "0 4px 16px -4px rgba(97, 120, 145, 0.2)"
                  : "0 1px 3px rgba(0, 0, 0, 0.04)",
                opacity: isAvailable ? 1 : 0.45,
                transition:
                  "border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease",
                "&:hover": isAvailable
                  ? {
                      borderColor: COLORS.primary,
                      boxShadow: "0 6px 20px -6px rgba(97, 120, 145, 0.18)",
                    }
                  : {},
              }}
            >
              <CardActionArea
                onClick={() => isAvailable && onSelect(type)}
                disabled={!isAvailable}
                disableRipple
                sx={{ p: 0 }}
              >
                <Box
                  display="flex"
                  alignItems="flex-start"
                  gap={1.5}
                  px={2.5}
                  py={1.75}
                  width="100%"
                >
                  {/* Radio dot */}
                  <Box
                    aria-hidden="true"
                    sx={{
                      mt: 0.3,
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      flexShrink: 0,
                      border: `2px solid ${sel ? COLORS.primary : COLORS.border}`,
                      backgroundColor: sel ? COLORS.primary : "transparent",
                      transition: "all 0.15s ease",
                    }}
                  />
                  <Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography
                        variant="body2"
                        fontWeight={sel ? 700 : 600}
                        color={sel ? COLORS.primary : COLORS.textPrimary}
                      >
                        {ui.STORY_TYPE_LABELS[type]}
                      </Typography>
                      {!isAvailable && (
                        <Typography
                          variant="caption"
                          sx={{
                            px: 1,
                            py: 0.25,
                            borderRadius: 1,
                            backgroundColor: COLORS.background,
                            color: COLORS.textSecondary,
                            fontSize: "0.65rem",
                          }}
                        >
                          {ui.comingSoon}
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="caption" color={COLORS.textSecondary} lineHeight={1.5}>
                      {ui.STORY_TYPE_DESCRIPTIONS[type]}
                    </Typography>
                  </Box>
                </Box>
              </CardActionArea>
            </Card>
          );
        })}
      </Stack>

      {/* Begin button */}
      <Box display="flex" justifyContent="flex-end">
        <Button
          variant="contained"
          onClick={onBegin}
          disabled={!selected}
          sx={{
            px: 4,
            py: 1.25,
            backgroundColor: COLORS.primary,
            fontWeight: 600,
            textTransform: "none",
            "&:hover": { backgroundColor: COLORS.secondary },
            "&:disabled": { opacity: 0.45 },
          }}
        >
          {ui.beginBrief}
        </Button>
      </Box>
    </Box>
  );
}

function firstIncompleteSection(
  draft: CompleteBrief,
  localeOpts?: BriefDefaultsLocaleOptions,
): number {
  const norm = normalizeBriefDefaults(draft, localeOpts);
  const maxSection = 5;
  for (let s = 1; s <= maxSection; s++) {
    if (!isSectionComplete(s, norm)) return s;
  }
  return maxSection;
}

// ============================================================================
// Legacy storage adapter (wraps briefDraftStorage for backward compat)
// ============================================================================

function legacyAdapter(draftId: string): BriefFormStorageAdapter {
  return {
    load: () => loadDraftForDraftId(draftId),
    save: (brief) => saveDraftForDraftId(draftId, brief),
    onSubmitted: () => deleteDraftForDraftId(draftId),
    onCreateAnother: () => createNewDraftIdWithEmptyBrief(),
  };
}

// ============================================================================
// BriefForm — main orchestrator
// ============================================================================

function BriefFormInner(props: Props) {
  const {
    onSubmit,
    storageAdapter,
    onUserInteraction,
    showSubmitSuccess = true,
    embedded = false,
  } = props;

  const touchUserInteraction = useCallback(() => {
    onUserInteraction?.();
  }, [onUserInteraction]);
  const { draftId, lang } = useParams<{ draftId: string; lang: string }>();
  const navigate = useNavigate();

  const { language } = useLanguage();
  const ui = useStoryBriefUi();
  const dateLocale = useBriefDateLocale();

  const briefLocaleOpts = useMemo((): BriefDefaultsLocaleOptions | undefined => {
    if (language === "en") return undefined;
    return {
      mustNeverDefaults: ui.MUST_NEVER_DEFAULTS,
    };
  }, [language, ui]);

  // ── State ──────────────────────────────────────────────────────────────────

  const [draft, setDraft] = useState<CompleteBrief>(createEmptyBrief);
  /** 0 = pre-brief story type selector; 1–5 = sections */
  const [activeStep, setActiveStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [savedSnackbar, setSavedSnackbar] = useState(false);

  /** Spec §8 hard block — cannot submit until fixed */
  const [hardBlockOpen, setHardBlockOpen] = useState(false);
  const [gateHardBlocks, setGateHardBlocks] = useState<SubmitGateItem[]>([]);
  /** Hard warnings requiring acknowledgment */
  const [hardWarningOpen, setHardWarningOpen] = useState(false);
  const [gateHardWarnings, setGateHardWarnings] = useState<SubmitGateItem[]>([]);
  const [hardWarningAck, setHardWarningAck] = useState(false);

  /** Set after successful API submit — local draft is cleared only from "Create another brief". */
  const [submitSuccess, setSubmitSuccess] = useState<{ briefId: string; jsonText: string } | null>(
    null,
  );
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Final confirmation before sending to server
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmDraft, setConfirmDraft] = useState<CompleteBrief | null>(null);

  // Ref to scroll to the top of the section content on navigation
  const sectionTopRef = useRef<HTMLDivElement | null>(null);

  const theme = useTheme();
  const isMdDown = useMediaQuery(theme.breakpoints.down("md"));
  /** Fixed AppBar (Navbar.tsx height) + small gap — keeps section scroll targets clear of the main header. */
  const briefScrollTopOffsetPx = isMdDown ? 124 : 108;

  const {
    resetComplexitySession,
    shouldShowPreSubmitWarning,
  } = useComplexitySignals();

  /** Spec §21 Layer 3 — pre-submit complexity (red load, no prior checkpoint/length-bump ack) */
  const [complexityPreSubmitOpen, setComplexityPreSubmitOpen] = useState(false);
  const [pendingNormalizedForConfirm, setPendingNormalizedForConfirm] = useState<CompleteBrief | null>(
    null,
  );
  const [complexityPreSubmitSnapshot, setComplexityPreSubmitSnapshot] = useState<ComplexityLoadResult | null>(
    null,
  );

  // ── Resolve storage adapter ────────────────────────────────────────────────

  const adapter = useMemo<BriefFormStorageAdapter>(
    () => storageAdapter ?? legacyAdapter(draftId ?? ""),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storageAdapter, draftId],
  );

  // ── Load draft for this URL id; remount when draftId changes ───────────────

  useEffect(() => {
    if (!draftId && !storageAdapter) return;
    const existing = adapter.load() ?? createEmptyBrief();
    const normalized = normalizeBriefDefaults(existing, briefLocaleOpts);
    setDraft(normalized);
    adapter.save(normalized);
    if (normalized.storyType) {
      setActiveStep(firstIncompleteSection(normalized, briefLocaleOpts));
    } else {
      setActiveStep(0);
    }
    // Only when switching drafts — not when language/default options change (would jump sections).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  useEffect(() => {
    setDraft((d) => normalizeBriefDefaults(d, briefLocaleOpts));
  }, [briefLocaleOpts]);

  // When changing sections, persist UI defaults into draft (avoids setState on every keystroke).
  // Also record highest section opened for progress (1–5).
  useEffect(() => {
    if ((!draftId && !storageAdapter) || !draft.storyType || activeStep === 0) return;
    setDraft((d) => {
      let base = d;
      if (activeStep >= 1 && activeStep <= 5) {
        const prev = d.highestSectionVisited ?? 0;
        if (activeStep > prev) {
          base = { ...d, highestSectionVisited: activeStep };
        }
      }
      const n = normalizeBriefDefaults(base, briefLocaleOpts);
      if (n === d && base === d) return d;
      adapter.save(n);
      return n;
    });
    // adapter is memoized on [storageAdapter, draftId]; draftId is already a dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, activeStep, draft.storyType, briefLocaleOpts]);

  // ── Computed ──────────────────────────────────────────────────────────────

  const personalizationOn = (draft.section4.personalization ?? PERSONALIZATION_DEFAULT) === "yes";
  const progressStepCount: 5 = 5;

  const sectionCompletion: boolean[] = useMemo(() => {
    const norm = normalizeBriefDefaults(draft, briefLocaleOpts);
    const steps = [1, 2, 3, 4, 5];
    return steps.map((n) => isSectionComplete(n, norm));
  }, [draft, briefLocaleOpts]);

  /** Normalized draft for ComplexityMeter — updates as fields change (§16 / §21). */
  const normalizedBriefForComplexity = useMemo(
    () => normalizeBriefDefaults(draft, briefLocaleOpts),
    [draft, briefLocaleOpts],
  );

  /** Sticky meter only while editing Sections 1–5 (not step 0; success view uses early return). */
  const showComplexityMeter =
    !!draft.storyType && activeStep >= 1 && activeStep <= 5;

  const scrollToTop = useCallback(() => {
    const el = sectionTopRef.current;
    if (!el) return;
    const offset = briefScrollTopOffsetPx;
    const run = () => {
      const rect = el.getBoundingClientRect();
      const y = window.scrollY + rect.top - offset;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    };
    requestAnimationFrame(run);
  }, [briefScrollTopOffsetPx]);

  if (!draftId && !storageAdapter) {
    return <Navigate to={`/${lang ?? "he"}/specialist/stories/new`} replace />;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function saveAndAdvance(nextStep: number) {
    touchUserInteraction();
    setDraft((d) => {
      const next = normalizeBriefDefaults({ ...d, savedAt: Date.now() }, briefLocaleOpts);
      adapter.save(next);
      return next;
    });
    setSavedSnackbar(true);
    setActiveStep(nextStep);
    setTimeout(scrollToTop, 50);
  }

  function goBack(prevStep: number) {
    setActiveStep(prevStep);
    setTimeout(scrollToTop, 50);
  }

  // ── Section-level onChange mergers ────────────────────────────────────────

  function updateSection1(updates: Partial<AgeAndScope>) {
    touchUserInteraction();
    setDraft((d) =>
      normalizeBriefDefaults(
        {
          ...d,
          section1: { ...d.section1, ...updates },
        },
        briefLocaleOpts,
      ),
    );
  }

  function updateLanguage(updates: {
    briefLanguage?: StoryLanguage;
    outputLanguage?: StoryLanguage;
  }) {
    touchUserInteraction();
    setDraft((d) => ({ ...d, ...updates }));
  }

  function updateSection2(updates: Partial<ClinicalFoundation>) {
    touchUserInteraction();
    setDraft((d) => ({ ...d, section2: { ...d.section2, ...updates } }));
  }

  function updateSection3(updates: Partial<TherapeuticArchitecture>) {
    touchUserInteraction();
    setDraft((d) => ({ ...d, section3: { ...d.section3, ...updates } }));
  }

  function updateSection4(updates: Partial<StoryWorld>) {
    touchUserInteraction();
    setDraft((d) => ({ ...d, section4: { ...d.section4, ...updates } }));
  }

  function updateSection5(updates: Partial<PersonalizationConfig>) {
    touchUserInteraction();
    setDraft((d) => ({ ...d, section5: { ...d.section5, ...updates } }));
  }

  // ── Submission ────────────────────────────────────────────────────────────

  function runSubmitPipeline(source: CompleteBrief) {
    if (submitting) return;

    let normalized = normalizeBriefDefaults(source, briefLocaleOpts);
    if (normalized !== source) {
      setDraft(normalized);
      adapter.save(normalized);
    }

    const gate = evaluateBriefSubmitGate(normalized);
    if (gate.hardBlocks.length > 0) {
      setGateHardBlocks(gate.hardBlocks);
      setHardBlockOpen(true);
      return;
    }

    const unacked = gate.hardWarnings.filter((w) => !gate.acknowledgedWarningIds.has(w.id));
    if (unacked.length > 0) {
      setGateHardWarnings(unacked);
      setHardWarningAck(false);
      setHardWarningOpen(true);
      return;
    }

    const complexityLoad = calculateComplexityLoad(normalized);
    const storyLength = normalized.section1.storyLength ?? STORY_LENGTH_DEFAULT;
    const isAtMaxStoryLength = storyLength === "extended";
    if (!isAtMaxStoryLength && shouldShowPreSubmitWarning(complexityLoad.state)) {
      setPendingNormalizedForConfirm(normalized);
      setComplexityPreSubmitSnapshot(complexityLoad);
      setComplexityPreSubmitOpen(true);
      return;
    }

    setConfirmDraft(normalized);
    setConfirmOpen(true);
  }

  function attemptSubmit() {
    runSubmitPipeline(draft);
  }

  function continueFromStoryWorld() {
    touchUserInteraction();
    const next = normalizeBriefDefaults({ ...draft, savedAt: Date.now() }, briefLocaleOpts);
    setDraft(next);
    adapter.save(next);
    setSavedSnackbar(true);
    setActiveStep(5);
    setTimeout(scrollToTop, 50);
  }

  function handleHardBlockClose() {
    setHardBlockOpen(false);
    setGateHardBlocks([]);
  }

  function handleHardWarningGoBack() {
    setHardWarningOpen(false);
    setGateHardWarnings([]);
    setHardWarningAck(false);
  }

  function handleHardWarningProceed() {
    const ids = gateHardWarnings.map((w) => w.id);
    const merged: CompleteBrief = {
      ...draft,
      acknowledgedWarnings: Array.from(
        new Set([...(draft.acknowledgedWarnings ?? []), ...ids]),
      ),
    };
    const finalDraft = normalizeBriefDefaults(merged, briefLocaleOpts);
    setDraft(finalDraft);
    adapter.save(finalDraft);
    setHardWarningOpen(false);
    setGateHardWarnings([]);
    setHardWarningAck(false);
    runSubmitPipeline(finalDraft);
  }

  function handleConfirmClose() {
    if (submitting) return;
    setConfirmOpen(false);
    setConfirmDraft(null);
  }

  function handleConfirmSubmit() {
    if (submitting) return;
    if (!confirmDraft) return;
    setConfirmOpen(false);
    const toSubmit = confirmDraft;
    setConfirmDraft(null);
    void submitBrief(toSubmit);
  }

  function handleComplexityPreSubmitAnyway() {
    if (!pendingNormalizedForConfirm) {
      console.warn(
        "[BriefForm] handleComplexityPreSubmitAnyway called with no pending normalized draft; this should be unreachable in normal usage.",
      );
      return;
    }
    setComplexityPreSubmitOpen(false);
    const pending = pendingNormalizedForConfirm;
    setPendingNormalizedForConfirm(null);
    setComplexityPreSubmitSnapshot(null);
    if (pending) {
      setConfirmDraft(pending);
      setConfirmOpen(true);
    }
  }

  function handleComplexityPreSubmitGoBack() {
    setComplexityPreSubmitOpen(false);
    setPendingNormalizedForConfirm(null);
    setComplexityPreSubmitSnapshot(null);
  }

  async function submitBrief(brief: CompleteBrief) {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const finalDraft = normalizeBriefDefaults(brief, briefLocaleOpts);
      if (finalDraft !== brief) {
        setDraft(finalDraft);
        adapter.save(finalDraft);
      }
      const forSubmit = omitUiOnlyBriefFields(finalDraft);
      const jsonText = JSON.stringify(forSubmit, null, 2);
      let briefId: string;
      if (onSubmit) {
        const result = await onSubmit(forSubmit);
        briefId = result.briefId;
      } else {
        const result = await submitDammaStoryBriefForm(forSubmit);
        briefId = result.briefId;
      }
      adapter.onSubmitted();
      resetComplexitySession();
      if (showSubmitSuccess) {
        setSubmitSuccess({ briefId, jsonText });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : ui.submitErrorGeneric;
      setSubmitError(message);
      console.error("[BriefForm] Submission failed:", err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateAnotherBrief() {
    adapter.onSubmitted();
    resetComplexitySession();
    setSubmitSuccess(null);
    setSubmitError(null);
    const nid = adapter.onCreateAnother
      ? await adapter.onCreateAnother()
      : createNewDraftIdWithEmptyBrief();
    navigate(`/${lang ?? "he"}/specialist/stories/${nid}/brief`, { replace: true });
  }

  // ── Post-submit success ─

  if (showSubmitSuccess && submitSuccess) {
    return (
      <BriefPageShell embedded={embedded}>
        <BriefSubmitSuccess
          briefId={submitSuccess.briefId}
          jsonText={submitSuccess.jsonText}
          onCreateAnother={handleCreateAnotherBrief}
        />
      </BriefPageShell>
    );
  }

  // ── The pre-brief story type selector ────────────────────────────────────

  if (activeStep === 0) {
    return (
      <BriefPageShell embedded={embedded}>
        <StoryTypeSelector
          selected={draft.storyType}
          compact={embedded}
          onSelect={(type: StoryType) => {
            touchUserInteraction();
            setDraft((d) => ({ ...d, storyType: type }));
          }}
          onBegin={() => {
            if (draft.storyType) saveAndAdvance(1);
          }}
        />
      </BriefPageShell>
    );
  }

  // ── Active section (steps 1–5) ─────────────────────────────────────────────

  const storyType = draft.storyType ?? "fear_anxiety";
  const ageRange = draft.section1.ageRange ?? null;
  const personalization = draft.section4.personalization ?? "yes";

  return (
    <>
    <BriefPageShell embedded={embedded}>
      {/* ── Form header with save indicator ────────────────────────── */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={1}
        pb={embedded ? 1.5 : 2}
        mb={embedded ? 2 : 2.5}
        ref={sectionTopRef}
        sx={{
          borderBottom: "1px solid rgba(208, 200, 192, 0.45)",
        }}
      >
          <Typography
            variant="overline"
            sx={{
              letterSpacing: "0.1em",
              fontWeight: 700,
              color: COLORS.primary,
              fontSize: "0.7rem",
              lineHeight: 1.4,
            }}
          >
            {ui.STORY_TYPE_LABELS[storyType]}
          </Typography>
          {draft.savedAt && (
            <Typography
              variant="caption"
              color={COLORS.textSecondary}
              sx={{ fontWeight: 500, opacity: 0.9 }}
            >
              {ui.savedPrefix} {formatBriefSavedAt(draft.savedAt, dateLocale)}
            </Typography>
          )}
        </Box>

        {showComplexityMeter && (
          <ComplexityMeter
            brief={normalizedBriefForComplexity}
            onLengthChange={(next) => updateSection1({ storyLength: next })}
          />
        )}

        {/* ── Progress indicator ─────────────────────────────────────── */}
        <Box
          sx={{
            mb: embedded ? 2.5 : { xs: 3, md: 4 },
            py: embedded ? 1.5 : 2,
            px: { xs: 0.75, sm: 1.5 },
            borderRadius: 2,
            bgcolor: "rgba(97, 120, 145, 0.04)",
            border: "1px solid rgba(208, 200, 192, 0.35)",
          }}
        >
          <BriefProgressIndicator
            currentSection={activeStep}
            sectionCompletion={sectionCompletion}
            totalSections={progressStepCount}
            onNavigate={(section) => {
              if (section < activeStep || sectionCompletion[section - 1]) {
                setActiveStep(section);
                setTimeout(scrollToTop, 50);
              }
            }}
          />
        </Box>

        {/* ── Section content ────────────────────────────────────────── */}
        {activeStep === 1 && (
          <Section1AgeAndScope
            value={draft.section1}
            onChange={updateSection1}
            briefLanguage={draft.briefLanguage ?? "en"}
            outputLanguage={draft.outputLanguage ?? "en"}
            onLanguageChange={updateLanguage}
            onContinue={() => saveAndAdvance(2)}
            onBack={() => goBack(0)}
          />
        )}

        {activeStep === 2 && (
          <Section2ClinicalFoundation
            storyType={storyType}
            value={draft.section2}
            onChange={updateSection2}
            onContinue={() => saveAndAdvance(3)}
            onBack={() => goBack(1)}
          />
        )}

        {activeStep === 3 && (
          <Section3TherapeuticArchitecture
            storyType={storyType}
            ageRange={ageRange}
            value={draft.section3}
            onChange={updateSection3}
            onContinue={() => saveAndAdvance(4)}
            onBack={() => goBack(2)}
          />
        )}

        {activeStep === 4 && (
          <Section4StoryWorld
            ageRange={ageRange}
            value={draft.section4}
            onChange={updateSection4}
            onContinue={continueFromStoryWorld}
            continueLabel={ui.saveContinue}
            continueIsSubmit={false}
            submitting={submitting}
            onBack={() => goBack(3)}
          />
        )}

        {activeStep === 5 && (
          <Section5PersonalizationConfig
            personalization={personalizationOn ? "yes" : "no"}
            value={draft.section5}
            onChange={updateSection5}
            onSubmit={attemptSubmit}
            onBack={() => goBack(4)}
            submitting={submitting}
          />
        )}
    </BriefPageShell>

      {/* §21 Layer 1 — story load: horizontal strip at top of brief card (scrolls with content). */}

      {/* ── "Saved" snackbar ─────────────────────────────────────────── */}
      <Snackbar
        open={savedSnackbar}
        autoHideDuration={2200}
        onClose={() => setSavedSnackbar(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="success"
          onClose={() => setSavedSnackbar(false)}
          sx={{
            borderRadius: 2,
            "& .MuiAlert-message": { fontSize: "0.875rem" },
          }}
        >
          {ui.draftSavedSnackbar}
        </Alert>
      </Snackbar>

      <Dialog
        open={complexityPreSubmitOpen}
        onClose={(_e, reason) => {
          if (reason === "backdropClick" || reason === "escapeKeyDown") return;
        }}
        disableEscapeKeyDown
        fullWidth
        maxWidth="sm"
        aria-labelledby="pre-submit-complexity-title"
        PaperProps={{
          sx: {
            borderRadius: 2.5,
            border: `1px solid rgba(208, 200, 192, 0.55)`,
            bgcolor: COLORS.surface,
          },
        }}
      >
        <DialogTitle id="pre-submit-complexity-title" sx={{ fontWeight: 800 }}>
          {ui.preSubmitComplexityTitle}
        </DialogTitle>
        <DialogContent>
          {complexityPreSubmitSnapshot && pendingNormalizedForConfirm && (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.75 }}>
                {ui.preSubmitComplexityBody(
                  complexityPreSubmitSnapshot.totalPageCost,
                  ui.STORY_LENGTH_LABELS[
                    pendingNormalizedForConfirm.section1.storyLength ?? STORY_LENGTH_DEFAULT
                  ],
                  complexityPreSubmitSnapshot.budget.min,
                  complexityPreSubmitSnapshot.budget.max,
                )}
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: COLORS.primary }}>
                {ui.preSubmitComplexityBreakdownHeading}
              </Typography>
              <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2.5, listStyle: "disc" }}>
                {complexityPreSubmitSnapshot.breakdown.map((row) => (
                  <Typography
                    key={row.id}
                    component="li"
                    variant="body2"
                    sx={{ lineHeight: 1.55 }}
                  >
                    {ui.complexityBreakdownLine(row.displayLabel, row.scaledCost)}
                  </Typography>
                ))}
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1, flexWrap: "wrap" }}>
          <Button
            type="button"
            onClick={handleComplexityPreSubmitGoBack}
            disabled={submitting}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            {ui.preSubmitComplexityGoBack}
          </Button>
          <Button
            type="button"
            variant="contained"
            color="primary"
            onClick={handleComplexityPreSubmitAnyway}
            disabled={submitting}
            sx={{ textTransform: "none", fontWeight: 800 }}
          >
            {ui.preSubmitComplexitySubmitAnyway}
          </Button>
        </DialogActions>
      </Dialog>

      <HardBlockSubmitDialog
        open={hardBlockOpen}
        items={translateSubmitGateItems(gateHardBlocks, ui)}
        onClose={handleHardBlockClose}
      />
      <HardWarningSubmitDialog
        open={hardWarningOpen}
        items={translateSubmitGateItems(gateHardWarnings, ui)}
        understood={hardWarningAck}
        onUnderstoodChange={setHardWarningAck}
        onGoBack={handleHardWarningGoBack}
        onProceed={handleHardWarningProceed}
      />

      <Dialog open={confirmOpen} onClose={handleConfirmClose} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>{ui.confirmSubmitTitle}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
            {ui.confirmSubmitBody}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleConfirmClose} disabled={submitting} sx={{ textTransform: "none" }}>
            {ui.confirmSubmitCancel}
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmSubmit}
            disabled={submitting}
            sx={{ textTransform: "none", fontWeight: 800 }}
          >
            {ui.confirmSubmitConfirm}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={submitError != null}
        autoHideDuration={8000}
        onClose={() => setSubmitError(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="error"
          onClose={() => setSubmitError(null)}
          variant="filled"
          sx={{ borderRadius: 2, alignItems: "center" }}
        >
          {submitError}
        </Alert>
      </Snackbar>
    </>
  );
}

export default function BriefForm(props: Props) {
  const { draftId } = useParams<{ draftId: string; lang: string }>();
  return (
    <ComplexitySignalProvider key={draftId ?? "draft"}>
      <BriefFormInner {...props} />
    </ComplexitySignalProvider>
  );
}
