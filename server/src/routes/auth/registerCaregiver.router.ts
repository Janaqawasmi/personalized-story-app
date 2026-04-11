// server/src/routes/auth/registerCaregiver.router.ts
//
// POST /api/auth/register-caregiver
//
// Called immediately after a user signs up (email/password or Google).
// Uses the Admin SDK to:
//   1. Set the "caregiver" custom claim on the Firebase Auth user
//   2. Create a caregivers/{uid} Firestore document (merge: true — won't overwrite)
//
// The client must send:  Authorization: Bearer <idToken>
// No role claim is required — any authenticated user can call this once.

import { Router, Request, Response } from "express";
import { admin, db } from "../../config/firebase";
import { COLLECTIONS } from "../../shared/firestore/paths";

const router = Router();

router.post("/register-caregiver", async (req: Request, res: Response) => {
  console.log("register-caregiver endpoint hit");
  // ── 1. Extract & verify token ──────────────────────────────────────────
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: "Authentication required",
      details: "Missing or malformed Authorization header. Expected: Bearer <token>",
    });
    return;
  }

  const idToken = authHeader.split("Bearer ")[1];

  if (!idToken) {
    res.status(401).json({
      success: false,
      error: "Authentication required",
      details: "Token is empty",
    });
    return;
  }

  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(idToken);
  } catch (error: any) {
    console.error("[register-caregiver] Token verification failed:", error.message);
    res.status(401).json({
      success: false,
      error: "Invalid authentication token",
    });
    return;
  }

  const uid = decodedToken.uid;
  const email = decodedToken.email ?? "unknown";
  const displayName =
    req.body.fullName ||
    decodedToken.name ||
    decodedToken.email?.split("@")[0] ||
    uid;

  console.log("[register-caregiver] Processing registration for:", { uid, email });

  try {
    // ── 2. Check if user already has caregiver role (from token) ───────────
    const existingClaims = decodedToken;
    const alreadyCaregiver = existingClaims.role === "caregiver";

    // ── 3. Set the "caregiver" custom claim ────────────────────────────────
    let caregiverClaimJustSet = false;
    if (!alreadyCaregiver) {
      // Don't overwrite existing roles (e.g., admin, specialist) — only set caregiver if no role exists
      const existingUser = await admin.auth().getUser(uid);
      const rawRole = existingUser.customClaims?.role;
      const existingRole = typeof rawRole === "string" ? rawRole : undefined;
      if (!existingRole) {
        await admin.auth().setCustomUserClaims(uid, { role: "caregiver" });
        caregiverClaimJustSet = true;
        console.log("[register-caregiver] Custom claim 'caregiver' set for:", uid);
      } else {
        console.log("[register-caregiver] Preserving existing role:", existingRole, uid);
      }
    } else {
      console.log("[register-caregiver] User already has caregiver role:", uid);
    }

    // ── 4. Create the caregivers/{uid} document (merge: true) ──────────────
    const caregiverData = {
      uid,
      fullName: displayName,
      email,
      role: "caregiver",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      purchaseCount: 0,
      paymentCustomerId: null,
    };

    await db
      .collection(COLLECTIONS.CAREGIVERS)
      .doc(uid)
      .set(caregiverData, { merge: true });

    console.log("[register-caregiver] Caregiver doc created/merged for:", uid);

    // ── 5. Return success ──────────────────────────────────────────────────
    res.status(200).json({
      success: true,
      message: alreadyCaregiver
        ? "Caregiver document ensured (role already set)"
        : caregiverClaimJustSet
          ? "Caregiver registered successfully"
          : "Caregiver document ensured (existing role preserved)",
      uid,
    });
  } catch (error: any) {
    console.error("[register-caregiver] Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to register caregiver",
      details: error.message,
    });
  }
});

export default router;
