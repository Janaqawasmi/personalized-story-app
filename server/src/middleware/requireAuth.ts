// server/src/middleware/requireAuth.ts
import { Request, Response, NextFunction } from "express";
import { admin } from "../config/firebase";

/**
 * Express middleware to require Firebase authentication.
 * Verifies the Authorization: Bearer <token> header and sets req.user.
 * 
 * Usage:
 *   router.post("/path", requireAuth, handler);
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: "Authentication required. Please provide a valid Firebase ID token in the Authorization header.",
    });
    return;
  }

  const idToken = authHeader.split("Bearer ")[1];

  if (!idToken || idToken.trim().length === 0) {
    res.status(401).json({
      success: false,
      error: "Authentication required. Please provide a valid Firebase ID token in the Authorization header.",
    });
    return;
  }

  admin
    .auth()
    .verifyIdToken(idToken)
    .then((decodedToken) => {
      // Set user info on request object
      (req as any).user = { uid: decodedToken.uid };
      next();
    })
    .catch((error) => {
      console.error("Error verifying ID token:", error);
      res.status(401).json({
        success: false,
        error: "Invalid or expired authentication token.",
        details: error.message,
      });
    });
}

