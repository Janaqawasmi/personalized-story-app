// server/src/services/draftSuggestion.service.ts
import { firestore, admin } from "../config/firebase";
import { StoryDraft } from "../models/storyDraft.model";
import { StoryBrief } from "../models/storyBrief.model";
import { DraftSuggestion, CreateSuggestionInput } from "../models/draftSuggestion.model";
import { loadWritingRules } from "./ragWritingRules.service";
import { buildDraftSuggestionPrompt } from "./draftSuggestionPromptBuilder.service";
import { generateStoryDraft } from "./llmClient.service";

/**
 * Parse LLM JSON response for suggestions
 * 
 * @param rawOutput - Raw text output from LLM
 * @returns Parsed suggestion with suggestedText and rationale
 * @throws Error if parsing fails or validation fails
 */
function parseSuggestionOutput(rawOutput: string): { suggestedText: string; rationale?: string } {
  // Clean the output - remove markdown code blocks if present
  let cleaned = rawOutput.trim();
  
  // Remove markdown code blocks (```json ... ```)
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    cleaned = jsonMatch[1].trim();
  }

  // Parse JSON
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch (parseError: any) {
    throw new Error(`Failed to parse JSON: ${parseError.message}`);
  }

  // Validate structure
  if (!parsed.suggestedText || typeof parsed.suggestedText !== "string") {
    throw new Error("Missing or invalid 'suggestedText' field in JSON");
  }

  if (parsed.suggestedText.trim().length === 0) {
    throw new Error("'suggestedText' cannot be empty");
  }

  return {
    suggestedText: parsed.suggestedText.trim(),
    rationale: parsed.rationale && typeof parsed.rationale === "string" ? parsed.rationale.trim() : undefined,
  };
}

/**
 * Create an AI suggestion for a draft edit
 * 
 * @param params - Parameters for creating the suggestion
 * @returns Created suggestion ID and parsed output
 */
export async function createSuggestionForDraft(params: {
  draftId: string;
  pageNumber?: number;
  scope: "page" | "selection";
  originalText: string;
  instruction: string;
  createdBy: string;
}): Promise<{ suggestionId: string; suggestedText: string; rationale?: string; status: string }> {
  const { draftId, pageNumber, scope, originalText, instruction, createdBy } = params;

  // 1. Load draft
  const draftRef = firestore.collection("storyDrafts").doc(draftId);
  const draftDoc = await draftRef.get();

  if (!draftDoc.exists) {
    throw new Error("Draft not found");
  }

  const draft = draftDoc.data() as StoryDraft;

  // 2. Validate draft status
  if (draft.status !== "generated" && draft.status !== "editing") {
    throw new Error(`Cannot create suggestion: draft status is "${draft.status}", expected "generated" or "editing"`);
  }

  // 3. Validate page number if scope is "page"
  if (scope === "page") {
    if (pageNumber === undefined) {
      throw new Error("pageNumber is required when scope is 'page'");
    }
    if (!draft.pages || draft.pages.length === 0) {
      throw new Error("Draft has no pages");
    }
    const pageExists = draft.pages.some(p => p.pageNumber === pageNumber);
    if (!pageExists) {
      throw new Error(`Page ${pageNumber} does not exist in this draft`);
    }
  }

  // 4. Load brief
  if (!draft.briefId) {
    throw new Error("Draft is missing briefId");
  }
  const briefRef = firestore.collection("storyBriefs").doc(draft.briefId);
  const briefDoc = await briefRef.get();

  if (!briefDoc.exists) {
    throw new Error("Story brief not found");
  }

  const brief = briefDoc.data() as StoryBrief;

  // 5. Load RAG rules
  const ragRulesText = await loadWritingRules();

  // 6. Build prompt
  const promptParams: {
    language: "ar" | "he";
    ragRulesText: string;
    brief: StoryBrief;
    pageNumber?: number;
    originalText: string;
    instruction: string;
  } = {
    language: draft.generationConfig.language,
    ragRulesText,
    brief,
    originalText,
    instruction,
  };

  // Only include pageNumber if it's defined
  if (pageNumber !== undefined) {
    promptParams.pageNumber = pageNumber;
  }

  const prompt = buildDraftSuggestionPrompt(promptParams);

  // 7. Call LLM (using generateStoryDraft as generic LLM text generator)
  const modelName = "gpt-4o-mini";
  const temperature = 0.4;
  let rawOutput: string;
  let parsedOutput: { suggestedText: string; rationale?: string };

  try {
    // Note: generateStoryDraft is a generic LLM text generator function
    // It's used here to generate suggestion text, not a full draft
    rawOutput = await generateStoryDraft(prompt);
    parsedOutput = parseSuggestionOutput(rawOutput);
  } catch (error: any) {
    // Log error but don't store suggestion on LLM failure
    console.error("Error generating suggestion:", error);
    
    // Provide clear error messages for common issues
    if (error.message?.includes("OPENAI_API_KEY")) {
      throw new Error("OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.");
    }
    
    throw new Error(`Failed to generate suggestion: ${error.message}`);
  }

  // 8. Create suggestion document
  const now = admin.firestore.Timestamp.now();
  const suggestionData: Omit<DraftSuggestion, "id"> = {
    draftId,
    briefId: draft.briefId,
    scope,
    instruction,
    originalText,
    suggestedText: parsedOutput.suggestedText,
    createdBy,
    status: "proposed",
    createdAt: now,
    updatedAt: now,
    modelInfo: {
      model: modelName,
      temperature,
    },
    // Store raw output only if env var is set
    ...(process.env.STORE_RAW_MODEL_OUTPUT === "true" && { rawModelOutput: rawOutput }),
    // Conditionally include optional fields
    ...(pageNumber !== undefined && { pageNumber }),
    ...(parsedOutput.rationale && { rationale: parsedOutput.rationale }),
  };

  const suggestionRef = await firestore.collection("draft_suggestions").add(suggestionData);

  const result: {
    suggestionId: string;
    suggestedText: string;
    rationale?: string;
    status: string;
  } = {
    suggestionId: suggestionRef.id,
    suggestedText: parsedOutput.suggestedText,
    status: "proposed",
  };

  // Only include rationale if it exists (to satisfy exactOptionalPropertyTypes)
  if (parsedOutput.rationale) {
    result.rationale = parsedOutput.rationale;
  }

  return result;
}

