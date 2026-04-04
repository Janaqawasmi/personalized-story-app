import React, { useRef, useState, useEffect, useMemo } from "react";
import { Container, Box, CircularProgress, Typography, Button } from "@mui/material";
import { motion, useReducedMotion } from "framer-motion";
import { useParams } from "react-router-dom";
import { useLangNavigate } from "../../i18n/navigation";
import { useTranslation } from "../../i18n/useTranslation";
import { useLanguage } from "../../i18n/context/useLanguage";
import { useFavorite } from "../../hooks/useFavorite";
import { useStoryDetail } from "./hooks/useStoryDetail";
import { useRelatedStories } from "./hooks/useRelatedStories";
import type { StoryDetailVM } from "./types/story";
import HeroCover from "./components/HeroCover";
import HeroInfo from "./components/HeroInfo";
import PreviewGallery from "./components/PreviewGallery";
import FaqSection from "./components/FaqSection";
import RelatedStories from "./components/RelatedStories";
import StickyMobileCta from "./components/StickyMobileCta";
import { heroVariant, fadeUpVariant } from "./animations/variants";

function pickLang(rec: Record<string, string>, lang: string): string {
  return rec[lang] ?? rec.en ?? rec.he ?? rec.ar ?? "";
}

function formatStickyPriceLine(
  story: StoryDetailVM,
  t: (k: string, params?: Record<string, string | number>) => string,
): string {
  const d = story.priceDigital;
  if (typeof d === "number" && Number.isFinite(d)) {
    const c = story.currency.toUpperCase();
    const amt = c === "ILS" ? `₪${d}` : `${c} ${d}`;
    return `${amt} · ${t("sticky.subline")}`;
  }
  return t("pricing.comingSoon");
}

