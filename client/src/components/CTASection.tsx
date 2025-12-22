import { Box, Typography, Button } from "@mui/material";

export default function CTASection() {
  return (
    <Box textAlign="center" my={8}>
      <Typography variant="h4" gutterBottom>
        Ready to create a story?
      </Typography>
      <Button variant="contained" size="large">
        Start now
      </Button>
    </Box>
  );
}
