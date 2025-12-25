import { Box, Typography, Button, useTheme } from "@mui/material";

export default function Hero() {
  const theme = useTheme();
  
  return (
    <Box
      sx={{
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.background.paper,
        borderRadius: theme.shape.borderRadius,
        p: 6,
        textAlign: "center",
        mt: 4,
      }}
    >
      <Typography variant="h3" gutterBottom>
        Stories made just for your child
      </Typography>

      <Typography variant="h6" sx={{ opacity: 0.9 }} mb={4}>
        Therapeutic stories that support emotions, family changes, and social growth
      </Typography>

      <Button
        variant="contained"
        color="secondary"
        size="large"
      >
        Create a story
      </Button>
    </Box>
  );
}
