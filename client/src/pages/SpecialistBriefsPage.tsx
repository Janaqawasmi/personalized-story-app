import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  IconButton,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import { listDammaStoryBriefs, type DammaStoryBriefListItem } from "../api/dammaStoryBrief";
import {
  createNewDraftIdWithEmptyBrief,
  deleteDraftForDraftId,
  listLocalDraftSummaries,
} from "../utils/briefDraftStorage";
import { COLORS } from "../theme";
import { useStoryBriefUi } from "../i18n/storyBriefUi";
import { useBriefDateLocale, formatBriefSavedAt } from "../i18n/storyBriefUi";
import type { StoryType } from "../types/storyBrief";

const pageSx = {
  py: { xs: 3, sm: 5 },
  px: { xs: 2, sm: 3 },
  maxWidth: 960,
  mx: "auto",
};

function storyTypeLabel(ui: ReturnType<typeof useStoryBriefUi>, t: string | undefined): string {
  if (!t) return "—";
  if (t in ui.STORY_TYPE_LABELS) {
    return ui.STORY_TYPE_LABELS[t as StoryType];
  }
  return t;
}

export default function SpecialistBriefsPage() {
  const { lang } = useParams<{ lang: string }>();
  const navigate = useNavigate();
  const base = `/${lang ?? "he"}/specialist`;
  const ui = useStoryBriefUi();
  const dateLocale = useBriefDateLocale();

  const [submitted, setSubmitted] = useState<DammaStoryBriefListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [draftTick, setDraftTick] = useState(0);

  const localDrafts = useMemo(() => listLocalDraftSummaries(), [draftTick]);

  const refreshSubmitted = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const rows = await listDammaStoryBriefs(80);
      setSubmitted(rows);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Could not load submitted briefs");
      setSubmitted([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSubmitted();
  }, [refreshSubmitted]);

  function handleNewBrief() {
    const id = createNewDraftIdWithEmptyBrief();
    setDraftTick((n) => n + 1);
    navigate(`${base}/create-brief/${id}`);
  }

  function handleDeleteDraft(draftId: string) {
    if (!window.confirm("Delete this draft? This cannot be undone.")) return;
    deleteDraftForDraftId(draftId);
    setDraftTick((n) => n + 1);
  }

  return (
    <Box sx={pageSx}>
      <Box display="flex" flexWrap="wrap" alignItems="center" justifyContent="space-between" gap={2} mb={3}>
        <div>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Story briefs
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Continue a saved draft or review briefs you already submitted.
          </Typography>
        </div>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleNewBrief} sx={{ textTransform: "none" }}>
          New brief
        </Button>
      </Box>

      {listError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {listError}
        </Alert>
      )}

      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
        Drafts (this browser)
      </Typography>
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ mb: 4, border: `1px solid ${COLORS.border}`, borderRadius: 2 }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Story type</TableCell>
              <TableCell>Last saved</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {localDrafts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3}>
                  <Typography variant="body2" color="text.secondary">
                    No local drafts. Start a new brief or open a previous link.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              localDrafts.map((d) => (
                <TableRow key={d.draftId}>
                  <TableCell>{storyTypeLabel(ui, d.storyType ?? undefined)}</TableCell>
                  <TableCell>
                    {d.savedAt
                      ? formatBriefSavedAt(d.savedAt, dateLocale)
                      : "—"}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      component={RouterLink}
                      to={`${base}/create-brief/${d.draftId}`}
                      size="small"
                      sx={{ textTransform: "none", mr: 1 }}
                    >
                      Resume
                    </Button>
                    <IconButton
                      size="small"
                      aria-label="Delete draft"
                      onClick={() => handleDeleteDraft(d.draftId)}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
        Submitted
      </Typography>
      <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Brief ID</TableCell>
              <TableCell>Story type</TableCell>
              <TableCell>Submitted</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Box display="flex" alignItems="center" gap={1} py={1}>
                    <CircularProgress size={22} />
                    <Typography variant="body2">Loading…</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : submitted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography variant="body2" color="text.secondary">
                    No submitted briefs yet.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              submitted.map((row) => (
                <TableRow key={row.id}>
                  <TableCell sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{row.id}</TableCell>
                  <TableCell>{storyTypeLabel(ui, row.storyType)}</TableCell>
                  <TableCell>
                    {row.submittedAt
                      ? formatBriefSavedAt(Date.parse(row.submittedAt), dateLocale)
                      : "—"}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      component={RouterLink}
                      to={`${base}/briefs/${row.id}`}
                      size="small"
                      sx={{ textTransform: "none" }}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
