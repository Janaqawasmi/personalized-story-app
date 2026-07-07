import { useEffect, useState } from "react";
import { Box, Typography, Button, Link, useTheme, Alert, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import GoogleIcon from "@mui/icons-material/Google";
import { useTranslation } from "../i18n/useTranslation";
import { signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail, onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { DEFAULT_LANGUAGE } from "../i18n/context/LanguageContext";
import { isPathAllowedForRole, isSafeInternalPath } from "../utils/roleAccess";

type RedirectFromState =
  | string
  | {
      pathname?: string;
      search?: string;
      hash?: string;
    };

type LoginLocationState = {
  from?: RedirectFromState;
  mode?: "login" | "signup";
} | null;

/**
 * Resolves the raw post-login destination from (in priority order) the
 * `location.state.from` set by route guards, then a `returnTo` query param,
 * then the public-home fallback. Only safe internal paths are honored; any
 * external / malformed target falls back to home.
 */
function resolveRawTarget(
  from: RedirectFromState | undefined,
  returnTo: string | null,
  fallback: string
): string {
  if (from) {
    if (typeof from === "string") {
      return isSafeInternalPath(from) ? from : fallback;
    }
    const pathname = from.pathname;
    if (isSafeInternalPath(pathname)) {
      return `${pathname}${from.search || ""}${from.hash || ""}`;
    }
    return fallback;
  }
  if (isSafeInternalPath(returnTo)) return returnTo;
  return fallback;
}

/**
 * Reads the signed-in user's role from custom claims and returns a destination
 * the user is actually allowed to open. If the intended target is a
 * specialist/admin area the user cannot access, it falls back to public home.
 */
async function resolveAuthorizedRedirect(
  rawTarget: string,
  fallback: string
): Promise<string> {
  const user = auth.currentUser;
  if (!user) return rawTarget;
  try {
    const tokenResult = await user.getIdTokenResult(true);
    const role = typeof tokenResult.claims.role === "string" ? tokenResult.claims.role : undefined;
    return isPathAllowedForRole(rawTarget, role) ? rawTarget : fallback;
  } catch {
    // If we cannot read the role, never assume elevated access.
    return isPathAllowedForRole(rawTarget, undefined) ? rawTarget : fallback;
  }
}

export default function LoginPage() {
  const theme = useTheme();
  const t = useTranslation();
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const location = useLocation();
  const { login, signup, ensureCaregiverDoc } = useAuth();

  const locationState = location.state as LoginLocationState;
  const from = locationState?.from;
  const mode = locationState?.mode;
  const returnTo = new URLSearchParams(location.search).get("returnTo");
  const homePath = lang ? `/${lang}` : `/${DEFAULT_LANGUAGE}`;
  
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "signup") {
      setEmailDialogOpen(true);
      setIsSignUp(true);
    } else if (mode === "login") {
      setEmailDialogOpen(true);
      setIsSignUp(false);
    }
  }, [mode]);

  async function handleEmailLogin() {
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (isSignUp) {
        // Firebase signup with profile displayName update handled by AuthContext.
        await signup(email, password);
      } else {
        await login(email, password);
      }

      const rawTarget = resolveRawTarget(from, returnTo, homePath);
      const redirectTo = await resolveAuthorizedRedirect(rawTarget, homePath);
      if (process.env.NODE_ENV !== "production") {
        console.log("[LoginPage] login redirect target resolved:", { from, returnTo, rawTarget, redirectTo });
      }

      setEmailDialogOpen(false);
      setShowPasswordReset(false);
      setIsSignUp(false);
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      console.error("Email auth error:", err);
      console.error("Error code:", err.code);
      console.error("Error message:", err.message);
      
      // Provide user-friendly error messages
      let errorMessage = "Failed to sign in. Please check your email and password.";
      
      // Firebase Auth error codes (updated for newer Firebase versions)
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-disabled") {
        errorMessage = "Invalid email or password. Please check your credentials and try again.";
        setShowPasswordReset(true);
      } else if (err.code === "auth/user-not-found") {
        errorMessage = "No account found with this email. Please sign up first or use Google Sign-In.";
        setIsSignUp(true);
      } else if (err.code === "auth/email-already-in-use") {
        errorMessage = "This email is already registered. Please sign in instead.";
        setIsSignUp(false);
      } else if (err.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please use at least 6 characters.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Invalid email address. Please check and try again.";
      } else if (err.code === "auth/operation-not-allowed") {
        errorMessage = "Email/password authentication is not enabled. Please contact an administrator.";
      } else if (err.code === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your internet connection and try again.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordReset() {
    if (!email) {
      setError("Please enter your email address first");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage(`Password reset email sent to ${email}. Please check your inbox and follow the instructions.`);
      setShowPasswordReset(false);
    } catch (err: any) {
      console.error("Password reset error:", err);
      if (err.code === "auth/user-not-found") {
        setError("No account found with this email address.");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address. Please check and try again.");
      } else {
        setError(err.message || "Failed to send password reset email. Please try again.");
      }
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
      const rawTarget = resolveRawTarget(from, returnTo, homePath);
      if (process.env.NODE_ENV !== "production") {
        console.log("[LoginPage] google redirect target resolved (raw):", { from, returnTo, rawTarget });
      }
      
      // Wait for auth state to be ready before navigating
      // This ensures the token is available for API calls
      return new Promise<void>((resolve, reject) => {
        let isResolved = false;
        let timeoutId: NodeJS.Timeout | null = null;
        
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (isResolved) return;
          
          unsubscribe();
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          
          if (user) {
            isResolved = true;

            // Ensure caregiver doc exists for Google sign-in users too
            await ensureCaregiverDoc(user, user.displayName || undefined);
            console.log("User created:", user.uid);
            console.log("Caregiver doc created");

            // Auth state is ready — resolve the destination against the role
            // (ensureCaregiverDoc refreshed claims) and navigate.
            const redirectTo = await resolveAuthorizedRedirect(rawTarget, homePath);
            if (process.env.NODE_ENV !== "production") {
              console.log("[LoginPage] google login success; redirecting to:", redirectTo);
            }
            navigate(redirectTo, { replace: true });
            resolve();
          } else {
            isResolved = true;
            reject(new Error("Authentication failed"));
          }
        });
        
        // Timeout after 5 seconds
        timeoutId = setTimeout(() => {
          if (isResolved) return;
          
          isResolved = true;
          unsubscribe();
          reject(new Error("Authentication timeout"));
        }, 5000);
      });
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
      <Dialog open={emailDialogOpen} onClose={() => { setEmailDialogOpen(false); setError(null); setSuccessMessage(null); setIsSignUp(false); setShowPasswordReset(false); }} maxWidth="sm" fullWidth>
        <DialogTitle>{isSignUp ? "Create Account" : "Sign in with Email"}</DialogTitle>
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
              <Alert severity="error" onClose={() => { setError(null); setShowPasswordReset(false); }}>
                {error}
              </Alert>
            )}
            {successMessage && (
              <Alert severity="success" onClose={() => setSuccessMessage(null)}>
                {successMessage}
              </Alert>
            )}
            {showPasswordReset && !isSignUp && (
              <Box sx={{ mt: 1 }}>
                <Button
                  onClick={handlePasswordReset}
                  size="small"
                  variant="text"
                  disabled={loading || !email}
                  sx={{ textTransform: "none" }}
                >
                  Forgot password? Reset it
                </Button>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleEmailLogin} variant="contained" disabled={loading || !email || !password}>
            {loading ? (isSignUp ? "Creating account..." : "Signing in...") : (isSignUp ? "Sign Up" : "Sign In")}
          </Button>
        </DialogActions>
        <Box sx={{ px: 3, pb: 2, display: "flex", justifyContent: "center" }}>
          {!isSignUp ? (
            <Button onClick={() => setIsSignUp(true)} size="small" variant="text">
              Don't have an account? Sign up
            </Button>
          ) : (
            <Button onClick={() => setIsSignUp(false)} size="small" variant="text">
              Already have an account? Sign in
            </Button>
          )}
        </Box>
      </Dialog>
    </Box>
  );
}
