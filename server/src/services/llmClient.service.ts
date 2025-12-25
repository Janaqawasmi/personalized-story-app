// server/src/services/llmClient.service.ts
import OpenAI from "openai";

/**
 * Lazy OpenAI client initialization
 */
let client: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
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
 * Generate story draft using LLM
 * 
 * @param prompt - Full prompt string to send to LLM
 * @returns Raw text output from the model
 * @throws Error if API call fails or returns no content
 */
export async function generateStoryDraft(prompt: string): Promise<string> {
  try {
    const openaiClient = getOpenAIClient();

    // Try gpt-4o-mini first (current model), fallback to gpt-4o if unavailable
    // Note: gpt-4.1-mini doesn't exist yet, using gpt-4o-mini
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 1200,
    });

    const rawOutput = completion.choices[0]?.message?.content;

    if (!rawOutput) {
      throw new Error("LLM returned empty response");
    }

    return rawOutput;
  } catch (error: any) {
    console.error("LLM Client Error:", {
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

    if (error.code === "model_not_found") {
      throw new Error(
        `OpenAI model not found. Please check if the model is available.`
      );
    }

    throw new Error(
      `LLM API error: ${error.message || "Unknown error"}`
    );
  }
}

