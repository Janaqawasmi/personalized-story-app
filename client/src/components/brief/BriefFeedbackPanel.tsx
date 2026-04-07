// client/src/components/brief/BriefFeedbackPanel.tsx
//
// Specialist review panel: general notes, overall quick tags, optional per-field
// feedback — stored via API in Firestore (dammaStoryBriefs/{id}/feedback).

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
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
  type BriefFeedbackFieldQuickTagId,
  type BriefFeedbackOverallQuickTagId,
  type BriefFieldFeedbackEntry,
  type StoryBriefFeedbackDoc,
} from "../../types/storyBriefFeedback";

function fieldLabel(fieldId: string): string {
  const row = BRIEF_FEEDBACK_FIELD_CATALOG.find((f) => f.id === fieldId);
  return row ? `${row.label} (${fieldId})` : fieldId;
}

function overallTagLabel(id: string): string {
  const row = BRIEF_FEEDBACK_OVERALL_QUICK_TAGS.find((t) => t.id === id);
  return row?.label ?? id;
}

interface Props {
  /** Firestore document id of a submitted brief — required to save feedback */
  briefId: string | null;
}

export default function BriefFeedbackPanel({ briefId }: Props) {
  const [generalComment, setGeneralComment] = useState("");
  const [overallTags, setOverallTags] = useState<Set<BriefFeedbackOverallQuickTagId>>(new Set());
  const [fieldFeedback, setFieldFeedback] = useState<Record<string, BriefFieldFeedbackEntry>>({});
  const [fieldToAdd, setFieldToAdd] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const [history, setHistory] = useState<StoryBriefFeedbackDoc[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

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

  const availableFieldOptions = useMemo(() => {
    const taken = new Set(Object.keys(fieldFeedback));
    return BRIEF_FEEDBACK_FIELD_CATALOG.filter((f) => !taken.has(f.id));
  }, [fieldFeedback]);

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

  function setFieldComment(fieldId: string, comment: string) {
    setFieldFeedback((prev) => {
      const cur = prev[fieldId] ?? { quickTags: [], comment: "" };
      return { ...prev, [fieldId]: { ...cur, comment } };
    });
  }

  function addFieldRow(fieldId: string) {
    if (!fieldId) return;
    setFieldFeedback((prev) => ({
      ...prev,
      [fieldId]: prev[fieldId] ?? { quickTags: [], comment: "" },
    }));
    setFieldToAdd("");
  }

  function removeFieldRow(fieldId: string) {
    setFieldFeedback((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }

  async function handleSubmit() {
    if (!briefId) return;
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    const filteredFields: Record<string, BriefFieldFeedbackEntry> = {};
    for (const [fid, entry] of Object.entries(fieldFeedback)) {
      const has =
        entry.comment.trim().length > 0 || (entry.quickTags?.length ?? 0) > 0;
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
      void loadHistory();
      window.setTimeout(() => setSubmitSuccess(null), 5000);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  const panelPaperSx = {
    p: { xs: 2.5, sm: 3 },
    borderRadius: 2.5,
    border: "1px solid rgba(208, 200, 192, 0.55)",
    backgroundColor: COLORS.surface,
    boxShadow: "0 12px 40px -20px rgba(97, 120, 145, 0.2)",
    width: { xs: "100%", md: 360 },
    flexShrink: 0,
    position: { md: "sticky" },
    top: { md: 24 },
    alignSelf: "flex-start",
  };

  return (
    <Paper elevation={0} component="aside" aria-label="Story brief feedback" sx={panelPaperSx}>
      <Typography
        variant="overline"
        sx={{
          letterSpacing: "0.08em",
          fontWeight: 800,
          color: COLORS.primary,
          fontSize: "0.7rem",
          display: "block",
          mb: 0.5,
        }}
      >
        Specialist feedback
      </Typography>
      <Typography variant="body2" color={COLORS.textSecondary} sx={{ mb: 2, lineHeight: 1.55 }}>
        Review notes and structured tags. Nothing here is required — add only what helps the author.
      </Typography>

      {!briefId && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          Submit the brief (or open this page with a brief ID in the URL) to save feedback to the
          server.
        </Alert>
      )}

      <Typography variant="subtitle2" fontWeight={700} color={COLORS.textPrimary} gutterBottom>
        Overall
      </Typography>
      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75} sx={{ mb: 2 }}>
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
        placeholder="High-level observations about this brief…"
        multiline
        minRows={3}
        fullWidth
        value={generalComment}
        onChange={(e) => setGeneralComment(e.target.value)}
        sx={{ mb: 2 }}
      />

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2" fontWeight={700} color={COLORS.textPrimary} gutterBottom>
        Field-level (optional)
      </Typography>
      <Typography variant="caption" color={COLORS.textSecondary} display="block" sx={{ mb: 1 }}>
        Add one or more spec fields, then choose quick tags and/or a short note.
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }} alignItems="stretch">
        <FormControl size="small" fullWidth>
          <InputLabel id="brief-feedback-field-add">Add field</InputLabel>
          <Select
            labelId="brief-feedback-field-add"
            label="Add field"
            value={fieldToAdd}
            onChange={(e) => setFieldToAdd(e.target.value as string)}
          >
            <MenuItem value="">
              <em>Select…</em>
            </MenuItem>
            {availableFieldOptions.map((f) => (
              <MenuItem key={f.id} value={f.id}>
                {f.id} — {f.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="outlined"
          disabled={!fieldToAdd}
          onClick={() => addFieldRow(fieldToAdd)}
          sx={{ flexShrink: 0, textTransform: "none", fontWeight: 600 }}
        >
          Add
        </Button>
      </Stack>

      <Stack spacing={2} sx={{ mb: 2 }}>
        {Object.keys(fieldFeedback).map((fid) => (
          <Box
            key={fid}
            sx={{
              p: 1.5,
              borderRadius: 2,
              border: `1px solid ${COLORS.border}`,
              bgcolor: "rgba(97, 120, 145, 0.03)",
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
              <Typography variant="caption" fontWeight={700} color={COLORS.textPrimary}>
                {fieldLabel(fid)}
              </Typography>
              <Button size="small" onClick={() => removeFieldRow(fid)} sx={{ minWidth: 0, p: 0.5 }}>
                Remove
              </Button>
            </Stack>
            <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.5} sx={{ mb: 1 }}>
              {BRIEF_FEEDBACK_FIELD_QUICK_TAGS.map((t) => {
                const active = fieldFeedback[fid]?.quickTags?.includes(t.id) ?? false;
                return (
                  <Chip
                    key={t.id}
                    label={t.label}
                    size="small"
                    onClick={() => toggleFieldTag(fid, t.id)}
                    color={active ? "secondary" : "default"}
                    variant={active ? "filled" : "outlined"}
                  />
                );
              })}
            </Stack>
            <TextField
              size="small"
              fullWidth
              placeholder="Optional note for this field…"
              multiline
              minRows={2}
              value={fieldFeedback[fid]?.comment ?? ""}
              onChange={(e) => setFieldComment(fid, e.target.value)}
            />
          </Box>
        ))}
      </Stack>

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
        disabled={!briefId || submitting}
        onClick={() => void handleSubmit()}
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

      {briefId && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Saved on this brief
          </Typography>
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
              No feedback entries yet.
            </Typography>
          )}
          {!historyLoading &&
            history &&
            history.map((h) => (
              <Box
                key={h.id}
                sx={{
                  mt: 1.5,
                  p: 1.25,
                  borderRadius: 1.5,
                  bgcolor: "#FAFAFA",
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <Typography variant="caption" color={COLORS.textSecondary} display="block">
                  {h.submittedAt
                    ? new Date(h.submittedAt).toLocaleString()
                    : "Unknown time"}
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
                  <Typography variant="caption" display="block" sx={{ mt: 1, fontWeight: 700 }}>
                    Fields: {Object.keys(h.fieldFeedback).join(", ")}
                  </Typography>
                ) : null}
              </Box>
            ))}
        </>
      )}
    </Paper>
  );
}
