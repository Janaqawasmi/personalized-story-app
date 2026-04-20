// client/src/specialist/pages/StoryWorkspacePage.tsx
// TODO D2.5: Full implementation
import React from 'react';
import { useParams } from 'react-router-dom';
import { Typography, Box } from '@mui/material';

export default function StoryWorkspacePage() {
  const { storyId, tab } = useParams<{ storyId: string; tab?: string }>();
  return (
    <Box p={4}>
      <Typography variant="h5">Story Workspace</Typography>
      <Typography color="text.secondary">
        Story: {storyId} · Tab: {tab ?? 'default'}
      </Typography>
      <Typography variant="body2" sx={{ mt: 2 }}>
        Placeholder — full implementation in a later prompt.
      </Typography>
    </Box>
  );
}
