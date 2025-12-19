import React, { useState } from 'react';
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
} from '@mui/material';
import { createStoryBrief, StoryBriefInput } from '../api/api';
import SpecialistNav from '../components/SpecialistNav';

const AdminStoryBriefForm: React.FC = () => {
  const [formData, setFormData] = useState<StoryBriefInput>({
    topicKey: '',
    targetAgeGroup: '',
    therapeuticMessages: [],
    shortDescription: '',
    createdBy: '',
  });
  
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: keyof StoryBriefInput) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
    setError(null);
  };

  const handleAddMessage = () => {
    if (messageInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        therapeuticMessages: [...prev.therapeuticMessages, messageInput.trim()],
      }));
      setMessageInput('');
    }
  };

  const handleRemoveMessage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      therapeuticMessages: prev.therapeuticMessages.filter((_, i) => i !== index),
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

    if (formData.therapeuticMessages.length === 0) {
      setError('Please add at least one therapeutic message');
      return;
    }

    setLoading(true);

    try {
      const response = await createStoryBrief({
        ...formData,
        shortDescription: formData.shortDescription || undefined,
      });

      if (response.success) {
        setSuccess(`Story brief created successfully! ID: ${response.id}`);
        // Reset form
        setFormData({
          topicKey: '',
          targetAgeGroup: '',
          therapeuticMessages: [],
          shortDescription: '',
          createdBy: '',
        });
        setMessageInput('');
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
              label="Topic Key"
              required
              fullWidth
              value={formData.topicKey}
              onChange={handleInputChange('topicKey')}
              placeholder="e.g., fear_of_school"
            />

            <TextField
              label="Target Age Group"
              required
              fullWidth
              value={formData.targetAgeGroup}
              onChange={handleInputChange('targetAgeGroup')}
              placeholder="e.g., 4-6"
            />

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Therapeutic Messages *
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  size="small"
                  fullWidth
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddMessage();
                    }
                  }}
                  placeholder="Add a therapeutic message"
                />
                <Button
                  variant="outlined"
                  onClick={handleAddMessage}
                  disabled={!messageInput.trim()}
                >
                  Add
                </Button>
              </Box>
              {formData.therapeuticMessages.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {formData.therapeuticMessages.map((msg, index) => (
                    <Chip
                      key={index}
                      label={msg}
                      onDelete={() => handleRemoveMessage(index)}
                      color="primary"
                    />
                  ))}
                </Stack>
              )}
            </Box>

            <TextField
              label="Short Description"
              fullWidth
              multiline
              rows={3}
              value={formData.shortDescription}
              onChange={handleInputChange('shortDescription')}
              placeholder="Optional description"
            />

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

