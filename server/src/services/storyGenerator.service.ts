import OpenAI from "openai";

// Lazy initialization - only create client when needed
let client: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
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
Use the following therapeutic knowledge to guide your writing:

${ragContext}

Admin Inputs:
Topic: ${brief.topicKey}
Age Group: ${brief.targetAgeGroup}
Therapeutic Messages: ${brief.therapeuticMessages?.join(", ")}

TASK:
Generate a therapeutic children's story following developmental psychology and emotional safety.
Return a JSON object with this exact schema:

{
  "title": "string",
  "pages": [
    {
      "pageNumber": 1,
      "text": "story text using {{child_name}} and pronoun tokens",
      "emotionalTone": "string",
      "imagePrompt": "scene description for image generation"
    }
  ]
}

Rules:
- Output ONLY valid JSON. No explanations.
- Use placeholders: {{child_name}}, {{pronoun_subject}}, {{pronoun_object}}, {{pronoun_possessive}}
- Story must include 5–8 pages.
- Emotional arc: introduction → identify emotion → challenge → coping → support → resolution.
- Use age-appropriate language rules from RAG.
- Avoid harmful or sensitive phrases listed in the RAG dont-do section.
`;

  try {
    const openaiClient = getOpenAIClient();
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
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
