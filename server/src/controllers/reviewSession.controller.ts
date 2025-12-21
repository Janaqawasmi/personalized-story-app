import { Request, Response } from "express";
import { db } from "../config/firebase";
import { getOpenAIClient } from "../services/storyGenerator.service";
import { retrieveKnowledgeForStory } from "../services/rag.service";

/**
 * Create a new review session for a draft
 */
export const createReviewSession = async (req: Request, res: Response) => {
  try {
    const { draftId } = req.params;
    const { specialistId } = req.body;

    if (!draftId) {
      return res.status(400).json({ success: false, error: "draftId parameter is required" });
    }

    if (!specialistId) {
      return res.status(400).json({ success: false, error: "specialistId is required" });
    }

    // Verify draft exists
    const draftSnap = await db.collection("story_drafts").doc(draftId).get();
    if (!draftSnap.exists) {
      return res.status(404).json({ success: false, error: "Draft not found" });
    }

    const draft = draftSnap.data();
    const revisionCount = draft?.revisionCount || 0;

    // Check revision count limit
    if (revisionCount >= 3) {
      return res.status(400).json({
        success: false,
        error: "Maximum revision count (3) reached. Cannot create new review session.",
      });
    }

    // Create review session
    const sessionRef = await db.collection("review_sessions").add({
      draftId,
      specialistId,
      revisionCount,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      sessionId: sessionRef.id,
      revisionCount,
    });
  } catch (error: any) {
    console.error("Error creating review session:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create review session",
      details: error.message,
    });
  }
};

/**
 * Get review session with messages
 */
export const getReviewSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ success: false, error: "sessionId parameter is required" });
    }

    const sessionSnap = await db.collection("review_sessions").doc(sessionId).get();
    if (!sessionSnap.exists) {
      return res.status(404).json({ success: false, error: "Review session not found" });
    }

    const session = { id: sessionSnap.id, ...sessionSnap.data() };

    // Get messages
    const messagesSnap = await db
      .collection("review_sessions")
      .doc(sessionId)
      .collection("messages")
      .orderBy("createdAt", "asc")
      .get();

    const messages = messagesSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get proposals
    const proposalsSnap = await db
      .collection("review_sessions")
      .doc(sessionId)
      .collection("proposals")
      .orderBy("createdAt", "desc")
      .get();

    const proposals = proposalsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({
      success: true,
      session: {
        ...session,
        messages,
        proposals,
      },
    });
  } catch (error: any) {
    console.error("Error fetching review session:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch review session",
      details: error.message,
    });
  }
};

/**
 * Send a message and generate a proposal
 */
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { content, specialistId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, error: "sessionId parameter is required" });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: "Message content is required" });
    }

    if (!specialistId) {
      return res.status(400).json({ success: false, error: "specialistId is required" });
    }

    // Verify session exists
    const sessionSnap = await db.collection("review_sessions").doc(sessionId).get();
    if (!sessionSnap.exists) {
      return res.status(404).json({ success: false, error: "Review session not found" });
    }

    const session = sessionSnap.data();
    const revisionCount = session?.revisionCount || 0;

    // Check revision count
    if (revisionCount >= 3) {
      return res.status(400).json({
        success: false,
        error: "Maximum revision count (3) reached. Cannot send more messages.",
      });
    }

    // 1. Save user message
    const messageRef = await db
      .collection("review_sessions")
      .doc(sessionId)
      .collection("messages")
      .add({
        role: "specialist",
        content: content.trim(),
        specialistId,
        createdAt: new Date().toISOString(),
      });

    // 2. Get draft
    const draftSnap = await db.collection("story_drafts").doc(session?.draftId).get();
    if (!draftSnap.exists) {
      return res.status(404).json({ success: false, error: "Draft not found" });
    }

    const draftData = draftSnap.data();
    if (!draftData) {
      return res.status(404).json({ success: false, error: "Draft data not found" });
    }

    const draft = draftData as any;

    // 3. Get RAG context
    const ragContext = await retrieveKnowledgeForStory(draft);

    // 4. Generate proposal using LLM
    const proposal = await generateProposal(draft, ragContext, content.trim(), revisionCount);

    // 5. Save proposal
    const proposalRef = await db
      .collection("review_sessions")
      .doc(sessionId)
      .collection("proposals")
      .add({
        messageId: messageRef.id,
        basedOnRevisionCount: revisionCount,
        proposedPages: proposal.pages,
        summary: proposal.summary,
        safetyNotes: proposal.safetyNotes,
        createdAt: new Date().toISOString(),
      });

    // 6. Save AI response message
    await db
      .collection("review_sessions")
      .doc(sessionId)
      .collection("messages")
      .add({
        role: "assistant",
        content: `I've generated a proposal based on your feedback. Please review the proposal below.`,
        proposalId: proposalRef.id,
        createdAt: new Date().toISOString(),
      });

    // 7. Update session
    await db.collection("review_sessions").doc(sessionId).update({
      updatedAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      messageId: messageRef.id,
      proposalId: proposalRef.id,
      proposal,
    });
  } catch (error: any) {
    console.error("Error sending message:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send message and generate proposal",
      details: error.message,
    });
  }
};

