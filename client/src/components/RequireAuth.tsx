import { useState, useEffect } from "react";
import { Navigate, Outlet, useParams } from "react-router-dom";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../firebase";
import { Box, CircularProgress } from "@mui/material";

export default function RequireAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { lang } = useParams<{ lang: string }>();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    const loginPath = lang ? `/${lang}/login` : "/he/login";
    return <Navigate to={loginPath} replace />;
  }

  return <Outlet />;
}
