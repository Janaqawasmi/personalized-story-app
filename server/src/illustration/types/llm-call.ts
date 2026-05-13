/** Shared envelope for LLM calls (Visual Bible, Scene Plan, etc.). */
export interface LLMCallRecord {
  model: string;
  prompt: string;
  response: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  success: boolean;
  error: string | null;
}
