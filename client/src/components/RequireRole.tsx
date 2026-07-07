import { useEffect, useState } from "react";
import { Box, CircularProgress } from "@mui/material";
import { Navigate, Outlet, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { DEFAULT_LANGUAGE } from "../i18n/context/LanguageContext";

type GateStatus = "loading" | "allowed" | "denied";

/**
 * Role-based route guard for *internal* areas (specialist / admin).
 *
 * - Waits for Firebase auth AND the role claim to resolve before rendering
 *   children, so protected pages never flash for the wrong user.
 * - Any visitor who is not allowed — whether unauthenticated OR authenticated
 *   with the wrong role — is redirected to the public home page for the
 *   current language. We deliberately do NOT redirect to login and do NOT
 *   preserve the intended route, so the existence of internal areas is not
 *   revealed to public visitors.
 *
 * `allowedRoles` is matched case-insensitively against the `role` custom claim.
 */
export default function RequireRole({ allowedRoles }: { allowedRoles: string[] }) {
  const { currentUser, loading } = useAuth();
  const { lang } = useParams<{ lang: string }>();
  const [status, setStatus] = useState<GateStatus>("loading");

  useEffect(() => {
    if (loading) {
      setStatus("loading");
      return;
    }
    if (!currentUser) {
      setStatus("denied");
      return;
    }

    let cancelled = false;
    setStatus("loading");
    const allowed = new Set(allowedRoles.map((r) => r.toLowerCase()));

    // Force refresh so a freshly-granted claim (e.g. specialist/admin) lands
    // in the token immediately rather than after the next natural refresh.
    currentUser
      .getIdTokenResult(true)
      .then((tokenResult) => {
        if (cancelled) return;
        const rawRole = tokenResult.claims.role;
        const role = typeof rawRole === "string" ? rawRole.toLowerCase() : undefined;
        if (role && allowed.has(role)) {
          setStatus("allowed");
        } else {
          setStatus("denied");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("denied");
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser, loading, allowedRoles]);

  if (status === "loading") {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (status === "denied") {
    const homePath = lang ? `/${lang}` : `/${DEFAULT_LANGUAGE}`;
    return <Navigate to={homePath} replace />;
  }

  return <Outlet />;
}
