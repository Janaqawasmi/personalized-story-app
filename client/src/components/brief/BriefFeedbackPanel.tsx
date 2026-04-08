// client/src/components/brief/BriefFeedbackPanel.tsx
//
// Specialist review panel: section-scoped field verdicts and notes —
// stored via API in Firestore (dammaStoryBriefs/{id}/feedback).

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { COLORS } from "../../theme";
import {
  listDammaStoryBriefFeedback,
  submitDammaStoryBriefFeedback,
} from "../../api/dammaStoryBrief";
import {
  BRIEF_FEEDBACK_OVERALL_QUICK_TAGS,
  BRIEF_FEEDBACK_VERDICTS,
  getFeedbackFieldIdsForStep,
  type BriefFeedbackVerdictId,
  type BriefFieldFeedbackEntry,
  type StoryBriefFeedbackDoc,
} from "../../types/storyBriefFeedback";
import { useStoryBriefUi } from "../../i18n/storyBriefUi";

function fieldMeta(fieldId: string, ui: ReturnType<typeof useStoryBriefUi>): { title: string; specId: string } {
  const row = ui.feedbackFields[fieldId];
  return { title: row?.label ?? fieldId, specId: fieldId };
}

function overallTagLabel(id: string): string {
  const row = BRIEF_FEEDBACK_OVERALL_QUICK_TAGS.find((t) => t.id === id);
  return row?.label ?? id;
}

function verdictLabel(id: string | undefined, ui: ReturnType<typeof useStoryBriefUi>): string {
  if (!id) return "";
  return ui.feedbackVerdicts[id as BriefFeedbackVerdictId]?.label ?? id;
}

export interface BriefFeedbackPanelProps {
  briefId: string | null;
  activeStep: number | null;
  personalization: "yes" | "no";
}