export default function StoryDetailPage() {
  const { storyId: routeStoryId } = useParams<{ storyId: string }>();
  const t = useTranslation();
  const { direction, isRTL, language } = useLanguage();
  const navigate = useLangNavigate();
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = Boolean(prefersReducedMotion);

  const { story, loading, error } = useStoryDetail();
  const related = useRelatedStories(story);

  const favoriteDraft = useMemo(
    () =>
      story
        ? {
            storyId: story.id,
            title: pickLang(story.title, language) || null,
            coverImage: story.coverUrl || null,
            category: null,
            topic: story.primaryTopic ?? null,
            ageGroup: story.ageRange ?? null,
          }
        : undefined,
    [story, language],
  );

  const { isFavorite, toggle: toggleFavorite, loading: favoriteLoading } = useFavorite(story?.id ?? null, favoriteDraft);

  const heroRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [stickyVisible, setStickyVisible] = useState(false);

  useEffect(() => {
    if (!routeStoryId) {
      navigate("/books");
    }
  }, [routeStoryId, navigate]);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || !story) return;
    const observer = new IntersectionObserver(([entry]) => setStickyVisible(!entry.isIntersecting), { threshold: 0 });
    observer.observe(hero);
    return () => observer.disconnect();
  }, [story]);

  const handlePersonalize = () => {
    if (!story) return;
    if (story.status === "coming_soon") {
      const subject = encodeURIComponent(`Notify me: ${pickLang(story.title, language)}`);
      window.location.href = `mailto:hello@dammah.app?subject=${subject}`;
      return;
    }
    navigate(`/stories/${story.id}/personalize`);
  };

  const faqRows = useMemo(() => {
    if (!story) return [];
    if (story.faq.length > 0) {
      return story.faq.map((f) => ({
        question: pickLang(f.question, language),
        answer: pickLang(f.answer, language),
      }));
    }
    return [
      { question: t("faq.q1"), answer: t("faq.a1") },
      { question: t("faq.q2"), answer: t("faq.a2") },
      { question: t("faq.q3"), answer: t("faq.a3") },
      { question: t("faq.q4"), answer: t("faq.a4") },
    ];
  }, [story, language, t]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 2 }}>
        <CircularProgress sx={{ color: "#7F77DD" }} />
        <Typography sx={{ fontSize: "14px", color: "#888" }}>{t("states.loading")}</Typography>
      </Box>
    );
  }

  if (error || !story) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 2 }}>
        <Typography sx={{ fontSize: "18px", fontWeight: 600 }}>{t("states.notFound")}</Typography>
        <Button onClick={() => navigate("/books")} sx={{ color: "#534AB7", textTransform: "none" }}>
          {t("storyDetail.backToCatalog")}
        </Button>
      </Box>
    );
  }

  const localTitle = pickLang(story.title, language);
  const localSubtitle = pickLang(story.subtitle, language);
  const localDescription = pickLang(story.description, language);
  const localTopicLabel = pickLang(story.topicLabel, language);

  const heroGrid = (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr 1.1fr" },
        gap: { xs: 3, md: "40px" },
        alignItems: "start",
        mb: 5,
      }}
    >
      <HeroCover coverUrl={story.coverUrl} title={localTitle} reducedMotion={reducedMotion} />
      <HeroInfo
        story={story}
        title={localTitle}
        subtitle={localSubtitle}
        description={localDescription}
        topicLabel={localTopicLabel}
        isFavorite={isFavorite}
        onFavoriteToggle={toggleFavorite}
        onPersonalize={handlePersonalize}
        language={language}
        isRTL={isRTL}
        reducedMotion={reducedMotion}
        favoriteLoading={favoriteLoading}
      />
    </Box>
  );

  return (
    <Box
      dir={direction}
      lang={language}
      sx={{
        bgcolor: "#f4f2ef",
        minHeight: "100vh",
        fontFamily:
          language === "he" ? "'Assistant', 'Nunito', sans-serif" : "'Nunito', 'Segoe UI', sans-serif",
      }}
    >
      <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 }, pb: { xs: 12, md: 10 } }}>
        <BackNav onBack={() => navigate("/books")} isRTL={isRTL} label={t("storyDetail.backToCatalog")} />

        <Box ref={heroRef}>
          {!reducedMotion ? (
            <motion.div variants={heroVariant} initial="hidden" animate="visible">
              {heroGrid}
            </motion.div>
          ) : (
            heroGrid
          )}
        </Box>

        {!reducedMotion ? (
          <motion.div variants={fadeUpVariant} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}>
            <PreviewGallery
              ref={previewRef}
              spreads={story.previewSpreads}
              language={language}
              onPersonalize={handlePersonalize}
              templatePages={story.templatePages}
              storyLanguage={story.storyLanguage}
              childPlaceholder={t("storyDetail.previewPlaceholderChildName")}
            />
          </motion.div>
        ) : (
          <PreviewGallery
            ref={previewRef}
            spreads={story.previewSpreads}
            language={language}
            onPersonalize={handlePersonalize}
            templatePages={story.templatePages}
            storyLanguage={story.storyLanguage}
            childPlaceholder={t("storyDetail.previewPlaceholderChildName")}
          />
        )}

        <FaqSection items={faqRows} reducedMotion={reducedMotion} />

        {related.length > 0 && <RelatedStories stories={related} reducedMotion={reducedMotion} />}
      </Container>

      <StickyMobileCta
        visible={stickyVisible}
        title={localTitle}
        price={formatStickyPriceLine(story, t)}
        onPersonalize={handlePersonalize}
        onPreviewClick={() => previewRef.current?.scrollIntoView({ behavior: "smooth" })}
      />
    </Box>
  );
}

function BackNav({ onBack, isRTL, label }: { onBack: () => void; isRTL: boolean; label: string }) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onBack}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        pb: 3,
        pt: 1,
        fontSize: "14px",
        fontWeight: 600,
        color: "#534AB7",
        background: "none",
        border: "none",
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      <Box
        component="svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        sx={{ transform: isRTL ? "scaleX(-1)" : "none" }}
      >
        <polyline points="15 18 9 12 15 6" />
      </Box>
      {label}
    </Box>
  );
}
