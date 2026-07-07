export interface BannerLocalizedString {
  en?: string;
  he?: string;
  ar?: string;
}

export interface Banner {
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
