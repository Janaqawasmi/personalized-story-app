import { Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import { useTranslation } from "../../i18n/useTranslation";

interface DirectPurchaseSummaryProps {
  result: {
    previewId: string;
    childName: string;
    photoPreviewUrl: string | null;
  };
  storyTitle: string;
  onAddToCart: () => void;
  onBack: () => void;
  existingPreviewId?: string | null;
  existingTemplateId?: string | null;
  onViewExistingPreview?: () => void;
}

export function DirectPurchaseSummary({
  result,
  storyTitle,
  onAddToCart,
  onBack,
  existingPreviewId = null,
  existingTemplateId = null,
  onViewExistingPreview,
}: DirectPurchaseSummaryProps) {
  const t = useTranslation();

  return (
    <Box sx={{ maxWidth: 560, mx: "auto", px: 3, py: 6 }} dir="auto">
      {existingPreviewId && existingTemplateId ? (
        <Box
          sx={{
            mb: 3,
            p: "14px 18px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, rgba(130,77,92,0.06), rgba(130,77,92,0.02))",
            border: "1px solid rgba(130,77,92,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Typography sx={{ fontSize: 13, color: "#5a4a52", lineHeight: 1.5 }}>
            ✨ {t("personalize.directPurchase.previousPreviewNotice")}
          </Typography>
          {onViewExistingPreview ? (
            <Button
              size="small"
              onClick={() => onViewExistingPreview()}
              sx={{
                textTransform: "none",
                fontSize: 12,
                fontWeight: 600,
                color: "#824D5C",
                px: 2,
                py: 0.5,
                border: "1px solid rgba(130,77,92,0.3)",
                borderRadius: "8px",
                whiteSpace: "nowrap",
                "&:hover": { background: "rgba(130,77,92,0.08)" },
              }}
            >
              {t("personalize.directPurchase.viewPreviousPreview")}
            </Button>
          ) : null}
        </Box>
      ) : null}

      <Stack spacing={3} alignItems="center">
        <Typography variant="h4" component="h1" textAlign="center">
          {t("personalize.directPurchase.title")}
        </Typography>

        <Typography variant="body1" color="text.secondary" textAlign="center">
          {t("personalize.directPurchase.subtitle")}
        </Typography>

        <Card sx={{ width: "100%" }}>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center">
              {result.photoPreviewUrl ? (
                <Box
                  component="img"
                  src={result.photoPreviewUrl}
                  alt={result.childName}
                  sx={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
              ) : null}
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  {storyTitle}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("personalize.directPurchase.personalizedFor")} {result.childName}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Button onClick={onAddToCart} variant="contained" size="large" fullWidth>
          {t("personalize.directPurchase.addToCart")}
        </Button>

        <Button onClick={onBack} variant="text" size="small">
          {t("personalize.directPurchase.back")}
        </Button>
      </Stack>
    </Box>
  );
}
