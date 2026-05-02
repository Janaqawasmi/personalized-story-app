// Generates character avatar images and environment reference images for the
// avatar-series experiments (exp-08a/b/c).
//
// Uploads each reference image to Firebase Storage under an experiments/ prefix
// so it has a stable public URL that Seedream can fetch as referenceImage.
// This file does NOT touch Firestore.

import "./bootstrap";
import { admin } from "@/config/firebase";
import { SeedreamProvider } from "@/providers/seedream.provider";
import type { StyleBible, EnvironmentEntry } from "./style-bible.types";

const STORAGE_BUCKET_PREFIX = "experiments/references";
const SEEDREAM_MODEL = process.env.SEEDREAM_MODEL_ID ?? "seedream-4-0-250828";

// ---------------------------------------------------------------------------
// Internal: Firebase Storage upload
// ---------------------------------------------------------------------------

async function uploadToStorage(
  buffer: Buffer,
  storagePath: string,
  mimeType: string,
): Promise<string> {
  const bucket = admin.storage().bucket();
  if (!bucket.name) {
    throw new Error(
      "avatar-generator: Firebase Storage bucket is not configured. " +
        "Set FIREBASE_STORAGE_BUCKET in server/.env or ensure the service account project_id is set.",
    );
  }
  const file = bucket.file(storagePath);
  await file.save(buffer, { metadata: { contentType: mimeType } });
  await file.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
}

// ---------------------------------------------------------------------------
// Character avatar generation
// ---------------------------------------------------------------------------

/**
 * Generates `count` full-body character portrait images (no background scene).
 * Each variation uses baseSeed + i so portraits are similar but not identical.
 * Uploads each to Firebase Storage and returns the public URLs.
 *
 * Variation 0 is the canonical avatar; the rest are alternatives for scoring.
 */
export async function generateCharacterAvatars(
  bible: StyleBible,
  baseSeed: number,
  expId: string,
  count = 3,
): Promise<string[]> {
  const provider = new SeedreamProvider();

  // Top 2 consistency anchors lock the style. Portrait has no scene so setting
  // and composition anchors are replaced by an explicit portrait directive.
  const anchors = bible.consistencyAnchors.slice(0, 2).join(", ");
  const avoid = `Avoid: ${bible.avoidList.slice(0, 3).join("; ")}.`;

  // Prompt ordering: no-text first (highest token weight), then style lock,
  // then character description, then portrait constraints.
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
      `[avatar-generator] avatar prompt is ${prompt.length} chars — may be truncated by Seedream.`,
    );
  }

  const urls: string[] = [];

  for (let i = 0; i < count; i++) {
    const seed = baseSeed + i;
    console.log(`[avatar-generator] generating avatar-${i} (seed ${seed}, model ${SEEDREAM_MODEL})…`);

    const result = await provider.generateImage({
      textPrompt: prompt,
      outputWidth: 1024,
      outputHeight: 1024,
      seed,
    });

    const ext = (result.mimeType.split("/")[1] ?? "jpeg").replace("jpeg", "jpg");
    const storagePath = `${STORAGE_BUCKET_PREFIX}/${expId}/avatar-${i}.${ext}`;
    const url = await uploadToStorage(result.imageBuffer, storagePath, result.mimeType);
    urls.push(url);
    console.log(`[avatar-generator] avatar-${i} uploaded → ${url}`);
  }

  return urls;
}

// ---------------------------------------------------------------------------
// Environment reference image generation
// ---------------------------------------------------------------------------

/**
 * Generates a single environment reference image for the given registry key.
 * No characters appear — only the empty setting.
 * Uploads to Firebase Storage and returns the public URL.
 */
export async function generateEnvironmentImage(
  envKey: string,
  env: EnvironmentEntry,
  bible: StyleBible,
  seed: number,
  expId: string,
): Promise<string> {
  const provider = new SeedreamProvider();

  const anchors = bible.consistencyAnchors.slice(0, 2).join(", ");
  // Skip the first avoid item (text suppression already at top) — use items 2 & 3.
  const avoid = `Avoid: ${bible.avoidList.slice(1, 3).join("; ")}.`;

  const prompt = [
    "No text, no letters, no words, no captions, no labels. Wordless illustration.",
    anchors + ".",
    `Empty interior space, no people, no characters. ${env.atmosphere}`,
    `Room layout: ${env.spatialLayout}`,
    avoid,
    "Children's book establishing shot. Full environment view. No figures.",
  ].join(" ");

  if (prompt.length > 1200) {
    console.warn(
      `[avatar-generator] environment prompt for '${envKey}' is ${prompt.length} chars — may be truncated.`,
    );
  }

  console.log(`[avatar-generator] generating environment '${envKey}' (seed ${seed}, model ${SEEDREAM_MODEL})…`);

  const result = await provider.generateImage({
    textPrompt: prompt,
    outputWidth: 1024,
    outputHeight: 1024,
    seed,
  });

  const ext = (result.mimeType.split("/")[1] ?? "jpeg").replace("jpeg", "jpg");
  const storagePath = `${STORAGE_BUCKET_PREFIX}/${expId}/env-${envKey}.${ext}`;
  const url = await uploadToStorage(result.imageBuffer, storagePath, result.mimeType);
  console.log(`[avatar-generator] env-${envKey} uploaded → ${url}`);
  return url;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * Extracts the environment registry key from a structured scene setting field.
 * The setting field format is: "<registry key> | <light state> | <props…>"
 */
export function parseEnvKeyFromSetting(setting: string): string {
  return setting.split("|")[0]!.trim();
}
