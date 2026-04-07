// client/src/components/brief/BriefFeedbackPanel.tsx
//
// Specialist review panel: section-scoped field verdicts, optional nuance tags,
// overall notes — stored via API in Firestore (dammaStoryBriefs/{id}/feedback).

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  Collapse,
  Divider,
  FormControl,
  FormControlLabel,
  Link,
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
  BRIEF_FEEDBACK_FIELD_CATALOG,
  BRIEF_FEEDBACK_FIELD_QUICK_TAGS,
  BRIEF_FEEDBACK_OVERALL_QUICK_TAGS,
  BRIEF_FEEDBACK_VERDICTS,
  BRIEF_FEEDBACK_VERDICT_LABELS,
  getFeedbackFieldIdsForStep,
  getFeedbackSectionHeading,
  type BriefFeedbackVerdictId,
  type BriefFeedbackFieldQuickTagId,
  type BriefFeedbackOverallQuickTagId,
  type BriefFieldFeedbackEntry,
  type StoryBriefFeedbackDoc,
} from "../../types/storyBriefFeedback";

function fieldMeta(fieldId: string): { title: string; specId: string } {
  const row = BRIEF_FEEDBACK_FIELD_CATALOG.find((f) => f.id === fieldId);
  return { title: row?.label ?? fieldId, specId: fieldId };
}

function overallTagLabel(id: string): string {
  const row = BRIEF_FEEDBACK_OVERALL_QUICK_TAGS.find((t) => t.id === id);
  return row?.label ?? id;
}

