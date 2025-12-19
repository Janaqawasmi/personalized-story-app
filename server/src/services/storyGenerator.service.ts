import OpenAI from "openai";

// Lazy initialization - only create client when needed
let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    // Validate API key format (should start with sk-)
    if (!apiKey.startsWith("sk-")) {
      console.warn("WARNING: OpenAI API key doesn't start with 'sk-'. This might be invalid.");
    }
    client = new OpenAI({
      apiKey: apiKey,
    });
  }
  return client;
}

export async function generateStoryDraft(brief: any, ragContext: string) {
  const prompt = `
You are a professional therapeutic children's story writer.

Use the following therapeutic knowledge (RAG):
${ragContext}

Admin Inputs:
Topic: ${brief.topicKey}
Age Group: ${brief.targetAgeGroup}
Therapeutic Messages: ${brief.therapeuticMessages?.join(", ")}

CRITICAL CONSTRAINTS:
- The main character MUST be a human child (no animals, no fantasy).
- Use a realistic everyday setting.
- Avoid clichés such as "Once upon a time" or repetitive praise.
- Do NOT write in a childish or silly tone.
- Include at least one setback and recovery moment.

STORY STRUCTURE (MANDATORY):
Page 1: Introduce the child in a daily situation.
Page 2: Attention difficulty appears.
Page 3: Emotional normalization.
Page 4: Teach one small coping step.
Page 5: Small success then setback.
Page 6: Support and retry.
Page 7: Meaningful success.
Page 8: Reassuring ending about self-worth.

WRITING QUALITY:
- Use sensory details.
- Show emotions through actions.
- Embed meaning naturally (no moral lectures).

Return ONLY valid JSON with this schema:
{
  "title": "string",
  "pages": [
    {
      "pageNumber": number,
      "text": "story text using {{child_name}} and pronoun tokens",
      "emotionalTone": "string",
      "imagePrompt": "realistic scene description"
    }
  ]
}

Before finalizing, verify all constraints. If not met, revise once.
`;


  try {
    const openaiClient = getOpenAIClient();
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-5-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0]?.message?.content || "{}";

    try {
      return JSON.parse(raw);
    } catch (err) {
      console.error("Failed JSON from LLM:", raw);
      throw new Error("LLM did not return valid JSON");
    }
  } catch (error: any) {
    // Log the actual error first for debugging
    console.error("OpenAI API Error Details:", {
      code: error.code,
      status: error.status,
      message: error.message,
      type: error.type,
    });

    if (error.code === "insufficient_quota" || error.status === 429) {
      console.error("\n❌ OpenAI Quota Error:");
      console.error("You have exceeded your OpenAI API quota or need to set up billing.");
      console.error("Please check your plan and billing details at: https://platform.openai.com/account/billing");
      console.error("Or visit: https://platform.openai.com/docs/guides/error-codes/api-errors\n");
      throw new Error("OpenAI quota exceeded. Please check your billing and plan at https://platform.openai.com/account/billing");
    }
    if (error.code === "invalid_api_key" || error.status === 401 || error.code === "authentication_error") {
      console.error("\n❌ OpenAI API Key Error:");
      console.error("Your OpenAI API key is invalid or incorrect.");
      console.error("Please check your .env file and ensure OPENAI_API_KEY is set correctly.");
      console.error("Get a valid API key from: https://platform.openai.com/account/api-keys");
      console.error(`Current API key starts with: ${process.env.OPENAI_API_KEY?.substring(0, 7)}...\n`);
      throw new Error("Invalid OpenAI API key. Please check your .env file.");
    }
    // Re-throw with more context for other errors
    console.error("Unexpected OpenAI error:", error);
    throw new Error(`OpenAI API error: ${error.message || error.code || "Unknown error"}`);
  }
}
