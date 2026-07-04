import { Request, Response, NextFunction } from "express";
import { admin } from "../config/firebase";

/**
 * Authenticated buyer-capable user info attached to req.caregiverUser.
 * The property name stays as-is for compatibility with existing caregiver routes.
 */
export type BuyerRole = "caregiver" | "admin" | "specialist";

export interface AuthenticatedCaregiver {
  uid: string;
  email: string;
  role: BuyerRole;
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
 * the user can use the caregiver purchase flow.
 *
 * On success, attaches `req.caregiverUser` with uid, email, role, displayName.
 * On failure, returns 401 or 403.
 *
 * Expects header: Authorization: Bearer <idToken>
 */
const ALLOWED_BUYER_ROLES: ReadonlySet<BuyerRole> = new Set<BuyerRole>([
  "caregiver",
  "admin",
  "specialist",
]);

function buyerRoleFromDecodedToken(decodedToken: unknown): BuyerRole | null {
  const token = decodedToken as { role?: unknown; admin?: unknown };

  if (typeof token.role === "string") {
    const normalized = token.role.toLowerCase();
    if (ALLOWED_BUYER_ROLES.has(normalized as BuyerRole)) {
      return normalized as BuyerRole;
    }
  }

  // Some Firebase setups still use a boolean admin flag instead of role="admin".
  if (token.admin === true) {
    return "admin";
  }

  return null;
}

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
    const role = buyerRoleFromDecodedToken(decodedToken);

    if (!role) {
      res.status(403).json({
        success: false,
        error: "Insufficient permissions",
        details:
          "This endpoint requires caregiver, specialist, or admin role. " +
          `Your role: ${String(decodedToken.role ?? "none")}`,
      });
      return;
    }

    req.caregiverUser = {
      uid: decodedToken.uid,
      email: decodedToken.email ?? "unknown",
      role,
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
