// client/src/pages/AdminStoryBriefForm.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  Alert,
  Stack,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormLabel,
  FormHelperText,
} from '@mui/material';
import { createStoryBrief, StoryBriefInput } from '../api/api';
import SpecialistNav from '../components/SpecialistNav';
import { AGE_GROUPS } from '../data/categories';
import {
  loadReferenceItems,
  loadSituationsByTopic,
  ReferenceDataItem,
  SituationReferenceItem,
} from '../services/referenceData.service';

// Helper function for multilingual labels
function getLabel(item: any, lang: "en" | "ar" | "he" = "en"): string {
  return item[`label_${lang}`] || item.label_en || '';
}

// Map frontend age groups to backend format
const AGE_GROUP_MAPPING: Record<string, "3_4" | "5_6" | "7_8" | "9_10"> = {
  "0-3": "3_4",
  "3-6": "5_6",
  "6-9": "7_8",
  "9-12": "9_10",
};

const AdminStoryBriefForm: React.FC = () => {
  // Reference data state
  const [topics, setTopics] = useState<ReferenceDataItem[]>([]);
  const [situations, setSituations] = useState<SituationReferenceItem[]>([]);
  const [emotionalGoals, setEmotionalGoals] = useState<ReferenceDataItem[]>([]);
  const [exclusions, setExclusions] = useState<ReferenceDataItem[]>([]);
  
  // Loading states
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loadingSituations, setLoadingSituations] = useState(false);
  const [loadingEmotionalGoals, setLoadingEmotionalGoals] = useState(false);
  const [loadingExclusions, setLoadingExclusions] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // UI state
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form data state (using enum keys only)
  const [selectedTopicKey, setSelectedTopicKey] = useState<string>('');
  const [selectedSituationKey, setSelectedSituationKey] = useState<string>('');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('');
  const [selectedEmotionalSensitivity, setSelectedEmotionalSensitivity] = useState<"low" | "medium" | "high">("medium");
  const [selectedEmotionalGoals, setSelectedEmotionalGoals] = useState<string[]>([]);
  const [keyMessage, setKeyMessage] = useState<string>('');
  const [selectedComplexity, setSelectedComplexity] = useState<"very_simple" | "simple" | "moderate">("simple");
  const [selectedEmotionalTone, setSelectedEmotionalTone] = useState<"very_gentle" | "calm" | "encouraging">("calm");
  const [selectedExclusions, setSelectedExclusions] = useState<string[]>([]);
  const [selectedCaregiverPresence, setSelectedCaregiverPresence] = useState<"included" | "self_guided">("included");
  const [selectedEndingStyle, setSelectedEndingStyle] = useState<"calm_resolution" | "open_ended" | "empowering">("calm_resolution");
  const [createdBy, setCreatedBy] = useState<string>('');

  // Load topics on mount
  useEffect(() => {
    const loadTopics = async () => {
      setLoadingTopics(true);
      try {
        const items = await loadReferenceItems("topics");
        setTopics(items);
      } catch (err) {
        console.error('Failed to load topics:', err);
        setError('Failed to load topics. Please refresh the page.');
      } finally {
        setLoadingTopics(false);
      }
    };
    loadTopics();
  }, []);

  // Load situations when topic changes
  useEffect(() => {
    const loadSituations = async () => {
      if (selectedTopicKey) {
        setLoadingSituations(true);
        setSelectedSituationKey(''); // Reset situation when topic changes
        try {
          const items = await loadSituationsByTopic(selectedTopicKey);
          setSituations(items);
        } catch (err) {
          console.error('Failed to load situations:', err);
          setError('Failed to load situations. Please refresh the page.');
        } finally {
          setLoadingSituations(false);
        }
      } else {
        setSituations([]);
      }
    };
    loadSituations();
  }, [selectedTopicKey]);

  // Load emotional goals on mount
  useEffect(() => {
    const loadEmotionalGoals = async () => {
      setLoadingEmotionalGoals(true);
      try {
        const items = await loadReferenceItems("emotionalGoals");
        setEmotionalGoals(items);
      } catch (err) {
        console.error('Failed to load emotional goals:', err);
        setError('Failed to load emotional goals. Please refresh the page.');
      } finally {
        setLoadingEmotionalGoals(false);
      }
    };
    loadEmotionalGoals();
  }, []);

  // Load exclusions on mount
  useEffect(() => {
    const loadExclusions = async () => {
      setLoadingExclusions(true);
      try {
        const items = await loadReferenceItems("exclusions");
        setExclusions(items);
      } catch (err) {
        console.error('Failed to load exclusions:', err);
        setError('Failed to load exclusions. Please refresh the page.');
      } finally {
        setLoadingExclusions(false);
      }
    };
    loadExclusions();
  }, []);

  // Handle emotional goal selection (max 3)
  const handleEmotionalGoalToggle = (goalKey: string) => {
    setSelectedEmotionalGoals((prev) => {
      if (prev.includes(goalKey)) {
        return prev.filter((key) => key !== goalKey);
      } else if (prev.length < 3) {
        return [...prev, goalKey];
      }
      return prev;
    });
  };

  // Handle exclusion toggle
  const handleExclusionToggle = (exclusionKey: string) => {
    setSelectedExclusions((prev) => {
      if (prev.includes(exclusionKey)) {
        return prev.filter((key) => key !== exclusionKey);
      }
      return [...prev, exclusionKey];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!selectedTopicKey || !selectedSituationKey || !selectedAgeGroup || !createdBy) {
      setError('Please fill in all required fields');
      return;
    }

    if (selectedEmotionalGoals.length === 0) {
      setError('Please select at least one emotional goal');
      return;
    }

    if (selectedEmotionalGoals.length > 3) {
      setError('Please select a maximum of 3 emotional goals');
      return;
    }

    setLoading(true);

    try {
      const payload: StoryBriefInput = {
        createdBy: createdBy.trim(),
        therapeuticFocus: {
          primaryTopic: selectedTopicKey,
          specificSituation: selectedSituationKey,
        },
        childProfile: {
          ageGroup: AGE_GROUP_MAPPING[selectedAgeGroup] || "5_6",
          emotionalSensitivity: selectedEmotionalSensitivity,
        },
        therapeuticIntent: {
          emotionalGoals: selectedEmotionalGoals,
          ...(keyMessage.trim() && { keyMessage: keyMessage.trim() }),
        },
        languageTone: {
          complexity: selectedComplexity,
          emotionalTone: selectedEmotionalTone,
        },
        safetyConstraints: {
          exclusions: selectedExclusions,
        },
        storyPreferences: {
          caregiverPresence: selectedCaregiverPresence,
          endingStyle: selectedEndingStyle,
        },
      };

      const response = await createStoryBrief(payload);

      if (response.success) {
        setSuccess(`Story brief created successfully! ID: ${response.id}`);
        // Reset form
        setSelectedTopicKey('');
        setSelectedSituationKey('');
        setSelectedAgeGroup('');
        setSelectedEmotionalSensitivity("medium");
        setSelectedEmotionalGoals([]);
        setKeyMessage('');
        setSelectedComplexity("simple");
        setSelectedEmotionalTone("calm");
        setSelectedExclusions([]);
        setSelectedCaregiverPresence("included");
        setSelectedEndingStyle("calm_resolution");
        setCreatedBy('');
      } else {
        setError(response.error || 'Failed to create story brief');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SpecialistNav />
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Create Story Brief
          </Typography>

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={3}>
              {/* Primary Topic */}
            <FormControl fullWidth required>
                <InputLabel>Primary Topic</InputLabel>
              <Select
                  value={selectedTopicKey}
                  onChange={(e) => setSelectedTopicKey(e.target.value)}
                  label="Primary Topic"
                  disabled={loadingTopics}
                >
                  {topics.map((topic) => (
                    <MenuItem key={topic.key} value={topic.key}>
                      {getLabel(topic, "en")}
                  </MenuItem>
                ))}
              </Select>
                {loadingTopics && (
                  <FormHelperText>Loading topics...</FormHelperText>
                )}
            </FormControl>

              {/* Specific Situation */}
            <FormControl fullWidth required>
                <InputLabel>Specific Situation</InputLabel>
              <Select
                  value={selectedSituationKey}
                  onChange={(e) => setSelectedSituationKey(e.target.value)}
                  label="Specific Situation"
                  disabled={loadingSituations || !selectedTopicKey || situations.length === 0}
                >
                  {situations.map((situation) => (
                    <MenuItem key={situation.key} value={situation.key}>
                      {getLabel(situation, "en")}
                    </MenuItem>
                  ))}
                </Select>
                {loadingSituations && (
                  <FormHelperText>Loading situations...</FormHelperText>
                )}
                {!selectedTopicKey && !loadingSituations && (
                  <FormHelperText>Please select a topic first</FormHelperText>
                )}
              </FormControl>

              {/* Target Age Group */}
              <FormControl fullWidth required>
                <InputLabel>Target Age Group</InputLabel>
                <Select
                  value={selectedAgeGroup}
                  onChange={(e) => setSelectedAgeGroup(e.target.value)}
                  label="Target Age Group"
                >
                  {AGE_GROUPS.map((age) => (
                    <MenuItem key={age.id} value={age.id}>
                      {age.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

              {/* Emotional Sensitivity */}
              <FormControl component="fieldset" required>
                <FormLabel component="legend">Emotional Sensitivity</FormLabel>
                <RadioGroup
                  row
                  value={selectedEmotionalSensitivity}
                  onChange={(e) => setSelectedEmotionalSensitivity(e.target.value as "low" | "medium" | "high")}
                >
                  <FormControlLabel value="low" control={<Radio />} label="Low" />
                  <FormControlLabel value="medium" control={<Radio />} label="Medium" />
                  <FormControlLabel value="high" control={<Radio />} label="High" />
                </RadioGroup>
              </FormControl>

              {/* Emotional Goals (checkboxes, max 3) */}
              <FormControl component="fieldset" required>
                <FormLabel component="legend">
                  Emotional Goals (select up to 3)
                </FormLabel>
                <FormHelperText>
                  {selectedEmotionalGoals.length} of 3 selected
                </FormHelperText>
                <Box sx={{ display: 'flex', flexDirection: 'column', mt: 1 }}>
                  {emotionalGoals.map((goal) => (
                    <FormControlLabel
                      key={goal.key}
                      control={
                        <Checkbox
                          checked={selectedEmotionalGoals.includes(goal.key)}
                          onChange={() => handleEmotionalGoalToggle(goal.key)}
                          disabled={
                            !selectedEmotionalGoals.includes(goal.key) &&
                            selectedEmotionalGoals.length >= 3
                          }
                        />
                      }
                      label={getLabel(goal, "en")}
                    />
                  ))}
                </Box>
                {loadingEmotionalGoals && (
                  <FormHelperText>Loading emotional goals...</FormHelperText>
                )}
              </FormControl>

              {/* Key Message (optional) */}
                    <TextField
                label="Key Message (Optional)"
                      fullWidth
                multiline
                rows={3}
                value={keyMessage}
                onChange={(e) => setKeyMessage(e.target.value)}
                placeholder="Optional key message, max 200 characters"
                inputProps={{ maxLength: 200 }}
                helperText={`${keyMessage.length}/200 characters`}
              />

              {/* Language Complexity */}
              <FormControl component="fieldset" required>
                <FormLabel component="legend">Language Complexity</FormLabel>
                <RadioGroup
                  row
                  value={selectedComplexity}
                  onChange={(e) => setSelectedComplexity(e.target.value as "very_simple" | "simple" | "moderate")}
                >
                  <FormControlLabel value="very_simple" control={<Radio />} label="Very Simple" />
                  <FormControlLabel value="simple" control={<Radio />} label="Simple" />
                  <FormControlLabel value="moderate" control={<Radio />} label="Moderate" />
                </RadioGroup>
              </FormControl>

              {/* Emotional Tone */}
              <FormControl component="fieldset" required>
                <FormLabel component="legend">Emotional Tone</FormLabel>
                <RadioGroup
                  row
                  value={selectedEmotionalTone}
                  onChange={(e) => setSelectedEmotionalTone(e.target.value as "very_gentle" | "calm" | "encouraging")}
                >
                  <FormControlLabel value="very_gentle" control={<Radio />} label="Very Gentle" />
                  <FormControlLabel value="calm" control={<Radio />} label="Calm" />
                  <FormControlLabel value="encouraging" control={<Radio />} label="Encouraging" />
                </RadioGroup>
              </FormControl>

              {/* Exclusions */}
              <FormControl component="fieldset">
                <FormLabel component="legend">Safety Exclusions (Optional)</FormLabel>
                <Box sx={{ display: 'flex', flexDirection: 'column', mt: 1 }}>
                  {exclusions.map((exclusion) => (
                    <FormControlLabel
                      key={exclusion.key}
                      control={
                        <Checkbox
                          checked={selectedExclusions.includes(exclusion.key)}
                          onChange={() => handleExclusionToggle(exclusion.key)}
                        />
                      }
                      label={getLabel(exclusion, "en")}
                        />
                      ))}
                </Box>
                {loadingExclusions && (
                  <FormHelperText>Loading exclusions...</FormHelperText>
                )}
              </FormControl>

              {/* Caregiver Presence */}
              <FormControl component="fieldset" required>
                <FormLabel component="legend">Caregiver Presence</FormLabel>
                <RadioGroup
                  row
                  value={selectedCaregiverPresence}
                  onChange={(e) => setSelectedCaregiverPresence(e.target.value as "included" | "self_guided")}
                >
                  <FormControlLabel value="included" control={<Radio />} label="Included" />
                  <FormControlLabel value="self_guided" control={<Radio />} label="Self-Guided" />
                </RadioGroup>
              </FormControl>

              {/* Ending Style */}
              <FormControl component="fieldset" required>
                <FormLabel component="legend">Ending Style</FormLabel>
                <RadioGroup
                  row
                  value={selectedEndingStyle}
                  onChange={(e) => setSelectedEndingStyle(e.target.value as "calm_resolution" | "open_ended" | "empowering")}
                >
                  <FormControlLabel value="calm_resolution" control={<Radio />} label="Calm Resolution" />
                  <FormControlLabel value="open_ended" control={<Radio />} label="Open Ended" />
                  <FormControlLabel value="empowering" control={<Radio />} label="Empowering" />
                </RadioGroup>
              </FormControl>

              {/* Created By */}
            <TextField
              label="Created By"
              required
              fullWidth
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
              placeholder="User ID or name"
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Story Brief'}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Container>
    </>
  );
};

export default AdminStoryBriefForm;
