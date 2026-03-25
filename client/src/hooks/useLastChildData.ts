import { useEffect, useState } from "react";
import { collection, limit, orderBy, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { getAuth } from "firebase/auth";

export interface LastChildData {
  childFirstName: string;
  childGender: "male" | "female";
  childAgeGroup: "0_3" | "3_6" | "6_9" | "9_12";
}

/**
 * Convenience hook for returning users: pre-fills personalization form from the latest preview.
 *
 * Query:
 *   storyPreviews where caregiverUid == currentUser.uid
 *   orderBy createdAt DESC
 *   limit 1
 */
export function useLastChildData(): {
  data: LastChildData | null;
  loading: boolean;
  error: string | null;
} {
  const [data, setData] = useState<LastChildData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
          setError("Authentication required");
          setLoading(false);
          return;
        }

        const q = query(
          collection(db, "storyPreviews"),
          where("caregiverUid", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(1)
        );

        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          setData(null);
          setError(null);
          setLoading(false);
          return;
        }

        const doc = snapshot.docs[0]!;
        const d = doc.data() as any;
        setData({
          childFirstName: String(d.childFirstName ?? ""),
          childGender: d.childGender as "male" | "female",
          childAgeGroup: d.childAgeGroup as "0_3" | "3_6" | "6_9" | "9_12",
        });
        setError(null);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to load last child data";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  return { data, loading, error };
}

