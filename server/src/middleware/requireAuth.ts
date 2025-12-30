// server/src/middleware/requireAuth.ts
import { Request, Response, NextFunction } from "express";
import { admin } from "../config/firebase";

/**
 * Express middleware to require Firebase authentication.
 * Verifies the Authorization: Bearer <token> header and sets req.user.
 * 
 * In development mode (when ALLOW_UNAUTHENTICATED_REQUESTS env var is set),
 * allows requests without tokens and uses a default user ID.
 * 
 * Usage:
 *   router.post("/path", requireAuth, handler);
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const allowUnauthenticated = process.env.ALLOW_UNAUTHENTICATED_REQUESTS === "true";

  // If no auth header and we're allowing unauthenticated requests (development mode)
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    if (allowUnauthenticated) {
      // Use default user ID for development/testing
      (req as any).user = { uid: "system_specialist" };
      console.warn("[DEV MODE] Request without auth token - using default user: system_specialist");
      next();
      return;
    }
    
    res.status(401).json({
      success: false,
      error: "Authentication required. Please provide a valid Firebase ID token in the Authorization header.",
    });
    return;
  }

  const idToken = authHeader.split("Bearer ")[1];

  if (!idToken || idToken.trim().length === 0) {
    if (allowUnauthenticated) {
      // Use default user ID for development/testing
      (req as any).user = { uid: "system_specialist" };
      console.warn("[DEV MODE] Request with empty auth token - using default user: system_specialist");
      next();
      return;
    }
    
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
      // In development mode, if token verification fails, still allow with default user
      if (allowUnauthenticated) {
        (req as any).user = { uid: "system_specialist" };
        console.warn(`[DEV MODE] Token verification failed: ${error.message} - using default user: system_specialist`);
        next();
        return;
      }
      
      console.error("Error verifying ID token:", error);
      res.status(401).json({
        success: false,
        error: "Invalid or expired authentication token.",
        details: error.message,
      });
    });
}

