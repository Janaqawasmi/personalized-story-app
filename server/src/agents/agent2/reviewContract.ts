// server/src/agents/agent2/reviewContract.ts
import { Request, Response } from "express";
import { firestore, admin } from "../../config/firebase";
import type { GenerationContract } from "../../models/generationContract.model";
import type { ReviewDecisionPayload, ReviewRecord } from "./types";

/**
 * Agent 2 — Specialist Contract Review & Approval Gate
 *
 * POST /api/agent2/contracts/:briefId/review
 *
 * Handles specialist review decisions (approved | needs_changes | rejected).
 * Enforces hard gating: approval only when contract is valid with no errors.
 * Uses Firestore batch writes for atomicity.
 */
export const reviewContract = async (req: Request, res: Response): Promise<void> => {
  try {
    const { briefId } = req.params;
    const { decision, reviewNotes } = req.body as ReviewDecisionPayload;

    // --- Input validation ---
    if (!briefId) {
      res.status(400).json({
        success: false,
        error: "briefId parameter is required",
      });
      return;
    }

    const validDecisions = ["approved", "needs_changes", "rejected"];
    if (!decision || !validDecisions.includes(decision)) {
      res.status(400).json({
        success: false,
        error: `decision is required and must be one of: ${validDecisions.join(", ")}`,
      });
      return;
    }

    // --- Derive reviewerId from auth (never from client) ---
    const reviewerId = (req as any).user?.uid;
    if (!reviewerId) {
      res.status(401).json({
        success: false,
        error: "Authentication required. reviewerId must be derived from authenticated user.",
      });
      return;
    }

    // --- Load contract ---
    const contractRef = firestore.collection("generationContracts").doc(briefId);
    const contractDoc = await contractRef.get();

    if (!contractDoc.exists) {
      res.status(404).json({
        success: false,
        error: "CONTRACT_NOT_FOUND",
        message: `Generation contract for brief "${briefId}" not found. Build a contract first.`,
      });
      return;
    }

    const contractData = contractDoc.data() as GenerationContract;

    // --- Load brief ---
    const briefRef = firestore.collection("storyBriefs").doc(briefId);
    const briefDoc = await briefRef.get();

    if (!briefDoc.exists) {
      res.status(404).json({
        success: false,
        error: "BRIEF_NOT_FOUND",
        message: `Story brief "${briefId}" not found.`,
      });
      return;
    }

    // --- Approval precondition: contract must be valid with no errors ---
    if (decision === "approved") {
      if (contractData.status !== "valid" || (contractData.errors && contractData.errors.length > 0)) {
        res.status(400).json({
          success: false,
          error: "CONTRACT_INVALID_CANNOT_APPROVE",
          message: "Cannot approve: contract status is not valid or contract has errors.",
        });
        return;
      }
    }

    // --- Map decision to brief status ---
    const briefStatusMap: Record<string, string> = {
      approved: "approved",
      needs_changes: "needs_changes",
      rejected: "rejected",
    };
    const newBriefStatus = briefStatusMap[decision];

    // --- Build review record (append-only audit trail) ---
    const reviewRecord: ReviewRecord = {
      briefId,
      contractId: briefId,
      rulesVersionUsed: contractData.rulesVersionUsed || "",
      decision: decision as ReviewRecord["decision"],
      reviewerId,
      overrideApplied: contractData.overrideUsed || false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Optional fields
    if (reviewNotes && reviewNotes.trim().length > 0) {
      reviewRecord.reviewNotes = reviewNotes.trim();
    }

    if (contractData.overrideUsed && contractData.overrideDetails) {
      const overrideDetailsObj: { copingToolId: string; reason?: string } = {
        copingToolId: contractData.overrideDetails.copingToolId as string,
      };
      const overrideReason = contractData.overrideDetails.reason;
      if (typeof overrideReason === "string") {
        overrideDetailsObj.reason = overrideReason;
      }
      reviewRecord.overrideDetails = overrideDetailsObj;
    }

    // For approved decisions, include a contract snapshot (excluding sentinel values and review fields)
    if (decision === "approved") {
      const {
        createdAt: _ca,
        updatedAt: _ua,
        reviewStatus: _rs,
        reviewedBy: _rb,
        reviewedAt: _ra,
        reviewNotes: _rn,
        approvedContractVersionHash: _ach,
        ...contractCore
      } = contractData;
      reviewRecord.contractSnapshot = contractCore;
    }

    // --- Firestore batch write for atomicity ---
    const batch = firestore.batch();

    // 1. Append new review record
    const reviewRef = contractRef.collection("reviews").doc();
    batch.set(reviewRef, reviewRecord);

    // 2. Update top-level review fields on contract
    const contractUpdate: Record<string, any> = {
      reviewStatus: decision,
      reviewedBy: reviewerId,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (reviewNotes && reviewNotes.trim().length > 0) {
      contractUpdate.reviewNotes = reviewNotes.trim();
    } else {
      contractUpdate.reviewNotes = admin.firestore.FieldValue.delete();
    }
    batch.update(contractRef, contractUpdate);

    // 3. Update brief status
    batch.update(briefRef, {
      status: newBriefStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    // --- Response ---
    res.status(200).json({
      success: true,
      data: {
        reviewId: reviewRef.id,
        decision,
        reviewStatus: decision,
        briefStatus: newBriefStatus,
      },
    });
  } catch (error: any) {
    console.error("Error reviewing contract:", error);
    res.status(500).json({
      success: false,
      error: "Failed to submit review decision",
      details: error.message,
    });
  }
};
