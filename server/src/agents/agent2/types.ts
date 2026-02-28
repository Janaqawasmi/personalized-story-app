// server/src/agents/agent2/types.ts
import type { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { GenerationContract } from "../../models/generationContract.model";

// ============================================================================
// Agent 2 — Specialist Contract Review & Approval Gate
// ============================================================================

/**
 * Specialist review decision
 */
export type ReviewDecision = "approved" | "needs_changes" | "rejected";

/**
 * Client → Backend payload for review decisions
 * Note: reviewerId is derived from auth, never accepted from client
 */
export interface ReviewDecisionPayload {
  decision: ReviewDecision;
  reviewNotes?: string;
}

/**
 * Append-only review history record
 * Stored at: generationContracts/{briefId}/reviews/{reviewId}
 */
export interface ReviewRecord {
  briefId: string;
  contractId: string; // same as briefId
  rulesVersionUsed: string;
  decision: ReviewDecision;
  reviewerId: string; // derived from auth
  reviewNotes?: string;
  overrideApplied: boolean;
  overrideDetails?: {
    copingToolId: string;
    reason?: string;
  };
  contractVersionHash?: string; // Phase 2 only
  contractSnapshot?: Omit<
    GenerationContract,
    "createdAt" | "updatedAt" | "reviewStatus" | "reviewedBy" | "reviewedAt" | "reviewNotes" | "approvedContractVersionHash"
  >; // Recommended for approved decisions only
  createdAt: FieldValue | Timestamp | string;
}

/**
 * Response from the review endpoint
 */
export interface ReviewResponse {
  reviewId: string;
  decision: ReviewDecision;
  reviewStatus: ReviewDecision;
  briefStatus: string;
}
