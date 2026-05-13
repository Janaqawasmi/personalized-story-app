export interface TextGenerationProvider {
  readonly providerId: string;
  readonly modelId: string;

  generateText(params: {
    systemPrompt: string;
    userPrompt: string;
    maxTokens?: number;
    temperature?: number;
    language?: "ar" | "he";
  }): Promise<TextGenerationResult>;
}

export interface TextGenerationResult {
  text: string;
  usage: { inputTokens: number; outputTokens: number };
  providerId: string;
  modelId: string;
  latencyMs: number;
}

export interface ImageGenerationProvider {
  readonly providerId: string;
  readonly modelId: string;

  generateImage(params: {
    textPrompt: string;
    /** Required for deterministic audit; specialist v2 always passes an integer seed. */
    seed: number;
    /**
     * Single reference image URL. Used by the **caregiver-side** personalization
     * flow (child photo → personalised illustrations). The v2 specialist-side
     * illustration pipeline (docs/illustration/spec.md) does NOT use this —
     * specialist consistency is anchored in structured text only.
     */
    referenceImage?: string;
    outputFormat?: "jpeg" | "png" | "webp";
    outputWidth?: number;
    outputHeight?: number;
  }): Promise<ImageGenerationResult>;
}

export interface ImageGenerationResult {
  imageBuffer: Buffer;
  mimeType: string;
  providerId: string;
  modelId: string;
  latencyMs: number;
  /** Echo of the seed used for this generation (audit). */
  seed: number;
  providerMetadata?: Record<string, unknown>;
}
