import { API_BASE, getAuthHeaders, getAuthHeadersForUpload } from "./api";

export interface BannerLocalizedString {
  en?: string;
  he?: string;
  ar?: string;
}

export interface AdminBanner {
  id: string;
  imageUrl: string;
  title: BannerLocalizedString;
  description: BannerLocalizedString;
  buttonText: BannerLocalizedString;
  buttonLink: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface BannerFormInput {
  image?: File | null;
  title: BannerLocalizedString;
  description: BannerLocalizedString;
  buttonText: BannerLocalizedString;
  buttonLink: string;
  isActive: boolean;
  sortOrder: number;
}

async function handleAdminResponse<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    data?: T;
    error?: { message?: string } | string;
  };

  if (!res.ok || !data.success) {
    const message =
      (typeof data.error === "object" && data.error?.message) ||
      (typeof data.error === "string" && data.error) ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data.data as T;
}

function buildFormData(input: BannerFormInput): FormData {
  const formData = new FormData();
  if (input.image) formData.append("image", input.image);
  for (const lang of ["en", "he", "ar"] as const) {
    const cap = lang.charAt(0).toUpperCase() + lang.slice(1);
    if (input.title[lang]) formData.append(`title${cap}`, input.title[lang]!);
    if (input.description[lang]) formData.append(`description${cap}`, input.description[lang]!);
    if (input.buttonText[lang]) formData.append(`buttonText${cap}`, input.buttonText[lang]!);
  }
  formData.append("buttonLink", input.buttonLink);
  formData.append("isActive", String(input.isActive));
  formData.append("sortOrder", String(input.sortOrder));
  return formData;
}

export async function listAdminBanners(): Promise<AdminBanner[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/admin/banners`, { headers });
  return handleAdminResponse<AdminBanner[]>(res);
}

export async function createAdminBanner(input: BannerFormInput): Promise<{ id: string }> {
  const headers = await getAuthHeadersForUpload();
  const res = await fetch(`${API_BASE}/api/admin/banners`, {
    method: "POST",
    headers,
    body: buildFormData(input),
  });
  return handleAdminResponse<{ id: string }>(res);
}

export async function updateAdminBanner(
  id: string,
  input: BannerFormInput,
): Promise<{ id: string }> {
  const headers = await getAuthHeadersForUpload();
  const res = await fetch(`${API_BASE}/api/admin/banners/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers,
    body: buildFormData(input),
  });
  return handleAdminResponse<{ id: string }>(res);
}

export async function deleteAdminBanner(id: string): Promise<{ id: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/admin/banners/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers,
  });
  return handleAdminResponse<{ id: string }>(res);
}
