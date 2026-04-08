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
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }

  return <Outlet />;
}
