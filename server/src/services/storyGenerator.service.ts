// src/services/storyGenerator.service.ts
import OpenAI from "openai";
import { StoryBrief } from "../models/storyBrief.model";
import { buildStoryDraftPrompt } from "./storyPromptBuilder";

/**
 * Lazy OpenAI client initialization
 */
let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY?.trim();

    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }

    if (!apiKey.startsWith("sk-")) {
      console.warn(
        "WARNING: OpenAI API key does not start with 'sk-'. Check if this is intentional."
      );
    }

    client = new OpenAI({ apiKey });
  }

  return client;
}

/**
 * Generate a therapeutic story draft
 * - Prompt is BUILT elsewhere
 * - This function only executes the LLM call
 */
export async function generateStoryDraft(
  brief: StoryBrief,
  ragContext: string
) {
  // 🔑 SINGLE SOURCE OF TRUTH
  const prompt = buildStoryDraftPrompt(brief, ragContext);

  try {
    const openaiClient = getOpenAIClient();

    const completion = await openaiClient.chat.completions.create({
      model: "gpt-5-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";

    try {
      return {
        draft: JSON.parse(raw),
        promptSnapshot: prompt,     // 👈 IMPORTANT (audit / preview)
        ragSnapshot: ragContext,    // 👈 IMPORTANT (traceability)
      };
    } catch {
      console.error("❌ LLM returned invalid JSON:\n", raw);
      throw new Error("LLM response is not valid JSON");
    }
  } catch (error: any) {
    console.error("OpenAI API Error:", {
      code: error.code,
      status: error.status,
      message: error.message,
      type: error.type,
    });

    if (error.code === "insufficient_quota" || error.status === 429) {
      throw new Error(
        "OpenAI quota exceeded. Please check billing at https://platform.openai.com/account/billing"
      );
    }

    if (
      error.code === "invalid_api_key" ||
      error.code === "authentication_error" ||
      error.status === 401
    ) {
      throw new Error(
        "Invalid OpenAI API key. Please check OPENAI_API_KEY in your environment."
      );
    }

    throw new Error(
      `OpenAI API error: ${error.message || "Unknown error"}`
    );
  }
}
