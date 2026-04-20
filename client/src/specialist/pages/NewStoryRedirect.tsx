// client/src/specialist/pages/NewStoryRedirect.tsx
//
// Redirect-only component — no visible page content in the success path.
// On mount: creates a new Story via draftStore, then navigates to its brief tab.
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { draftStore } from '../storage';
import { COLORS } from '../../theme';

export default function NewStoryRedirect() {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const [error, setError] = useState<string | null>(null);

  function createAndRedirect() {
    setError(null);
    draftStore
      .createStory()
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
      alignItems="center"
      justifyContent="center"
      minHeight="40vh"
    >
      <CircularProgress />
    </Box>
  );
}
