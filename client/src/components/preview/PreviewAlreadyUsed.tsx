import { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { useLangNavigate } from "../../i18n/navigation";
import { useTranslation } from "../../i18n/useTranslation";
import { getPreviewPersonalization } from "../../api/caregiverApi";
import { getStoryPersonalizationStorageKey } from "../../utils/storyPersonalization";

interface PreviewAlreadyUsedProps {
  existingPreviewId: string | null;
  existingTemplateId: string | null;
  currentStoryId: string;
  onContinueWithoutPreview: () => void;
}

export function PreviewAlreadyUsed({
  existingPreviewId,
  existingTemplateId,
  currentStoryId,
  onContinueWithoutPreview,
}: PreviewAlreadyUsedProps) {
  const navigate = useLangNavigate();
  const t = useTranslation();
  const [loadingView, setLoadingView] = useState(false);

  const handleViewExisting = async () => {
    if (!existingPreviewId || !existingTemplateId) return;

    setLoadingView(true);
    try {
      const p = await getPreviewPersonalization(existingPreviewId);

      const storageKey = getStoryPersonalizationStorageKey(existingTemplateId);
      const session = {
        status: "completed" as const,
        data: {
          childName: p.childFirstName,
          gender: p.childGender,
          childAgeGroup: p.childAgeGroup,
          photoPreviewUrl: "",
          visualStyle: "watercolor",
        },
        updatedAt: Date.now(),
      };
      localStorage.setItem(storageKey, JSON.stringify(session));

      try {
        localStorage.setItem(`dammah.preview.${existingTemplateId}`, existingPreviewId);
      } catch {
        // non-critical
      }

      navigate(
        `/stories/${existingTemplateId}/read?previewId=${encodeURIComponent(existingPreviewId)}`
      );
    } catch (err) {
      console.error("Failed to load preview personalization", err);
      navigate(
        `/stories/${existingTemplateId}/read?previewId=${encodeURIComponent(existingPreviewId)}`
      );
    } finally {
      setLoadingView(false);
    }
  };

  // If quota has no template id (legacy / missing doc), fall back to current story for navigation.
  const templateForRead = existingTemplateId ?? currentStoryId;

  return (
    <Box
      sx={{
        mx: "auto",
        maxWidth: 520,
        px: 3,
        py: 6,
        textAlign: "center",
      }}
    >
      <Typography sx={{ mb: 2, fontSize: "2.5rem" }} aria-hidden>
        ✨
      </Typography>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 2 }}>
        {t("personalize.previewAlreadyUsed.title")}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6 }}>
        {t("personalize.previewAlreadyUsed.body")}
      </Typography>

      {existingPreviewId ? (
        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={handleViewExisting}
          disabled={loadingView || !templateForRead}
          sx={{ mb: 2, py: 1.5, textTransform: "none", fontWeight: 600 }}
        >
          {loadingView ? t("personalize.directPurchase.loadingPreview") : t("personalize.previewAlreadyUsed.viewPreview")}
        </Button>
      ) : null}

      <Button
        variant="outlined"
        fullWidth
        size="large"
        onClick={onContinueWithoutPreview}
        sx={{ mb: 2, py: 1.5, textTransform: "none", fontWeight: 600 }}
      >
        {t("personalize.previewAlreadyUsed.personalizeAnyway")}
      </Button>

      <Button
        variant="text"
        onClick={() => navigate("/books")}
        sx={{ textTransform: "none", color: "text.secondary" }}
      >
        {t("personalize.previewAlreadyUsed.browseStories")}
      </Button>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 4, display: "block" }}>
        {t("personalize.previewAlreadyUsed.footer")}
      </Typography>
    </Box>
  );
}