function verdictLabel(id: string | undefined): string {
  if (!id) return "";
  return BRIEF_FEEDBACK_VERDICT_LABELS[id as BriefFeedbackVerdictId] ?? id;
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
  const [generalComment, setGeneralComment] = useState("");
  const [overallTags, setOverallTags] = useState<Set<BriefFeedbackOverallQuickTagId>>(new Set());
  const [fieldFeedback, setFieldFeedback] = useState<Record<string, BriefFieldFeedbackEntry>>({});
  /** Per-field: show optional quick-tag row */
  const [nuanceOpen, setNuanceOpen] = useState<Record<string, boolean>>({});
  const [historyOpen, setHistoryOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const [history, setHistory] = useState<StoryBriefFeedbackDoc[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const sectionHeading = useMemo(
    () => getFeedbackSectionHeading(activeStep, personalization),
    [activeStep, personalization],
  );

  const visibleFieldIds = useMemo(
    () => getFeedbackFieldIdsForStep(activeStep, personalization),
    [activeStep, personalization],
  );

  const canSave = useMemo(() => {
    if (generalComment.trim().length > 0) return true;
    if (overallTags.size > 0) return true;
    for (const entry of Object.values(fieldFeedback)) {
      if (
        entry.verdict != null ||
        entry.comment.trim().length > 0 ||
        (entry.quickTags?.length ?? 0) > 0
      ) {
        return true;
      }
    }
    return false;
  }, [generalComment, overallTags, fieldFeedback]);

  const loadHistory = useCallback(async () => {
    if (!briefId) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const rows = await listDammaStoryBriefFeedback(briefId, 15);
      setHistory(rows);
    } catch (e) {
      setHistoryError(e instanceof Error ? e.message : "Could not load prior feedback");
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [briefId]);

  useEffect(() => {
    if (!briefId) {
      setHistory(null);
      return;
    }
    void loadHistory();
  }, [briefId, loadHistory]);

  function toggleOverallTag(id: BriefFeedbackOverallQuickTagId) {
    setOverallTags((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleFieldTag(fieldId: string, tagId: BriefFeedbackFieldQuickTagId) {
    setFieldFeedback((prev) => {
      const cur = prev[fieldId] ?? { quickTags: [], comment: "" };
      const qt = new Set(cur.quickTags);
      if (qt.has(tagId)) qt.delete(tagId);
      else qt.add(tagId);
      return {
        ...prev,
        [fieldId]: { ...cur, quickTags: Array.from(qt) as BriefFeedbackFieldQuickTagId[] },
      };
    });
  }

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
      const has =
        entry.verdict != null ||
        entry.comment.trim().length > 0 ||
        (entry.quickTags?.length ?? 0) > 0;
      if (has) filteredFields[fid] = entry;
    }

    try {
      await submitDammaStoryBriefFeedback(briefId, {
        generalComment,
        overallQuickTags: Array.from(overallTags),
        fieldFeedback: filteredFields,
      });
      setSubmitSuccess("Feedback saved.");
      setGeneralComment("");
      setOverallTags(new Set());
      setFieldFeedback({});
      setNuanceOpen({});
      void loadHistory();
      window.setTimeout(() => setSubmitSuccess(null), 5000);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Save failed");
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

  const fieldCount = visibleFieldIds.length;

  return (
    <Paper
      elevation={0}
      component="aside"
      aria-label="Story brief feedback"
      sx={panelPaperSx}
    >
      <Stack spacing={0.5} sx={{ mb: 2 }}>
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
          Specialist feedback
        </Typography>
        <Typography variant="body2" color={COLORS.textSecondary} sx={{ lineHeight: 1.55 }}>
          Optional review for the author. Rate only the fields you care about — nothing is required.
        </Typography>
        {briefId ? (
          <Chip
            size="small"
            label={`Brief ${briefId.length > 12 ? `${briefId.slice(0, 10)}…` : briefId}`}
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

      <Box
        sx={{
          mb: 2,
          py: 1.25,
          px: 1.5,
          borderRadius: 2,
          bgcolor: "rgba(97, 120, 145, 0.06)",
          border: "1px solid rgba(208, 200, 192, 0.45)",
        }}
      >
        <Typography variant="caption" fontWeight={800} color={COLORS.primary} display="block">
          Current focus
        </Typography>
        <Typography variant="body2" fontWeight={600} color={COLORS.textPrimary} sx={{ mt: 0.25 }}>
          {sectionHeading}
        </Typography>
        {fieldCount > 0 ? (
          <Typography variant="caption" color={COLORS.textSecondary} display="block" sx={{ mt: 0.5 }}>
            {fieldCount} field{fieldCount === 1 ? "" : "s"} in this step
          </Typography>
        ) : (
          <Typography variant="caption" color={COLORS.textSecondary} display="block" sx={{ mt: 0.5 }}>
            Field-by-field ratings appear when you work inside the brief steps.
          </Typography>
        )}
      </Box>

      {!briefId && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }} icon={false}>
          <Typography variant="body2" fontWeight={600} gutterBottom>
            Save isn’t available yet
          </Typography>
          <Typography variant="body2" color={COLORS.textSecondary}>
            Submit this brief first, or open this page with{" "}
            <Box component="span" sx={{ fontFamily: "ui-monospace, monospace", fontSize: "0.8rem" }}>
              ?briefId=…
            </Box>{" "}
            in the URL.
          </Typography>
        </Alert>
      )}

      {/* ── Section fields (primary) ── */}
      <Typography variant="subtitle2" fontWeight={700} color={COLORS.textPrimary} gutterBottom>
        This step
      </Typography>
      <Typography variant="caption" color={COLORS.textSecondary} display="block" sx={{ mb: 1.5 }}>
        One assessment per field. Add a note when something needs changing or isn’t clear.
      </Typography>

      {visibleFieldIds.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }} icon={false}>
          <Typography variant="body2" color={COLORS.textSecondary}>
            Use overall notes below, or move through the brief to rate specific fields.
          </Typography>
        </Alert>
      ) : (
        <Stack spacing={1.75} sx={{ mb: 2 }}>
          {visibleFieldIds.map((fid) => {
            const { title, specId } = fieldMeta(fid);
            const v = fieldFeedback[fid]?.verdict;
            const showNuance = nuanceOpen[fid] ?? false;
            const hasNuanceTags = (fieldFeedback[fid]?.quickTags?.length ?? 0) > 0;

            return (
              <Box
                key={fid}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: `1px solid ${COLORS.border}`,
                  bgcolor: "rgba(97, 120, 145, 0.03)",
                  transition: "border-color 0.15s ease",
                  ...(v
                    ? { borderColor: "rgba(97, 120, 145, 0.35)" }
                    : {}),
                }}
              >
                <Typography variant="body2" fontWeight={700} color={COLORS.textPrimary}>
                  {title}
                </Typography>
                <Typography variant="caption" color={COLORS.textSecondary} display="block" sx={{ mb: 1 }}>
                  Field {specId}
                </Typography>

                <FormControl component="fieldset" fullWidth variant="standard" sx={{ m: 0 }}>
                  <Typography
                    component="legend"
                    variant="caption"
                    sx={{ fontWeight: 700, color: COLORS.textSecondary, mb: 0.75 }}
                  >
                    Assessment
                  </Typography>
                  <RadioGroup
                    name={`verdict-${fid}`}
                    value={v ?? ""}
                    onChange={(_, val) =>
                      setFieldVerdict(fid, val === "" ? "" : (val as BriefFeedbackVerdictId))
                    }
                  >
                    {BRIEF_FEEDBACK_VERDICTS.map((opt) => (
                      <Tooltip key={opt.id} title={opt.description} placement="left" enterDelay={400}>
                        <FormControlLabel
                          value={opt.id}
                          control={<Radio size="small" sx={{ py: 0.35 }} />}
                          label={<Typography variant="body2">{opt.label}</Typography>}
                          sx={{ alignItems: "flex-start", ml: 0, mr: 0, mb: 0.15 }}
                        />
                      </Tooltip>
                    ))}
                  </RadioGroup>
                </FormControl>

                {v ? (
                  <Link
                    component="button"
                    type="button"
                    variant="body2"
                    onClick={() => setFieldVerdict(fid, "")}
                    sx={{ mt: 0.5, fontSize: "0.75rem" }}
                  >
                    Clear assessment
                  </Link>
                ) : null}

                <Box sx={{ mt: 1 }}>
                  <Link
                    component="button"
                    type="button"
                    variant="body2"
                    onClick={() =>
                      setNuanceOpen((prev) => ({ ...prev, [fid]: !showNuance }))
                    }
                    sx={{ fontSize: "0.75rem", fontWeight: 600 }}
                  >
                    {showNuance || hasNuanceTags
                      ? "Hide additional tags"
                      : "Additional tags (optional)"}
                  </Link>
                  <Collapse in={showNuance || hasNuanceTags}>
                    <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.5} sx={{ mt: 1 }}>
                      {BRIEF_FEEDBACK_FIELD_QUICK_TAGS.map((t) => {
                        const active = fieldFeedback[fid]?.quickTags?.includes(t.id) ?? false;
                        return (
                          <Chip
                            key={t.id}
                            label={t.label}
                            size="small"
                            onClick={() => {
                              if (!showNuance && !hasNuanceTags) {
                                setNuanceOpen((prev) => ({ ...prev, [fid]: true }));
                              }
                              toggleFieldTag(fid, t.id);
                            }}
                            color={active ? "secondary" : "default"}
                            variant={active ? "filled" : "outlined"}
                          />
                        );
                      })}
                    </Stack>
                  </Collapse>
                </Box>

                <TextField
                  size="small"
                  fullWidth
                  label={wantsDetailNote(v) ? "Note (recommended)" : "Note (optional)"}
                  placeholder={
                    wantsDetailNote(v)
                      ? "What should change or be clarified?"
                      : "Add detail if it helps the author…"
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
      )}

      <Divider sx={{ my: 2 }} />

      {/* ── Overall (secondary) ── */}
      <Typography variant="subtitle2" fontWeight={700} color={COLORS.textPrimary} gutterBottom>
        Whole brief
      </Typography>
      <Typography variant="caption" color={COLORS.textSecondary} display="block" sx={{ mb: 1 }}>
        Quick signals across the entire brief, plus free text.
      </Typography>
      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75} sx={{ mb: 1.5 }}>
        {BRIEF_FEEDBACK_OVERALL_QUICK_TAGS.map((t) => (
          <Chip
            key={t.id}
            label={t.label}
            size="small"
            onClick={() => toggleOverallTag(t.id)}
            color={overallTags.has(t.id) ? "primary" : "default"}
            variant={overallTags.has(t.id) ? "filled" : "outlined"}
            sx={{ fontWeight: 600 }}
          />
        ))}
      </Stack>

      <TextField
        label="General comments"
        placeholder="Themes, risks, or praise that aren’t tied to one field…"
        multiline
        minRows={2}
        fullWidth
        value={generalComment}
        onChange={(e) => setGeneralComment(e.target.value)}
        sx={{ mb: 2 }}
      />

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
          py: 1.1,
          textTransform: "none",
          fontWeight: 700,
          backgroundColor: COLORS.primary,
          "&:hover": { backgroundColor: COLORS.secondary },
        }}
      >
        {submitting ? <CircularProgress size={22} color="inherit" /> : "Save feedback"}
      </Button>
      {!canSave && briefId ? (
        <Typography variant="caption" color={COLORS.textSecondary} display="block" sx={{ mt: 1, textAlign: "center" }}>
          Add an assessment, tag, or comment to enable save.
        </Typography>
      ) : null}

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
                No entries yet.
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
                              — {verdictLabel(fb.verdict)}
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
