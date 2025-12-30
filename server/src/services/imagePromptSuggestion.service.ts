// server/src/services/imagePromptSuggestion.service.ts
import { generateStoryDraft } from "./llmClient.service";
import { buildImagePromptSuggestionPrompt } from "./imagePromptSuggestionPromptBuilder.service";

/**
 * Parse LLM JSON response for image prompt suggestions
 * 
 * @param rawOutput - Raw text output from LLM
 * @returns Parsed suggestion with suggestedImagePrompt and rationale
 * @throws Error if parsing fails or validation fails
 */
function parseImagePromptSuggestionOutput(rawOutput: string): { 
  suggestedImagePrompt: string; 
  rationale?: string 
} {
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
  if (!parsed.suggestedImagePrompt || typeof parsed.suggestedImagePrompt !== "string") {
    throw new Error("Missing or invalid 'suggestedImagePrompt' field in JSON");
  }

  if (parsed.suggestedImagePrompt.trim().length === 0) {
    throw new Error("'suggestedImagePrompt' cannot be empty");
  }

  return {
    suggestedImagePrompt: parsed.suggestedImagePrompt.trim(),
    rationale: parsed.rationale && typeof parsed.rationale === "string" ? parsed.rationale.trim() : undefined,
  };
}

/**
 * Generate an AI suggestion for aligning an image prompt with updated story text
 * 
 * @param params - Parameters for generating the suggestion
 * @returns Suggestion with suggestedImagePrompt and rationale
 */
export async function generateImagePromptSuggestion(params: {
  currentText: string;
  currentImagePrompt: string;
}): Promise<{
  suggestedImagePrompt: string;
  rationale?: string;
}> {
  const { currentText, currentImagePrompt } = params;

  // Validate inputs
  if (!currentText || typeof currentText !== "string" || currentText.trim().length === 0) {
    throw new Error("currentText is required and must be a non-empty string");
  }

  if (!currentImagePrompt || typeof currentImagePrompt !== "string" || currentImagePrompt.trim().length === 0) {
    throw new Error("currentImagePrompt is required and must be a non-empty string");
  }

  // Build prompt
  const prompt = buildImagePromptSuggestionPrompt({
    currentText: currentText.trim(),
    currentImagePrompt: currentImagePrompt.trim(),
  });

  // Call LLM
  const modelName = "gpt-4o-mini";
  const temperature = 0.4;
  let rawOutput: string;
  let parsedOutput: { suggestedImagePrompt: string; rationale?: string };

  try {
    rawOutput = await generateStoryDraft(prompt);
    parsedOutput = parseImagePromptSuggestionOutput(rawOutput);
  } catch (error: any) {
    console.error("Error generating image prompt suggestion:", error);
    if (error.message?.includes("OPENAI_API_KEY")) {
      throw new Error("OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.");
    }
    throw new Error(`Failed to generate image prompt suggestion: ${error.message}`);
  }

  return parsedOutput;
}

