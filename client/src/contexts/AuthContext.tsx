import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { auth } from "../firebase";

type AuthContextValue = {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function deriveDisplayNameFromEmail(email: string): string {
  const name = email.split("@")[0]?.trim();
  return name || email;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("[AuthContext] Setting up onAuthStateChanged...");

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log(
        "[AuthContext] auth state change:",
        firebaseUser ? { uid: firebaseUser.uid, email: firebaseUser.email } : null
      );

      setCurrentUser(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    console.log("[AuthContext] currentUser state:", currentUser?.email ?? null);
  }, [currentUser]);

  const login = useCallback(async (email: string, password: string) => {
    console.log("[AuthContext] login success/failure - attempt:", email);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await cred.user.reload(); // refresh displayName/email
      setCurrentUser(cred.user);

      console.log(
        "[AuthContext] login success:",
        cred.user.displayName || cred.user.email
      );
    } catch (err) {
      console.error("[AuthContext] login failure:", err);
      throw err;
    }
  }, []);

  const signup = useCallback(
    async (email: string, password: string, displayName?: string) => {
      console.log("[AuthContext] signup success/failure - attempt:", email);
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);

        const finalDisplayName = displayName ?? deriveDisplayNameFromEmail(email);
        await updateProfile(cred.user, { displayName: finalDisplayName });
        await cred.user.reload();
        setCurrentUser(cred.user);

        console.log("[AuthContext] signup success:", finalDisplayName);
      } catch (err) {
        console.error("[AuthContext] signup failure:", err);
        throw err;
      }
    },
    []
  );

  const logout = useCallback(async () => {
    console.log("[AuthContext] logout...");
    await signOut(auth);
    setCurrentUser(null);
  }, []);

  const value: AuthContextValue = useMemo(
    () => ({
      currentUser,
      loading,
      login,
      signup,
      logout,
    }),
    [currentUser, loading, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

