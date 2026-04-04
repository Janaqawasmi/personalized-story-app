import { Box, Typography } from "@mui/material";
import { useTranslation } from "../../../i18n/useTranslation";
import type { StoryDetailVM } from "../types/story";
import ChipsRow from "./ChipsRow";
import FeaturesGrid from "./FeaturesGrid";
import PricingCard from "./PricingCard";
import CtaRow from "./CtaRow";

interface HeroInfoProps {
  story: StoryDetailVM;
  title: string;
  subtitle: string;
  description: string;
  topicLabel: string;
  isFavorite: boolean;
  onFavoriteToggle: () => void;
  onPersonalize: () => void;
  language: string;
  isRTL: boolean;
  reducedMotion: boolean;
  favoriteLoading: boolean;
}

export default function HeroInfo({
  story,
  title,
  subtitle,
  description,
  topicLabel,
  isFavorite,
  onFavoriteToggle,
  onPersonalize,
  language,
  isRTL,
  reducedMotion,
  favoriteLoading,
}: HeroInfoProps) {
  const t = useTranslation();
  const titleFontFamily =
    language === "he" ? "'Assistant', sans-serif" : "'Playfair Display', Georgia, serif";

  return (
    <Box>
      <Typography
        sx={{
          fontSize: "13px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "1.2px",
          color: "#888",
          mb: 1.25,
        }}
      >
        {t("storyDetail.breadcrumb")}
      </Typography>

      <Typography
        component="h1"
        sx={{
          fontFamily: titleFontFamily,
          fontSize: "32px",
          fontWeight: 700,
          lineHeight: 1.2,
          color: "#1a1a2e",
          mb: 1,
        }}
      >
        {title}
      </Typography>

      <Typography sx={{ fontSize: "16px", fontWeight: 400, lineHeight: 1.5, color: "#555", mb: 2 }}>
        {subtitle}
      </Typography>

      <ChipsRow ageRange={story.ageRange} topicLabel={topicLabel} />

      <Typography
        sx={{
          fontSize: "15px",
          fontWeight: 400,
          lineHeight: 1.7,
          color: "#444",
          mb: 2.5,
          fontFamily: language === "he" ? "'Assistant', sans-serif" : undefined,
        }}
      >
        {description}
      </Typography>

      <FeaturesGrid isRTL={isRTL} reducedMotion={reducedMotion} />

      <PricingCard
        priceDigital={story.priceDigital}
        pricePrint={story.pricePrint}
        currency={story.currency}
        printAvailable={story.printAvailable}
        status={story.status}
      />

      <CtaRow
        onPersonalize={onPersonalize}
        onFavoriteToggle={onFavoriteToggle}
        isFavorite={isFavorite}
        status={story.status}
        favoriteLoading={favoriteLoading}
        reducedMotion={reducedMotion}
      />
    </Box>
  );
}
