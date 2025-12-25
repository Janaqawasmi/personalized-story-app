import { Box, Typography } from "@mui/material";
import { COLORS } from "../theme";

export default function Footer() {
  return (
    <Box textAlign="center" py={4} bgcolor={COLORS.grayLight}>
      <Typography variant="body2">
        © QOSATI — All rights reserved
      </Typography>
    </Box>
  );
}
