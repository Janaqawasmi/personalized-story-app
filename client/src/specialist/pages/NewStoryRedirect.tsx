// client/src/specialist/pages/NewStoryRedirect.tsx
//
// Redirect-only component — shows a short "Creating story…" bridge, then navigates to the new story's Brief tab.
// On mount: creates a new Story via draftStore, then navigates to its brief tab.
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { draftStore } from '../storage';
import { COLORS } from '../../theme';

/** Minimum time to show the loading UI so the redirect never feels like an instant, disorienting context switch. */
const CREATE_STORY_MIN_UI_MS = 300;

export default function NewStoryRedirect() {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const [error, setError] = useState<string | null>(null);

  function createAndRedirect() {
    setError(null);
    const startedAt = Date.now();
    draftStore
      .createStory()
      .then((story) => {
        const elapsed = Date.now() - startedAt;
        const remaining = Math.max(0, CREATE_STORY_MIN_UI_MS - elapsed);
        return new Promise<typeof story>((resolve) => {
          setTimeout(() => resolve(story), remaining);
        });
      })
      .then((story) => {
        navigate(`/${lang ?? 'he'}/specialist/stories/${story.id}/brief`, {
          replace: true,
        });
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Failed to create story.');
      });
  }

  useEffect(() => {
    createAndRedirect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="40vh"
        gap={2}
        p={4}
      >
        <Typography variant="h6" color="error" fontWeight={700}>
          Could not create story
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, textAlign: 'center' }}>
          {error}
        </Typography>
        <Button
          variant="contained"
          onClick={createAndRedirect}
          sx={{
            mt: 1,
            px: 3,
            fontWeight: 700,
            bgcolor: COLORS.primary,
            '&:hover': { bgcolor: COLORS.primary, opacity: 0.9 },
          }}
        >
          Try again
        </Button>
      </Box>
    );
  }

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap={2}
      minHeight="40vh"
    >
      <CircularProgress />
      <Typography variant="body2" color="text.secondary" fontWeight={600}>
        Creating story…
      </Typography>
    </Box>
  );
}
