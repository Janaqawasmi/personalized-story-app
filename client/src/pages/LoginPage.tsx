import { Box, Typography, Button, Container } from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import GoogleIcon from "@mui/icons-material/Google";
import { COLORS } from "../theme";

export default function LoginPage() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: COLORS.beigeLight,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 8,
      }}
    >
      <Container maxWidth="sm">
        <Box sx={{ textAlign: "center" }}>
          {/* Title */}
          <Typography
            variant="h3"
            sx={{
              fontWeight: 900,
              fontSize: "2.5rem",
              color: COLORS.textPrimary,
              mb: 6,
            }}
          >
            בואו נתחבר
          </Typography>

          {/* Login Buttons */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Email Login Button */}
            <Button
              variant="outlined"
              fullWidth
              sx={{
                py: 2,
                borderRadius: "999px",
                borderColor: COLORS.textPrimary,
                backgroundColor: COLORS.beigeLight,
                color: COLORS.textPrimary,
                fontSize: "1rem",
                fontWeight: 500,
                textTransform: "none",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                "&:hover": {
                  borderColor: COLORS.textPrimary,
                  backgroundColor: COLORS.beigeLighter,
                },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography sx={{ fontSize: "1rem", fontWeight: 500 }}>
                  התחברות עם אימייל
                </Typography>
                <EmailIcon sx={{ fontSize: "1.2rem" }} />
              </Box>
            </Button>

            {/* Google Login Button */}
            <Button
              variant="outlined"
              fullWidth
              sx={{
                py: 2,
                borderRadius: "999px",
                borderColor: COLORS.textPrimary,
                backgroundColor: COLORS.beigeLight,
                color: COLORS.textPrimary,
                fontSize: "1rem",
                fontWeight: 500,
                textTransform: "none",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                "&:hover": {
                  borderColor: COLORS.textPrimary,
                  backgroundColor: COLORS.beigeLighter,
                },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography sx={{ fontSize: "1rem", fontWeight: 500 }}>
                  התחברות עם Google
                </Typography>
                <GoogleIcon sx={{ fontSize: "1.2rem", color: COLORS.googleBlue }} />
              </Box>
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

