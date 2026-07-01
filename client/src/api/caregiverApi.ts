/**
 * Caregiver API client.
 *
 * All calls require Firebase auth — the current user's ID token
 * is included as a Bearer token in the Authorization header.
 */

import { getAuth } from "firebase/auth";
import { API_BASE } from "./api";

// ============================================================================
// Configuration
// ============================================================================

// ============================================================================
// Auth Helper
// ============================================================================

async function getAuthHeaders(): Promise<Record<string, string>> {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Not authenticated. Please log in.");
  }

  const token = await user.getIdToken();

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Get auth headers for multipart/form-data (no Content-Type — browser sets it).
 */
async function getAuthHeadersForUpload(): Promise<Record<string, string>> {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Not authenticated. Please log in.");
  }

  const token = await user.getIdToken();

  return {
    Authorization: `Bearer ${token}`,
  };
}

// ============================================================================
// Types
// ============================================================================

export type Gender = "male" | "female";
export type AgeGroup = "0_3" | "3_6" | "6_9" | "9_12";
export type PhotoStatus = "none" | "uploaded" | "preview_used" | "processing" | "deleted" | "expired";
export type CharacterProfileStatus = "pending" | "generated" | "reviewed";

export interface CharacterProfile {
  hair?: string;
  eyes?: string;
  skinTone?: string;
  faceShape?: string;
  expression?: string;
  defaultClothing?: string;
}

export interface PreviewData {
  previewId: string;
  caregiverUid: string;
  templateId: string;
  childAgeGroup: AgeGroup;
  childFirstName: string;
  childGender: Gender;
  templateTitle: string;
  templateVersion: number;
  language: "ar" | "he";
  previewPageCount: number;
  pages: Array<{
    pageNumber: number;
    locationKey?: string;
    personalizedText: string;
    imagePromptUsed: string;
    generatedImagePath: string | null;
    aiMetadata: {
      providerId: string;
      modelId: string;
      generatedAt: string;
      latencyMs: number;
    } | null;
  }>;
  coverImageUrl: string | null;
  characterProfileSnapshot: unknown | null;
  generationStatus: string;
  pagesCompleted: number;
  generationStartedAt: string | null;
  generationCompletedAt: string | null;
  failureReason: string | null;
  status: string;
  expiresAt: string | null;
  purchaseId: string | null;
  personalizedStoryId: string | null;
  photoPath: string | null;
  photoStatus: PhotoStatus;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface CartItemData {
  cartItemId: string;
  caregiverUid: string;
  previewId: string;
  templateId: string;
  templateTitle: string;
  childFirstName: string;
  coverImageUrl: string | null;
  priceCents: number;
  currency: string;
  language: "ar" | "he";
  addedAt: unknown;
}

export interface StoryLibraryItem {
  storyId: string;
  templateTitle: string;
  coverImageUrl: string;
  childFirstName: string;
  childGender: Gender;
  language: "ar" | "he";
  totalPages: number;
  createdAt: unknown;
}

export type StoryGenerationStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "partially_failed"
  | "failed";

export interface PurchasedStoryItem {
  storyId: string;
  templateId: string;
  templateTitle: string;
  coverImageUrl: string | null;
  childFirstName: string;
  childGender: Gender;
  language: "ar" | "he";
  totalPages: number;
  pagesCompleted: number;
  generationStatus: StoryGenerationStatus;
  isAccessible: boolean;
  createdAt: unknown;
}

export interface PersonalizedStoryData {
  storyId: string;
  caregiverUid: string;
  purchaseId: string;
  previewId: string;
  childFirstName: string;
  childGender: Gender;
  childAgeGroup: AgeGroup;
  templateId: string;
  templateTitle: string;
  templateVersion: number;
  language: "ar" | "he";
  dedicationName: string | null;
  coverImageUrl: string;
  characterProfileSnapshot: CharacterProfile | null;
  generationStatus: string;
  totalPages: number;
  pagesCompleted: number;
  pagesFromPreview: number;
  pagesFailedIndexes: number[];
  pages: Array<{
    pageNumber: number;
    personalizedText: string;
    imagePromptUsed: string;
    generatedImagePath: string | null;
    fromPreview: boolean;
  }>;
  isAccessible: boolean;
  createdAt: unknown;
  updatedAt: unknown;
}

// ============================================================================
// Generic API Response Handler
// ============================================================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
}

