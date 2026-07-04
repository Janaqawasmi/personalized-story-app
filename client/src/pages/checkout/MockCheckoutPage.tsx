import { useState } from "react";
import { Box, Typography, Button, CircularProgress } from "@mui/material";
import { Navigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "../../i18n/useTranslation";
import { useLanguage } from "../../i18n/context/useLanguage";
import { useAuth } from "../../contexts/AuthContext";
import { simulateMockPayment } from "../../api/caregiverApi";

/**
 * Sandbox-only "hosted checkout page" stand-in. In production this route
 * would never exist — the real gateway's own hosted page fills this role.
 * Only reachable via a checkoutUrl produced by MockPaymentProvider
 * (server/src/providers/mockPayment.provider.ts).
 */
export default function MockCheckoutPage() {
  const t = useTranslation();
  const { direction, language } = useLanguage();
  const { currentUser, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [processing, setProcessing] = useState<"success" | "failure" | null>(null);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  if (authLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 12 }}>
        <CircularProgress sx={{ color: "#824D5C" }} />
      </Box>
    );
  }

  if (!currentUser) {
    return <Navigate to={`/${language}/login`} replace />;
  }

  if (!sessionId) {
    return <Navigate to={`/${language}/cart`} replace />;
  }

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSimulate = async (outcome: "success" | "failure") => {
    setProcessing(outcome);
    try {
      await simulateMockPayment(sessionId, outcome);
      setRedirectTo(
        outcome === "success"
          ? `/checkout/success?session_id=${encodeURIComponent(sessionId)}`
          : `/checkout/cancel`
      );
    } catch {
      setRedirectTo(`/checkout/cancel`);
    }
  };

  return (
    <Box
      dir={direction}
      sx={{
        minHeight: "100vh",
        backgroundColor: "#F7F2EC",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
      }}
    >
      <Box
        sx={{
          maxWidth: 420,
          width: "100%",
          background: "#fff",
          borderRadius: "20px",
          border: "1px solid #ede5df",
          boxShadow: "0 2px 12px rgba(28,17,24,0.08)",
          p: 4,
          textAlign: "center",
        }}
      >
        <Typography sx={{ fontSize: 32, mb: 1 }}>🧪</Typography>
        <Typography
          sx={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: "#3C1C28", mb: 1 }}
        >
          {t("pages.checkoutMock.title")}
        </Typography>
        <Typography sx={{ fontSize: 13, color: "#9a8a92", mb: 4 }}>
          {t("pages.checkoutMock.subtitle")}
        </Typography>

        <Button
          fullWidth
          variant="contained"
          disabled={processing !== null}
          onClick={() => handleSimulate("success")}
          sx={{
            backgroundColor: "#824D5C",
            "&:hover": { backgroundColor: "#6f404d" },
            textTransform: "none",
            borderRadius: "12px",
            py: 1.25,
            fontWeight: 600,
            mb: 1.5,
          }}
        >
          {processing === "success" ? (
            <CircularProgress size={20} sx={{ color: "#fff" }} />
          ) : (
            t("pages.checkoutMock.payCta")
          )}
        </Button>

        <Button
          fullWidth
          variant="outlined"
          disabled={processing !== null}
          onClick={() => handleSimulate("failure")}
          sx={{
            borderColor: "#824D5C",
            color: "#824D5C",
            "&:hover": { borderColor: "#6f404d", backgroundColor: "rgba(130,77,92,0.06)" },
            textTransform: "none",
            borderRadius: "12px",
            py: 1.25,
            fontWeight: 600,
          }}
        >
          {processing === "failure" ? (
            <CircularProgress size={20} sx={{ color: "#824D5C" }} />
          ) : (
            t("pages.checkoutMock.failCta")
          )}
        </Button>
      </Box>
    </Box>
  );
}
