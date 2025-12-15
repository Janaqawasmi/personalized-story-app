import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

  const completion = await client.chat.completions.create({
    model: "gpt-4.1",
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
}
