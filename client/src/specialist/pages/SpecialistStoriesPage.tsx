// client/src/specialist/pages/SpecialistStoriesPage.tsx
//
// Shell page for the specialist stories dashboard.
// D2.2 adds the filter bar; D2.3 adds the StoriesTable.
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { draftStore } from '../storage';
import type { Story } from '../../types/story';
import { COLORS } from '../../theme';

export default function SpecialistStoriesPage() {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const base = `/${lang ?? 'he'}/specialist`;

  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    draftStore
      .listStories()
      .then(setStories)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load stories.'))
      .finally(() => setLoading(false));

    const unsub = draftStore.subscribeToList(setStories);
    return unsub;
  }, []);

  function handleNewStory() {
    navigate(`${base}/stories/new`);
  }

  return (
    <Box
      sx={{
        maxWidth: 1200,
        mx: 'auto',
        px: { xs: 2, sm: 3, md: 4 },
        py: 4,
      }}
    >
      {/* Page header */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 4 }}
      >
        <Typography
          variant="h4"
          component="h1"
          sx={{ fontWeight: 800, letterSpacing: '-0.02em', color: COLORS.textPrimary }}
        >
          My stories
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={<AddIcon />}
          onClick={handleNewStory}
          sx={{
            px: 3,
            py: 1.25,
            fontWeight: 700,
            bgcolor: COLORS.primary,
            boxShadow: '0 8px 24px -8px rgba(97, 120, 145, 0.45)',
            '&:hover': { bgcolor: COLORS.primary, opacity: 0.9 },
          }}
        >
          New Story
        </Button>
      </Stack>

      {/* Body */}
      {loading && (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      )}

      {!loading && error && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && (
        <Typography variant="body2" color="text.secondary">
          {stories.length} {stories.length === 1 ? 'story' : 'stories'} loaded.
        </Typography>
      )}

      {/* D2.2: StoriesFilterBar goes here */}
      {/* D2.3: StoriesTable goes here */}
    </Box>
  );
}
