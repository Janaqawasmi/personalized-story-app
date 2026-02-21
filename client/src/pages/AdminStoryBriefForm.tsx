// client/src/pages/AdminStoryBriefForm.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Tabs,
  Tab,
} from '@mui/material';
import { createStoryBrief, StoryBriefInput } from '../api/api';
import { normalizeStoryBriefInput } from '../utils/briefNormalize';
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

// TabPanel component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`step-tabpanel-${index}`}
      aria-labelledby={`step-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}


const AdminStoryBriefForm: React.FC = () => {
  const navigate = useNavigate();
  
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
  const [activeStep, setActiveStep] = useState(0);
  const messageRef = useRef<HTMLDivElement>(null);

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

  // Scroll to messages when they appear
  useEffect(() => {
    if ((success || error) && messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [success, error]);

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

  const handleNext = () => {
    // Validate current step before moving forward
    if (activeStep === 0) {
      if (!selectedTopicKey || !selectedSituationKey || !selectedAgeGroup) {
        setError('Please fill in all required fields in Step 1');
        return;
      }
    } else if (activeStep === 1) {
      if (selectedEmotionalGoals.length === 0) {
        setError('Please select at least one emotional goal');
        return;
      }
    }
    setError(null);
    setActiveStep((prev) => Math.min(prev + 1, 2));
  };

  const handleBack = () => {
    setError(null);
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    // Validate before allowing tab change
    if (newValue > activeStep) {
      if (activeStep === 0) {
        if (!selectedTopicKey || !selectedSituationKey || !selectedAgeGroup) {
          setError('Please fill in all required fields in Step 1');
          return;
        }
      } else if (activeStep === 1) {
        if (selectedEmotionalGoals.length === 0) {
          setError('Please select at least one emotional goal');
          return;
        }
      }
    }
    setError(null);
    setActiveStep(newValue);
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
      const rawPayload: StoryBriefInput = {
        createdBy: createdBy,
        therapeuticFocus: {
          primaryTopic: selectedTopicKey,
          specificSituation: selectedSituationKey,
        },
        childProfile: {
          ageGroup: (selectedAgeGroup as "0_3" | "3_6" | "6_9" | "9_12") || "3_6",
          emotionalSensitivity: selectedEmotionalSensitivity,
        },
        therapeuticIntent: {
          emotionalGoals: selectedEmotionalGoals,
          ...(keyMessage && { keyMessage: keyMessage }),
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

      // Normalize the input (trim + lowercase where appropriate)
      const payload = normalizeStoryBriefInput(rawPayload);
      const response = await createStoryBrief(payload);

      // If we get here, response.success is always true (errors are thrown)
      const briefId = response.data.id;
      
      if (!briefId) {
        throw new Error('Failed to get brief ID from response');
      }
      
      // Navigate to contract review page
      navigate(`/specialist/story-briefs/${briefId}/contract`);
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
        <Paper elevation={2} sx={{ p: { xs: 3, sm: 4 } }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
            Create Story Brief
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Define the therapeutic parameters for a personalized children's story.
          </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          <Tabs
            value={activeStep}
            onChange={handleTabChange}
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
          >
            <Tab label="Step 1: Story Context" id="step-tab-0" aria-controls="step-tabpanel-0" />
            <Tab label="Step 2: Emotional & Therapeutic Intent" id="step-tab-1" aria-controls="step-tabpanel-1" />
            <Tab label="Step 3: Safety & Resolution" id="step-tab-2" aria-controls="step-tabpanel-2" />
          </Tabs>

          {/* STEP 1: Story Context */}
          <TabPanel value={activeStep} index={0}>
            <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
              Story Context
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Define the core situation and target age.
            </Typography>
          <Stack spacing={3}>
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
                </Stack>
          </TabPanel>

          {/* STEP 2: Emotional & Therapeutic Intent */}
          <TabPanel value={activeStep} index={1}>
            <Box sx={{ bgcolor: "action.hover", p: 3, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
              <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                Emotional & Therapeutic Intent
              </Typography>
              <Stack spacing={3}>
                <FormControl component="fieldset" required>
                  <FormLabel component="legend" sx={{ fontWeight: 500, mb: 1 }}>Emotional Sensitivity</FormLabel>
                  <RadioGroup
                    row
                    value={selectedEmotionalSensitivity}
                    onChange={(e) => setSelectedEmotionalSensitivity(e.target.value as "low" | "medium" | "high")}
                    sx={{ mt: 0.5 }}
                  >
                    <FormControlLabel value="low" control={<Radio />} label="Low" />
                    <FormControlLabel value="medium" control={<Radio />} label="Medium" />
                    <FormControlLabel value="high" control={<Radio />} label="High" />
                  </RadioGroup>
                </FormControl>

                <FormControl component="fieldset" required>
                  <FormLabel component="legend" sx={{ fontWeight: 500, mb: 1 }}>Emotional Goals</FormLabel>
                  <FormHelperText sx={{ mb: 1.5, mt: 0 }}>
                    {selectedEmotionalGoals.length} / 3 selected
                  </FormHelperText>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                    gap: 1.5,
                  }}>
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
                        sx={{ m: 0 }}
                      />
                    ))}
                  </Box>
                  {loadingEmotionalGoals && (
                    <FormHelperText sx={{ mt: 1 }}>Loading emotional goals...</FormHelperText>
                  )}
                </FormControl>

                <FormControl fullWidth required>
                  <InputLabel>Emotional Tone</InputLabel>
                  <Select
                    value={selectedEmotionalTone}
                    onChange={(e) => setSelectedEmotionalTone(e.target.value as "very_gentle" | "calm" | "encouraging")}
                    label="Emotional Tone"
                  >
                    <MenuItem value="very_gentle">Very Gentle</MenuItem>
                    <MenuItem value="calm">Calm</MenuItem>
                    <MenuItem value="encouraging">Encouraging</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth required>
                  <InputLabel>Language Complexity</InputLabel>
                  <Select
                    value={selectedComplexity}
                    onChange={(e) => setSelectedComplexity(e.target.value as "very_simple" | "simple" | "moderate")}
                    label="Language Complexity"
                  >
                    <MenuItem value="very_simple">Very Simple</MenuItem>
                    <MenuItem value="simple">Simple</MenuItem>
                    <MenuItem value="moderate">Moderate</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
                </Box>
          </TabPanel>

          {/* STEP 3: Safety & Resolution */}
          <TabPanel value={activeStep} index={2}>
            <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
              Safety & Resolution
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Optional safety considerations and story resolution preferences.
                  </Typography>
            <Stack spacing={3}>
              <FormControl component="fieldset">
                <FormLabel component="legend" sx={{ fontWeight: 500, mb: 1 }}>Safety Exclusions</FormLabel>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1 }}>
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
                      sx={{ m: 0 }}
                        />
                      ))}
                </Box>
                {loadingExclusions && (
                  <FormHelperText sx={{ mt: 1 }}>Loading exclusions...</FormHelperText>
                )}
              </FormControl>

              <FormControl component="fieldset" required>
                <FormLabel component="legend" sx={{ fontWeight: 500, mb: 1 }}>Caregiver Presence</FormLabel>
                <RadioGroup
                  row
                  value={selectedCaregiverPresence}
                  onChange={(e) => setSelectedCaregiverPresence(e.target.value as "included" | "self_guided")}
                  sx={{ mt: 0.5 }}
                >
                  <FormControlLabel value="included" control={<Radio />} label="Included" />
                  <FormControlLabel value="self_guided" control={<Radio />} label="Self-Guided" />
                </RadioGroup>
              </FormControl>

              <FormControl fullWidth required>
                <InputLabel>Ending Style</InputLabel>
                <Select
                  value={selectedEndingStyle}
                  onChange={(e) => setSelectedEndingStyle(e.target.value as "calm_resolution" | "open_ended" | "empowering")}
                  label="Ending Style"
                >
                  <MenuItem value="calm_resolution">Calm Resolution</MenuItem>
                  <MenuItem value="open_ended">Open Ended</MenuItem>
                  <MenuItem value="empowering">Empowering</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Key Message"
                fullWidth
                multiline
                rows={3}
                value={keyMessage}
                onChange={(e) => setKeyMessage(e.target.value)}
                placeholder="e.g. You are safe, even when things feel new."
                inputProps={{ maxLength: 200 }}
                helperText={`${keyMessage.length} / 200 characters`}
              />

            <TextField
              label="Created By"
              required
              fullWidth
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
              placeholder="User ID or name"
            />
            </Stack>
          </TabPanel>

          {/* Success/Error Messages - Displayed near action buttons for immediate feedback */}
          {(success || error) && (
            <Box ref={messageRef} sx={{ mt: 4, mb: 2 }}>
              {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {success}
                </Alert>
              )}
              {error && (
                <Alert severity="error">
                  {error}
                </Alert>
              )}
            </Box>
          )}

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: success || error ? 0 : 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
            <Button
              onClick={handleBack}
              disabled={activeStep === 0}
              sx={{ textTransform: 'none' }}
            >
              Back
            </Button>
            {activeStep < 2 ? (
              <Button
                variant="contained"
                onClick={handleNext}
                sx={{ textTransform: 'none' }}
              >
                Next
              </Button>
            ) : (
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
                sx={{ 
                  py: 1.5,
                  px: 4,
                  fontSize: '1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                }}
            >
              {loading ? 'Creating...' : 'Create Story Brief'}
            </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Container>
    </>
  );
};

export default AdminStoryBriefForm;
