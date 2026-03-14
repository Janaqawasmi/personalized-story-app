import { Request, Response, NextFunction } from "express";
import { admin } from "../config/firebase";

/**
 * Authenticated caregiver info attached to req.caregiverUser.
 * Separate from the specialist req.user to avoid conflicts.
 */
export interface AuthenticatedCaregiver {
  uid: string;
  email: string;
  role: "caregiver";
  displayName: string;
}

declare global {
  namespace Express {
    interface Request {
      caregiverUser?: AuthenticatedCaregiver;
    }
  }
}

/**
 * Middleware that verifies a Firebase ID token and ensures
 * the user has the "caregiver" custom claim role.
 *
 * On success, attaches `req.caregiverUser` with uid, email, role, displayName.
 * On failure, returns 401 or 403.
 *
 * Expects header: Authorization: Bearer <idToken>
 */
export async function requireCaregiverAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
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

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    if (decodedToken.role !== "caregiver") {
      res.status(403).json({
        success: false,
        error: "Insufficient permissions",
        details: "This endpoint requires caregiver role",
      });
      return;
    }

    req.caregiverUser = {
      uid: decodedToken.uid,
      email: decodedToken.email ?? "unknown",
      role: "caregiver",
      displayName: decodedToken.name ?? decodedToken.email ?? decodedToken.uid,
    };

    next();
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    console.error("Caregiver auth middleware: token verification failed:", err.message);

    if (err.code === "auth/id-token-expired") {
      res.status(401).json({
        success: false,
        error: "Token expired",
        details: "Please re-authenticate",
      });
      return;
    }

    res.status(401).json({
      success: false,
      error: "Invalid authentication token",
    });
  }
}
