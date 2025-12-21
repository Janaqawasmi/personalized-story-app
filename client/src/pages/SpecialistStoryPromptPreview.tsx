import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  Stack,
  Chip,
  Divider,
} from '@mui/material';
import { fetchStoryPromptPreview } from '../api/api';
import SpecialistNav from '../components/SpecialistNav';

const SpecialistStoryPromptPreview: React.FC = () => {
  const { briefId } = useParams<{ briefId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ topicKey: string; targetAgeGroup: string; prompt: string } | null>(null);

  useEffect(() => {
    const loadPromptPreview = async () => {
      if (!briefId) {
        setError('Brief ID is required');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await fetchStoryPromptPreview(briefId);
        setPreview(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load prompt preview');
      } finally {
        setLoading(false);
      }
    };

    loadPromptPreview();
  }, [briefId]);

  return (
    <>
      <SpecialistNav />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Stack spacing={3}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h4" component="h1">
                Story Prompt Preview
              </Typography>
              <Button variant="outlined" onClick={() => navigate('/specialist/generate-draft')}>
                Back to Briefs
              </Button>
            </Box>

            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {loading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : preview ? (
              <>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Story Brief Information
                  </Typography>
                  <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                    <Chip
                      label={`Subject: ${preview.topicKey}`}
                      color="primary"
                      variant="outlined"
                    />
                    <Chip
                      label={`Age Group: ${preview.targetAgeGroup}`}
                      color="secondary"
                      variant="outlined"
                    />
                  </Stack>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="h6" gutterBottom>
                    Full LLM Prompt (Including RAG Context)
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    This is the complete prompt that will be sent to the LLM for story generation.
                    The RAG (Retrieval-Augmented Generation) context is included below.
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      backgroundColor: '#f5f5f5',
                      maxHeight: '600px',
                      overflow: 'auto',
                    }}
                  >
                    <Box
                      component="pre"
                      sx={{
                        margin: 0,
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {preview.prompt}
                    </Box>
                  </Paper>
                </Box>
              </>
            ) : null}
          </Stack>
        </Paper>
      </Container>
    </>
  );
};

export default SpecialistStoryPromptPreview;

