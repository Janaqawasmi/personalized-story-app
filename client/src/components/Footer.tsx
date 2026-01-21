import { Box, Typography, useTheme } from "@mui/material";
import { useTranslation } from "../i18n/useTranslation";

export default function Footer() {
  const theme = useTheme();
  const t = useTranslation();
  
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
        {t("footer.copyright")}
      </Typography>
    </Box>
  );
}
