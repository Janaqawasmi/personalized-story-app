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
}

export function DirectPurchaseSummary({
  result,
  storyTitle,
  onAddToCart,
  onBack,
}: DirectPurchaseSummaryProps) {
  const t = useTranslation();

  return (
    <Box sx={{ maxWidth: 560, mx: "auto", px: 3, py: 6 }} dir="auto">
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
