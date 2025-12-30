// server/src/models/draftSuggestion.model.ts
import admin from "firebase-admin";

/**
 * Draft Suggestion Firestore Data Model
 * 
 * Represents an AI-generated suggestion for editing a story draft.
 * Suggestions are proposals that specialists can accept or reject.
 */

// ============================================================================
// Types
// ============================================================================

export type SuggestionStatus = "proposed" | "accepted" | "rejected";

export type SuggestionScope = "page" | "selection";

// ============================================================================
// Interfaces
// ============================================================================

export interface DraftSuggestion {
  /** ID of the draft this suggestion applies to */
  draftId: string;
  /** ID of the brief this draft was generated from */
  briefId: string;
  /** Page number (required if scope="page") */
  pageNumber?: number;
  /** Scope of the suggestion (page-level or text selection) */
  scope: SuggestionScope;
  /** Specialist's instruction for the AI */
  instruction: string;
  /** Original text that was requested to be edited */
  originalText: string;
  /** AI-generated suggested replacement text */
  suggestedText: string;
  /** Short explanation from the model for why this suggestion was made */
  rationale?: string;
  /** ID of the specialist who created this suggestion request */
  createdBy: string;
  /** Current status of the suggestion */
  status: SuggestionStatus;
  /** Timestamp when suggestion was created */
  createdAt: admin.firestore.Timestamp;
  /** Timestamp when suggestion was last updated */
  updatedAt: admin.firestore.Timestamp;
  /** Timestamp when suggestion was accepted (only set when status="accepted") */
  acceptedAt?: admin.firestore.Timestamp;
  /** Timestamp when suggestion was rejected (only set when status="rejected") */
  rejectedAt?: admin.firestore.Timestamp;
  /** Model information for debugging/auditing */
  modelInfo?: {
    model: string;
    temperature: number;
  };
  /** Raw model output (for debugging only, controlled by env var) */
  rawModelOutput?: string;
}

// ============================================================================
// Input Interfaces
// ============================================================================

export interface CreateSuggestionInput {
  scope: SuggestionScope;
  pageNumber?: number;
  originalText: string;
  instruction: string;
}

