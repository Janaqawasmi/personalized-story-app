// server/src/providers/seedream.provider.ts
//
// Implements ImageGenerationProvider for ByteDance Seedream 3.0.
// Env vars required:
//   SEEDREAM_API_KEY  — API key for the Seedream service
//   SEEDREAM_API_URL  — Base URL (default: https://api.seeeddream.com/v2)
//
// Page-1 of a story is generated with no referenceImage (model's own style).
// Pages 2-N pass the page-1 output Buffer as referenceImage for consistency.
// A fixed numeric seed is passed on every call to make the style reproducible.

import type {
  ImageGenerationProvider,
  ImageGenerationResult,
} from "@/shared/types/aiProvider";

const DEFAULT_API_URL = "https://api.seeeddream.com/v2";

interface SeedreamGenerateRequest {
  model: string;
  prompt: string;
  n?: number;
  size?: string;
  image_format?: string;
  seed?: number;
  reference_image?: string; // base64 data URI or URL
}

interface SeedreamGenerateResponse {
  data: Array<{
    b64_json?: string;
    url?: string;
  }>;
  model: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

export class SeedreamProvider implements ImageGenerationProvider {
  readonly providerId = "seedream";
  readonly modelId: string;

  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor(options?: { apiKey?: string; apiUrl?: string; modelId?: string }) {
    this.apiKey = options?.apiKey ?? process.env.SEEDREAM_API_KEY ?? "";
    this.apiUrl = options?.apiUrl ?? process.env.SEEDREAM_API_URL ?? DEFAULT_API_URL;
    this.modelId = options?.modelId ?? "seedream-3";

    if (!this.apiKey) {
      throw new Error(
        "SeedreamProvider: SEEDREAM_API_KEY is not set. " +
          "Set it in the environment or pass apiKey in the constructor.",
      );
    }
  }

  async generateImage(params: {
    textPrompt: string;
    referenceImage?: Buffer | string;
    referenceImageMediaType?: string;
    style?: string;
    outputFormat?: "png" | "jpeg" | "webp";
    outputWidth?: number;
    outputHeight?: number;
    seed?: number;
    additionalParams?: Record<string, unknown>;
  }): Promise<ImageGenerationResult> {
    const startMs = Date.now();

    const outputFormat = params.outputFormat ?? "png";
    const width = params.outputWidth ?? 1024;
    const height = params.outputHeight ?? 1024;
    const size = `${width}x${height}`;

    const body: SeedreamGenerateRequest = {
      model: this.modelId,
      prompt: params.textPrompt,
      n: 1,
      size,
      image_format: outputFormat,
      ...(params.seed !== undefined ? { seed: params.seed } : {}),
    };

    if (params.referenceImage !== undefined) {
      body.reference_image = this.toDataUri(
        params.referenceImage,
        params.referenceImageMediaType ?? `image/${outputFormat}`,
      );
    }

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
      throw new Error(
        `SeedreamProvider: HTTP ${response.status} — ${errorText}`,
      );
    }

    const json = (await response.json()) as SeedreamGenerateResponse;
    const item = json.data[0];

    if (!item) {
      throw new Error("SeedreamProvider: response contained no image data");
    }

    let imageBuffer: Buffer;
    let mimeType: string;

    if (item.b64_json) {
      imageBuffer = Buffer.from(item.b64_json, "base64");
      mimeType = `image/${outputFormat}`;
    } else if (item.url) {
      const imgResponse = await fetch(item.url);
      if (!imgResponse.ok) {
        throw new Error(
          `SeedreamProvider: failed to download image from URL ${item.url}`,
        );
      }
      const arrayBuffer = await imgResponse.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
      mimeType =
        imgResponse.headers.get("content-type") ?? `image/${outputFormat}`;
    } else {
      throw new Error(
        "SeedreamProvider: response item has neither b64_json nor url",
      );
    }

    return {
      imageBuffer,
      mimeType,
      providerId: this.providerId,
      modelId: this.modelId,
      latencyMs: Date.now() - startMs,
    };
  }

  private toDataUri(image: Buffer | string, mimeType: string): string {
    if (typeof image === "string") {
      // Already a data URI or URL — pass through
      return image;
    }
    return `data:${mimeType};base64,${image.toString("base64")}`;
  }
}