export default function BriefFeedbackPanel({
  briefId,
  activeStep,
  personalization,
}: BriefFeedbackPanelProps) {
  const ui = useStoryBriefUi();
  const [fieldFeedback, setFieldFeedback] = useState<Record<string, BriefFieldFeedbackEntry>>({});
  const [historyOpen, setHistoryOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const [history, setHistory] = useState<StoryBriefFeedbackDoc[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const visibleFieldIds = useMemo(
    () => getFeedbackFieldIdsForStep(activeStep, personalization),
    [activeStep, personalization],
  );

  /** Focus first field card when step / visible fields change — not on initial mount (avoid stealing focus from the form). */
  const firstFieldCardRef = useRef<HTMLDivElement | null>(null);
  const prevFeedbackContextKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const contextKey = `${activeStep ?? "null"}:${personalization}:${visibleFieldIds.join(",")}`;
    const prev = prevFeedbackContextKeyRef.current;
    prevFeedbackContextKeyRef.current = contextKey;

    if (visibleFieldIds.length === 0) return;
    if (prev === null) return;
    if (prev === contextKey) return;

    const el = firstFieldCardRef.current;
    if (!el) return;

    const frame = requestAnimationFrame(() => {
      el.focus({ preventScroll: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeStep, personalization, visibleFieldIds]);

  const canSave = useMemo(() => {
    for (const entry of Object.values(fieldFeedback)) {
      if (entry.verdict != null || entry.comment.trim().length > 0) {
        return true;
      }
    }
    return false;
  }, [fieldFeedback]);

  const loadHistory = useCallback(async () => {
    if (!briefId) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const rows = await listDammaStoryBriefFeedback(briefId, 15);
      setHistory(rows);
    } catch (e) {
      setHistoryError(e instanceof Error ? e.message : ui.feedbackLoadError);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [briefId, ui.feedbackLoadError]);

  useEffect(() => {
    if (!briefId) {
      setHistory(null);
      return;
    }
    void loadHistory();
  }, [briefId, loadHistory]);

  function setFieldVerdict(fieldId: string, verdict: BriefFeedbackVerdictId | "") {
    setFieldFeedback((prev) => {
      const cur = prev[fieldId] ?? { quickTags: [], comment: "" };
      if (!verdict) {
        const { verdict: _omit, ...rest } = cur;
        return { ...prev, [fieldId]: rest };
      }
      return { ...prev, [fieldId]: { ...cur, verdict } };
    });
  }

  function setFieldComment(fieldId: string, comment: string) {
    setFieldFeedback((prev) => {
      const cur = prev[fieldId] ?? { quickTags: [], comment: "" };
      return { ...prev, [fieldId]: { ...cur, comment } };
    });
  }

  function wantsDetailNote(verdict: BriefFeedbackVerdictId | undefined): boolean {
    return (
      verdict === "needs_modification" ||
      verdict === "unclear" ||
      verdict === "remove_or_rethink"
    );
  }

  async function handleSubmit() {
    if (!briefId || !canSave) return;
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    const filteredFields: Record<string, BriefFieldFeedbackEntry> = {};
    for (const [fid, entry] of Object.entries(fieldFeedback)) {
      const has = entry.verdict != null || entry.comment.trim().length > 0;
      if (has) {
        filteredFields[fid] = { ...entry, quickTags: [] };
      }
    }

    try {
      await submitDammaStoryBriefFeedback(briefId, {
        generalComment: "",
        overallQuickTags: [],
        fieldFeedback: filteredFields,
      });
      setSubmitSuccess(ui.feedbackSaved);
      setFieldFeedback({});
      void loadHistory();
      window.setTimeout(() => setSubmitSuccess(null), 5000);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : ui.feedbackSaveError);
    } finally {
      setSubmitting(false);
    }
  }

  const panelPaperSx = {
    p: { xs: 2.25, sm: 2.75 },
    borderRadius: 2.5,
    border: "1px solid rgba(208, 200, 192, 0.55)",
    backgroundColor: COLORS.surface,
    boxShadow: "0 12px 40px -20px rgba(97, 120, 145, 0.2)",
    width: { xs: "100%", md: 400 },
    flexShrink: 0,
    position: { md: "sticky" },
    top: { md: 24 },
    alignSelf: "flex-start",
    maxHeight: { md: "calc(100vh - 48px)" },
    overflowY: { md: "auto" },
  };

  return (
    <Paper
      elevation={0}
      component="aside"
      aria-label="Story brief feedback"
      sx={panelPaperSx}
    >
      <Stack spacing={0.75} sx={{ mb: 2 }}>
        <Typography
          variant="overline"
          sx={{
            letterSpacing: "0.08em",
            fontWeight: 800,
            color: COLORS.primary,
            fontSize: "0.7rem",
            lineHeight: 1.4,
          }}
        >
          {ui.feedbackTitle}
        </Typography>
        {briefId ? (
          <Chip
            size="small"
            label={ui.feedbackBriefChip(
              briefId.length > 12 ? `${briefId.slice(0, 10)}…` : briefId,
            )}
            title={briefId}
            sx={{
              alignSelf: "flex-start",
              fontFamily: "ui-monospace, monospace",
              fontSize: "0.7rem",
              height: 24,
              bgcolor: "rgba(97, 120, 145, 0.08)",
              border: `1px solid ${COLORS.border}`,
            }}
          />
        ) : null}
      </Stack>

      {!briefId && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          {ui.feedbackNotYetSavableHint}
        </Alert>
      )}

      {visibleFieldIds.length > 0 ? (
        <Stack spacing={1.75} sx={{ mb: 2 }}>
          {visibleFieldIds.map((fid, index) => {
            const { title, specId } = fieldMeta(fid, ui);
            const v = fieldFeedback[fid]?.verdict;
            const isFirst = index === 0;
            const titleId = `brief-feedback-field-${fid}-title`;

            return (
              <Box
                key={fid}
                ref={isFirst ? firstFieldCardRef : undefined}
                tabIndex={isFirst ? -1 : undefined}
                component="section"
                aria-labelledby={titleId}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: `1px solid ${COLORS.border}`,
                  bgcolor: "rgba(97, 120, 145, 0.03)",
                  transition: "border-color 0.15s ease",
                  ...(v
                    ? { borderColor: "rgba(97, 120, 145, 0.35)" }
                    : {}),
                  ...(isFirst
                    ? {
                        "&:focus-visible": {
                          outline: `2px solid ${COLORS.primary}`,
                          outlineOffset: 2,
                        },
                      }
                    : {}),
                }}
              >
                <Typography
                  id={titleId}
                  variant="body2"
                  fontWeight={700}
                  color={COLORS.textPrimary}
                >
                  {title}
                </Typography>
                <Typography variant="caption" color={COLORS.textSecondary} display="block" sx={{ mb: 1 }}>
                  {ui.feedbackFieldPrefix} {specId}
                </Typography>

                <FormControl component="fieldset" fullWidth variant="standard" sx={{ m: 0 }}>
                  <Typography
                    component="legend"
                    variant="caption"
                    sx={{ fontWeight: 700, color: COLORS.textSecondary, mb: 0.75 }}
                  >
                    {ui.feedbackAssessment}
                  </Typography>
                  <RadioGroup
                    name={`verdict-${fid}`}
                    value={v ?? ""}
                    onChange={(_, val) =>
                      setFieldVerdict(fid, val === "" ? "" : (val as BriefFeedbackVerdictId))
                    }
                  >
                    {BRIEF_FEEDBACK_VERDICTS.map((opt) => (
                      <Tooltip
                        key={opt.id}
                        title={ui.feedbackVerdicts[opt.id].description}
                        placement="left"
                        enterDelay={400}
                      >
                        <FormControlLabel
                          value={opt.id}
                          control={<Radio size="small" sx={{ py: 0.35 }} />}
                          label={<Typography variant="body2">{ui.feedbackVerdicts[opt.id].label}</Typography>}
                          sx={{ alignItems: "flex-start", ml: 0, mr: 0, mb: 0.15 }}
                        />
                      </Tooltip>
                    ))}
                  </RadioGroup>
                </FormControl>

                {v ? (
                  <Button
                    type="button"
                    size="small"
                    variant="text"
                    onClick={() => setFieldVerdict(fid, "")}
                    sx={{
                      mt: 0.5,
                      mb: 0.25,
                      textTransform: "none",
                      fontWeight: 600,
                      fontSize: "0.8125rem",
                      color: COLORS.textSecondary,
                      minHeight: 36,
                    }}
                  >
                    {ui.feedbackClear}
                  </Button>
                ) : null}

                <TextField
                  size="small"
                  fullWidth
                  label={wantsDetailNote(v) ? ui.feedbackNoteRecommended : ui.feedbackNoteOptional}
                  placeholder={
                    wantsDetailNote(v)
                      ? ui.feedbackNotePlaceholderDetail
                      : ui.feedbackNotePlaceholderOptional
                  }
                  multiline
                  minRows={wantsDetailNote(v) ? 2 : 1}
                  value={fieldFeedback[fid]?.comment ?? ""}
                  onChange={(e) => setFieldComment(fid, e.target.value)}
                  sx={{ mt: 1.25 }}
                />
              </Box>
            );
          })}
        </Stack>
      ) : null}

      {submitError && (
        <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2 }}>
          {submitError}
        </Alert>
      )}
      {submitSuccess && (
        <Alert severity="success" sx={{ mb: 1.5, borderRadius: 2 }}>
          {submitSuccess}
        </Alert>
      )}

      <Button
        variant="contained"
        fullWidth
        disabled={!briefId || submitting || !canSave}
        onClick={() => void handleSubmit()}
        aria-busy={submitting}
        sx={{
          mt: visibleFieldIds.length > 0 ? 0 : 1,
          py: 1.1,
          textTransform: "none",
          fontWeight: 700,
          backgroundColor: COLORS.primary,
          "&:hover": { backgroundColor: COLORS.secondary },
        }}
      >
        {submitting ? <CircularProgress size={22} color="inherit" /> : ui.feedbackSave}
      </Button>
      {briefId && (
        <Accordion
          disableGutters
          elevation={0}
          expanded={historyOpen}
          onChange={(_, exp) => setHistoryOpen(exp)}
          sx={{
            mt: 2,
            border: `1px solid ${COLORS.border}`,
            borderRadius: "12px !important",
            "&:before": { display: "none" },
            overflow: "hidden",
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2" fontWeight={700}>
              Previous feedback
              {history && history.length > 0 ? ` (${history.length})` : ""}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            {historyLoading && (
              <Box display="flex" justifyContent="center" py={1}>
                <CircularProgress size={24} />
              </Box>
            )}
            {historyError && (
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                {historyError}
              </Alert>
            )}
            {!historyLoading && history && history.length === 0 && (
              <Typography variant="caption" color={COLORS.textSecondary}>
                {ui.feedbackNoEntries}
              </Typography>
            )}
            {!historyLoading &&
              history &&
              history.map((h) => (
                <Box
                  key={h.id}
                  sx={{
                    mt: 1.5,
                    pt: 1.5,
                    borderTop: `1px solid ${COLORS.border}`,
                    "&:first-of-type": { mt: 0, pt: 0, borderTop: "none" },
                  }}
                >
                  <Typography variant="caption" color={COLORS.textSecondary} display="block">
                    {h.submittedAt ? new Date(h.submittedAt).toLocaleString() : "Unknown time"}
                    {h.submittedByDisplayName ? ` · ${h.submittedByDisplayName}` : ""}
                  </Typography>
                  {h.generalComment ? (
                    <Typography variant="body2" sx={{ mt: 0.75, whiteSpace: "pre-wrap" }}>
                      {h.generalComment}
                    </Typography>
                  ) : null}
                  {h.overallQuickTags?.length ? (
                    <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.5} sx={{ mt: 1 }}>
                      {h.overallQuickTags.map((tid) => (
                        <Chip key={tid} label={overallTagLabel(tid)} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  ) : null}
                  {h.fieldFeedback && Object.keys(h.fieldFeedback).length > 0 ? (
                    <Box component="ul" sx={{ m: 0.75, pl: 2.25, mt: 1 }}>
                      {Object.entries(h.fieldFeedback).map(([fieldId, fb]) => (
                        <Typography component="li" variant="caption" key={fieldId} display="list-item" sx={{ mb: 0.35 }}>
                          <Box component="span" fontWeight={700}>
                            {fieldId}
                          </Box>
                          {fb.verdict ? (
                            <Box component="span" color={COLORS.textSecondary}>
                              {" "}
                              — {verdictLabel(fb.verdict, ui)}
                            </Box>
                          ) : null}
                          {fb.comment?.trim() ? (
                            <Box component="span" display="block" sx={{ mt: 0.25, whiteSpace: "pre-wrap" }}>
                              {fb.comment}
                            </Box>
                          ) : null}
                        </Typography>
                      ))}
                    </Box>
                  ) : null}
                </Box>
              ))}
          </AccordionDetails>
        </Accordion>
      )}
    </Paper>
  );
}
