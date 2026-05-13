import { useCallback, useEffect, useMemo, useState } from "react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { EnvironmentEntry, VisualBibleArtefact } from "../../../types/illustration";
import {
  patchVisualBible,
  regenerateVisualBible,
  type VisualBiblePatchFields,
} from "../../../api/illustrationApi";

const MANDATED_NO_TEXT_HINT =
  "text, letters, words, captions, labels, speech bubbles, logos of any kind";

function paletteToChips(palette: string): string[] {
  return palette
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function chipsToPalette(chips: string[]): string {
  return chips.join(", ");
}

interface Props {
  storyId: string;
  readOnly: boolean;
  currentVersion: number;
  visualBible: VisualBibleArtefact | null;
  visualBibleVersionsDesc: VisualBibleArtefact[];
  visualBibleRegenBusy: boolean;
}

export default function VisualBibleCard({
  storyId,
  readOnly,
  currentVersion,
  visualBible,
  visualBibleVersionsDesc,
  visualBibleRegenBusy,
}: Props) {
  const [selectedVersion, setSelectedVersion] = useState(currentVersion);
  const [editing, setEditing] = useState(false);
  const [confirmRegenOpen, setConfirmRegenOpen] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [regenBusy, setRegenBusy] = useState(false);

  const [draftAnchor, setDraftAnchor] = useState("");
  const [draftSheet, setDraftSheet] = useState("");
  const [draftStyle, setDraftStyle] = useState("");
  const [draftPaletteChips, setDraftPaletteChips] = useState<string[]>([]);
  const [draftAnchors, setDraftAnchors] = useState<string[]>([]);
  const [draftAvoidRest, setDraftAvoidRest] = useState<string[]>([]);
  const [draftEnvs, setDraftEnvs] = useState<Record<string, EnvironmentEntry>>({});

  useEffect(() => {
    setSelectedVersion(currentVersion);
  }, [currentVersion]);

  const displayArtefact = useMemo(() => {
    return (
      visualBibleVersionsDesc.find((v) => v.version === selectedVersion) ?? visualBible
    );
  }, [visualBible, visualBibleVersionsDesc, selectedVersion]);

  const openEditor = useCallback(() => {
    if (!visualBible) return;
    setDraftAnchor(visualBible.characterAnchor);
    setDraftSheet(visualBible.characterSheet);
    setDraftStyle(visualBible.styleGuide);
    setDraftPaletteChips(paletteToChips(visualBible.palette));
    setDraftAnchors([...visualBible.consistencyAnchors]);
    const avoid = [...visualBible.avoidList];
    setDraftAvoidRest(avoid.length > 1 ? avoid.slice(1) : []);
    setDraftEnvs({ ...visualBible.environmentRegistry });
    setSaveErr(null);
    setEditing(true);
  }, [visualBible]);

  const mandatedLine = displayArtefact?.avoidList[0] ?? MANDATED_NO_TEXT_HINT;

  const dirty = useMemo(() => {
    if (!visualBible || !editing) return false;
    const palEq =
      chipsToPalette(draftPaletteChips) === visualBible.palette;
    const envEq =
      JSON.stringify(draftEnvs) === JSON.stringify(visualBible.environmentRegistry);
    const avoidEq =
      [mandatedLine, ...draftAvoidRest].join("\0") ===
      visualBible.avoidList.join("\0");
    return (
      draftAnchor !== visualBible.characterAnchor ||
      draftSheet !== visualBible.characterSheet ||
      draftStyle !== visualBible.styleGuide ||
      !palEq ||
      JSON.stringify(draftAnchors) !== JSON.stringify(visualBible.consistencyAnchors) ||
      !avoidEq ||
      !envEq
    );
  }, [
    visualBible,
    editing,
    draftAnchor,
    draftSheet,
    draftStyle,
    draftPaletteChips,
    draftAnchors,
    draftAvoidRest,
    draftEnvs,
    mandatedLine,
  ]);

  const save = async () => {
    if (!visualBible) return;
    setSaveErr(null);
    setSaveBusy(true);
    const body: VisualBiblePatchFields = {
      characterAnchor: draftAnchor,
      characterSheet: draftSheet,
      styleGuide: draftStyle,
      palette: chipsToPalette(draftPaletteChips),
      consistencyAnchors: draftAnchors,
      avoidList: [mandatedLine, ...draftAvoidRest],
      environmentRegistry: draftEnvs,
    };
    try {
      await patchVisualBible(storyId, body);
      setEditing(false);
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaveBusy(false);
    }
  };

  const runRegen = async () => {
    setRegenBusy(true);
    setSaveErr(null);
    try {
      await regenerateVisualBible(storyId);
      setConfirmRegenOpen(false);
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : String(e));
    } finally {
      setRegenBusy(false);
    }
  };

  if (visualBibleRegenBusy) {
    return (
      <Stack spacing={1} sx={{ py: 1 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          Visual Bible
        </Typography>
        <Skeleton variant="rounded" height={160} />
        <Typography variant="body2" color="text.secondary">
          Regenerating Visual Bible…
        </Typography>
      </Stack>
    );
  }

  if (!displayArtefact) {
    return (
      <Typography variant="body2" color="text.secondary">
        Loading Visual Bible…
      </Typography>
    );
  }

  const isViewingOlder = selectedVersion !== currentVersion;
  const canEdit = !readOnly && !isViewingOlder;

  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" sx={{ pr: 1 }}>
          <Typography variant="subtitle1" fontWeight={700}>
            Visual Bible (v{displayArtefact.version})
          </Typography>
          {isViewingOlder ? (
            <Chip size="small" label="Historical view" color="warning" variant="outlined" />
          ) : null}
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="vb-version-label">Version</InputLabel>
              <Select
                labelId="vb-version-label"
                label="Version"
                value={selectedVersion}
                onChange={(e) => setSelectedVersion(Number(e.target.value))}
              >
                {visualBibleVersionsDesc.map((v) => (
                  <MenuItem key={v.version} value={v.version}>
                    v{v.version} · {v.source === "llm_generated" ? "LLM" : "Edited"}
                    {v.version === currentVersion ? " (current)" : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {canEdit && !editing ? (
              <Button size="small" variant="outlined" onClick={openEditor}>
                Edit
              </Button>
            ) : null}
            {canEdit && editing ? (
              <>
                <Button
                  size="small"
                  variant="contained"
                  disabled={!dirty || saveBusy}
                  onClick={() => void save()}
                >
                  Save
                </Button>
                <Button
                  size="small"
                  variant="text"
                  disabled={saveBusy}
                  onClick={() => {
                    setEditing(false);
                    setSaveErr(null);
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : null}
            {canEdit && !editing ? (
              <Button
                size="small"
                color="secondary"
                variant="outlined"
                disabled={regenBusy}
                onClick={() => setConfirmRegenOpen(true)}
              >
                Regenerate Visual Bible
              </Button>
            ) : null}
          </Stack>

          {saveErr ? (
            <Alert severity="error" onClose={() => setSaveErr(null)}>
              {saveErr}
            </Alert>
          ) : null}

          {editing && canEdit ? (
            <Stack spacing={2}>
              <TextField
                label="Character anchor"
                multiline
                minRows={2}
                fullWidth
                value={draftAnchor}
                onChange={(e) => setDraftAnchor(e.target.value)}
                helperText={`${draftAnchor.length} / 240`}
                error={draftAnchor.length > 240}
              />
              <TextField
                label="Character sheet"
                multiline
                minRows={4}
                fullWidth
                value={draftSheet}
                onChange={(e) => setDraftSheet(e.target.value)}
              />
              <TextField
                label="Style guide"
                multiline
                minRows={3}
                fullWidth
                value={draftStyle}
                onChange={(e) => setDraftStyle(e.target.value)}
              />
              <Box>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                  Palette (comma-separated colours — use chips below)
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mb: 1 }}>
                  {draftPaletteChips.map((c, i) => (
                    <Chip
                      key={`${c}-${i}`}
                      label={c}
                      onDelete={() =>
                        setDraftPaletteChips(draftPaletteChips.filter((_, j) => j !== i))
                      }
                    />
                  ))}
                </Stack>
                <Button
                  size="small"
                  onClick={() => {
                    const next = window.prompt("Add palette entry");
                    if (next?.trim()) {
                      setDraftPaletteChips([...draftPaletteChips, next.trim()]);
                    }
                  }}
                >
                  Add colour
                </Button>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Consistency anchors
                </Typography>
                <Stack spacing={0.5}>
                  {draftAnchors.map((a, i) => (
                    <Stack key={i} direction="row" spacing={1} alignItems="center">
                      <TextField
                        size="small"
                        fullWidth
                        value={a}
                        onChange={(e) => {
                          const next = [...draftAnchors];
                          next[i] = e.target.value;
                          setDraftAnchors(next);
                        }}
                      />
                      <Button
                        size="small"
                        onClick={() =>
                          setDraftAnchors(draftAnchors.filter((_, j) => j !== i))
                        }
                      >
                        Remove
                      </Button>
                    </Stack>
                  ))}
                  <Button size="small" onClick={() => setDraftAnchors([...draftAnchors, ""])}>
                    Add anchor
                  </Button>
                </Stack>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Avoid list
                </Typography>
                <Chip
                  size="small"
                  label={mandatedLine}
                  sx={{ mb: 1, opacity: 0.85 }}
                  color="default"
                  variant="outlined"
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                  Mandated (no on-screen text) — always kept as first line
                </Typography>
                <Stack spacing={0.5}>
                  {draftAvoidRest.map((a, i) => (
                    <Stack key={i} direction="row" spacing={1} alignItems="center">
                      <TextField
                        size="small"
                        fullWidth
                        value={a}
                        onChange={(e) => {
                          const next = [...draftAvoidRest];
                          next[i] = e.target.value;
                          setDraftAvoidRest(next);
                        }}
                      />
                      <Button
                        size="small"
                        onClick={() =>
                          setDraftAvoidRest(draftAvoidRest.filter((_, j) => j !== i))
                        }
                      >
                        Remove
                      </Button>
                    </Stack>
                  ))}
                  <Button size="small" onClick={() => setDraftAvoidRest([...draftAvoidRest, ""])}>
                    Add avoid entry
                  </Button>
                </Stack>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Environments
                </Typography>
                {Object.entries(draftEnvs).map(([key, ent]) => (
                  <Accordion key={key} disableGutters elevation={0} sx={{ border: 1, borderColor: "divider", mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>{key}</AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={1}>
                        <TextField
                          label="Atmosphere"
                          multiline
                          minRows={2}
                          fullWidth
                          value={ent.atmosphere}
                          onChange={(e) =>
                            setDraftEnvs({
                              ...draftEnvs,
                              [key]: { ...ent, atmosphere: e.target.value },
                            })
                          }
                        />
                        <TextField
                          label="Spatial layout"
                          multiline
                          minRows={2}
                          fullWidth
                          value={ent.spatialLayout}
                          onChange={(e) =>
                            setDraftEnvs({
                              ...draftEnvs,
                              [key]: { ...ent, spatialLayout: e.target.value },
                            })
                          }
                        />
                        <Button
                          size="small"
                          color="error"
                          onClick={() => {
                            const { [key]: _, ...rest } = draftEnvs;
                            setDraftEnvs(rest);
                          }}
                        >
                          Remove environment
                        </Button>
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                ))}
                <Button
                  size="small"
                  onClick={() => {
                    const name = window.prompt("Environment key (e.g. forest, bedroom)");
                    if (name?.trim() && !draftEnvs[name.trim()]) {
                      setDraftEnvs({
                        ...draftEnvs,
                        [name.trim()]: { atmosphere: "", spatialLayout: "" },
                      });
                    }
                  }}
                >
                  Add environment
                </Button>
              </Box>
            </Stack>
          ) : (
            <Stack spacing={1.5}>
              <Typography variant="subtitle2" color="primary">
                Character anchor
              </Typography>
              <Typography variant="body2">{displayArtefact.characterAnchor}</Typography>
              <Typography variant="caption" color="text.secondary">
                Style: {displayArtefact.styleGuide.slice(0, 120)}
                {displayArtefact.styleGuide.length > 120 ? "…" : ""}
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={0.5}>
                {paletteToChips(displayArtefact.palette).map((c) => (
                  <Chip
                    key={c}
                    size="small"
                    label={c}
                    sx={{
                      borderLeft: 4,
                      borderColor: "divider",
                    }}
                  />
                ))}
              </Stack>
            </Stack>
          )}

          <Dialog open={confirmRegenOpen} onClose={() => setConfirmRegenOpen(false)} fullWidth maxWidth="sm">
            <DialogTitle>Regenerate Visual Bible?</DialogTitle>
            <DialogContent>
              <Typography variant="body2">
                This produces a new Visual Bible version. Per-page scene plans created from older
                versions will be flagged stale until you regenerate each scene plan.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setConfirmRegenOpen(false)}>Cancel</Button>
              <Button variant="contained" disabled={regenBusy} onClick={() => void runRegen()}>
                Continue
              </Button>
            </DialogActions>
          </Dialog>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
