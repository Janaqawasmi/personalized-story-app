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
import FeaturesGrid from "./components/FeaturesGrid";
import HowItWorks from "./components/HowItWorks";
import PreviewGallery from "./components/PreviewGallery";
import FaqSection from "./components/FaqSection";
import RelatedStories from "./components/RelatedStories";
import StickyMobileCta from "./components/StickyMobileCta";
import { heroVariant, fadeUpVariant } from "./animations/variants";
import { getPersonalizeRoute } from "./storyDetailRoutes";
import { createFixedStoryPreview, addToCart } from "../../api/caregiverApi";
import type { PurchaseFormat, ShippingDetails } from "../../types/commerce";
import PurchaseFormatDialog from "../../components/commerce/PurchaseFormatDialog";
import { COLORS } from "../../theme";

function pickLang(rec: Record<string, string>, lang: string): string {
  return rec[lang] ?? rec.en ?? rec.he ?? rec.ar ?? "";
}

function formatStickyPriceLine(
  detail: StoryDetailVM,
  translate: (k: string, params?: Record<string, string | number>) => string,
): string {
  const d = detail.priceDigital;
  if (typeof d === "number" && Number.isFinite(d)) {
    const c = detail.currency.toUpperCase();
    const amt = c === "ILS" ? `₪${d}` : `${c} ${d}`;
    return `${amt} · ${translate("sticky.subline")}`;
  }
  return translate("pricing.comingSoon");
}