/**
 * Apply a proposal to the draft
 */
export const applyProposal = async (req: Request, res: Response) => {
  try {
    const { sessionId, proposalId } = req.params;
    const { specialistId } = req.body;

    if (!sessionId || !proposalId) {
      return res.status(400).json({
        success: false,
        error: "sessionId and proposalId parameters are required",
      });
    }

    if (!specialistId) {
      return res.status(400).json({ success: false, error: "specialistId is required" });
    }

    // Verify session exists
    const sessionSnap = await db.collection("review_sessions").doc(sessionId).get();
    if (!sessionSnap.exists) {
      return res.status(404).json({ success: false, error: "Review session not found" });
    }

    const session = sessionSnap.data();
    const draftId = session?.draftId;

    if (!draftId) {
      return res.status(400).json({ success: false, error: "Draft ID not found in session" });
    }

    // Get proposal
    const proposalSnap = await db
      .collection("review_sessions")
      .doc(sessionId)
      .collection("proposals")
      .doc(proposalId)
      .get();

    if (!proposalSnap.exists) {
      return res.status(404).json({ success: false, error: "Proposal not found" });
    }

    const proposal = proposalSnap.data();

    if (!proposal) {
      return res.status(404).json({ success: false, error: "Proposal data not found" });
    }

    // Verify revision count matches
    const currentRevisionCount = session?.revisionCount || 0;
    if (proposal.basedOnRevisionCount !== currentRevisionCount) {
      return res.status(400).json({
        success: false,
        error: "Proposal is based on a different revision count. Please generate a new proposal.",
      });
    }

    // Update draft with proposal pages
    await db.collection("story_drafts").doc(draftId).update({
      pages: proposal.proposedPages,
      revisionCount: currentRevisionCount + 1,
      updatedAt: new Date().toISOString(),
    });

    // Mark proposal as applied
    await db
      .collection("review_sessions")
      .doc(sessionId)
      .collection("proposals")
      .doc(proposalId)
      .update({
        applied: true,
        appliedAt: new Date().toISOString(),
        appliedBy: specialistId,
      });

    // Update session
    await db.collection("review_sessions").doc(sessionId).update({
      revisionCount: currentRevisionCount + 1,
      updatedAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      revisionCount: currentRevisionCount + 1,
    });
  } catch (error: any) {
    console.error("Error applying proposal:", error);
    res.status(500).json({
      success: false,
      error: "Failed to apply proposal",
      details: error.message,
    });
  }
};

/**
 * Helper function to generate proposal using LLM
 */
async function generateProposal(
  draft: any,
  ragContext: string,
  feedback: string,
  revisionCount: number
) {
  
  const prompt = `
You are a therapeutic children's story editor helping a specialist review and improve a story draft.

Current Story Draft:
${JSON.stringify(draft.pages, null, 2)}

Therapeutic Knowledge Context:
${ragContext}

Specialist Feedback:
${feedback}

Revision Number: ${revisionCount + 1}

TASK:
Generate an improved version of the story based on the specialist's feedback. Return a JSON object with this exact schema:

{
  "pages": [
    {
      "pageNumber": 1,
      "text": "revised story text using {{child_name}} and pronoun tokens",
      "emotionalTone": "string",
      "imagePrompt": "scene description for image generation"
    }
  ],
  "summary": "Brief summary of what was changed and why",
  "safetyNotes": "Any safety considerations or therapeutic alignment notes"
}

Rules:
- Output ONLY valid JSON. No explanations.
- Maintain the same number of pages as the original draft.
- Incorporate the specialist's feedback thoughtfully.
- Ensure therapeutic alignment and age-appropriateness.
- Use placeholders: {{child_name}}, {{pronoun_subject}}, {{pronoun_object}}, {{pronoun_possessive}}
- Keep the emotional arc intact.
`;

  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: "gpt-5-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    return {
      pages: parsed.pages || draft.pages,
      summary: parsed.summary || `Proposal generated based on revision ${revisionCount + 1}.`,
      safetyNotes: parsed.safetyNotes || "Review therapeutic alignment and age-appropriateness.",
    };
  } catch (error: any) {
    console.error("Error generating proposal:", error);
    // Fallback to original draft if LLM fails
    return {
      pages: draft.pages,
      summary: `Proposal generation encountered an issue. Please review the original draft. Error: ${error.message}`,
      safetyNotes: "Manual review required due to generation error.",
    };
  }
}

