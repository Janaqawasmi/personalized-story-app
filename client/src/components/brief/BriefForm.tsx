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
import { useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { COLORS } from "../../theme";

import Section1AgeAndScope from "./Section1AgeAndScope";
import Section2ClinicalFoundation from "./Section2ClinicalFoundation";
import Section3TherapeuticArchitecture from "./Section3TherapeuticArchitecture";
import Section4StoryWorld from "./Section4StoryWorld";
import Section5PersonalizationConfig from "./Section5PersonalizationConfig";
import BriefProgressIndicator from "./BriefProgressIndicator";
import { HardBlockSubmitDialog, HardWarningSubmitDialog } from "./BriefSubmitGateModals";
import BriefSubmitSuccess from "./BriefSubmitSuccess";
import BriefFeedbackPanel from "./BriefFeedbackPanel";
import { submitDammaStoryBriefForm } from "../../api/dammaStoryBrief";

import {
  STORY_TYPES,
  STORY_TYPE_LABELS,
  STORY_TYPE_DESCRIPTIONS,
  createEmptyBrief,
  isSectionComplete,
  normalizeBriefDefaults,
  omitUiOnlyBriefFields,
  type AgeAndScope,
  type ClinicalFoundation,
  type TherapeuticArchitecture,
  type StoryWorld,
  type PersonalizationConfig,
  type CompleteBrief,
  type StoryType,
} from "../../types/storyBrief";
import { evaluateBriefSubmitGate, type SubmitGateItem } from "../../validation/briefSubmitGate";

// ============================================================================
// localStorage helpers
// ============================================================================

const DRAFT_STORAGE_KEY = "dammah_brief_draft_v1";

function saveDraftToStorage(draft: CompleteBrief): void {
  try {
    localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({ ...draft, savedAt: Date.now() })
    );
  } catch {
    // Storage quota exceeded or unavailable — fail silently
  }
}

function loadDraftFromStorage(): CompleteBrief | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CompleteBrief;
  } catch {
    return null;
  }
}

