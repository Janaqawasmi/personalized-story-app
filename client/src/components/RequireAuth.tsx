import { useState, useEffect } from "react";
import { Navigate, Outlet, useParams } from "react-router-dom";
import { auth } from "../firebase";
import { User, onAuthStateChanged } from "firebase/auth";

export default function RequireAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { lang } = useParams<{ lang: string }>();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div>Loading...</div>; // Or a proper loading spinner
  }

  if (!user) {
    // Preserve language prefix when redirecting to login
    const loginPath = lang ? `/${lang}/login` : "/he/login";
    return <Navigate to={loginPath} replace />;
  }

  return <Outlet />;
}
