import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditNoteOutlinedIcon from "@mui/icons-material/EditNoteOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import { listDammaStoryBriefs, type DammaStoryBriefListItem } from "../api/dammaStoryBrief";
import {
  createNewDraftIdWithEmptyBrief,
  deleteDraftForDraftId,
  listLocalDraftSummaries,
} from "../utils/briefDraftStorage";
import { COLORS } from "../theme";
import SpecialistPortalShell, { specialistMainPaperSx } from "../components/specialist/SpecialistPortalShell";
import { useStoryBriefUi } from "../i18n/storyBriefUi";
import { useBriefDateLocale, formatBriefSavedAt } from "../i18n/storyBriefUi";
import { useSpecialistUi } from "../i18n/specialistUi";
import type { StoryType } from "../types/storyBrief";

function storyTypeLabel(ui: ReturnType<typeof useStoryBriefUi>, t: string | undefined): string {
  if (!t) return "—";
  if (t in ui.STORY_TYPE_LABELS) {
    return ui.STORY_TYPE_LABELS[t as StoryType];
  }
  return t;
}

function truncateId(id: string): string {
  if (id.length <= 14) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

export default function SpecialistBriefsPage() {
  const { lang } = useParams<{ lang: string }>();
  const navigate = useNavigate();
  const base = `/${lang ?? "he"}/specialist`;
  const ui = useStoryBriefUi();
  const sp = useSpecialistUi();
  const dateLocale = useBriefDateLocale();

  const [submitted, setSubmitted] = useState<DammaStoryBriefListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [, bumpDraftList] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const localDrafts = listLocalDraftSummaries();

  const refreshSubmitted = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const rows = await listDammaStoryBriefs(80);
      setSubmitted(rows);
    } catch (e) {
      setListError(e instanceof Error ? e.message : sp.loadSubmittedError);
      setSubmitted([]);
    } finally {
      setLoading(false);
    }
  }, [sp.loadSubmittedError]);

  useEffect(() => {
    void refreshSubmitted();
  }, [refreshSubmitted]);

  function handleNewBrief() {
    const id = createNewDraftIdWithEmptyBrief();
    bumpDraftList((n) => n + 1);
    navigate(`${base}/create-brief/${id}`);
  }

  function confirmDeleteDraft() {
    if (!deleteTarget) return;
    deleteDraftForDraftId(deleteTarget.id);
    bumpDraftList((n) => n + 1);
    setDeleteTarget(null);
    setSnackbar(sp.snackbarDraftRemoved);
  }

  async function copyId(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      setSnackbar(sp.snackbarBriefIdCopied);
    } catch {
      setSnackbar(sp.snackbarCopyFailed);
    }
  }

  const tableHeadSx = {
    "& .MuiTableCell-head": {
      fontWeight: 700,
      fontSize: "0.75rem",
      letterSpacing: "0.06em",
      textTransform: "uppercase" as const,
      color: COLORS.textSecondary,
      borderBottom: `1px solid ${COLORS.border}`,
      bgcolor: "rgba(97, 120, 145, 0.06)",
    },
  };

  const rowHoverSx = {
    "&:last-child td, &:last-child th": { border: 0 },
    "&:hover": { bgcolor: "rgba(97, 120, 145, 0.04)" },
    transition: "background-color 0.15s ease",
  };

  return (
    <SpecialistPortalShell maxWidth={960}>
      <Paper elevation={0} sx={specialistMainPaperSx}>
        <Stack spacing={0.5} sx={{ mb: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ color: COLORS.primary }}>
            <ArticleOutlinedIcon sx={{ fontSize: 28 }} aria-hidden />
            <Typography variant="overline" sx={{ letterSpacing: "0.14em", fontWeight: 700 }}>
              {sp.briefsPageHeroOverline}
            </Typography>
          </Stack>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
            {sp.briefsPageTitle}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560, lineHeight: 1.6 }}>
            {sp.briefsPageIntro}
          </Typography>
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 4 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={handleNewBrief}
            sx={{
              alignSelf: { xs: "stretch", sm: "flex-start" },
              px: 3,
              py: 1.25,
              fontWeight: 700,
              boxShadow: "0 8px 24px -8px rgba(97, 120, 145, 0.45)",
            }}
          >
            {sp.newStoryBrief}
          </Button>
          <Tooltip title={sp.refreshListTooltip}>
            <span>
              <Button
                variant="outlined"
                size="large"
                startIcon={<RefreshIcon />}
                onClick={() => void refreshSubmitted()}
                disabled={loading}
                sx={{
                  borderColor: COLORS.border,
                  color: COLORS.textSecondary,
                  alignSelf: { xs: "stretch", sm: "flex-start" },
                  "&:hover": { borderColor: COLORS.primary, color: COLORS.primary },
                }}
              >
                {sp.refresh}
              </Button>
            </span>
          </Tooltip>
        </Stack>

        {listError && (
          <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", fontWeight: 600 }}>
              {listError}
            </Typography>
            {listError.toLowerCase().includes("insufficient permissions") && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.6 }}>
                {sp.permissionHelpBeforeCode}
                <Box
                  component="code"
                  sx={{
                    display: "block",
                    mt: 1.5,
                    mb: 1,
                    p: 1.5,
                    bgcolor: "rgba(0,0,0,0.05)",
                    borderRadius: 1,
                    fontSize: "0.8rem",
                    wordBreak: "break-all",
                  }}
                >
                  npx ts-node scripts/setUserRole.ts YOUR_FIREBASE_UID specialist
                </Box>
                {sp.permissionHelpAfterCode}
              </Typography>
            )}
          </Alert>
        )}

        {/* Drafts */}
        <Stack spacing={1.5} sx={{ mb: 4 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <EditNoteOutlinedIcon sx={{ color: COLORS.primary, fontSize: 22 }} />
            <Typography variant="h6" component="h2" sx={{ fontWeight: 700, fontSize: "1.05rem" }}>
              {sp.sectionInProgress}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: -0.5 }}>
            {sp.inProgressHint}
          </Typography>

          <TableContainer
            sx={{
              borderRadius: 2,
              border: `1px solid ${COLORS.border}`,
              overflow: "hidden",
            }}
          >
            <Table size="medium" sx={{ minWidth: 520 }}>
              <TableHead sx={tableHeadSx}>
                <TableRow>
                  <TableCell scope="col">{sp.colStoryFocus}</TableCell>
                  <TableCell scope="col">{sp.colLastSaved}</TableCell>
                  <TableCell scope="col" align="right" width={200}>
                    {sp.colActions}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {localDrafts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} sx={{ py: 5, border: 0 }}>
                      <Stack alignItems="center" spacing={2} sx={{ textAlign: "center", px: 2 }}>
                        <Box
                          sx={{
                            width: 56,
                            height: 56,
                            borderRadius: "50%",
                            bgcolor: "rgba(97, 120, 145, 0.08)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <EditNoteOutlinedIcon sx={{ color: COLORS.primary, fontSize: 28 }} />
                        </Box>
                        <Box>
                          <Typography variant="subtitle1" fontWeight={700}>
                            {sp.draftsEmptyTitle}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360, mx: "auto" }}>
                            {sp.draftsEmptyBody}
                          </Typography>
                        </Box>
                        <Button variant="contained" startIcon={<AddIcon />} onClick={handleNewBrief}>
                          {sp.startABrief}
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : (
                  localDrafts.map((d) => (
                    <TableRow key={d.draftId} sx={rowHoverSx}>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                          {d.storyType ? (
                            <Chip
                              size="small"
                              label={storyTypeLabel(ui, d.storyType ?? undefined)}
                              sx={{
                                fontWeight: 600,
                                bgcolor: "rgba(97, 120, 145, 0.12)",
                                color: COLORS.primary,
                                border: "none",
                              }}
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              {sp.notStarted}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {d.savedAt ? formatBriefSavedAt(d.savedAt, dateLocale) : "—"}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          component={RouterLink}
                          to={`${base}/create-brief/${d.draftId}`}
                          variant="contained"
                          size="small"
                          sx={{ mr: 0.5, fontWeight: 700 }}
                        >
                          {sp.resume}
                        </Button>
                        <Tooltip title={sp.deleteDraftTooltip}>
                          <IconButton
                            size="small"
                            aria-label={sp.deleteDraftAria}
                            onClick={() =>
                              setDeleteTarget({
                                id: d.draftId,
                                label: storyTypeLabel(ui, d.storyType ?? undefined),
                              })
                            }
                            sx={{ color: COLORS.textSecondary }}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>

        {/* Submitted */}
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <TaskAltOutlinedIcon sx={{ color: COLORS.primary, fontSize: 22 }} />
            <Typography variant="h6" component="h2" sx={{ fontWeight: 700, fontSize: "1.05rem" }}>
              {sp.sectionSubmitted}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: -0.5 }}>
            {sp.submittedHint}
          </Typography>

          <TableContainer
            sx={{
              borderRadius: 2,
              border: `1px solid ${COLORS.border}`,
              overflow: "hidden",
            }}
          >
            <Table size="medium" sx={{ minWidth: 520 }}>
              <TableHead sx={tableHeadSx}>
                <TableRow>
                  <TableCell scope="col">{sp.colBriefId}</TableCell>
                  <TableCell scope="col">{sp.colStoryFocus}</TableCell>
                  <TableCell scope="col">{sp.colSubmitted}</TableCell>
                  <TableCell scope="col" align="right" width={120}>
                    {sp.colActions}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  [0, 1, 2].map((i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton width={140} />
                      </TableCell>
                      <TableCell>
                        <Skeleton width={100} />
                      </TableCell>
                      <TableCell>
                        <Skeleton width={120} />
                      </TableCell>
                      <TableCell align="right">
                        <Skeleton width={64} sx={{ ml: "auto" }} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : submitted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ py: 5, border: 0 }}>
                      <Stack alignItems="center" spacing={1.5} sx={{ textAlign: "center", px: 2 }}>
                        <Box
                          sx={{
                            width: 56,
                            height: 56,
                            borderRadius: "50%",
                            bgcolor: "rgba(97, 120, 145, 0.08)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <TaskAltOutlinedIcon sx={{ color: COLORS.primary, fontSize: 28 }} />
                        </Box>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {sp.submittedEmptyTitle}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mx: "auto" }}>
                          {sp.submittedEmptyBody}
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : (
                  submitted.map((row) => (
                    <TableRow key={row.id} sx={rowHoverSx}>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <Tooltip title={row.id}>
                            <Typography
                              variant="body2"
                              component="span"
                              sx={{ fontFamily: "ui-monospace, monospace", fontSize: "0.8rem" }}
                            >
                              {truncateId(row.id)}
                            </Typography>
                          </Tooltip>
                          <Tooltip title={sp.copyFullIdTooltip}>
                            <IconButton size="small" aria-label={sp.copyBriefIdAria} onClick={() => void copyId(row.id)}>
                              <ContentCopyIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {row.storyType ? (
                          <Chip
                            size="small"
                            label={storyTypeLabel(ui, row.storyType)}
                            sx={{
                              fontWeight: 600,
                              bgcolor: "rgba(97, 120, 145, 0.12)",
                              color: COLORS.primary,
                              border: "none",
                            }}
                          />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {row.submittedAt
                            ? formatBriefSavedAt(Date.parse(row.submittedAt), dateLocale)
                            : "—"}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          component={RouterLink}
                          to={`${base}/briefs/${row.id}`}
                          variant="outlined"
                          size="small"
                          sx={{ fontWeight: 700, borderColor: COLORS.border }}
                        >
                          {sp.view}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </Paper>

      <Dialog open={deleteTarget != null} onClose={() => setDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>{sp.deleteDraftDialogTitle}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {deleteTarget?.label && deleteTarget.label !== "—"
              ? sp.deleteDraftDialogWithLabel(deleteTarget.label)
              : sp.deleteDraftDialogGeneric}{" "}
            {sp.cannotUndo}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} sx={{ textTransform: "none" }}>
            {sp.cancel}
          </Button>
          <Button color="error" variant="contained" onClick={confirmDeleteDraft} sx={{ textTransform: "none" }}>
            {sp.deleteDraftConfirm}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar != null}
        autoHideDuration={2800}
        onClose={() => setSnackbar(null)}
        message={snackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </SpecialistPortalShell>
  );
}
