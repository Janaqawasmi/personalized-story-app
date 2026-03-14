import { useState, useEffect } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import { getAuth } from "firebase/auth";

export interface CartItemView {
  cartItemId: string;
  caregiverUid: string;
  previewId: string;
  templateId: string;
  templateTitle: string;
  childId: string;
  childFirstName: string;
  coverImageUrl: string | null;
  priceCents: number;
  currency: string;
  language: "ar" | "he";
  addedAt: unknown;
}

interface UseMyCartResult {
  items: CartItemView[];
  loading: boolean;
  error: string | null;
  totalCents: number;
}

/**
 * Real-time listener on the caregiver's cart subcollection.
 * Path: caregivers/{uid}/cart
 * Auth required.
 */
export function useMyCart(): UseMyCartResult {
  const [items, setItems] = useState<CartItemView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      setError("Authentication required");
      setLoading(false);
      return;
    }

    const cartRef = collection(db, "caregivers", user.uid, "cart");
    const q = query(cartRef, orderBy("addedAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const cartItems: CartItemView[] = snapshot.docs.map((doc) => ({
          cartItemId: doc.id,
          ...(doc.data() as Omit<CartItemView, "cartItemId">),
        }));
        setItems(cartItems);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Cart snapshot error:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const totalCents = items.reduce((sum, item) => sum + item.priceCents, 0);

  return { items, loading, error, totalCents };
}
