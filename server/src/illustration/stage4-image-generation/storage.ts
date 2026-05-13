import { admin } from "@/config/firebase";
import { STORAGE_PATHS } from "@/shared/firestore/paths";

export interface UploadImageResult {
  storagePath: string;
  publicUrl: string;
  bytes: number;
  mimeType: string;
}

/**
 * Writes bytes to Firebase Storage and makes the object world-readable
 * (storage.rules must allow public read for `specialist-illustrations/**`).
 */
export async function uploadImageToStorage(params: {
  storyId: string;
  pageNumber: number;
  version: number;
  buffer: Buffer;
  mimeType: string;
}): Promise<UploadImageResult> {
  const ext = params.mimeType.split("/")[1] ?? "jpg";
  const storagePath = STORAGE_PATHS.specialistIllustrationV2(
    params.storyId,
    params.pageNumber,
    params.version,
    ext,
  );
  const bucket = admin.storage().bucket();
  const file = bucket.file(storagePath);
  await file.save(params.buffer, {
    metadata: { contentType: params.mimeType },
  });
  await file.makePublic();
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
  return {
    storagePath,
    publicUrl,
    bytes: params.buffer.length,
    mimeType: params.mimeType,
  };
}
