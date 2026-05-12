/**
 * Character avatar generation for the pilot pipeline.
 *
 * One avatar is generated per story (text-to-image, plain background) and
 * reused as the reference image for every page generation across both variants
 * C and D. Sharing the avatar between variants is required for a valid C-vs-D
 * comparison — otherwise we'd be changing two variables at once.
 *
 * Mirrors the character-portrait portion of
 * server/experiments/src/avatar-generator.ts. Environment-reference helpers
 * are not ported because the pilot pipeline locks environments via verbose
 * text (scene-director-avatar-only style), not via reference images.
 */

import { admin } from "@/config/firebase";
import { SeedreamProvider } from "@/providers/seedream.provider";
import type { StyleBible } from "./style-bible.types";

const STORAGE_BUCKET_PREFIX = "specialist-illustrations/pilot";
const SEEDREAM_MODEL = process.env.SEEDREAM_MODEL_ID ?? "seedream-4-0-250828";

async function uploadToStorage(
  buffer: Buffer,
  storagePath: string,
  mimeType: string,
): Promise<string> {
  const bucket = admin.storage().bucket();
  if (!bucket.name) {
    throw new Error(
      "[pilot/avatar-generator] Firebase Storage bucket is not configured. " +
        "Set FIREBASE_STORAGE_BUCKET in server/.env or ensure the service account project_id is set.",
    );
  }
  const file = bucket.file(storagePath);
  await file.save(buffer, { metadata: { contentType: mimeType } });
  await file.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
}

/**
 * Generates a single full-body character portrait (no scene) from the
 * StyleBible's characterAnchor. Uploads to Firebase Storage and returns the
 * public URL. The returned URL is what gets passed as `referenceImage` to
 * Seedream on every page generation for this story.
 *
 * @param bible    The locked Style Bible — only characterAnchor +
 *                 consistencyAnchors + avoidList are used here.
 * @param seed     Numeric seed for reproducibility.
 * @param storyId  Used to scope the storage path.
 */
export async function generatePilotAvatar(
  bible: StyleBible,
  seed: number,
  storyId: string,
): Promise<{ url: string; prompt: string; seed: number }> {
  const provider = new SeedreamProvider();

  const anchors = bible.consistencyAnchors.slice(0, 2).join(", ");
  const avoid = `Avoid: ${bible.avoidList.slice(0, 3).join("; ")}.`;

  const prompt = [
    "No text, no letters, no words, no captions, no labels, no speech bubbles. Wordless illustration.",
    anchors + ".",
    `Full-body children's book character portrait. ${bible.characterAnchor}`,
    "Standing upright, facing viewer, arms relaxed at sides, neutral expression.",
    "Plain pale cream background wash. No other characters. No furniture, no setting elements.",
    avoid,
    "Children's book character reference illustration.",
  ].join(" ");

  if (prompt.length > 1200) {
    console.warn(
      `[pilot/avatar-generator] avatar prompt is ${prompt.length} chars — may be truncated.`,
    );
  }

  console.log(
    `[pilot/avatar-generator] generating avatar for story=${storyId} (seed ${seed}, model ${SEEDREAM_MODEL})`,
  );

  const result = await provider.generateImage({
    textPrompt: prompt,
    outputWidth: 1024,
    outputHeight: 1024,
    seed,
  });

  const ext = (result.mimeType.split("/")[1] ?? "jpeg").replace("jpeg", "jpg");
  const storagePath = `${STORAGE_BUCKET_PREFIX}/${storyId}/avatar.${ext}`;
  const url = await uploadToStorage(result.imageBuffer, storagePath, result.mimeType);
  console.log(`[pilot/avatar-generator] avatar uploaded → ${url}`);

  return { url, prompt, seed };
}
