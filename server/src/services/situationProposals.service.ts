/**
 * Situation-suggestion admin review service.
 *
 * A specialist can request a new "situation" (catalog taxonomy value) at
 * publish time when none of the existing `referenceData/situations` entries
 * fit. That request is saved inline on the new `story_templates/{id}` document
 * as `situationProposal: { status: "pending", labelHe/labelAr/labelEn, ... }`
 * (see server/src/illustration/orchestrator/publishStory.ts).
 *
 * This module is the single source of truth for reviewing those proposals —
 * both the admin dashboard endpoints (server/src/routes/admin/situationSuggestions.router.ts)
 * and the standalone CLI tool (server/scripts/approveSituationProposal.ts) call
 * into these same functions so the risky part (creating a live catalog entry,
 * flipping proposal status) is implemented exactly once.
 */

import { admin, firestore } from "@/config/firebase";
import { COLLECTIONS } from "@/shared/firestore/paths";

const REFERENCE_DATA_COLLECTION = "referenceData";
const SITUATIONS_DOC = "situations";
const ITEMS_SUBCOLLECTION = "items";

export class SituationProposalError extends Error {
  readonly code:
    | "TEMPLATE_NOT_FOUND"
    | "NO_PROPOSAL"
    | "NOT_PENDING"
    | "SITUATION_ID_TAKEN"
    | "INVALID_INPUT";

  constructor(code: SituationProposalError["code"], message: string) {
    super(message);
    this.name = "SituationProposalError";
    this.code = code;
  }
}

export interface PendingSituationProposal {
  templateId: string;
  title: string;
  slug: string;
  primaryTopic: string;
  labelHe: string;
  labelAr: string;
  labelEn: string;
  reason: string;
  createdBy: string;
  /** ms since epoch, or null if unavailable. */
  createdAt: number | null;
}

function toEpochMs(value: unknown): number | null {
  if (
    value &&
    typeof value === "object" &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  return null;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * Lists every `story_templates` document with a pending `situationProposal`.
 * Approved/rejected proposals are never returned here — the caller (admin UI)
 * only needs to see what's awaiting a decision.
 */
export async function listPendingSituationProposals(): Promise<PendingSituationProposal[]> {
  const snap = await firestore
    .collection(COLLECTIONS.STORY_TEMPLATES)
    .where("situationProposal.status", "==", "pending")
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>;
    const proposal = (data.situationProposal as Record<string, unknown>) ?? {};
    return {
      templateId: doc.id,
      title: str(data.title),
      slug: str(data.slug),
      primaryTopic: str(data.primaryTopic),
      labelHe: str(proposal.labelHe),
      labelAr: str(proposal.labelAr),
      labelEn: str(proposal.labelEn),
      reason: str(proposal.reason),
      createdBy: str(proposal.createdBy),
      createdAt: toEpochMs(proposal.createdAt),
    };
  });
}

async function loadProposal(templateId: string): Promise<{
  ref: FirebaseFirestore.DocumentReference;
  data: Record<string, unknown>;
  proposal: Record<string, unknown>;
}> {
  const ref = firestore.collection(COLLECTIONS.STORY_TEMPLATES).doc(templateId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new SituationProposalError(
      "TEMPLATE_NOT_FOUND",
      `No story_templates doc with id "${templateId}".`,
    );
  }
  const data = snap.data() as Record<string, unknown>;
  const proposal = data.situationProposal as Record<string, unknown> | undefined;
  if (!proposal) {
    throw new SituationProposalError(
      "NO_PROPOSAL",
      `Template "${templateId}" has no situationProposal.`,
    );
  }
  return { ref, data, proposal };
}

/**
 * Approves a pending proposal: creates the `referenceData/situations/items/{situationId}`
 * entry (in the exact shape `loadSituationsByTopic`/`checkReferenceItem` expect)
 * and sets `situationId` + `situationProposal.status = "approved"` on the
 * originating template.
 *
 * Idempotent: calling this again after a successful approval (e.g. a repeated
 * click) returns the already-approved result instead of erroring or writing
 * a duplicate `referenceData` item.
 */
export async function approveSituationProposal(
  templateId: string,
  situationId: string,
  adminUid: string,
): Promise<{ situationId: string; alreadyApproved: boolean }> {
  const trimmedId = situationId.trim();
  if (!trimmedId) {
    throw new SituationProposalError("INVALID_INPUT", "situationId is required.");
  }
  if (!/^[a-z0-9_]+$/.test(trimmedId)) {
    throw new SituationProposalError(
      "INVALID_INPUT",
      "situationId must contain only lowercase letters, numbers, and underscores.",
    );
  }

  const { ref, data, proposal } = await loadProposal(templateId);

  if (proposal.status === "approved") {
    // Repeated click after a successful approval — no-op, report existing state.
    return {
      situationId: str(data.situationId) || trimmedId,
      alreadyApproved: true,
    };
  }
  if (proposal.status !== "pending") {
    throw new SituationProposalError(
      "NOT_PENDING",
      `Template "${templateId}" proposal is "${String(proposal.status)}", not pending.`,
    );
  }

  const situationRef = firestore
    .collection(REFERENCE_DATA_COLLECTION)
    .doc(SITUATIONS_DOC)
    .collection(ITEMS_SUBCOLLECTION)
    .doc(trimmedId);
  const existingSituation = await situationRef.get();
  if (existingSituation.exists) {
    throw new SituationProposalError(
      "SITUATION_ID_TAKEN",
      `referenceData/situations/items/${trimmedId} already exists. Choose a different id.`,
    );
  }

  await situationRef.set({
    label_en: str(proposal.labelEn),
    label_ar: str(proposal.labelAr),
    label_he: str(proposal.labelHe),
    topicKey: str(data.primaryTopic),
    active: true,
  });

  await ref.update({
    situationId: trimmedId,
    "situationProposal.status": "approved",
    "situationProposal.reviewedBy": adminUid,
    "situationProposal.reviewedAt": admin.firestore.Timestamp.now(),
  });

  return { situationId: trimmedId, alreadyApproved: false };
}

/**
 * Rejects a pending proposal: sets `situationProposal.status = "rejected"`.
 * Does not touch `situationId`, `status`, `isActive`, or any other field on
 * the template — the published story is entirely unaffected by rejection.
 *
 * Idempotent: calling this again after a successful rejection is a no-op.
 */
export async function rejectSituationProposal(
  templateId: string,
  adminUid: string,
  note?: string,
): Promise<{ alreadyRejected: boolean }> {
  const { ref, proposal } = await loadProposal(templateId);

  if (proposal.status === "rejected") {
    return { alreadyRejected: true };
  }
  if (proposal.status !== "pending") {
    throw new SituationProposalError(
      "NOT_PENDING",
      `Template "${templateId}" proposal is "${String(proposal.status)}", not pending.`,
    );
  }

  const update: Record<string, unknown> = {
    "situationProposal.status": "rejected",
    "situationProposal.reviewedBy": adminUid,
    "situationProposal.reviewedAt": admin.firestore.Timestamp.now(),
  };
  const trimmedNote = note?.trim();
  if (trimmedNote) {
    update["situationProposal.reviewNote"] = trimmedNote;
  }

  await ref.update(update);
  return { alreadyRejected: false };
}
