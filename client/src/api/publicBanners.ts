import { API_BASE } from "./api";

export interface PublicBannerLocalizedString {
  en?: string;
  he?: string;
  ar?: string;
}

export interface PublicBanner {
  id: string;
  imageUrl: string;
  title: PublicBannerLocalizedString;
  description: PublicBannerLocalizedString;
  buttonText: PublicBannerLocalizedString;
  buttonLink: string;
}

export async function fetchBanners(): Promise<PublicBanner[]> {
  const res = await fetch(`${API_BASE}/api/public/banners`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Failed to load banners (${res.status})`);
  }
  const body = await res.json();
  return body.data ?? [];
}
