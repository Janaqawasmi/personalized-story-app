// server/src/services/auditTrail.service.ts
//
// Immutable audit trail for all governed actions in the DAMMAH pipeline.
// Every entry is APPEND-ONLY — no updates, no deletes.
//
// Firestore collection: auditTrail
// Document structure: auto-generated ID, never overwritten
//
// Usage:
//   import { AuditTrail } from "../services/auditTrail.service";
//   await AuditTrail.log({ ... });

import { admin, firestore } from "../config/firebase";
import type { Firestore } from "firebase-admin/firestore";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * All possible audit actions in the system.
 * Add new actions here as the pipeline grows.
 */
export type AuditAction =
  // Brief lifecycle
  | "brief.created"
  | "brief.updated"
  // Contract lifecycle
  | "contract.built"
  | "contract.preview"
  | "contract.override_applied"
  // Approval lifecycle
  | "contract.approved"
  | "contract.rejected"
  | "contract.approval_revoked" // When override invalidates a previous approval
  // Generation lifecycle
  | "generation.requested"
  | "generation.started"
  | "generation.completed"
  | "generation.failed"
  | "generation.blocked"; // Blocked by missing approval

/**
 * A single audit trail entry. Immutable once written.
 */
export interface AuditEntry {
  /** The action that occurred */
  action: AuditAction;

  /** Who performed the action (from auth middleware) */
  actor: {
    uid: string;
    email: string;
    displayName: string;
    role: string;
  };

  /** The primary resource this action relates to */
  resourceType: "storyBrief" | "generationContract" | "storyDraft";
  resourceId: string;

  /** Optional secondary resource (e.g., briefId when acting on a contract) */
  relatedResourceId?: string;

  /** Action-specific metadata (e.g., override details, rejection reason) */
  metadata?: Record<string, unknown>;

  /** Server timestamp — set automatically */
  timestamp?: FirebaseFirestore.FieldValue;
}

/**
 * Input type for logging (without timestamp, which is set automatically)
 */
export type AuditLogInput = Omit<AuditEntry, "timestamp">;

// ============================================================================
// Audit Trail Service
// ============================================================================

const COLLECTION_NAME = "auditTrail";

/**
 * Logs an audit entry to Firestore.
 * Uses auto-generated document IDs to guarantee uniqueness.
 * Adds server timestamp automatically.
 *
 * @param entry - The audit entry to log
 * @param fs - Optional Firestore instance (for testing)
 * @returns The auto-generated document ID
 */
async function log(
  entry: AuditLogInput,
  fs?: Firestore
): Promise<string> {
  const db = fs ?? firestore;

  const auditDoc: AuditEntry = {
    ...entry,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };

  const docRef = await db.collection(COLLECTION_NAME).add(auditDoc);
  return docRef.id;
}

/**
 * Queries audit entries for a specific resource.
 * Useful for displaying audit history in the review UI.
 *
 * @param resourceType - The type of resource
 * @param resourceId - The resource ID
 * @param limit - Maximum number of entries to return (default 50)
 * @param fs - Optional Firestore instance (for testing)
 */
async function getByResource(
  resourceType: AuditEntry["resourceType"],
  resourceId: string,
  limit: number = 50,
  fs?: Firestore
): Promise<Array<AuditEntry & { id: string }>> {
  const db = fs ?? firestore;

  const snapshot = await db
    .collection(COLLECTION_NAME)
    .where("resourceType", "==", resourceType)
    .where("resourceId", "==", resourceId)
    .orderBy("timestamp", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as AuditEntry),
  }));
}

/**
 * Queries audit entries for a specific brief, including all related
 * contracts and drafts. Useful for full-lifecycle audit view.
 *
 * @param briefId - The brief ID
 * @param limit - Maximum number of entries to return (default 100)
 * @param fs - Optional Firestore instance (for testing)
 */
async function getByBriefId(
  briefId: string,
  limit: number = 100,
  cursor?: string, // Document ID to start after (for pagination)
  fs?: Firestore
): Promise<{
  entries: Array<AuditEntry & { id: string }>;
  nextCursor?: string;
  hasMore: boolean;
}> {
  const db = fs ?? firestore;
  const fetchLimit = limit + 1; // Fetch one extra to check hasMore

  // Build queries for both resourceId and relatedResourceId
  let directQuery = db
    .collection(COLLECTION_NAME)
    .where("resourceId", "==", briefId)
    .orderBy("timestamp", "desc")
    .limit(fetchLimit);

  let relatedQuery = db
    .collection(COLLECTION_NAME)
    .where("relatedResourceId", "==", briefId)
    .orderBy("timestamp", "desc")
    .limit(fetchLimit);

  // Apply cursor if provided
  if (cursor) {
    try {
      const cursorDoc = await db.collection(COLLECTION_NAME).doc(cursor).get();
      if (cursorDoc.exists) {
        directQuery = directQuery.startAfter(cursorDoc);
        relatedQuery = relatedQuery.startAfter(cursorDoc);
      }
    } catch (err) {
      console.warn(`Invalid cursor for audit history pagination: ${cursor}`, err);
    }
  }

  // Execute queries
  const [directSnapshot, relatedSnapshot] = await Promise.all([
    directQuery.get(),
    relatedQuery.get(),
  ]);

  // Merge and deduplicate by document ID
  const seen = new Set<string>();
  const allEntries: Array<AuditEntry & { id: string }> = [];

  for (const doc of [...directSnapshot.docs, ...relatedSnapshot.docs]) {
    if (!seen.has(doc.id)) {
      seen.add(doc.id);
      allEntries.push({
        id: doc.id,
        ...(doc.data() as AuditEntry),
      });
    }
  }

  // Sort by timestamp descending (Firestore timestamps are objects)
  allEntries.sort((a, b) => {
    const aTime = a.timestamp && typeof a.timestamp === "object" && "toMillis" in a.timestamp
      ? (a.timestamp as FirebaseFirestore.Timestamp).toMillis()
      : 0;
    const bTime = b.timestamp && typeof b.timestamp === "object" && "toMillis" in b.timestamp
      ? (b.timestamp as FirebaseFirestore.Timestamp).toMillis()
      : 0;
    return bTime - aTime;
  });

  // Determine pagination info
  const hasMore = allEntries.length > limit;
  const entries = allEntries.slice(0, limit);
  const nextCursor = hasMore && entries.length > 0 ? entries[entries.length - 1].id : undefined;

  return { entries, nextCursor, hasMore };
}

// ============================================================================
// Helper: Build actor from Express request
// ============================================================================

/**
 * Extracts the actor object from an authenticated Express request.
 * Use this in controllers to build audit entries.
 *
 * @param reqUser - The req.user object from auth middleware
 */
function actorFromRequest(reqUser: {
  uid: string;
  email: string;
  displayName: string;
  role: string;
}): AuditEntry["actor"] {
  return {
    uid: reqUser.uid,
    email: reqUser.email,
    displayName: reqUser.displayName,
    role: reqUser.role,
  };
}

// ============================================================================
// Export as namespace-style object
// ============================================================================

export const AuditTrail = {
  log,
  getByResource,
  getByBriefId,
  actorFromRequest,
  // Export pagination result type for TypeScript
  getByBriefIdPaginated: getByBriefId,
};
