import { useEffect, useState } from "react";
import { Navigate, Outlet, useParams } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { Box, CircularProgress } from "@mui/material";
import { COLORS } from "../theme";

export default function RequireAdmin() {
  const [status, setStatus] = useState<"loading" | "allowed" | "denied">("loading");
  const { lang } = useParams<{ lang: string }>();

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setStatus("denied");
        return;
      }
      try {
        // Force refresh so newly-set custom claims (e.g. admin) land in the token immediately
        const tokenResult = await user.getIdTokenResult(true);
        const role = tokenResult.claims.role;
        if (role === "admin") {
          setStatus("allowed");
        } else {
          console.warn("[RequireAdmin] Access denied. User role:", role, "Full claims:", tokenResult.claims);
          setStatus("denied");
        }
      } catch (err) {
        console.error("[RequireAdmin] Failed to read token claims:", err);
        setStatus("denied");
      }
    });
    return () => unsub();
  }, []);

  if (status === "loading") {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress sx={{ color: COLORS.secondary }} />
      </Box>
    );
  }

  if (status === "denied") {
    return <Navigate to={`/${lang ?? "he"}/login`} replace />;
  }

  return <Outlet />;
}
