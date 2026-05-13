import { randomUUID } from "crypto";
import type { FinalPromptArtefact, ImageArtefact } from "@/illustration/types";
import { requireImageProvider } from "@/services/preview.service";
import { uploadImageToStorage } from "./storage";

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function isRetryableProviderError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const m = err.message;
  if (/HTTP 5\d\d/.test(m)) return true;
  if (/timeout|ETIMEDOUT|ECONNRESET|fetch failed/i.test(m)) return true;
  return false;
}

export async function runImageGeneration(input: {
  storyId: string;
  finalPrompt: FinalPromptArtefact;
  imageVersion: number;
}): Promise<ImageArtefact> {
  const { storyId, finalPrompt, imageVersion } = input;
  const seed = Math.floor(Math.random() * 2 ** 31);
  const provider = requireImageProvider();

  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const result = await provider.generateImage({
        textPrompt: finalPrompt.finalPromptString,
        seed,
        outputWidth: 1024,
        outputHeight: 1024,
      });

      const upload = await uploadImageToStorage({
        storyId,
        pageNumber: finalPrompt.pageNumber,
        version: imageVersion,
        buffer: result.imageBuffer,
        mimeType: result.mimeType,
      });

      const artefact: ImageArtefact = {
        id: randomUUID(),
        storyId,
        pageNumber: finalPrompt.pageNumber,
        version: imageVersion,
        createdAt: Date.now(),
        parentFinalPromptId: finalPrompt.id,
        providerId: result.providerId,
        modelId: result.modelId,
        modelParams: {
          seed: result.seed,
          outputWidth: 1024,
          outputHeight: 1024,
        },
        latencyMs: result.latencyMs,
        storagePath: upload.storagePath,
        publicUrl: upload.publicUrl,
        mimeType: upload.mimeType,
        bytes: upload.bytes,
        reviewStatus: "awaiting_review",
        approvedAt: null,
        rejectionNote: null,
        safetyFlags: [],
      };
      return artefact;
    } catch (err) {
      lastErr = err;
      if (attempt < 2 && isRetryableProviderError(err)) {
        await delay(attempt === 0 ? 1000 : 4000);
        continue;
      }
      throw err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
