import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Rating,
  Slider,
  TextField,
  Typography,
} from "@mui/material";
import { useTranslation } from "../../i18n/useTranslation";
import { useLanguage } from "../../i18n/context/useLanguage";
import { submitStoryFeedback } from "../../services/storyFeedback.service";

interface StoryFeedbackDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  storyTemplateId: string;
  personalizedStoryId: string;
  childName: string;
}

export default function StoryFeedbackDialog({
  open,
  onClose,
  onSubmitted,
  storyTemplateId,
  personalizedStoryId,
  childName,
}: StoryFeedbackDialogProps) {
  const t = useTranslation();
  const { isRTL } = useLanguage();

  const [rating, setRating] = useState<number | null>(null);
  const [before, setBefore] = useState(5);
  const [after, setAfter] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!rating) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitStoryFeedback({
        storyTemplateId,
        personalizedStoryId,
        childName,
        rating,
        emotionalShift: { before, after },
        reviewText: reviewText.trim() || undefined,
      });
      onSubmitted();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("feedback.submitError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { direction: isRTL ? "rtl" : "ltr" } }}
    >
      <DialogContent sx={{ pt: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, textAlign: "center" }}>
          {t("feedback.title", { name: childName })}
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 3 }}>
          <Typography sx={{ mb: 1 }}>{t("feedback.ratingLabel")}</Typography>
          <Rating
            value={rating}
            onChange={(_e, value) => setRating(value)}
            size="large"
          />
          {!rating && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              {t("feedback.ratingRequired")}
            </Typography>
          )}
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography sx={{ mb: 1 }}>{t("feedback.beforeLabel", { name: childName })}</Typography>
          <Slider
            value={before}
            onChange={(_e, value) => setBefore(value as number)}
            min={0}
            max={10}
            step={1}
            marks
            valueLabelDisplay="auto"
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography sx={{ mb: 1 }}>{t("feedback.afterLabel", { name: childName })}</Typography>
          <Slider
            value={after}
            onChange={(_e, value) => setAfter(value as number)}
            min={0}
            max={10}
            step={1}
            marks
            valueLabelDisplay="auto"
          />
        </Box>

        <TextField
          label={t("feedback.reviewLabel")}
          placeholder={t("feedback.reviewPlaceholder")}
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          multiline
          minRows={3}
          fullWidth
        />

        {error ? (
          <Typography sx={{ color: "error.main", fontSize: "0.85rem", mt: 2, textAlign: "center" }}>
            {error}
          </Typography>
        ) : null}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={submitting} color="inherit">
          {t("feedback.skip")}
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!rating || submitting}
        >
          {t("feedback.submit")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
