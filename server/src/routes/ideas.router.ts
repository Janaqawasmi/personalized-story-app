import { Router, Request, Response } from "express";
import { admin, db } from "../config/firebase";
import { COLLECTIONS } from "../shared/firestore/paths";
import { validateIdeaInput } from "../validators/ideaValidator";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  console.log("ideas endpoint hit");

  // ── 1. Extract & verify token (mirror registerCaregiver) ────────────────
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
    console.error("[ideas] Token verification failed:", error.message);
    res.status(401).json({
      success: false,
      error: "Invalid authentication token",
    });
    return;
  }

  const uid = decodedToken.uid;
  const role = (decodedToken as any)?.role;
  if (
    typeof role !== "string" ||
    (role !== "caregiver" && role !== "specialist" && role !== "admin")
  ) {
    res.status(403).json({
      success: false,
      errorCode: "forbidden",
      message: "Only authenticated users with a valid role can submit story ideas",
    });
    return;
  }

  try {
    // ── 2. Validate and sanitize input ─────────────────────────────────────
    const validated = validateIdeaInput(req.body);
    if (!validated.ok) {
      res.status(400).json({
        success: false,
        errorCode: validated.errorCode,
        field: validated.field,
        message: validated.message,
      });
      return;
    }

    const { title, ageRange, description, motivation, contactConsent, language } = validated.value;

    // ── 3. Rate limit: 3 submissions / rolling 30 days ─────────────────────
    const thirtyDaysAgo = admin.firestore.Timestamp.fromMillis(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    );

    const recentIdeasSnap = await db
      .collection("storyIdeas")
      .where("submittedByUid", "==", uid)
      .where("createdAt", ">", thirtyDaysAgo)
      .orderBy("createdAt", "desc")
      .limit(3)
      .get();

    if (recentIdeasSnap.size >= 3) {
      res.status(429).json({
        success: false,
        errorCode: "rate_limit",
        message: "You have shared 3 ideas in the last 30 days",
      });
      return;
    }

    // ── 4. Resolve submitter name/email ────────────────────────────────────
    let submittedByName = "";
    let submittedByEmail = "";

    // Attempt 1: caregiver profile doc (preferred)
    const caregiverSnap = await db
      .collection(COLLECTIONS.CAREGIVERS)
      .doc(uid)
      .get();
    if (caregiverSnap.exists) {
      const caregiverData = caregiverSnap.data() as
        | { fullName?: unknown; email?: unknown }
        | undefined;
      const nameFromDoc =
        typeof caregiverData?.fullName === "string" ? caregiverData.fullName.trim() : "";
      const emailFromDoc =
        typeof caregiverData?.email === "string" ? caregiverData.email.trim() : "";

      if (nameFromDoc && emailFromDoc) {
        submittedByName = nameFromDoc;
        submittedByEmail = emailFromDoc;
      }
    }

    // Attempt 2: Auth user record (fallback for specialist/admin or incomplete caregiver doc)
    if (!submittedByName || !submittedByEmail) {
      const userRecord = await admin.auth().getUser(uid);
      const nameFromAuth = (userRecord.displayName ?? "").trim();
      const emailFromAuth = (userRecord.email ?? "").trim();
      if (nameFromAuth && emailFromAuth) {
        submittedByName = nameFromAuth;
        submittedByEmail = emailFromAuth;
      }
    }

    if (!submittedByName.trim() || !submittedByEmail.trim()) {
      res.status(400).json({
        success: false,
        errorCode: "caregiver_profile_incomplete",
        message: "Caregiver profile is missing required fields",
      });
      return;
    }

    // ── 5. Write idea document ─────────────────────────────────────────────
    const now = admin.firestore.FieldValue.serverTimestamp();

    const doc = {
      submittedByUid: uid,
      submittedByName,
      submittedByEmail,
      title,
      ageRange,
      description,
      motivation,
      contactConsent,
      language,
      status: "new",
      adminNote: null,
      linkedTemplateId: null,
      createdAt: now,
      updatedAt: now,
    } as const;

    const docRef = await db.collection("storyIdeas").add(doc);

    res.status(200).json({ success: true, ideaId: docRef.id });
  } catch (error: any) {
    console.error("[ideas] Error:", error);
    res.status(500).json({
      success: false,
      errorCode: "server_error",
      message: "Something went wrong",
    });
  }
});

export default router;

