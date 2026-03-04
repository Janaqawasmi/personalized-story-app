// server/src/middleware/auth.middleware.ts
//
// Firebase Auth middleware for protected routes.
// Verifies the Bearer token, extracts uid and role,
// and attaches them to req.user for downstream handlers.
//
// Usage in routes:
//   import { requireAuth, requireRole } from "../middleware/auth.middleware";
//   router.post("/briefs", requireAuth, requireRole("specialist"), createStoryBrief);

import { Request, Response, NextFunction } from "express";
import { admin } from "../config/firebase";

// ============================================================================
// Type Augmentation
// ============================================================================

/**
 * Extend Express Request to carry authenticated user info.
 * This is picked up globally — no need to cast in controllers.
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export interface AuthenticatedUser {
  uid: string;
  email: string;
  role: string;       // e.g. "specialist", "admin", "viewer"
  displayName: string; // For audit trail entries
}

// ============================================================================
// Allowed roles (extend as the platform grows)
// ============================================================================

export type UserRole = "specialist" | "admin" | "viewer";

const VALID_ROLES: ReadonlySet<string> = new Set<UserRole>([
  "specialist",
  "admin",
  "viewer",
]);

// ============================================================================
// Middleware: requireAuth
// ============================================================================

/**
 * Verifies the Firebase ID token from the Authorization header.
 * On success, attaches `req.user` with uid, email, role, displayName.
 * On failure, returns 401.
 *
 * Expects header:  Authorization: Bearer <idToken>
 *
 * Role is read from custom claims (set via Firebase Admin SDK):
 *   admin.auth().setCustomUserClaims(uid, { role: "specialist" })
 *
 * If no role claim exists, defaults to "viewer" (least privilege).
 */
export async function requireAuth(
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

    const role = typeof decodedToken.role === "string" && VALID_ROLES.has(decodedToken.role)
      ? decodedToken.role
      : "viewer"; // Default to least privilege

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email ?? "unknown",
      role,
      displayName: decodedToken.name ?? decodedToken.email ?? decodedToken.uid,
    };

    next();
  } catch (error: any) {
    console.error("Auth middleware: token verification failed:", error.message);

    // Distinguish expired tokens from invalid tokens
    if (error.code === "auth/id-token-expired") {
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

// ============================================================================
// Middleware: requireRole
// ============================================================================

/**
 * Factory that returns middleware requiring the user to have one of the
 * specified roles. Must be used AFTER requireAuth.
 *
 * Usage:
 *   router.post("/approve", requireAuth, requireRole("specialist", "admin"), handler);
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      // requireAuth should have been called first
      res.status(401).json({
        success: false,
        error: "Authentication required",
        details: "requireRole must be used after requireAuth",
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role as UserRole)) {
      res.status(403).json({
        success: false,
        error: "Insufficient permissions",
        details: `Required role: ${allowedRoles.join(" or ")}. Your role: ${req.user.role}`,
      });
      return;
    }

    next();
  };
}
