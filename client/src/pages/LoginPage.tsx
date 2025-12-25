import { Box, Typography, Button, Container } from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import GoogleIcon from "@mui/icons-material/Google";

export default function LoginPage() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#F5F1EC",
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
              color: "#000",
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
                borderColor: "#000",
                backgroundColor: "#F5F1EC",
                color: "#000",
                fontSize: "1rem",
                fontWeight: 500,
                textTransform: "none",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                "&:hover": {
                  borderColor: "#000",
                  backgroundColor: "#EBE5DC",
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
                borderColor: "#000",
                backgroundColor: "#F5F1EC",
                color: "#000",
                fontSize: "1rem",
                fontWeight: 500,
                textTransform: "none",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                "&:hover": {
                  borderColor: "#000",
                  backgroundColor: "#EBE5DC",
                },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography sx={{ fontSize: "1rem", fontWeight: 500 }}>
                  התחברות עם Google
                </Typography>
                <GoogleIcon sx={{ fontSize: "1.2rem", color: "#4285F4" }} />
              </Box>
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