export class ApiError extends Error {
  code?: string;
  status?: number;
  constructor(message: string, opts?: { code?: string; status?: number }) {
    super(message);
    this.name = "ApiError";
    this.code = opts?.code;
    this.status = opts?.status;
  }
}

export class FreePreviewAlreadyUsedError extends Error {
  constructor(public existingPreviewId?: string) {
    super("Free preview already used");
    this.name = "FreePreviewAlreadyUsedError";
  }
}

export interface PreviewQuota {
  hasUsedPreview: boolean;
  existingPreviewId: string | null;
  existingTemplateId: string | null;
  status: "claimed" | "ready" | "failed" | null;
  unlimited: boolean;
}

export interface PreviewPersonalization {
  templateId: string;
  childFirstName: string;
  childGender: Gender;
  childAgeGroup: AgeGroup;
  dedicationName: string | null;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({
      error: `Request failed with status ${res.status}`,
    }));
    throw new ApiError(
      errorData.error || errorData.details || `Request failed (${res.status})`,
      { code: errorData.code, status: res.status }
    );
  }

  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success) {
    throw new ApiError(json.error || "Request failed", { code: json.code, status: res.status });
  }

  return json.data as T;
}

// ============================================================================
// Preview API
// ============================================================================

export async function getPreviewQuota(): Promise<PreviewQuota> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/caregiver/previews/quota`, {
    headers,
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch quota: ${res.status}`);
  }
  const json = (await res.json()) as ApiResponse<PreviewQuota>;
  if (!json.success || json.data === undefined) {
    throw new ApiError(json.error || "Failed to fetch quota", { status: res.status });
  }
  return {
    ...json.data,
    existingTemplateId: json.data.existingTemplateId ?? null,
  };
}

/**
 * Initiate preview generation with photo upload.
 *
 * Endpoint:
 *   POST /api/caregiver/previews/generate
 * Content-Type: multipart/form-data
 */
export async function generatePreview(input: {
  templateId: string;
  childFirstName: string;
  childGender: Gender;
  childAgeGroup: AgeGroup;
  dedicationName?: string | null;
  photoFile: File;
  selectedIllustrationStyle?: string;
}): Promise<{ previewId: string; status: string }> {
  const headers = await getAuthHeadersForUpload();

  const formData = new FormData();
  formData.append("templateId", input.templateId);
  formData.append("childFirstName", input.childFirstName);
  formData.append("childGender", input.childGender);
  formData.append("childAgeGroup", input.childAgeGroup);
  if (input.dedicationName) {
    formData.append("dedicationName", input.dedicationName);
  }
  if (input.selectedIllustrationStyle) {
    formData.append("selectedIllustrationStyle", input.selectedIllustrationStyle);
  }
  formData.append("photo", input.photoFile);

  const res = await fetch(`${API_BASE}/api/caregiver/previews/generate`, {
    method: "POST",
    headers,
    body: formData,
  });

  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    data?: { previewId: string; status: string };
    error?: string | { code?: string; message?: string; existingPreviewId?: string };
  };

  if (res.status === 403) {
    const errObj = typeof json.error === "object" && json.error ? json.error : null;
    if (errObj?.code === "FREE_PREVIEW_ALREADY_USED") {
      throw new FreePreviewAlreadyUsedError(errObj.existingPreviewId);
    }
  }

  if (!res.ok) {
    const msg =
      typeof json.error === "object" && json.error && "message" in json.error
        ? String((json.error as { message?: string }).message)
        : typeof json.error === "string"
          ? json.error
          : `Request failed (${res.status})`;
    throw new ApiError(msg, { status: res.status });
  }

  if (!json.success || !json.data) {
    throw new ApiError("Request failed", { status: res.status });
  }

  return json.data;
}

