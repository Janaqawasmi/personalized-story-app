// client/src/pages/AdminContractReviewPage.tsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Stack,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Divider,
  Card,
  CardContent,
} from "@mui/material";
import SpecialistNav from "../components/SpecialistNav";
import {
  fetchStoryBriefById,
  fetchGenerationContract,
  buildContractFromBrief,
  applyContractOverride,
  resetContractOverrides,
  fetchReviewHistory,
  StoryBrief,
  GenerationContract,
  ClientReviewRecord,
  SpecialistOverrides,
} from "../api/api";

// ============================================================================
// Constants & Helpers
// ============================================================================

function formatDisplayText(text: string): string {
  if (!text) return text;
  return text
    .split("_")
    .filter((w) => w.length > 0)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const CLINICAL_LABELS: Record<string, string> = {
  // Required elements
  emotion_labeling: "Name and validate the child's emotions",
  validation_phrase: "Include an emotional validation phrase",
  reassurance_loop: "Repeat a reassurance/comfort cycle",
  gentle_exposure_steps: "Gradual, gentle exposure to difficulty",
  predictable_routine: "Show a predictable, safe routine",
  caregiver_reassurance: "Caregiver provides reassurance",
  small_success_moment: "A small moment of success or agency",
  positive_self_talk: "Model positive self-talk",
  coping_tool_practice: "Practice the coping tool in the story",
  // Coping tools
  balloon_breathing: "Balloon breathing exercise",
  counting: "Counting (self-regulation)",
  safe_object: "Comfort/safe object",
  coping_phrase: "Coping phrase (repeated reassurance)",
  name_the_feeling: "Name the feeling",
  // Must-avoid
  shaming_language: "Shaming language",
  suspense: "Suspense or tension-building",
  threat_metaphors: "Threatening metaphors",
  betrayal_theme: "Themes of betrayal",
  humiliation: "Humiliation",
  punishment_tone: "Punitive or punishing tone",
  sudden_surprise: "Sudden surprises",
  emotional_spikes: "Sharp emotional spikes",
  cliffhanger: "Cliffhanger endings",
  new_threat: "Introduction of new threats",
  helplessness: "Feelings of helplessness",
  needles: "Needles",
  blood: "Blood",
  hospital_realism: "Realistic hospital imagery",
  police_threat: "Police as threat",
  punitive_authority: "Punitive authority figures",
  // Ending elements
  emotional_closure: "Emotional closure",
  calm_state: "Calm state",
  safe_present_moment: "Safe present moment",
  success_moment: "Success moment",
};

function getClinicalLabel(key: string): string {
  return CLINICAL_LABELS[key] || formatDisplayText(key);
}

function formatAgeGroup(ag: string): string {
  const m: Record<string, string> = {
    "0_3": "0\u20133 years",
    "3_6": "3\u20136 years",
    "6_9": "6\u20139 years",
    "9_12": "9\u201312 years",
  };
  return m[ag] || ag;
}

// Known option pools for add-item selects
const KNOWN_REQUIRED_ELEMENTS = [
  "emotion_labeling", "validation_phrase", "reassurance_loop",
  "gentle_exposure_steps", "predictable_routine", "caregiver_reassurance",
  "small_success_moment", "positive_self_talk", "coping_tool_practice",
];

const KNOWN_MUST_AVOID = [
  "shaming_language", "suspense", "threat_metaphors", "betrayal_theme",
  "humiliation", "punishment_tone", "sudden_surprise", "emotional_spikes",
  "cliffhanger", "new_threat", "helplessness", "needles", "blood",
  "hospital_realism", "police_threat", "punitive_authority",
];

const KNOWN_COPING_TOOLS = [
  "balloon_breathing", "counting", "safe_object", "coping_phrase", "name_the_feeling",
];

// ============================================================================
// Component
// ============================================================================

const AdminContractReviewPage: React.FC = () => {
  const { briefId } = useParams<{ briefId: string }>();
  const navigate = useNavigate();

  // --- Data state ---
  const [brief, setBrief] = useState<StoryBrief | null>(null);
  const [contract, setContract] = useState<GenerationContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [reviewHistory, setReviewHistory] = useState<ClientReviewRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // --- Override editor state ---
  const [ovCopingTool, setOvCopingTool] = useState("");
  const [ovSensitivity, setOvSensitivity] = useState("");
  const [ovEndingStyle, setOvEndingStyle] = useState("");
  const [ovCaregiverPresence, setOvCaregiverPresence] = useState("");
  const [ovKeyMessage, setOvKeyMessage] = useState("");
  const [ovMinScenes, setOvMinScenes] = useState<number | "">("");
  const [ovMaxScenes, setOvMaxScenes] = useState<number | "">("");
  const [ovMaxWords, setOvMaxWords] = useState<number | "">("");
  const [addedRequired, setAddedRequired] = useState<string[]>([]);
  const [removedRequired, setRemovedRequired] = useState<string[]>([]);
  const [addedMustAvoid, setAddedMustAvoid] = useState<string[]>([]);
  const [removedMustAvoid, setRemovedMustAvoid] = useState<string[]>([]);
  const [newRequiredItem, setNewRequiredItem] = useState("");
  const [newMustAvoidItem, setNewMustAvoidItem] = useState("");
  const [customMustAvoid, setCustomMustAvoid] = useState("");

  // --- Init editor from contract ---
  const initEditor = useCallback((c: GenerationContract) => {
    const ov = c.specialistOverrides;
    setOvCopingTool(ov?.copingToolId || "");
    setOvSensitivity(ov?.emotionalSensitivity || "");
    setOvEndingStyle(ov?.endingStyle || "");
    setOvCaregiverPresence(ov?.caregiverPresence || "");
    setOvKeyMessage(ov?.keyMessage || "");
    setOvMinScenes(ov?.minScenes ?? "");
    setOvMaxScenes(ov?.maxScenes ?? "");
    setOvMaxWords(ov?.maxWords ?? "");
    setAddedRequired(ov?.addRequiredElements || []);
    setRemovedRequired(ov?.removeRequiredElements || []);
    setAddedMustAvoid(ov?.addMustAvoid || []);
    setRemovedMustAvoid(ov?.removeMustAvoid || []);
  }, []);

  // --- Compute base items (before overrides) ---
  const baseRequired = useMemo(() => {
    if (!contract) return [];
    const prev = contract.specialistOverrides;
    let base = [...contract.requiredElements];
    if (prev?.removeRequiredElements) base = [...base, ...prev.removeRequiredElements];
    if (prev?.addRequiredElements) {
      const addSet = new Set(prev.addRequiredElements);
      base = base.filter((e) => !addSet.has(e));
    }
    return Array.from(new Set(base));
  }, [contract]);

  const baseMustAvoid = useMemo(() => {
    if (!contract) return [];
    const prev = contract.specialistOverrides;
    let base = [...contract.mustAvoid];
    if (prev?.removeMustAvoid) base = [...base, ...prev.removeMustAvoid];
    if (prev?.addMustAvoid) {
      const addSet = new Set(prev.addMustAvoid);
      base = base.filter((e) => !addSet.has(e));
    }
    return Array.from(new Set(base));
  }, [contract]);

  // --- Effective displayed lists ---
  const effectiveRequired = useMemo(() => {
    const removeSet = new Set(removedRequired);
    return Array.from(new Set([...baseRequired.filter((e) => !removeSet.has(e)), ...addedRequired]));
  }, [baseRequired, addedRequired, removedRequired]);

  const effectiveMustAvoid = useMemo(() => {
    const removeSet = new Set(removedMustAvoid);
    return Array.from(new Set([...baseMustAvoid.filter((e) => !removeSet.has(e)), ...addedMustAvoid]));
  }, [baseMustAvoid, addedMustAvoid, removedMustAvoid]);

  // --- Unsaved changes detection ---
  const hasUnsavedChanges = useMemo(() => {
    if (!contract) return false;
    const ov = contract.specialistOverrides;
    return (
      ovCopingTool !== (ov?.copingToolId || "") ||
      ovSensitivity !== (ov?.emotionalSensitivity || "") ||
      ovEndingStyle !== (ov?.endingStyle || "") ||
      ovCaregiverPresence !== (ov?.caregiverPresence || "") ||
      ovKeyMessage !== (ov?.keyMessage || "") ||
      ovMinScenes !== (ov?.minScenes ?? "") ||
      ovMaxScenes !== (ov?.maxScenes ?? "") ||
      ovMaxWords !== (ov?.maxWords ?? "") ||
      JSON.stringify(addedRequired.slice().sort()) !== JSON.stringify((ov?.addRequiredElements || []).slice().sort()) ||
      JSON.stringify(removedRequired.slice().sort()) !== JSON.stringify((ov?.removeRequiredElements || []).slice().sort()) ||
      JSON.stringify(addedMustAvoid.slice().sort()) !== JSON.stringify((ov?.addMustAvoid || []).slice().sort()) ||
      JSON.stringify(removedMustAvoid.slice().sort()) !== JSON.stringify((ov?.removeMustAvoid || []).slice().sort())
    );
  }, [contract, ovCopingTool, ovSensitivity, ovEndingStyle, ovCaregiverPresence, ovKeyMessage, ovMinScenes, ovMaxScenes, ovMaxWords, addedRequired, removedRequired, addedMustAvoid, removedMustAvoid]);

  // --- Load data ---
  const loadContractData = useCallback(async () => {
    if (!briefId) { setError("Brief ID is required"); setLoading(false); return; }
      try {
        setLoading(true);
        setError(null);
      setSuccessMsg(null);
        const briefData = await fetchStoryBriefById(briefId);
        setBrief(briefData);
      let contractData: GenerationContract;
      try {
        contractData = await fetchGenerationContract(briefId);
      } catch {
        contractData = await buildContractFromBrief(briefId);
        const updatedBrief = await fetchStoryBriefById(briefId);
        setBrief(updatedBrief);
      }
      setContract(contractData);
      initEditor(contractData);
      try {
        setHistoryLoading(true);
        const history = await fetchReviewHistory(briefId);
        setReviewHistory(history);
      } catch { setReviewHistory([]); } finally { setHistoryLoading(false); }
    } catch (err: any) {
      setError(err.message || "Failed to load contract");
    } finally { setLoading(false); }
  }, [briefId, initEditor]);

  useEffect(() => { loadContractData(); }, [loadContractData]);

  // --- Required elements handlers ---
  const handleRemoveRequired = (item: string) => {
    if (addedRequired.includes(item)) {
      setAddedRequired((prev) => prev.filter((e) => e !== item));
    } else {
      setRemovedRequired((prev) => Array.from(new Set([...prev, item])));
    }
  };

  const handleAddRequired = (item: string) => {
    if (!item) return;
    if (removedRequired.includes(item)) {
      setRemovedRequired((prev) => prev.filter((e) => e !== item));
    } else if (!effectiveRequired.includes(item)) {
      setAddedRequired((prev) => Array.from(new Set([...prev, item])));
    }
    setNewRequiredItem("");
  };

  // --- Must-avoid handlers ---
  const handleRemoveMustAvoid = (item: string) => {
    if (addedMustAvoid.includes(item)) {
      setAddedMustAvoid((prev) => prev.filter((e) => e !== item));
    } else {
      setRemovedMustAvoid((prev) => Array.from(new Set([...prev, item])));
    }
  };

  const handleAddMustAvoid = (item: string) => {
    if (!item) return;
    if (removedMustAvoid.includes(item)) {
      setRemovedMustAvoid((prev) => prev.filter((e) => e !== item));
    } else if (!effectiveMustAvoid.includes(item)) {
      setAddedMustAvoid((prev) => Array.from(new Set([...prev, item])));
    }
    setNewMustAvoidItem("");
  };

  const handleAddCustomMustAvoid = () => {
    const item = customMustAvoid.trim().toLowerCase().replace(/\s+/g, "_");
    if (item) {
      handleAddMustAvoid(item);
      setCustomMustAvoid("");
    }
  };

  // --- Save & Regenerate ---
  const handleSaveAndRegenerate = async () => {
    if (!briefId) return;
    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);
      const overrides: SpecialistOverrides = {};
      if (ovCopingTool) overrides.copingToolId = ovCopingTool;
      if (addedRequired.length) overrides.addRequiredElements = addedRequired;
      if (removedRequired.length) overrides.removeRequiredElements = removedRequired;
      if (addedMustAvoid.length) overrides.addMustAvoid = addedMustAvoid;
      if (removedMustAvoid.length) overrides.removeMustAvoid = removedMustAvoid;
      if (ovSensitivity) overrides.emotionalSensitivity = ovSensitivity as SpecialistOverrides["emotionalSensitivity"];
      if (ovEndingStyle) overrides.endingStyle = ovEndingStyle as SpecialistOverrides["endingStyle"];
      if (ovCaregiverPresence) overrides.caregiverPresence = ovCaregiverPresence as SpecialistOverrides["caregiverPresence"];
      if (ovKeyMessage) overrides.keyMessage = ovKeyMessage;
      if (ovMinScenes !== "") overrides.minScenes = Number(ovMinScenes);
      if (ovMaxScenes !== "") overrides.maxScenes = Number(ovMaxScenes);
      if (ovMaxWords !== "") overrides.maxWords = Number(ovMaxWords);
      overrides.reason = "specialist_adjustment";

      await applyContractOverride(briefId, overrides);
      const updated = await fetchGenerationContract(briefId);
      setContract(updated);
      initEditor(updated);
      const updatedBrief = await fetchStoryBriefById(briefId);
      setBrief(updatedBrief);
      try { const h = await fetchReviewHistory(briefId); setReviewHistory(h); } catch {}
      setSuccessMsg("Contract regenerated with your adjustments.");
    } catch (err: any) {
      setError(err.message || "Failed to save overrides");
    } finally { setSaving(false); }
  };

  // --- Reset to defaults (clear all overrides) ---
  const handleResetDefaults = async () => {
    if (!briefId) return;
    try {
      setResetting(true);
      setError(null);
      setSuccessMsg(null);
      await resetContractOverrides(briefId);
      const updated = await fetchGenerationContract(briefId);
      setContract(updated);
      initEditor(updated);
      const updatedBrief = await fetchStoryBriefById(briefId);
      setBrief(updatedBrief);
      try { const h = await fetchReviewHistory(briefId); setReviewHistory(h); } catch {}
      setSuccessMsg("All overrides cleared. Contract regenerated from clinical rules.");
    } catch (err: any) {
      setError(err.message || "Failed to reset overrides");
    } finally { setResetting(false); }
  };

  // --- Gate conditions ---
  const canContinueToGeneration = contract?.status === "valid" && (!contract.errors || contract.errors.length === 0);

  // Available items for add-selects (exclude already effective items)
  const availableRequiredToAdd = KNOWN_REQUIRED_ELEMENTS.filter((e) => !effectiveRequired.includes(e));
  const availableMustAvoidToAdd = KNOWN_MUST_AVOID.filter((e) => !effectiveMustAvoid.includes(e));
  const copingToolOptions = contract
    ? Array.from(new Set([...contract.allowedCopingTools, ...KNOWN_COPING_TOOLS]))
    : KNOWN_COPING_TOOLS;

  // ===================== RENDER =====================

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !contract) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <SpecialistNav />
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!contract || !brief) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <SpecialistNav />
        <Alert severity="warning">Contract or brief not found</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <SpecialistNav />
      <Typography variant="h4" gutterBottom>
        Contract Editor
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Review and adjust the generation contract. Changes are saved and approved automatically.
      </Typography>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {successMsg && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}
      {contract.errors.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <strong>Contract Errors:</strong>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {contract.errors.map((e, i) => <li key={i}>{e.message}</li>)}
          </ul>
        </Alert>
      )}
      {contract.warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>Warnings:</strong>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {contract.warnings.map((w, i) => <li key={i}>{w.message}</li>)}
          </ul>
        </Alert>
      )}

      {/* Workflow guidance */}
      {hasUnsavedChanges ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>Unsaved changes</strong> — Click "Save &amp; Regenerate" to apply your adjustments.
        </Alert>
      ) : canContinueToGeneration ? (
        <Alert severity="success" sx={{ mb: 3 }}>
          <strong>Ready</strong> — This contract is valid and ready for story generation. You can still adjust it below.
        </Alert>
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>
          Adjust the contract below, then click "Save &amp; Regenerate".
        </Alert>
      )}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
        {/* ────────────── Brief Summary (read-only) ────────────── */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Brief Summary</Typography>
            <Stack spacing={1}>
              <LabelValue label="Topic" value={formatDisplayText(brief.therapeuticFocus.primaryTopic)} />
              <LabelValue label="Situation" value={formatDisplayText(brief.therapeuticFocus.specificSituation)} />
              <LabelValue label="Age Group" value={formatAgeGroup(brief.childProfile.ageGroup)} />
              <LabelValue label="Emotional Sensitivity" value={formatDisplayText(brief.childProfile.emotionalSensitivity)} />
              <Box>
                <Typography variant="caption" color="text.secondary">Emotional Goals</Typography>
                <Box sx={{ mt: 0.5 }}>
                  {brief.therapeuticIntent.emotionalGoals.map((g, i) => (
                    <Chip key={i} label={formatDisplayText(g)} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                  ))}
                </Box>
              </Box>
              <LabelValue label="Ending Style" value={formatDisplayText(brief.storyPreferences.endingStyle)} />
            </Stack>
          </CardContent>
        </Card>

        {/* ────────────── Contract Status (read-only) ────────────── */}
          <Card>
            <CardContent>
            <Typography variant="h6" gutterBottom>Contract Status</Typography>
            <Stack spacing={1}>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                      <Chip
                  label={contract.status === "valid" ? "Valid" : "Invalid"}
                        size="small"
                  color={contract.status === "valid" ? "success" : "error"}
                />
                {contract.overrideUsed && <Chip label="Overrides Applied" size="small" variant="outlined" color="warning" />}
                  </Box>
              <LabelValue label="Rules Version" value={contract.rulesVersionUsed} />
              <LabelValue label="Length Budget" value={`${contract.lengthBudget.minScenes}–${contract.lengthBudget.maxScenes} scenes, max ${contract.lengthBudget.maxWords} words`} />
              <LabelValue label="Language Complexity" value={formatDisplayText(contract.styleRules.languageComplexity)} />
              <LabelValue label="Emotional Tone" value={formatDisplayText(contract.styleRules.emotionalTone)} />
              <LabelValue label="Caregiver Presence" value={formatDisplayText(contract.caregiverPresence)} />
              <LabelValue label="Sensitivity" value={formatDisplayText(contract.emotionalSensitivity)} />
              <LabelValue label="Ending Style" value={formatDisplayText(contract.endingContract.endingStyle)} />
              {contract.keyMessage && <LabelValue label="Key Message" value={contract.keyMessage} />}
              </Stack>
            </CardContent>
          </Card>

        {/* ────────────── SPECIALIST ADJUSTMENTS ────────────── */}
        <Box sx={{ gridColumn: { xs: "1", md: "1 / -1" } }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Specialist Adjustments
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Modify any aspect of the contract. Changes are applied on top of the clinical rules.
            </Typography>

            {/* ── Required Elements ── */}
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Required Elements
            </Typography>
            <Box sx={{ mb: 1 }}>
              {effectiveRequired.map((item) => (
                <Chip
                  key={item}
                  label={getClinicalLabel(item)}
                  size="small"
                  onDelete={() => handleRemoveRequired(item)}
                  color={addedRequired.includes(item) ? "primary" : "default"}
                  variant={addedRequired.includes(item) ? "outlined" : "filled"}
                  sx={{ mr: 0.5, mb: 0.5 }}
                />
              ))}
              {effectiveRequired.length === 0 && (
                <Typography variant="body2" color="text.secondary">None</Typography>
              )}
            </Box>
            {availableRequiredToAdd.length > 0 && (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
                <FormControl size="small" sx={{ minWidth: 280 }}>
                  <InputLabel>Add required element</InputLabel>
                  <Select
                    value={newRequiredItem}
                    onChange={(e) => setNewRequiredItem(e.target.value)}
                    label="Add required element"
                  >
                    {availableRequiredToAdd.map((e) => (
                      <MenuItem key={e} value={e}>{getClinicalLabel(e)}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={!newRequiredItem}
                  onClick={() => handleAddRequired(newRequiredItem)}
                >
                  Add
                </Button>
              </Stack>
            )}

            <Divider sx={{ my: 2 }} />

            {/* ── Must-Avoid Items ── */}
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Must-Avoid Items
            </Typography>
            <Box sx={{ mb: 1 }}>
              {effectiveMustAvoid.map((item) => (
                <Chip
                  key={item}
                  label={getClinicalLabel(item)}
                  size="small"
                  color={addedMustAvoid.includes(item) ? "warning" : "error"}
                  variant="outlined"
                  onDelete={() => handleRemoveMustAvoid(item)}
                  sx={{ mr: 0.5, mb: 0.5 }}
                />
              ))}
              {effectiveMustAvoid.length === 0 && (
                <Typography variant="body2" color="text.secondary">None</Typography>
              )}
            </Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <FormControl size="small" sx={{ minWidth: 280 }}>
                <InputLabel>Add must-avoid item</InputLabel>
                <Select
                  value={newMustAvoidItem}
                  onChange={(e) => setNewMustAvoidItem(e.target.value)}
                  label="Add must-avoid item"
                >
                  {availableMustAvoidToAdd.map((e) => (
                    <MenuItem key={e} value={e}>{getClinicalLabel(e)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                size="small"
                variant="outlined"
                disabled={!newMustAvoidItem}
                onClick={() => handleAddMustAvoid(newMustAvoidItem)}
              >
                Add
              </Button>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
                <TextField
                  size="small"
                  label="Add custom trigger (e.g. dogs, thunder)"
                  value={customMustAvoid}
                  onChange={(e) => setCustomMustAvoid(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCustomMustAvoid(); } }}
                  sx={{ minWidth: 280 }}
                />
                <Button
                  size="small"
                  variant="outlined"
                  disabled={!customMustAvoid.trim()}
                  onClick={handleAddCustomMustAvoid}
                >
                  Add Custom
                </Button>
              </Stack>

            <Divider sx={{ my: 2 }} />

            {/* ── Dropdowns & text fields ── */}
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" }, gap: 2, mb: 3 }}>
              {/* Coping Tool */}
              <FormControl size="small" fullWidth>
                <InputLabel>Primary Coping Tool</InputLabel>
                <Select
                  value={ovCopingTool}
                  onChange={(e) => setOvCopingTool(e.target.value)}
                  label="Primary Coping Tool"
                >
                  <MenuItem value=""><em>Use default</em></MenuItem>
                  {copingToolOptions.map((t) => (
                    <MenuItem key={t} value={t}>{getClinicalLabel(t)}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Emotional Sensitivity */}
              <FormControl size="small" fullWidth>
                <InputLabel>Emotional Sensitivity</InputLabel>
                <Select
                  value={ovSensitivity}
                  onChange={(e) => setOvSensitivity(e.target.value)}
                  label="Emotional Sensitivity"
                >
                  <MenuItem value=""><em>Use default ({formatDisplayText(brief.childProfile.emotionalSensitivity)})</em></MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>

              {/* Ending Style */}
              <FormControl size="small" fullWidth>
                <InputLabel>Ending Style</InputLabel>
                <Select
                  value={ovEndingStyle}
                  onChange={(e) => setOvEndingStyle(e.target.value)}
                  label="Ending Style"
                >
                  <MenuItem value=""><em>Use default ({formatDisplayText(brief.storyPreferences.endingStyle)})</em></MenuItem>
                  <MenuItem value="calm_resolution">Calm Resolution</MenuItem>
                  <MenuItem value="open_ended">Open Ended</MenuItem>
                  <MenuItem value="empowering">Empowering</MenuItem>
                </Select>
              </FormControl>

              {/* Caregiver Presence */}
              <FormControl size="small" fullWidth>
                <InputLabel>Caregiver Presence</InputLabel>
                <Select
                  value={ovCaregiverPresence}
                  onChange={(e) => setOvCaregiverPresence(e.target.value)}
                  label="Caregiver Presence"
                >
                  <MenuItem value=""><em>Use default ({formatDisplayText(brief.storyPreferences.caregiverPresence)})</em></MenuItem>
                  <MenuItem value="included">Included</MenuItem>
                  <MenuItem value="self_guided">Self-Guided</MenuItem>
                </Select>
              </FormControl>

              {/* Min Scenes */}
              <TextField
                size="small"
                type="number"
                label="Min Scenes"
                value={ovMinScenes}
                onChange={(e) => setOvMinScenes(e.target.value === "" ? "" : Number(e.target.value))}
                inputProps={{ min: 1, max: 20 }}
                helperText={`Default: ${contract.lengthBudget.minScenes}`}
              />

              {/* Max Scenes */}
              <TextField
                size="small"
                type="number"
                label="Max Scenes"
                value={ovMaxScenes}
                onChange={(e) => setOvMaxScenes(e.target.value === "" ? "" : Number(e.target.value))}
                inputProps={{ min: 1, max: 20 }}
                helperText={`Default: ${contract.lengthBudget.maxScenes}`}
              />

              {/* Max Words */}
              <TextField
                size="small"
                type="number"
                label="Max Words"
                value={ovMaxWords}
                onChange={(e) => setOvMaxWords(e.target.value === "" ? "" : Number(e.target.value))}
                inputProps={{ min: 50, max: 5000 }}
                helperText={ovMaxWords === "" && (ovMaxScenes !== "" || ovMinScenes !== "") ? "Auto-scales with scenes" : `Default: ${contract.lengthBudget.maxWords}`}
              />
            </Box>

            {/* Key Message */}
            <TextField
              size="small"
              fullWidth
              label="Key Message (override)"
              value={ovKeyMessage}
              onChange={(e) => setOvKeyMessage(e.target.value)}
              placeholder={contract.keyMessage || "e.g. It's okay to ask for help"}
              helperText="The core takeaway the story should convey"
              sx={{ mb: 3 }}
            />

            {/* Action buttons */}
            <Stack spacing={2}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Button
                  variant="contained"
                  onClick={handleSaveAndRegenerate}
                  disabled={saving || !hasUnsavedChanges}
                  startIcon={saving ? <CircularProgress size={16} /> : undefined}
                >
                  {saving ? "Saving…" : "Save & Regenerate"}
                </Button>
                {contract.overrideUsed && (
                  <Button
                    variant="outlined"
                    color="warning"
                    onClick={handleResetDefaults}
                    disabled={resetting}
                    startIcon={resetting ? <CircularProgress size={16} /> : undefined}
                  >
                    {resetting ? "Resetting…" : "Reset to Defaults"}
                  </Button>
                )}
              </Stack>
              {contract.status !== "valid" && (
                <Typography variant="caption" color="error">
                  Contract has errors — fix them before generating a story.
                </Typography>
              )}
            </Stack>
          </Paper>
        </Box>

        {/* ────────────── Audit Trail ────────────── */}
        <Box sx={{ gridColumn: { xs: "1", md: "1 / -1" } }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Audit Trail</Typography>
            {historyLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}><CircularProgress size={24} /></Box>
            ) : reviewHistory.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No audit records yet.</Typography>
            ) : (
              <Stack spacing={1}>
                {reviewHistory.map((record) => {
                  const ts =
                    typeof record.createdAt === "object" && record.createdAt !== null
                      ? "_seconds" in record.createdAt
                        ? new Date((record.createdAt as any)._seconds * 1000).toLocaleString()
                        : "seconds" in record.createdAt
                          ? new Date((record.createdAt as any).seconds * 1000).toLocaleString()
                          : "—"
                      : typeof record.createdAt === "string"
                        ? new Date(record.createdAt).toLocaleString()
                        : "—";
                  return (
                    <Card key={record.id} variant="outlined">
                      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Chip
                            label={record.overrideApplied ? "Overrides Applied" : "Clean Build"}
                            size="small"
                            color={record.overrideApplied ? "warning" : "success"}
                            variant="outlined"
                          />
                          <Typography variant="caption" color="text.secondary">
                            by {record.reviewerId} · {ts}
                          </Typography>
                        </Stack>
                        {record.clinicalRationale && (
                          <Typography variant="body2" sx={{ mt: 0.5, fontStyle: "italic", color: "text.secondary" }}>
                            {record.clinicalRationale}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </Paper>
        </Box>

        {/* ────────────── Bottom Actions ────────────── */}
        <Box sx={{ gridColumn: { xs: "1", md: "1 / -1" } }}>
          <Divider sx={{ my: 2 }} />
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button variant="outlined" onClick={() => navigate(-1)}>Back</Button>
            <Button
              variant="contained"
              onClick={() => navigate(`/specialist/generate-draft?briefId=${briefId}`)}
              disabled={!canContinueToGeneration}
            >
              Continue to Generation
            </Button>
          </Stack>
          {!canContinueToGeneration && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block", textAlign: "right" }}>
              Contract must be valid before generation.
            </Typography>
          )}
        </Box>
      </Box>
    </Container>
  );
};

// Tiny helper for label-value pairs
function LabelValue({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
}

export default AdminContractReviewPage;
