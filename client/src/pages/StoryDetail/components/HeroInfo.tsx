import { Box, Typography } from "@mui/material";
import { useTranslation } from "../../../i18n/useTranslation";
import { COLORS } from "../../../theme";
import { colorWithAlpha } from "../StoryDetail.styles";
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
          color: COLORS.textSecondary,
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
          color: COLORS.textPrimary,
          mb: 1,
        }}
      >
        {title}
      </Typography>

      {subtitle.trim() !== "" ? (
        <Typography
          sx={{
            fontSize: "17px",
            fontWeight: 600,
            lineHeight: 1.55,
            color: colorWithAlpha(COLORS.textPrimary, 0.72),
            mb: 2.75,
          }}
        >
          {subtitle}
        </Typography>
      ) : null}

      <ChipsRow ageRange={story.ageRange} topicLabel={topicLabel} />

      {description.trim() !== "" ? (
        <Typography
          sx={{
            fontSize: "15px",
            fontWeight: 400,
            lineHeight: 1.7,
            color: COLORS.textSecondary,
            mb: 2.5,
            fontFamily: language === "he" ? "'Assistant', sans-serif" : undefined,
          }}
        >
          {description}
        </Typography>
      ) : null}

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
        personalizationEnabled={story.personalizationEnabled}
        favoriteLoading={favoriteLoading}
        reducedMotion={reducedMotion}
      />
    </Box>
  );
}