export async function getPreviewPersonalization(previewId: string): Promise<PreviewPersonalization> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${API_BASE}/api/caregiver/previews/${encodeURIComponent(previewId)}/personalization`,
    { headers }
  );
  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    data?: PreviewPersonalization;
    error?: string | { code?: string; message?: string };
  };
  if (!res.ok) {
    const msg =
      typeof json.error === "object" && json.error && "message" in json.error
        ? String((json.error as { message?: string }).message)
        : typeof json.error === "string"
          ? json.error
          : `Failed: ${res.status}`;
    throw new ApiError(msg, {
      code:
        typeof json.error === "object" && json.error && "code" in json.error
          ? String((json.error as { code?: string }).code)
          : undefined,
      status: res.status,
    });
  }
  if (!json.success || !json.data) {
    throw new ApiError("Request failed", { status: res.status });
  }
  return json.data;
}

/**
 * Create a cart-ready preview without AI pages (after free preview already used).
 */
export async function createDirectPurchasePreview(input: {
  templateId: string;
  childFirstName: string;
  childGender: Gender;
  childAgeGroup: AgeGroup;
  photoFile: File;
  dedicationName?: string | null;
  selectedIllustrationStyle?: string;
}): Promise<{ previewId: string }> {
  const headers = await getAuthHeadersForUpload();
  const formData = new FormData();
  formData.append("templateId", input.templateId);
  formData.append("childFirstName", input.childFirstName);
  formData.append("childGender", input.childGender);
  formData.append("childAgeGroup", input.childAgeGroup);
  if (input.selectedIllustrationStyle) {
    formData.append("selectedIllustrationStyle", input.selectedIllustrationStyle);
  }
  if (input.dedicationName) {
    formData.append("dedicationName", input.dedicationName);
  }
  formData.append("photo", input.photoFile);

  const res = await fetch(`${API_BASE}/api/caregiver/previews/direct-purchase`, {
    method: "POST",
    headers,
    body: formData,
  });

  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    data?: { previewId: string };
    error?: string | { code?: string; message?: string };
  };

  if (!res.ok) {
    const msg =
      typeof json.error === "object" && json.error && "message" in json.error
        ? String((json.error as { message?: string }).message)
        : typeof json.error === "string"
          ? json.error
          : `Failed: ${res.status}`;
    throw new ApiError(msg, {
      code:
        typeof json.error === "object" && json.error && "code" in json.error
          ? String((json.error as { code?: string }).code)
          : undefined,
      status: res.status,
    });
  }
  if (!json.success || !json.data) {
    throw new ApiError("Request failed", { status: res.status });
  }
  return json.data;
}

/**
 * Re-upload a preview photo after it expires (48h retention).
 */
export async function reuploadPreviewPhoto(
  previewId: string,
  photoFile: File
): Promise<{ previewId: string; photoStatus: string }> {
  const headers = await getAuthHeadersForUpload();
  const formData = new FormData();
  formData.append("photo", photoFile);

  const res = await fetch(
    `${API_BASE}/api/caregiver/previews/${previewId}/reupload-photo`,
    {
      method: "POST",
      headers,
      body: formData,
    }
  );

  return handleResponse<{ previewId: string; photoStatus: string }>(res);
}

/**
 * Get a single preview by ID.
 */
export async function getPreview(previewId: string): Promise<PreviewData> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/caregiver/previews/${previewId}`, { headers });
  return handleResponse<PreviewData>(res);
}

/**
 * Raised when `waitForPreviewReady` observes `generationStatus === "failed"`
 * on the polled preview document.
 */
export class PreviewGenerationFailedError extends Error {
  constructor(public reason?: string | null) {
    super(reason || "Preview image generation failed.");
    this.name = "PreviewGenerationFailedError";
  }
}

