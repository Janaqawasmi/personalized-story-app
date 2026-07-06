// client/src/api/publicFeedback.ts
import { API_BASE } from "./api";

export interface FeaturedReview {
  rating: number | null;
  reviewText: string | null;
  featuredDisplayName: string | null;
  storyTitle: string;
}

export interface ReviewStats {
  totalReviews: number;
  avgRating: number;
}

export async function fetchFeaturedReviews(): Promise<FeaturedReview[]> {
  const res = await fetch(`${API_BASE}/api/public/featured-reviews`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Failed to load featured reviews (${res.status})`);
  }
  const body = await res.json();
  return body.data ?? [];
}

export async function fetchReviewStats(): Promise<ReviewStats> {
  const res = await fetch(`${API_BASE}/api/public/review-stats`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Failed to load review stats (${res.status})`);
  }
  const body = await res.json();
  return body.data ?? { totalReviews: 0, avgRating: 0 };
}
