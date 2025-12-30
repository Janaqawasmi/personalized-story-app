import { Box, Typography, useTheme } from "@mui/material";

export default function Footer() {
  const theme = useTheme();
  
  return (
    <Box 
      textAlign="center" 
      py={4} 
      sx={{ 
        bgcolor: theme.palette.background.default,
        color: theme.palette.text.secondary,
      }}
    >
      <Typography variant="body2">
        © QOSATI — All rights reserved
      </Typography>
    </Box>
  );
}
