import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "../../i18n/useTranslation";
import SectionHeader from "./SectionHeader";
import {
  fetchFeaturedReviews,
  fetchReviewStats,
  type FeaturedReview,
  type ReviewStats,
} from "../../api/publicFeedback";

const AVATAR_COLORS = ["#824D5C", "#617891", "#9C8576"];

function starString(rating: number | null): string {
  const filled = Math.max(0, Math.min(5, rating ?? 0));
  return "★".repeat(filled) + "☆".repeat(5 - filled);
}

export default function TestimonialsSection() {
  const t = useTranslation();
  const [reviews, setReviews] = useState<FeaturedReview[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchFeaturedReviews(), fetchReviewStats()])
      .then(([reviewRows, statRow]) => {
        if (cancelled) return;
        setReviews(reviewRows);
        setStats(statRow);
      })
      .catch((err) => {
        console.error("[TestimonialsSection] failed to load reviews:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Box component="section" sx={{ py: 12, px: { xs: 4, md: 8 }, background: "#E5DFD9" }}>
      <Box sx={{ maxWidth: "1200px", mx: "auto" }}>
        <Box sx={{ textAlign: "center", mb: stats && stats.totalReviews > 0 ? 2 : 6 }}>
          <SectionHeader
            label={t("home.testimonials.label")}
            title={t("home.testimonials.title")}
            align="center"
          />
        </Box>

        {stats && stats.totalReviews > 0 && (
          <Typography sx={{ textAlign: "center", fontSize: "15px", color: "text.secondary", mb: 6 }}>
            {t("home.testimonials.statBanner", {
              avg: stats.avgRating.toFixed(1),
              count: stats.totalReviews,
            })}
          </Typography>
        )}

        {loading ? null : reviews.length === 0 ? (
          <Typography sx={{ textAlign: "center", fontSize: "14px", color: "text.secondary" }}>
            {t("home.testimonials.empty")}
          </Typography>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(3,1fr)" },
              gap: 2.5,
            }}
          >
            {reviews.map((review, i) => {
              const displayName = review.featuredDisplayName?.trim() || "";
              const initial = displayName ? displayName[0]!.toUpperCase() : "★";
              const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
              return (
                <Box
                  key={i}
                  sx={{
                    background: "#fff",
                    borderRadius: "20px",
                    p: "28px",
                    border: "1.5px solid #D0C8C0",
                    transition: "all 0.25s",
                    "&:hover": {
                      transform: "translateY(-3px)",
                      boxShadow: "0 12px 32px rgba(0,0,0,0.08)",
                    },
                  }}
                >
                  <Typography sx={{ color: "#F9CB42", fontSize: "14px", mb: 1.75 }} aria-hidden>
                    {starString(review.rating)}
                  </Typography>
                  {review.reviewText ? (
                    <Typography sx={{ fontSize: "14px", color: "text.primary", lineHeight: 1.65, mb: 2.5, fontStyle: "italic" }}>
                      &ldquo;{review.reviewText}&rdquo;
                    </Typography>
                  ) : null}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.25,
                      pt: 2,
                      borderTop: "1px solid #D0C8C0",
                    }}
                  >
                    <Box
                      sx={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        background: color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "#fff",
                        flexShrink: 0,
                      }}
                    >
                      {initial}
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: "13px", fontWeight: 700 }}>
                        {displayName || t("home.testimonials.anonymous")}
                      </Typography>
                      <Typography sx={{ fontSize: "12px", color: "text.secondary" }}>
                        {review.storyTitle}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
}
