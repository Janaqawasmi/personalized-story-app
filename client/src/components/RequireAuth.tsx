import { Box, CircularProgress } from "@mui/material";
import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function RequireAuth() {
  const { currentUser, loading } = useAuth();
  const location = useLocation();
  const { lang } = useParams<{ lang: string }>();

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!currentUser) {
    const loginPath = lang ? `/${lang}/login` : "/login";

    // Redirect back to the originally requested page after login.
    const from = location.pathname + location.search;
    return <Navigate to={loginPath} replace state={{ from }} />;
  }

  return <Outlet />;
}