function clearDraftFromStorage(): void {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

function formatSavedAt(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Today at ${time}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} at ${time}`;
}

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

/**
 * Story brief main column + sticky feedback column (desktop).
 */
function BriefPageWithSidebar({
  briefId,
  activeStep,
  personalization,
  children,
}: {
  briefId: string | null;
  activeStep: number | null;
  personalization: "yes" | "no";
  children: React.ReactNode;
}) {
  return (
    <Box component="main" sx={briefPageSx}>
      <Box
        sx={{
          width: "100%",
          maxWidth: { md: BRIEF_FORM_MAX_WIDTH + 360 + 32 },
          mx: "auto",
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: "flex-start",
          gap: { xs: 3, md: 3 },
        }}
      >
        <Paper
          elevation={0}
          sx={{
            ...briefPaperSx,
            flex: "1 1 auto",
            minWidth: 0,
            mx: { xs: "auto", md: 0 },
          }}
        >
          {children}
        </Paper>
        <BriefFeedbackPanel
          briefId={briefId}
          activeStep={activeStep}
          personalization={personalization}
        />
      </Box>
    </Box>
  );
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
}

// ============================================================================
// Pre-brief: Story Type Selector
// ============================================================================

const CARD_SELECTED_BG = "#EEF2F5";

interface StoryTypeSelectorProps {
  selected: StoryType | null;
  onSelect: (type: StoryType) => void;
  onBegin: () => void;
  savedDraft: CompleteBrief | null;
  onResumeDraft: () => void;
  onDiscardDraft: () => void;
}

function StoryTypeSelector({
  selected,
  onSelect,
  onBegin,
  savedDraft,
  onResumeDraft,
  onDiscardDraft,
}: StoryTypeSelectorProps) {
  return (
    <Box>
      {/* Resume banner */}
      {savedDraft && savedDraft.storyType && (
        <Alert
          severity="info"
          sx={{
            mb: 3,
            borderRadius: 2,
            border: `1px solid ${COLORS.border}`,
            backgroundColor: CARD_SELECTED_BG,
            "& .MuiAlert-message": { width: "100%" },
          }}
          icon={false}
        >
          <Box
            display="flex"
            alignItems={{ xs: "flex-start", sm: "center" }}
            flexDirection={{ xs: "column", sm: "row" }}
            gap={1.5}
          >
            <Box flex={1}>
              <Typography variant="body2" fontWeight={600} color={COLORS.primary}>
                You have a saved draft
              </Typography>
              <Typography variant="caption" color={COLORS.textSecondary}>
                {STORY_TYPE_LABELS[savedDraft.storyType]} brief
                {savedDraft.savedAt ? ` — saved ${formatSavedAt(savedDraft.savedAt)}` : ""}
              </Typography>
            </Box>
            <Box display="flex" gap={1} flexShrink={0}>
              <Button
                size="small"
                variant="contained"
                onClick={onResumeDraft}
                sx={{
                  textTransform: "none",
                  backgroundColor: COLORS.primary,
                  fontWeight: 600,
                  "&:hover": { backgroundColor: COLORS.secondary },
                }}
              >
                Resume
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={onDiscardDraft}
                sx={{
                  textTransform: "none",
                  borderColor: COLORS.border,
                  color: COLORS.textSecondary,
                  "&:hover": { borderColor: COLORS.secondary, color: COLORS.secondary },
                }}
              >
                Start over
              </Button>
            </Box>
          </Box>
        </Alert>
      )}

      {/* Header */}
      <Box mb={5}>
        <Typography variant="overline" display="block" color={COLORS.textSecondary} letterSpacing={1} mb={0.5}>
          Pre-brief
        </Typography>
        <Typography variant="h5" fontWeight={700} mb={0.75}>
          Choose the lens this story looks through
        </Typography>
        <Typography variant="body2" color={COLORS.textSecondary} sx={{ maxWidth: 640 }}>
          The story type determines which fields appear, which options are available, and which
          clinical defaults are loaded. It is a therapeutic lens, not a diagnosis.
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
                        {STORY_TYPE_LABELS[type]}
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
                          Coming soon
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="caption" color={COLORS.textSecondary} lineHeight={1.5}>
                      {STORY_TYPE_DESCRIPTIONS[type]}
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
          Begin brief →
        </Button>
      </Box>
    </Box>
  );
}

// ============================================================================
// BriefForm — main orchestrator
// ============================================================================

export default function BriefForm({ onSubmit }: Props) {
  const [searchParams] = useSearchParams();
  const briefIdFromUrl = searchParams.get("briefId")?.trim() || null;

  // ── State ──────────────────────────────────────────────────────────────────

  const [draft, setDraft] = useState<CompleteBrief>(createEmptyBrief);
  /** 0 = pre-brief story type selector; 1–5 = sections */
  const [activeStep, setActiveStep] = useState(0);
  const [savedDraft, setSavedDraft] = useState<CompleteBrief | null>(null);
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

  // Ref to scroll to the top of the section content on navigation
  const sectionTopRef = useRef<HTMLDivElement | null>(null);

  const feedbackBriefId = submitSuccess?.briefId ?? briefIdFromUrl;

  // ── Load saved draft on mount ──────────────────────────────────────────────

  useEffect(() => {
    const existing = loadDraftFromStorage();
    if (existing?.storyType) {
      const normalized = normalizeBriefDefaults(existing);
      setSavedDraft(normalized);
      if (normalized !== existing) {
        saveDraftToStorage(normalized);
      }
    }
  }, []);

  // When changing sections, persist UI defaults into draft (avoids setState on every keystroke).
  // Also record highest section opened so Section 5 progress stays honest when personalization is ON.
  useEffect(() => {
    if (!draft.storyType || activeStep === 0) return;
    setDraft((d) => {
      let base = d;
      if (activeStep >= 1 && activeStep <= 5) {
        const prev = d.highestSectionVisited ?? 0;
        if (activeStep > prev) {
          base = { ...d, highestSectionVisited: activeStep };
        }
      }
      const n = normalizeBriefDefaults(base);
      if (n === d && base === d) return d;
      saveDraftToStorage(n);
      return n;
    });
  }, [activeStep, draft.storyType]);

  // ── Computed ──────────────────────────────────────────────────────────────

  const sectionCompletion: boolean[] = useMemo(
    () => [1, 2, 3, 4, 5].map((n) => isSectionComplete(n, normalizeBriefDefaults(draft))),
    [draft],
  );

  // ── Helpers ───────────────────────────────────────────────────────────────

  const scrollToTop = useCallback(() => {
    sectionTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  function saveAndAdvance(nextStep: number) {
    setDraft((d) => {
      const next = normalizeBriefDefaults({ ...d, savedAt: Date.now() });
      saveDraftToStorage(next);
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
    setDraft((d) =>
      normalizeBriefDefaults({
        ...d,
        section1: { ...d.section1, ...updates },
      }),
    );
  }

  function updateSection2(updates: Partial<ClinicalFoundation>) {
    setDraft((d) => ({ ...d, section2: { ...d.section2, ...updates } }));
  }

  function updateSection3(updates: Partial<TherapeuticArchitecture>) {
    setDraft((d) => ({ ...d, section3: { ...d.section3, ...updates } }));
  }

  function updateSection4(updates: Partial<StoryWorld>) {
    setDraft((d) => ({ ...d, section4: { ...d.section4, ...updates } }));
  }

  function updateSection5(updates: Partial<PersonalizationConfig>) {
    setDraft((d) => ({ ...d, section5: { ...d.section5, ...updates } }));
  }

  // ── Submission ────────────────────────────────────────────────────────────

  function attemptSubmit() {
    if (submitting) return;

    let normalized = normalizeBriefDefaults(draft);
    if (normalized !== draft) {
      setDraft(normalized);
      saveDraftToStorage(normalized);
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

    void submitBrief(normalized);
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
    const finalDraft = normalizeBriefDefaults(merged);
    setDraft(finalDraft);
    saveDraftToStorage(finalDraft);
    setHardWarningOpen(false);
    setGateHardWarnings([]);
    setHardWarningAck(false);
    void submitBrief(finalDraft);
  }

  async function submitBrief(brief: CompleteBrief) {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const finalDraft = normalizeBriefDefaults(brief);
      if (finalDraft !== brief) {
        setDraft(finalDraft);
        saveDraftToStorage(finalDraft);
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
      setSubmitSuccess({ briefId, jsonText });
      // Intentionally keep localStorage until the user explicitly starts a new brief.
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong while submitting. Please try again.";
      setSubmitError(message);
      console.error("[BriefForm] Submission failed:", err);
    } finally {
      setSubmitting(false);
    }
  }

  function handleCreateAnotherBrief() {
    clearDraftFromStorage();
    setSavedDraft(null);
    setSubmitSuccess(null);
    setSubmitError(null);
    setDraft(createEmptyBrief());
    setActiveStep(0);
  }

  // ── Resume / discard ──────────────────────────────────────────────────────

  function handleResumeDraft() {
    if (!savedDraft) return;
    const normalized = normalizeBriefDefaults(savedDraft);
    setDraft(normalized);
    saveDraftToStorage(normalized);
    setSavedDraft(null);
    // Determine which step to resume at: the first incomplete section
    let resumeStep = 1;
    for (let s = 1; s <= 5; s++) {
      if (!isSectionComplete(s, normalized)) {
        resumeStep = s;
        break;
      }
      resumeStep = 5; // all complete → go to last section
    }
    setActiveStep(resumeStep);
  }

  function handleDiscardDraft() {
    clearDraftFromStorage();
    setSavedDraft(null);
  }

  // ── Post-submit success (draft kept in storage until "Create another brief") ─

  if (submitSuccess) {
    return (
      <BriefPageWithSidebar
        briefId={feedbackBriefId}
        activeStep={null}
        personalization="yes"
      >
        <BriefSubmitSuccess
          briefId={submitSuccess.briefId}
          jsonText={submitSuccess.jsonText}
          onCreateAnother={handleCreateAnotherBrief}
        />
      </BriefPageWithSidebar>
    );
  }

  // ── The pre-brief story type selector ────────────────────────────────────

  if (activeStep === 0) {
    return (
      <BriefPageWithSidebar
        briefId={feedbackBriefId}
        activeStep={0}
        personalization="yes"
      >
        <StoryTypeSelector
          selected={draft.storyType}
          onSelect={(type: StoryType) => setDraft((d) => ({ ...d, storyType: type }))}
          onBegin={() => {
            if (draft.storyType) saveAndAdvance(1);
          }}
          savedDraft={savedDraft}
          onResumeDraft={handleResumeDraft}
          onDiscardDraft={handleDiscardDraft}
        />
      </BriefPageWithSidebar>
    );
  }

  // ── Active section (steps 1–5) ─────────────────────────────────────────────

  const storyType = draft.storyType ?? "fear_anxiety";
  const ageRange = draft.section1.ageRange ?? null;
  const personalization = draft.section4.personalization ?? "yes";

  return (
    <>
    <BriefPageWithSidebar
      briefId={feedbackBriefId}
      activeStep={activeStep}
      personalization={personalization}
    >
      {/* ── Form header with save indicator ────────────────────────── */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={1}
        pb={2}
        mb={2.5}
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
            {STORY_TYPE_LABELS[storyType]}
          </Typography>
          {draft.savedAt && (
            <Typography
              variant="caption"
              color={COLORS.textSecondary}
              sx={{ fontWeight: 500, opacity: 0.9 }}
            >
              Saved {formatSavedAt(draft.savedAt)}
            </Typography>
          )}
        </Box>

        {/* ── Progress indicator ─────────────────────────────────────── */}
        <Box
          sx={{
            mb: { xs: 3, md: 4 },
            py: 2,
            px: { xs: 0.75, sm: 1.5 },
            borderRadius: 2,
            bgcolor: "rgba(97, 120, 145, 0.04)",
            border: "1px solid rgba(208, 200, 192, 0.35)",
          }}
        >
          <BriefProgressIndicator
            currentSection={activeStep}
            sectionCompletion={sectionCompletion}
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
            onContinue={() => saveAndAdvance(5)}
            onBack={() => goBack(3)}
          />
        )}

        {activeStep === 5 && (
          <Section5PersonalizationConfig
            storyType={storyType}
            personalization={personalization}
            value={draft.section5}
            onChange={updateSection5}
            onSubmit={attemptSubmit}
            onBack={() => goBack(4)}
            submitting={submitting}
          />
        )}
    </BriefPageWithSidebar>

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
          Draft saved
        </Alert>
      </Snackbar>

      <HardBlockSubmitDialog
        open={hardBlockOpen}
        items={gateHardBlocks}
        onClose={handleHardBlockClose}
      />
      <HardWarningSubmitDialog
        open={hardWarningOpen}
        items={gateHardWarnings}
        understood={hardWarningAck}
        onUnderstoodChange={setHardWarningAck}
        onGoBack={handleHardWarningGoBack}
        onProceed={handleHardWarningProceed}
      />

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
