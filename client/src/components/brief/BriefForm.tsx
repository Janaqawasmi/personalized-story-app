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

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  Container,
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

import {
  STORY_TYPES,
  STORY_TYPE_LABELS,
  STORY_TYPE_DESCRIPTIONS,
  STORY_LENGTH_DEFAULT,
  createEmptyBrief,
  isSectionComplete,
  type AgeAndScope,
  type ClinicalFoundation,
  type TherapeuticArchitecture,
  type StoryWorld,
  type PersonalizationConfig,
  type CompleteBrief,
  type StoryType,
} from "../../types/storyBrief";

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

/**
 * Field 1.3 (story length) is required by spec; the UI defaults to Standard without
 * always writing to state. Once 1.1 and 1.2 are set, persist Standard if the user
 * never touched 1.3 — and migrate older saved drafts missing `storyLength`.
 */
function withSection1StoryLengthDefault(d: CompleteBrief): CompleteBrief {
  const s1 = d.section1;
  if (!s1.ageRange || !s1.peakIntensity) return d;
  if (s1.storyLength != null) return d;
  return {
    ...d,
    section1: { ...s1, storyLength: STORY_LENGTH_DEFAULT },
  };
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

// ============================================================================
// Props
// ============================================================================

interface Props {
  /**
   * Called when the psychologist submits the complete brief.
   * The consumer is responsible for sending it to the backend.
   */
  onSubmit?: (brief: CompleteBrief) => Promise<void>;
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
      <Box mb={4}>
        <Typography variant="overline" display="block" color={COLORS.textSecondary} letterSpacing={1} mb={0.5}>
          Pre-brief
        </Typography>
        <Typography variant="h5" fontWeight={700} mb={0.75}>
          Choose the lens this story looks through
        </Typography>
        <Typography variant="body2" color={COLORS.textSecondary} maxWidth={520}>
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
                borderRadius: 2,
                opacity: isAvailable ? 1 : 0.45,
                transition: "border-color 0.15s ease, background-color 0.15s ease",
                "&:hover": isAvailable ? { borderColor: COLORS.primary } : {},
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
  // ── State ──────────────────────────────────────────────────────────────────

  const [draft, setDraft] = useState<CompleteBrief>(createEmptyBrief);
  /** 0 = pre-brief story type selector; 1–5 = sections */
  const [activeStep, setActiveStep] = useState(0);
  const [savedDraft, setSavedDraft] = useState<CompleteBrief | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savedSnackbar, setSavedSnackbar] = useState(false);

  // Ref to scroll to the top of the section content on navigation
  const sectionTopRef = useRef<HTMLDivElement | null>(null);

  // ── Load saved draft on mount ──────────────────────────────────────────────

  useEffect(() => {
    const existing = loadDraftFromStorage();
    if (existing?.storyType) {
      const normalized = withSection1StoryLengthDefault(existing);
      setSavedDraft(normalized);
      if (normalized.section1.storyLength !== existing.section1.storyLength) {
        saveDraftToStorage(normalized);
      }
    }
  }, []);

  // ── Computed ──────────────────────────────────────────────────────────────

  const sectionCompletion: boolean[] = [1, 2, 3, 4, 5].map((n) =>
    isSectionComplete(n, draft)
  );

  // ── Helpers ───────────────────────────────────────────────────────────────

  const scrollToTop = useCallback(() => {
    sectionTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  function saveAndAdvance(nextStep: number) {
    setDraft((d) => {
      let next: CompleteBrief = { ...d, savedAt: Date.now() };
      // Field 1.3 required — commit visual default or user choice before leaving Section 1
      if (activeStep === 1 && nextStep === 2) {
        next = withSection1StoryLengthDefault(next);
      }
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
    setDraft((d) => {
      const section1 = { ...d.section1, ...updates };
      const merged = withSection1StoryLengthDefault({ ...d, section1 });
      return { ...d, section1: merged.section1 };
    });
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

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const finalDraft = withSection1StoryLengthDefault(draft);
      if (finalDraft !== draft) {
        setDraft(finalDraft);
        saveDraftToStorage(finalDraft);
      }
      if (onSubmit) {
        await onSubmit(finalDraft);
      } else {
        // No handler provided — log and clear draft
        console.info("[BriefForm] Brief submitted:", finalDraft);
      }
      clearDraftFromStorage();
      setSavedDraft(null);
    } catch (err) {
      console.error("[BriefForm] Submission failed:", err);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Resume / discard ──────────────────────────────────────────────────────

  function handleResumeDraft() {
    if (!savedDraft) return;
    const normalized = withSection1StoryLengthDefault(savedDraft);
    setDraft(normalized);
    saveDraftToStorage(normalized);
    setSavedDraft(null);
    // Determine which step to resume at: the first incomplete section
    let resumeStep = 1;
    for (let s = 1; s <= 5; s++) {
      if (!isSectionComplete(s, savedDraft)) {
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

  // ── The pre-brief story type selector ────────────────────────────────────

  if (activeStep === 0) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4 },
            border: `1px solid ${COLORS.border}`,
            borderRadius: 3,
            backgroundColor: COLORS.surface,
          }}
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
        </Paper>
      </Container>
    );
  }

  // ── Active section (steps 1–5) ─────────────────────────────────────────────

  const storyType = draft.storyType ?? "fear_anxiety";
  const ageRange = draft.section1.ageRange ?? null;
  const personalization = draft.section4.personalization ?? "yes";

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 4 },
          border: `1px solid ${COLORS.border}`,
          borderRadius: 3,
          backgroundColor: COLORS.surface,
        }}
      >
        {/* ── Form header with save indicator ────────────────────────── */}
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={2.5}
          ref={sectionTopRef}
        >
          <Typography variant="body2" color={COLORS.textSecondary} fontWeight={500}>
            {STORY_TYPE_LABELS[storyType]}
          </Typography>
          {draft.savedAt && (
            <Typography variant="caption" color={COLORS.textSecondary} fontStyle="italic">
              Saved {formatSavedAt(draft.savedAt)}
            </Typography>
          )}
        </Box>

        {/* ── Progress indicator ─────────────────────────────────────── */}
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
            onSubmit={handleSubmit}
            onBack={() => goBack(4)}
            submitting={submitting}
          />
        )}
      </Paper>

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
    </Container>
  );
}
