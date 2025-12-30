// server/src/models/storyDraft.model.ts
import admin from "firebase-admin";

/**
 * Story Draft Firestore Data Model
 * 
 * Represents a generated story draft created from a story brief.
 */

// ============================================================================
// Types
// ============================================================================

export type StoryDraftStatus = "generating" | "generated" | "failed" | "editing" | "approved";

export type Language = "ar" | "he";

export type DraftLength = "short" | "medium" | "long";

// ============================================================================
// Interfaces
// ============================================================================

export interface GenerationConfig {
  language: Language;
  targetAgeGroup: string;
  length: DraftLength;
  tone: string;
  emphasis?: string;
}

export interface DraftPage {
  pageNumber: number;
  text: string;
  imagePrompt: string;
  emotionalTone?: string;
}

export interface DraftError {
  message: string;
  reason?: string;
}

export interface StoryDraft {
  /** ID of the story brief this draft was generated from */
  briefId: string;
  /** ID of the user who triggered the generation */
  createdBy: string;
  /** Current status of the draft */
  status: StoryDraftStatus;
  /** Version number of this draft */
  version: number;
  /** Number of times this draft has been edited and saved (incremented on each save) */
  revisionCount: number;
  /** Configuration used for generation */
  generationConfig: GenerationConfig;
  /** Story title (only set when status === "generated") */
  title?: string;
  /** Story pages (only set when status === "generated") */
  pages?: DraftPage[];
  /** Timestamp when draft was created */
  createdAt: admin.firestore.Timestamp;
  /** Timestamp when draft was last updated */
  updatedAt: admin.firestore.Timestamp;
  /** Error information (only set when status === "failed") */
  error?: DraftError;
  /** Raw model output (for debugging only, not shown to users) */
  rawModelOutput?: string;
  /** Timestamp when draft was approved (only set when status === "approved") */
  approvedAt?: admin.firestore.Timestamp;
  /** ID of the user who approved this draft (only set when status === "approved") */
  approvedBy?: string;
}

export interface GenerateDraftInput {
  /** Story length preference */
  length: DraftLength;
  /** Tone preference for the story */
  tone: string;
  /** Optional emphasis for the story */
  emphasis?: string;
}

