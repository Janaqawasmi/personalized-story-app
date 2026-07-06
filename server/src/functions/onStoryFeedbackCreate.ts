import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { firestore } from "../config/firebase";
import { COLLECTIONS } from "../shared/firestore/paths";

interface FeedbackStats {
  ratingSum: number;
  totalRatings: number;
  avgRating: number;
  deltaSum: number;
  totalDeltaSamples: number;
  avgEmotionalDelta: number;
}

interface PlatformReviewSummary {
  ratingSum: number;
  totalRatings: number;
  avgRating: number;
}

/**
 * Fires on every new storyFeedback doc. In one transaction:
 *   1. Aggregates rating + emotional-shift data onto the source
 *      story_templates doc as feedbackStats, so the future "most popular"
 *      (ratings volume) and "most effective" (avg emotional delta) catalog
 *      sorts have a precomputed field to sort on instead of scanning
 *      storyFeedback per request.
 *   2. Rolls the rating into the platform-wide platformStats/reviewSummary
 *      doc, which backs GET /api/public/review-stats (the homepage stat
 *      banner) — computed here once, not summed client-side per request.
 */
export const onStoryFeedbackCreate = onDocumentCreated(
  `${COLLECTIONS.STORY_FEEDBACK}/{feedbackId}`,
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    const storyTemplateId = data.storyTemplateId as string | undefined;
    const rating = data.rating as number | undefined;
    const emotionalShift = data.emotionalShift as { before: number; after: number } | null | undefined;

    if (!storyTemplateId || !Number.isInteger(rating)) {
      logger.warn(
        `[onStoryFeedbackCreate] ${event.params.feedbackId} missing storyTemplateId/rating — skipping aggregation`,
      );
      return;
    }

    const templateRef = firestore.collection(COLLECTIONS.STORY_TEMPLATES).doc(storyTemplateId);
    const platformStatsRef = firestore.collection(COLLECTIONS.PLATFORM_STATS).doc("reviewSummary");

    await firestore.runTransaction(async (tx) => {
      // Firestore transactions require all reads before any writes.
      const [templateSnap, platformStatsSnap] = await Promise.all([
        tx.get(templateRef),
        tx.get(platformStatsRef),
      ]);

      const existing = (templateSnap.data()?.feedbackStats ?? {}) as Partial<FeedbackStats>;

      const ratingSum = (existing.ratingSum ?? 0) + rating!;
      const totalRatings = (existing.totalRatings ?? 0) + 1;
      const avgRating = ratingSum / totalRatings;

      let deltaSum = existing.deltaSum ?? 0;
      let totalDeltaSamples = existing.totalDeltaSamples ?? 0;
      if (
        emotionalShift &&
        Number.isFinite(emotionalShift.before) &&
        Number.isFinite(emotionalShift.after)
      ) {
        deltaSum += emotionalShift.after - emotionalShift.before;
        totalDeltaSamples += 1;
      }
      const avgEmotionalDelta = totalDeltaSamples > 0 ? deltaSum / totalDeltaSamples : 0;

      const feedbackStats: FeedbackStats = {
        ratingSum,
        totalRatings,
        avgRating,
        deltaSum,
        totalDeltaSamples,
        avgEmotionalDelta,
      };

      const existingPlatformStats = (platformStatsSnap.data() ?? {}) as Partial<PlatformReviewSummary>;
      const platformRatingSum = (existingPlatformStats.ratingSum ?? 0) + rating!;
      const platformTotalRatings = (existingPlatformStats.totalRatings ?? 0) + 1;
      const platformReviewSummary: PlatformReviewSummary = {
        ratingSum: platformRatingSum,
        totalRatings: platformTotalRatings,
        avgRating: platformRatingSum / platformTotalRatings,
      };

      tx.set(templateRef, { feedbackStats }, { merge: true });
      tx.set(platformStatsRef, platformReviewSummary, { merge: true });
    });

    logger.info(
      `[onStoryFeedbackCreate] updated feedbackStats for story_templates/${storyTemplateId} ` +
        `and platformStats/reviewSummary (feedbackId=${event.params.feedbackId})`,
    );
  },
);
