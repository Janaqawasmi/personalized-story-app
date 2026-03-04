import { useState } from "react";
import { Box, Typography, Button, Link, useTheme, Alert, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import GoogleIcon from "@mui/icons-material/Google";
import { useTranslation } from "../i18n/useTranslation";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const theme = useTheme();
  const t = useTranslation();
  const navigate = useNavigate();
  
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEmailLogin() {
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await signInWithEmailAndPassword(auth, email, password);
      // Success - RequireAuth will handle navigation
      setEmailDialogOpen(false);
      navigate("/specialist");
    } catch (err: any) {
      console.error("Email login error:", err);
      setError(err.message || "Failed to sign in. Please check your email and password.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    try {
      setLoading(true);
      setError(null);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // Success - RequireAuth will handle navigation
      navigate("/specialist");
    } catch (err: any) {
      console.error("Google login error:", err);
      if (err.code === "auth/popup-closed-by-user") {
        setError("Sign in cancelled");
      } else {
        setError(err.message || "Failed to sign in with Google");
      }
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: theme.palette.background.default,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 8,
        px: 3,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          maxWidth: 400,
          width: "100%",
          animation: "fadeIn 0.6s ease-in",
          "@keyframes fadeIn": {
            from: {
              opacity: 0,
            },
            to: {
              opacity: 1,
            },
          },
        }}
      >
        {/* Heading */}
        <Typography
          variant="h3"
          sx={{
            fontWeight: 600,
            fontSize: "2.5rem",
            color: theme.palette.text.primary,
            mb: 8, // Increased spacing
            lineHeight: 1.3,
            letterSpacing: "-0.01em",
          }}
        >
          {t("login.title")}
        </Typography>

        {/* Login Buttons - Grouped action area */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1.5, // Reduced spacing between buttons
            width: "100%",
            mb: 5, // Increased spacing before footer
          }}
        >
          {/* Email Login Button - Primary */}
          <Button
            variant="contained"
            fullWidth
            onClick={() => setEmailDialogOpen(true)}
            sx={{
              py: 1.75, // Increased vertical padding
              borderRadius: 2,
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.background.paper,
              fontSize: "0.95rem", // Slightly reduced
              fontWeight: 500,
              textTransform: "none",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 1,
              flexDirection: "row-reverse", // RTL: icon on right side of text
              transition: "opacity 0.2s ease",
              "&:hover": {
                backgroundColor: theme.palette.primary.main,
                opacity: 0.9,
              },
            }}
          >
            <EmailIcon sx={{ fontSize: "1.2rem" }} />
            {t("login.email")}
          </Button>

          {/* Google Login Button - Secondary */}
          <Button
            variant="outlined"
            fullWidth
            onClick={handleGoogleLogin}
            disabled={loading}
            sx={{
              py: 1.75,
              borderRadius: 2,
              borderColor: theme.palette.divider,
              backgroundColor: "transparent", // No background
              color: theme.palette.text.primary,
              fontSize: "0.95rem",
              fontWeight: 500,
              textTransform: "none",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 1,
              flexDirection: "row-reverse", // RTL: icon on right side of text
              transition: "border-color 0.2s ease, opacity 0.2s ease",
              "&:hover": {
                borderColor: theme.palette.primary.main,
                backgroundColor: "transparent", // Keep transparent
                opacity: 0.9,
              },
            }}
          >
            <GoogleIcon sx={{ fontSize: "1.2rem", color: theme.palette.primary.main }} />
            {t("login.google")}
          </Button>
        </Box>

        {/* Footer Text */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0.5,
            mt: 1,
          }}
        >
          <Typography
            sx={{
              fontSize: "0.95rem",
              color: theme.palette.text.secondary,
            }}
          >
            {t("login.notRegistered")}
          </Typography>
          <Link
            href="#"
            sx={{
              fontSize: "0.95rem",
              color: theme.palette.primary.main,
              textDecoration: "none",
              cursor: "pointer",
              transition: "text-decoration 0.2s ease",
              "&:hover": {
                textDecoration: "underline",
              },
            }}
          >
            {t("login.goToSignup")}
          </Link>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mt: 2, maxWidth: 400, width: "100%" }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Email/Password Login Dialog */}
      <Dialog open={emailDialogOpen} onClose={() => setEmailDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Sign in with Email</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              autoComplete="email"
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              autoComplete="current-password"
              onKeyPress={(e) => {
                if (e.key === "Enter" && !loading) {
                  handleEmailLogin();
                }
              }}
            />
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleEmailLogin} variant="contained" disabled={loading || !email || !password}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
