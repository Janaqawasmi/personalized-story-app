// server/src/providers/seedream.provider.ts
//
// Implements ImageGenerationProvider for BytePlus ModelArk Seedream 4.0.
// `size` is sent as "WxH" pixels (see `shared/seedreamImageSize.ts`); unsupported
// dimensions fall back to the default children's-book preset.
// Env vars required:
//   ARK_API_KEY         — API key for BytePlus ModelArk
//   ARK_API_URL         — Base URL (default: https://ark.ap-southeast.bytepluses.com/api/v3)
//   SEEDREAM_MODEL_ID   — Model ID (default: seedream-4-0-250828)
//
// v2 specialist pipeline (docs/illustration/spec.md §17) is text-to-image only.
// The `referenceImage` parameter remains available for the caregiver-side
// personalization flow (child photo → personalised illustrations), which is a
// separate, legitimate use case.

import type {
  ImageGenerationProvider,
  ImageGenerationResult,
} from "@/shared/types/aiProvider";
import { buildSeedreamSizeParam } from "@/shared/seedreamImageSize";

const DEFAULT_API_URL = "https://ark.ap-southeast.bytepluses.com/api/v3";
const DEFAULT_MODEL_ID = "seedream-4-0-250828";
const DEFAULT_GUIDANCE_SCALE = 7.5;
const PROMPT_WARN_CHARS = 1200; // ~300-token threshold per official docs

interface SeedreamRequest {
  model: string;
  prompt: string;
  n?: number;
  size?: string;
  response_format?: string;
  seed?: number;
  guidance_scale?: number;
  watermark?: boolean;
  image?: string;
}

interface SeedreamResponse {
  created?: number;
  data: Array<{
    b64_json?: string;
    url?: string;
    revised_prompt?: string;
  }>;
}

export class SeedreamProvider implements ImageGenerationProvider {
  readonly providerId = "seedream";
  readonly modelId: string;

  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor(options?: { apiKey?: string; apiUrl?: string; modelId?: string }) {
    this.apiKey = options?.apiKey ?? process.env.ARK_API_KEY ?? "";
    this.apiUrl = options?.apiUrl ?? process.env.ARK_API_URL ?? DEFAULT_API_URL;
    this.modelId = options?.modelId ?? process.env.SEEDREAM_MODEL_ID ?? DEFAULT_MODEL_ID;

    if (!this.apiKey) {
      throw new Error(
        "SeedreamProvider: ARK_API_KEY is not set. " +
          "Set it in the environment or pass apiKey in the constructor.",
      );
    }
  }

  async generateImage(params: {
    textPrompt: string;
    seed: number;
    referenceImage?: string;
    outputFormat?: "jpeg" | "png" | "webp";
    outputWidth?: number;
    outputHeight?: number;
  }): Promise<ImageGenerationResult> {
    const startMs = Date.now();
    const seed = params.seed;

    if (params.textPrompt.length > PROMPT_WARN_CHARS) {
      console.warn(
        `SeedreamProvider: prompt is ${params.textPrompt.length} chars — may exceed 300-token limit and be truncated.`,
      );
    }

    const sizeParams: { outputWidth?: number; outputHeight?: number } = {};
    if (params.outputWidth !== undefined) {
      sizeParams.outputWidth = params.outputWidth;
    }
    if (params.outputHeight !== undefined) {
      sizeParams.outputHeight = params.outputHeight;
    }

    const body: SeedreamRequest = {
      model: this.modelId,
      prompt: params.textPrompt,
      n: 1,
      size: buildSeedreamSizeParam(sizeParams),
      response_format: "b64_json",
      watermark: false,
      guidance_scale: DEFAULT_GUIDANCE_SCALE,
      seed,
      ...(params.referenceImage !== undefined ? { image: params.referenceImage } : {}),
    };

    const response = await fetch(`${this.apiUrl}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "(no body)");
      throw new Error(`SeedreamProvider: HTTP ${response.status} — ${errorText}`);
    }

    const json = (await response.json()) as SeedreamResponse;
    const item = json.data[0];

    if (!item) {
      throw new Error("SeedreamProvider: response contained no image data");
    }

    let imageBuffer: Buffer;

    if (item.b64_json) {
      imageBuffer = Buffer.from(item.b64_json, "base64");
    } else if (item.url) {
      const imgResponse = await fetch(item.url);
      if (!imgResponse.ok) {
        throw new Error(
          `SeedreamProvider: failed to download image from URL ${item.url}`,
        );
      }
      imageBuffer = Buffer.from(await imgResponse.arrayBuffer());
    } else {
      throw new Error("SeedreamProvider: response item has neither b64_json nor url");
    }

    return {
      imageBuffer,
      mimeType: "image/jpeg",
      providerId: this.providerId,
      modelId: this.modelId,
      latencyMs: Date.now() - startMs,
      seed,
      ...(item.revised_prompt
        ? { providerMetadata: { revised_prompt: item.revised_prompt } }
        : {}),
    };
  }
}
