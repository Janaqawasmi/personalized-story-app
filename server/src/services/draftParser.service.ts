// server/src/services/draftParser.service.ts
import { DraftPage } from "../models/storyDraft.model";

/**
 * Parsed draft structure
 */
export interface ParsedDraft {
  title: string;
  pages: DraftPage[];
}

/**
 * Parse LLM output (expects JSON format as specified in prompt)
 * 
 * @param rawOutput - Raw text output from LLM
 * @returns Parsed draft with title and pages
 * @throws Error if parsing fails or validation fails
 */
export function parseDraftOutput(rawOutput: string): ParsedDraft {
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
  if (!parsed.title || typeof parsed.title !== "string") {
    throw new Error("Missing or invalid 'title' field in JSON");
  }

  if (!parsed.pages || !Array.isArray(parsed.pages)) {
    throw new Error("Missing or invalid 'pages' array in JSON");
  }

  // Validate minimum page count
  if (parsed.pages.length < 3) {
    throw new Error(`Insufficient pages: got ${parsed.pages.length}, minimum 3 required`);
  }

  // Parse and validate pages
  const validatedPages: DraftPage[] = [];
  let expectedPageNumber = 1;

  for (const page of parsed.pages) {
    // Skip malformed pages
    if (!page.pageNumber || !page.text) {
      console.warn(`Skipping malformed page: missing pageNumber or text`, page);
      continue;
    }

    // Validate imagePrompt is present and non-empty (required field per DraftPage model)
    if (!page.imagePrompt || typeof page.imagePrompt !== "string" || page.imagePrompt.trim().length === 0) {
      console.warn(`Skipping malformed page: missing or empty imagePrompt`, page);
      continue;
    }

    // Validate page number is sequential
    const pageNum = typeof page.pageNumber === "number" ? page.pageNumber : parseInt(page.pageNumber, 10);
    if (isNaN(pageNum) || pageNum !== expectedPageNumber) {
      console.warn(`Skipping page with non-sequential number: expected ${expectedPageNumber}, got ${pageNum}`);
      continue;
    }

    // Build validated page
    const validatedPage: DraftPage = {
      pageNumber: pageNum,
      text: String(page.text),
      imagePrompt: String(page.imagePrompt).trim(),
      ...(page.emotionalTone ? { emotionalTone: String(page.emotionalTone) } : {}),
    };

    validatedPages.push(validatedPage);
    expectedPageNumber++;
  }

  // Final validation: must have at least 3 valid pages
  if (validatedPages.length < 3) {
    throw new Error(`Insufficient valid pages after parsing: got ${validatedPages.length}, minimum 3 required`);
  }

  return {
    title: parsed.title,
    pages: validatedPages,
  };
}