/** Raised when `waitForPreviewReady` exceeds its polling deadline. */
export class PreviewGenerationTimeoutError extends Error {
  constructor() {
    super("Preview generation is taking longer than expected.");
    this.name = "PreviewGenerationTimeoutError";
  }
}

/**
 * `POST /previews/generate` kicks off image generation asynchronously on the
 * server and returns as soon as the child photo is uploaded — well before the
 * personalized illustrations exist. Polls `GET /previews/:previewId` (which
 * reflects `storyPreviews/{previewId}.generationStatus` and each page's
 * `generatedImagePath`) until generation is `"completed"` (or `"skipped"`,
 * used by the no-AI direct-purchase path) so callers never navigate the
 * caregiver to the reader while illustrations are still being generated.
 */
export async function waitForPreviewReady(
  previewId: string,
  opts?: { intervalMs?: number; timeoutMs?: number }
): Promise<PreviewData> {
  const intervalMs = opts?.intervalMs ?? 2000;
  const timeoutMs = opts?.timeoutMs ?? 120000;
  const deadline = Date.now() + timeoutMs;

  while (true) {
    let preview: PreviewData | null = null;
    try {
      preview = await getPreview(previewId);
    } catch (err) {
      // Transient network/read failure — keep polling until the deadline.
      console.warn("[waitForPreviewReady] poll failed, retrying:", err);
    }

    if (preview) {
      if (preview.generationStatus === "completed" || preview.generationStatus === "skipped") {
        return preview;
      }
      if (preview.generationStatus === "failed") {
        throw new PreviewGenerationFailedError(preview.failureReason);
      }
    }

    if (Date.now() >= deadline) {
      throw new PreviewGenerationTimeoutError();
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

// ============================================================================
// Cart API
// ============================================================================

/**
 * List all items in the caregiver's cart.
 */
export async function listCartItems(): Promise<CartItemData[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/caregiver/cart`, { headers });
  return handleResponse<CartItemData[]>(res);
}

/**
 * Add a preview to the cart.
 */
export async function addToCart(previewId: string): Promise<CartItemData> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/caregiver/cart`, {
    method: "POST",
    headers,
    body: JSON.stringify({ previewId }),
  });
  return handleResponse<CartItemData>(res);
}

/**
 * Remove an item from the cart.
 */
export async function removeFromCart(cartItemId: string): Promise<{ deleted: boolean }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/caregiver/cart/${cartItemId}`, {
    method: "DELETE",
    headers,
  });
  return handleResponse<{ deleted: boolean }>(res);
}

// ============================================================================
// Checkout API
// ============================================================================

/**
 * Initiate checkout for cart items or specific previews.
 */
export async function checkout(input: {
  cartItemIds?: string[];
  previewIds?: string[];
}): Promise<{
  checkoutUrl: string;
  sessionId: string;
  purchaseIds: string[];
}> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/caregiver/checkout`, {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
  return handleResponse<{
    checkoutUrl: string;
    sessionId: string;
    purchaseIds: string[];
  }>(res);
}

// ============================================================================
// Stories API
// ============================================================================

/**
 * Get all of the caregiver's personalized story records (any generation status).
 * Use `generationStatus` + `isAccessible` to render different UI states.
 */
export async function getPurchasedStories(): Promise<PurchasedStoryItem[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/caregiver/stories/purchased`, { headers });
  return handleResponse<PurchasedStoryItem[]>(res);
}

/**
 * Get the caregiver's library of completed personalized stories.
 */
export async function getStoryLibrary(): Promise<StoryLibraryItem[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/caregiver/stories/library`, { headers });
  return handleResponse<StoryLibraryItem[]>(res);
}

/**
 * Get a full personalized story with all pages.
 */
export async function getPersonalizedStory(storyId: string): Promise<PersonalizedStoryData> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/caregiver/stories/${storyId}`, { headers });
  return handleResponse<PersonalizedStoryData>(res);
}
