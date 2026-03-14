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
    referenceImage: Buffer | string;
    referenceImageMediaType?: string;
    style?: string;
    outputFormat?: "png" | "jpeg" | "webp";
    outputWidth?: number;
    outputHeight?: number;
    additionalParams?: Record<string, unknown>;
  }): Promise<ImageGenerationResult>;
}

export interface ImageGenerationResult {
  imageBuffer: Buffer;
  mimeType: string;
  providerId: string;
  modelId: string;
  latencyMs: number;
  providerMetadata?: Record<string, unknown>;
}
