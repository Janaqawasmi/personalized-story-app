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
  Chip,
  Stack,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Checkbox,
  ListItemText,
  OutlinedInput,
} from '@mui/material';
import { createStoryBrief, StoryBriefInput, fetchTopicTags } from '../api/api';
import SpecialistNav from '../components/SpecialistNav';

const AGE_GROUP_OPTIONS = ['2-3', '4-6', '7-9', '10-12'];

const AdminStoryBriefForm: React.FC = () => {
  const [formData, setFormData] = useState<StoryBriefInput>({
    topicKey: '',
    targetAgeGroup: '',
    topicTags: [],
    therapeuticIntent: [],
    constraints: {},
    createdBy: '',
  });
  
  const [availableTopicTags, setAvailableTopicTags] = useState<string[]>([]);
  const [loadingTopicTags, setLoadingTopicTags] = useState(false);
  const [intentInput, setIntentInput] = useState('');
  const [avoidMetaphorInput, setAvoidMetaphorInput] = useState('');
  const [avoidLanguageInput, setAvoidLanguageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load available topic tags on mount
  useEffect(() => {
    const loadTopicTags = async () => {
      setLoadingTopicTags(true);
      try {
        const tags = await fetchTopicTags();
        setAvailableTopicTags(tags);
      } catch (err) {
        console.error('Failed to load topic tags:', err);
        setError('Failed to load available topic tags. Please refresh the page.');
      } finally {
        setLoadingTopicTags(false);
      }
    };
    loadTopicTags();
  }, []);

  const handleInputChange = (field: keyof StoryBriefInput) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
    setError(null);
  };

  const handleSelectChange = (field: 'targetAgeGroup') => (
    e: { target: { value: string } }
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
    setError(null);
  };

  const handleAddIntent = () => {
    if (intentInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        therapeuticIntent: [...prev.therapeuticIntent, intentInput.trim()],
      }));
      setIntentInput('');
    }
  };

  const handleRemoveIntent = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      therapeuticIntent: prev.therapeuticIntent.filter((_, i) => i !== index),
    }));
  };

  const handleTopicTagsChange = (event: any) => {
    const value = event.target.value;
    setFormData((prev) => ({
      ...prev,
      topicTags: typeof value === 'string' ? value.split(',') : value,
    }));
    setError(null);
  };

  const handleAddAvoidMetaphor = () => {
    if (avoidMetaphorInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        constraints: {
          ...prev.constraints,
          avoidMetaphors: [...(prev.constraints?.avoidMetaphors || []), avoidMetaphorInput.trim()],
        },
      }));
      setAvoidMetaphorInput('');
    }
  };

  const handleRemoveAvoidMetaphor = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      constraints: {
        ...prev.constraints,
        avoidMetaphors: prev.constraints?.avoidMetaphors?.filter((_, i) => i !== index) || [],
      },
    }));
  };

  const handleAddAvoidLanguage = () => {
    if (avoidLanguageInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        constraints: {
          ...prev.constraints,
          avoidLanguage: [...(prev.constraints?.avoidLanguage || []), avoidLanguageInput.trim()],
        },
      }));
      setAvoidLanguageInput('');
    }
  };

  const handleRemoveAvoidLanguage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      constraints: {
        ...prev.constraints,
        avoidLanguage: prev.constraints?.avoidLanguage?.filter((_, i) => i !== index) || [],
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!formData.topicKey || !formData.targetAgeGroup || !formData.createdBy) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.topicTags.length === 0) {
      setError('Please add at least one topic tag');
      return;
    }

    if (formData.therapeuticIntent.length === 0) {
      setError('Please add at least one therapeutic intent');
      return;
    }

    setLoading(true);

    try {
      const payload: StoryBriefInput = {
        topicKey: formData.topicKey,
        targetAgeGroup: formData.targetAgeGroup,
        topicTags: formData.topicTags,
        therapeuticIntent: formData.therapeuticIntent,
        createdBy: formData.createdBy,
        constraints: {
          ...(formData.constraints?.avoidMetaphors?.length && {
            avoidMetaphors: formData.constraints.avoidMetaphors,
          }),
          ...(formData.constraints?.avoidLanguage?.length && {
            avoidLanguage: formData.constraints.avoidLanguage,
          }),
        },
      };

      const response = await createStoryBrief(payload);

      if (response.success) {
        setSuccess(`Story brief created successfully! ID: ${response.id}`);
        // Reset form
        setFormData({
          topicKey: '',
          targetAgeGroup: '',
          topicTags: [],
          therapeuticIntent: [],
          constraints: {},
          createdBy: '',
        });
        setIntentInput('');
        setAvoidMetaphorInput('');
        setAvoidLanguageInput('');
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
            <TextField
              label="Story Subject"
              required
              fullWidth
              value={formData.topicKey}
              onChange={handleInputChange('topicKey')}
              placeholder="e.g., Fear of the dark, Sleeping alone, Starting school"
              helperText="Enter the main subject or theme of the story"
            />

            <FormControl fullWidth required>
              <InputLabel>Target Age Group</InputLabel>
              <Select
                value={formData.targetAgeGroup}
                onChange={handleSelectChange('targetAgeGroup')}
                label="Target Age Group"
              >
                {AGE_GROUP_OPTIONS.map((age) => (
                  <MenuItem key={age} value={age}>
                    {age}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Topic Tags *</InputLabel>
              <Select
                multiple
                value={formData.topicTags}
                onChange={handleTopicTagsChange}
                input={<OutlinedInput label="Topic Tags *" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((value) => (
                      <Chip key={value} label={value} size="small" color="primary" />
                    ))}
                  </Box>
                )}
                disabled={loadingTopicTags}
              >
                {availableTopicTags.map((tag) => (
                  <MenuItem key={tag} value={tag}>
                    <Checkbox checked={formData.topicTags.indexOf(tag) > -1} />
                    <ListItemText primary={tag} />
                  </MenuItem>
                ))}
              </Select>
              {loadingTopicTags && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  Loading available topic tags...
                </Typography>
              )}
              {!loadingTopicTags && availableTopicTags.length === 0 && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                  No topic tags available. Please check server connection.
                </Typography>
              )}
            </FormControl>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Therapeutic Intent *
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  size="small"
                  fullWidth
                  value={intentInput}
                  onChange={(e) => setIntentInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddIntent();
                    }
                  }}
                  placeholder="Add therapeutic intent (e.g., normalize night fear, create bedtime safety)"
                />
                <Button
                  variant="outlined"
                  onClick={handleAddIntent}
                  disabled={!intentInput.trim()}
                >
                  Add
                </Button>
              </Box>
              {formData.therapeuticIntent.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {formData.therapeuticIntent.map((intent, index) => (
                    <Chip
                      key={index}
                      label={intent}
                      onDelete={() => handleRemoveIntent(index)}
                      color="secondary"
                    />
                  ))}
                </Stack>
              )}
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Constraints (Optional)
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Avoid Metaphors
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField
                      size="small"
                      fullWidth
                      value={avoidMetaphorInput}
                      onChange={(e) => setAvoidMetaphorInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddAvoidMetaphor();
                        }
                      }}
                      placeholder="e.g., monsters, hidden creatures"
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleAddAvoidMetaphor}
                      disabled={!avoidMetaphorInput.trim()}
                    >
                      Add
                    </Button>
                  </Box>
                  {formData.constraints?.avoidMetaphors && formData.constraints.avoidMetaphors.length > 0 && (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {formData.constraints.avoidMetaphors.map((item, index) => (
                        <Chip
                          key={index}
                          label={item}
                          onDelete={() => handleRemoveAvoidMetaphor(index)}
                          size="small"
                        />
                      ))}
                    </Stack>
                  )}
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Avoid Language
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField
                      size="small"
                      fullWidth
                      value={avoidLanguageInput}
                      onChange={(e) => setAvoidLanguageInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddAvoidLanguage();
                        }
                      }}
                      placeholder="e.g., be brave, nothing to fear"
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleAddAvoidLanguage}
                      disabled={!avoidLanguageInput.trim()}
                    >
                      Add
                    </Button>
                  </Box>
                  {formData.constraints?.avoidLanguage && formData.constraints.avoidLanguage.length > 0 && (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {formData.constraints.avoidLanguage.map((item, index) => (
                        <Chip
                          key={index}
                          label={item}
                          onDelete={() => handleRemoveAvoidLanguage(index)}
                          size="small"
                        />
                      ))}
                    </Stack>
                  )}
                </Box>
              </Stack>
            </Box>

            <TextField
              label="Created By"
              required
              fullWidth
              value={formData.createdBy}
              onChange={handleInputChange('createdBy')}
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

