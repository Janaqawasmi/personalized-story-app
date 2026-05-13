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
import { API_BASE } from "../api/api";

type AuthContextValue = {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  ensureCaregiverDoc: (user: User, fullName?: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function deriveDisplayNameFromEmail(email: string): string {
  const name = email.split("@")[0]?.trim();
  return name || email;
}

/**
 * Calls the server endpoint to create the caregiver Firestore document
 * and set the "caregiver" custom claim. Uses merge: true on the server
 * so it won't overwrite existing data.
 */
async function registerCaregiverOnServer(user: User, fullName?: string): Promise<void> {
  const idToken = await user.getIdToken();

  const res = await fetch(`${API_BASE}/api/auth/register-caregiver`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ fullName: fullName || user.displayName || user.email }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("[AuthContext] registerCaregiverOnServer failed:", errorData);
    throw new Error(errorData.error || "Failed to register caregiver");
  }

  const data = await res.json();
  console.log("[AuthContext] Caregiver doc created:", data);

  // Force token refresh so the new "caregiver" custom claim is picked up
  await user.getIdToken(true);
  console.log("[AuthContext] Token refreshed with caregiver claim");
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
      await cred.user.getIdToken(true); // pick up custom claims (specialist/admin) for Firestore rules
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

  const ensureCaregiverDoc = useCallback(async (user: User, fullName?: string) => {
    try {
      await registerCaregiverOnServer(user, fullName);
    } catch (err) {
      console.error("[AuthContext] ensureCaregiverDoc error:", err);
      // Don't throw — the user is still signed in even if doc creation fails.
      // They can retry or the doc will be created on next sign-in.
    }
  }, []);

  const signup = useCallback(
    async (email: string, password: string, displayName?: string) => {
      console.log("[AuthContext] signup success/failure - attempt:", email);
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);

        const finalDisplayName = displayName ?? deriveDisplayNameFromEmail(email);
        await updateProfile(cred.user, { displayName: finalDisplayName });

        // Create caregiver doc + set custom claim via server
        await registerCaregiverOnServer(cred.user, finalDisplayName);
        console.log("User created:", cred.user.uid);
        console.log("Caregiver doc created");

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
      ensureCaregiverDoc,
    }),
    [currentUser, loading, login, signup, logout, ensureCaregiverDoc]
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

