import { Box, Button, Typography } from "@mui/material";
import { COLORS } from "../theme";
import { useTranslation } from "../i18n/useTranslation";
import { useLanguage } from "../i18n/context/useLanguage";
import { useLangNavigate } from "../i18n/navigation";

export type SuggestStoryBannerProps = {
  variant?: "default" | "age" | "category" | "topic" | "empty";
  filterLabel?: string;
};

function pickKeys(variant: NonNullable<SuggestStoryBannerProps["variant"]>): {
  titleKey: string;
  subtitleKey: string;
} {
  switch (variant) {
    case "age":
      return { titleKey: "suggest.banner.age.title", subtitleKey: "suggest.banner.age.subtitle" };
    case "category":
      return {
        titleKey: "suggest.banner.category.title",
        subtitleKey: "suggest.banner.category.subtitle",
      };
    case "topic":
      return { titleKey: "suggest.banner.topic.title", subtitleKey: "suggest.banner.topic.subtitle" };
    case "empty":
      return { titleKey: "suggest.banner.empty.title", subtitleKey: "suggest.banner.empty.subtitle" };
    case "default":
    default:
      return {
        titleKey: "suggest.banner.default.title",
        subtitleKey: "suggest.banner.default.subtitle",
      };
  }
}

export default function SuggestStoryBanner({
  variant = "default",
  filterLabel,
}: SuggestStoryBannerProps) {
  const t = useTranslation();
  const { isRTL } = useLanguage();
  const navigate = useLangNavigate();

  const { titleKey, subtitleKey } = pickKeys(variant);

  return (
    <Box
      sx={{
        gridColumn: "1 / -1",
        mt: 3,
      }}
    >
      <Box
        sx={{
          width: "100%",
          border: `1px solid ${COLORS.border}`,
          borderRadius: 3,
          backgroundColor: "#F7F2EC",
          px: { xs: 2.5, sm: 3.5 },
          py: { xs: 2.5, sm: 4 },
          textAlign: "center",
        }}
      >
        <Box sx={{ maxWidth: 480, mx: "auto" }}>
          <Typography sx={{ fontSize: 22, mb: 1 }} aria-hidden>
            ✨
          </Typography>

          <Typography
            sx={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 700,
              fontSize: { xs: 20, sm: 22 },
              color: COLORS.textPrimary,
              mb: 1,
            }}
          >
            {t(titleKey)}
          </Typography>

          <Typography sx={{ color: COLORS.textSecondary, fontSize: 14, lineHeight: 1.7, mb: 2.25 }}>
            {variant === "default" || variant === "empty"
              ? t(subtitleKey)
              : t(subtitleKey, { filterLabel: filterLabel ?? "" })}
          </Typography>

          <Button
            variant="contained"
            onClick={() => navigate("/suggest")}
            sx={{
              backgroundColor: COLORS.secondary,
              color: "#fff",
              borderRadius: 2,
              px: 3,
              py: 1.1,
              textTransform: "none",
              fontWeight: 700,
              "&:hover": { backgroundColor: "#6D404D" },
            }}
          >
            {t("suggest.banner.cta")} {isRTL ? "←" : "→"}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