export default function StoryDetailPage() {
  const { storyId: routeStoryId } = useParams<{ storyId: string }>();
  const t = useTranslation();
  const { direction, isRTL, language } = useLanguage();
  const navigate = useLangNavigate();
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = Boolean(prefersReducedMotion);

  const { story: storyVm, loading, error } = useStoryDetail();
  const related = useRelatedStories(storyVm);

  const favoriteDraft = useMemo(
    () =>
      storyVm
        ? {
            storyId: storyVm.id,
            title: storyVm.title || null,
            coverImage: storyVm.coverUrl || null,
            category: null,
            topic: storyVm.primaryTopic ?? null,
            ageGroup: storyVm.ageRange ?? null,
          }
        : undefined,
    [storyVm],
  );

  const { isFavorite, toggle: toggleFavorite, loading: favoriteLoading } = useFavorite(storyVm?.id ?? null, favoriteDraft);

  const heroRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [stickyVisible, setStickyVisible] = useState(false);
  const [buying, setBuying] = useState(false);
  const [buyingFormat, setBuyingFormat] = useState<PurchaseFormat | null>(null);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [formatDialogOpen, setFormatDialogOpen] = useState(false);

  useEffect(() => {
    if (!routeStoryId) {
      navigate("/books");
    }
  }, [routeStoryId, navigate]);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || !storyVm) return;
    const observer = new IntersectionObserver(([entry]) => setStickyVisible(!entry.isIntersecting), { threshold: 0 });
    observer.observe(hero);
    return () => observer.disconnect();
  }, [storyVm]);

  const handlePersonalize = () => {
    if (!storyVm) return;
    if (storyVm.status === "coming_soon") {
      const subject = encodeURIComponent(`Notify me: ${storyVm.title}`);
      window.location.href = `mailto:hello@dammah.app?subject=${subject}`;
      return;
    }
    if (!storyVm.canStartPersonalization) return;
    navigate(getPersonalizeRoute(storyVm.id));
  };

  // "Buy this story" CTA — shown only for stories that do NOT support
  // personalization (see CtaRow/StickyMobileCta "State B"). Unlike
  // "Personalize", this never opens the wizard: the original story/template
  // is added directly to the cart (no child name/gender/photo needed), then
  // the user is taken straight to checkout via the cart page.
  const handleBuy = () => {
    if (!storyVm || buying) return;
    setFormatDialogOpen(true);
  };

  const handleBuyWithFormat = async (purchaseFormat: PurchaseFormat, shippingDetails?: ShippingDetails) => {
    if (!storyVm || buying) return;
    setBuying(true);
    setBuyingFormat(purchaseFormat);
    setBuyError(null);
    try {
      const { previewId } = await createFixedStoryPreview(storyVm.id);
      await addToCart(previewId, purchaseFormat, shippingDetails);
      navigate("/cart");
    } catch (err) {
      console.error("[StoryDetailPage] Failed to add story to cart:", err);
      setBuyError(t("storyDetail.buyStoryError"));
      setBuying(false);
      setBuyingFormat(null);
      setFormatDialogOpen(false);
    }
  };

  const faqRows = useMemo(() => {
    if (!storyVm) return [];
    if (storyVm.faq.length > 0) {
      return storyVm.faq.map((f) => ({
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
  }, [storyVm, language, t]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 2 }}>
        <CircularProgress sx={{ color: COLORS.primary }} />
        <Typography sx={{ fontSize: "14px", color: COLORS.textSecondary }}>{t("states.loading")}</Typography>
      </Box>
    );
  }

  if (error || !storyVm) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 2 }}>
        <Typography sx={{ fontSize: "18px", fontWeight: 600, color: COLORS.error }}>{t("states.notFound")}</Typography>
        <Button onClick={() => navigate("/books")} sx={{ color: COLORS.primary, textTransform: "none" }}>
          {t("storyDetail.backToCatalog")}
        </Button>
      </Box>
    );
  }

  const localTitle = storyVm.title;
  const localSubtitle = storyVm.subtitle;
  const localDescription = storyVm.description;
  const localTopicLabel = storyVm.topicLabel;
  const stickyPriceLine = formatStickyPriceLine(storyVm, t);

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
      <HeroCover coverUrl={storyVm.coverUrl} title={localTitle} reducedMotion={reducedMotion} />
      <HeroInfo
        story={storyVm}
        title={localTitle}
        subtitle={localSubtitle}
        description={localDescription}
        topicLabel={localTopicLabel}
        isFavorite={isFavorite}
        onFavoriteToggle={toggleFavorite}
        onPersonalize={handlePersonalize}
        onBuy={handleBuy}
        buying={buying}
        buyError={buyError}
        language={language}
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
        bgcolor: COLORS.background,
        minHeight: "100vh",
        fontFamily:
          language === "he" ? "'Assistant', 'Nunito', sans-serif" : "'Nunito', 'Segoe UI', sans-serif",
      }}
    >
      <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 }, pb: { xs: "calc(96px + env(safe-area-inset-bottom, 0px))", md: 10 } }}>
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

        <FeaturesGrid isRTL={isRTL} reducedMotion={reducedMotion} personalizationEnabled={storyVm.personalizationEnabled} />

        <HowItWorks
          reducedMotion={reducedMotion}
          personalizationEnabled={storyVm.personalizationEnabled}
        />

        {!reducedMotion ? (
          <motion.div variants={fadeUpVariant} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}>
            <Box id="story-preview-section" ref={previewRef}>
              <PreviewGallery
                spreads={storyVm.previewSpreads}
                language={language}
                onPersonalize={handlePersonalize}
                onBuy={handleBuy}
                templatePages={storyVm.templatePages}
                storyLanguage={storyVm.storyLanguage}
                personalizationEnabled={storyVm.personalizationEnabled}
                canStartPersonalization={storyVm.canStartPersonalization}
                comingSoon={storyVm.status === "coming_soon"}
              />
            </Box>
          </motion.div>
        ) : (
          <Box id="story-preview-section" ref={previewRef}>
            <PreviewGallery
              spreads={storyVm.previewSpreads}
              language={language}
              onPersonalize={handlePersonalize}
              onBuy={handleBuy}
              templatePages={storyVm.templatePages}
              storyLanguage={storyVm.storyLanguage}
              personalizationEnabled={storyVm.personalizationEnabled}
              canStartPersonalization={storyVm.canStartPersonalization}
              comingSoon={storyVm.status === "coming_soon"}
            />
          </Box>
        )}

        <FaqSection items={faqRows} reducedMotion={reducedMotion} />

        {related.length > 0 && <RelatedStories stories={related} reducedMotion={reducedMotion} />}
      </Container>

      <StickyMobileCta
        visible={stickyVisible}
        title={localTitle}
        price={stickyPriceLine}
        personalizationEnabled={storyVm.personalizationEnabled}
        canStartPersonalization={storyVm.canStartPersonalization}
        onPersonalize={handlePersonalize}
        onBuy={handleBuy}
        buying={buying}
        onPreviewClick={() => previewRef.current?.scrollIntoView({ behavior: "smooth" })}
      />

      <PurchaseFormatDialog
        open={formatDialogOpen}
        onClose={() => !buying && setFormatDialogOpen(false)}
        onSelect={handleBuyWithFormat}
        currency={storyVm.currency}
        digitalPrice={storyVm.priceDigital}
        printPrice={storyVm.pricePrint}
        printAvailable={storyVm.printAvailable}
        loadingFormat={buyingFormat}
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
        color: COLORS.primary,
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
