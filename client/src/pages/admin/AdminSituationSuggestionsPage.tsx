import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  listPendingSituationSuggestions,
  approveSituationSuggestion,
  rejectSituationSuggestion,
  type AdminSituationSuggestion,
} from "../../api/adminSituationSuggestions";
import { COLORS } from "../../theme";
import { useTranslation } from "../../i18n/useTranslation";

/**
 * Suggests a situation id from a label, mirroring the snake_case convention
 * already used for seeded situations (e.g. "fear_of_school"). This is only a
 * starting point shown in the approve dialog — the admin can edit it before
 * confirming, and the server is the source of truth for uniqueness.
 */
function suggestSituationId(suggestion: AdminSituationSuggestion): string {
  const source = suggestion.labelEn || suggestion.labelHe || suggestion.labelAr;
  const slug = source
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "");
  return slug || "new_situation";
}

function formatDate(ms: number | null): string {
  if (ms === null) return "—";
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type DialogState =
  | { kind: "none" }
  | { kind: "approve"; suggestion: AdminSituationSuggestion; situationId: string; busy: boolean; error: string | null }
  | { kind: "reject"; suggestion: AdminSituationSuggestion; note: string; busy: boolean; error: string | null };

export default function AdminSituationSuggestionsPage() {
  const t = useTranslation();
  const { lang } = useParams<{ lang: string }>();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AdminSituationSuggestion[]>([]);
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listPendingSituationSuggestions();
      setSuggestions(data);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openApprove(suggestion: AdminSituationSuggestion) {
    setDialog({
      kind: "approve",
      suggestion,
      situationId: suggestSituationId(suggestion),
      busy: false,
      error: null,
    });
  }

  function openReject(suggestion: AdminSituationSuggestion) {
    setDialog({ kind: "reject", suggestion, note: "", busy: false, error: null });
  }

  async function confirmApprove() {
    if (dialog.kind !== "approve") return;
    setDialog({ ...dialog, busy: true, error: null });
    try {
      await approveSituationSuggestion(dialog.suggestion.templateId, dialog.situationId);
      setSuggestions((prev) => prev.filter((s) => s.templateId !== dialog.suggestion.templateId));
      setDialog({ kind: "none" });
      setToast(t("admin.situationSuggestions.approveSuccess"));
    } catch (e) {
      setDialog({ ...dialog, busy: false, error: e instanceof Error ? e.message : String(e) });
    }
  }

  async function confirmReject() {
    if (dialog.kind !== "reject") return;
    setDialog({ ...dialog, busy: true, error: null });
    try {
      await rejectSituationSuggestion(dialog.suggestion.templateId, dialog.note);
      setSuggestions((prev) => prev.filter((s) => s.templateId !== dialog.suggestion.templateId));
      setDialog({ kind: "none" });
      setToast(t("admin.situationSuggestions.rejectSuccess"));
    } catch (e) {
      setDialog({ ...dialog, busy: false, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 500,
          color: COLORS.textSecondary,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          mb: 0.75,
        }}
      >
        {t("admin.situationSuggestions.sectionEyebrow")}
      </Typography>
      <Typography sx={{ fontSize: 13, color: COLORS.textSecondary, mb: 2.5, maxWidth: 720 }}>
        {t("admin.situationSuggestions.helperText")}
      </Typography>

      {loading ? (
        <Paper elevation={0} sx={{ p: 3, border: `0.5px solid ${COLORS.border}`, borderRadius: "12px", bgcolor: "#fff" }}>
          <Typography sx={{ fontSize: 13, color: COLORS.textSecondary }}>{t("admin.common.loading")}</Typography>
        </Paper>
      ) : loadError ? (
        <Paper elevation={0} sx={{ p: 3, border: `0.5px solid ${COLORS.error}40`, borderRadius: "12px", bgcolor: "#fff" }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: COLORS.error, mb: 0.5 }}>
            {t("admin.situationSuggestions.errorTitle")}
          </Typography>
          <Typography sx={{ fontSize: 13, color: COLORS.textSecondary, mb: 1.5 }}>
            {t("admin.situationSuggestions.errorBody")}
          </Typography>
          <Button size="small" variant="outlined" onClick={() => void load()}>
            {t("admin.situationSuggestions.retry")}
          </Button>
        </Paper>
      ) : suggestions.length === 0 ? (
        <Paper elevation={0} sx={{ p: 3, border: `0.5px solid ${COLORS.border}`, borderRadius: "12px", bgcolor: "#fff" }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: COLORS.textPrimary, mb: 0.5 }}>
            {t("admin.situationSuggestions.emptyTitle")}
          </Typography>
          <Typography sx={{ fontSize: 13, color: COLORS.textSecondary }}>
            {t("admin.situationSuggestions.emptyBody")}
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {suggestions.map((s) => (
            <Paper
              key={s.templateId}
              elevation={0}
              sx={{ p: 2.5, border: `0.5px solid ${COLORS.border}`, borderRadius: "12px", bgcolor: "#fff" }}
            >
              <Stack direction="row" flexWrap="wrap" alignItems="center" justifyContent="space-between" gap={1} sx={{ mb: 1.5 }}>
                <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary }}>
                    {s.title.trim() || t("admin.situationSuggestions.untitledStory")}
                  </Typography>
                  {s.primaryTopic ? (
                    <Chip label={s.primaryTopic} size="small" sx={{ bgcolor: COLORS.primarySoft, color: COLORS.primaryDark, fontSize: 11 }} />
                  ) : null}
                  <Chip
                    label="Pending"
                    size="small"
                    sx={{ bgcolor: COLORS.warningSoft, color: COLORS.warning, fontSize: 11, fontWeight: 600 }}
                  />
                  {s.slug && lang ? (
                    <Typography
                      component={RouterLink}
                      to={`/${lang}/stories/${encodeURIComponent(s.slug)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ fontSize: 12, color: COLORS.primary, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
                    >
                      {t("admin.situationSuggestions.viewStory")}
                    </Typography>
                  ) : null}
                </Stack>
                <Typography sx={{ fontSize: 11, color: COLORS.textMuted }}>
                  {s.createdBy ? `${t("admin.situationSuggestions.colSuggestedBy")}: ${s.createdBy} · ` : ""}
                  {t("admin.situationSuggestions.colSuggestedAt")}: {formatDate(s.createdAt)}
                </Typography>
              </Stack>

              <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: s.reason ? 1.25 : 1.75 }}>
                {([
                  ["labelHe", s.labelHe],
                  ["labelAr", s.labelAr],
                  ["labelEn", s.labelEn],
                ] as const).map(([key, value]) => (
                  <Box
                    key={key}
                    sx={{
                      px: 1.25,
                      py: 0.5,
                      borderRadius: "8px",
                      bgcolor: COLORS.cream,
                      border: `0.5px solid ${COLORS.borderSoft}`,
                      minWidth: 120,
                    }}
                  >
                    <Typography sx={{ fontSize: 10, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {t(`admin.situationSuggestions.${key}`)}
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: COLORS.textPrimary, fontWeight: value ? 500 : 400 }}>
                      {value || "—"}
                    </Typography>
                  </Box>
                ))}
              </Stack>

              {s.reason ? (
                <Typography sx={{ fontSize: 12.5, color: COLORS.textSecondary, mb: 1.75, fontStyle: "italic" }}>
                  {t("admin.situationSuggestions.reasonPrefix")}: {s.reason}
                </Typography>
              ) : null}

              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button size="small" variant="outlined" color="error" onClick={() => openReject(s)}>
                  {t("admin.situationSuggestions.reject")}
                </Button>
                <Button size="small" variant="contained" onClick={() => openApprove(s)}>
                  {t("admin.situationSuggestions.approve")}
                </Button>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      {/* ── Approve dialog ─────────────────────────────────────────────── */}
      <Dialog open={dialog.kind === "approve"} onClose={() => dialog.kind === "approve" && !dialog.busy && setDialog({ kind: "none" })} fullWidth maxWidth="sm">
        {dialog.kind === "approve" ? (
          <>
            <DialogTitle sx={{ fontSize: 16, fontWeight: 700 }}>
              {t("admin.situationSuggestions.approveDialogTitle")}
            </DialogTitle>
            <DialogContent>
              <Typography sx={{ fontSize: 13, color: COLORS.textSecondary, mb: 2 }}>
                {t("admin.situationSuggestions.approveDialogBody", {
                  title: dialog.suggestion.title.trim() || t("admin.situationSuggestions.untitledStory"),
                })}
              </Typography>
              <TextField
                label={t("admin.situationSuggestions.situationIdLabel")}
                value={dialog.situationId}
                onChange={(e) => setDialog({ ...dialog, situationId: e.target.value })}
                helperText={dialog.error ?? t("admin.situationSuggestions.situationIdHelper")}
                error={!!dialog.error}
                fullWidth
                disabled={dialog.busy}
                autoFocus
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialog({ kind: "none" })} disabled={dialog.busy}>
                {t("admin.common.cancel")}
              </Button>
              <Button variant="contained" onClick={() => void confirmApprove()} disabled={dialog.busy || !dialog.situationId.trim()}>
                {t("admin.situationSuggestions.confirmApprove")}
              </Button>
            </DialogActions>
          </>
        ) : null}
      </Dialog>

      {/* ── Reject dialog ──────────────────────────────────────────────── */}
      <Dialog open={dialog.kind === "reject"} onClose={() => dialog.kind === "reject" && !dialog.busy && setDialog({ kind: "none" })} fullWidth maxWidth="sm">
        {dialog.kind === "reject" ? (
          <>
            <DialogTitle sx={{ fontSize: 16, fontWeight: 700 }}>
              {t("admin.situationSuggestions.rejectDialogTitle")}
            </DialogTitle>
            <DialogContent>
              <Typography sx={{ fontSize: 13, color: COLORS.textSecondary, mb: 2 }}>
                {t("admin.situationSuggestions.rejectDialogBody", {
                  title: dialog.suggestion.title.trim() || t("admin.situationSuggestions.untitledStory"),
                })}
              </Typography>
              <TextField
                label={t("admin.situationSuggestions.rejectNoteLabel")}
                value={dialog.note}
                onChange={(e) => setDialog({ ...dialog, note: e.target.value })}
                multiline
                minRows={2}
                fullWidth
                disabled={dialog.busy}
                error={!!dialog.error}
                helperText={dialog.error ?? undefined}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialog({ kind: "none" })} disabled={dialog.busy}>
                {t("admin.common.cancel")}
              </Button>
              <Button variant="contained" color="error" onClick={() => void confirmReject()} disabled={dialog.busy}>
                {t("admin.situationSuggestions.confirmReject")}
              </Button>
            </DialogActions>
          </>
        ) : null}
      </Dialog>

      <Snackbar
        open={toast !== null}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        message={toast ?? ""}
      />
    </Box>
  );
}
