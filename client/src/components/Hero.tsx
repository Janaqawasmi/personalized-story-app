import { Box, Typography, Button } from "@mui/material";
import { COLORS } from "../theme";

export default function Hero() {
  return (
    <Box
      sx={{
        backgroundColor: COLORS.primary,
        color: COLORS.surface,
        borderRadius: 4,
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
