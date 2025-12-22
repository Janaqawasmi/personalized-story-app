import { Box, Typography } from "@mui/material";

export default function TrustSection() {
  return (
    <Box my={6}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(3, 1fr)",
          },
          gap: 3,
        }}
      >
        <Typography variant="h6">✔ Therapist guided</Typography>
        <Typography variant="h6">✔ Child safe</Typography>
        <Typography variant="h6">✔ Personalized with care</Typography>
      </Box>
    </Box>
  );
}
