import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import { COLORS } from "../../../theme";
import { useTranslation } from "../../../i18n/useTranslation";
import { useLanguage } from "../../../i18n/context/useLanguage";
import { useTopics } from "../hooks/useTopics";
import type { AgeRange, IdeaFormValues, SubmitResult } from "../types";
import { submitIdea } from "../api/submitIdea";

const AGE_OPTIONS: Array<{ value: AgeRange; label: string }> = [
  { value: "3-5", label: "3–5" },
  { value: "6-8", label: "6–8" },
  { value: "9-12", label: "9–12" },
];

function RequiredMark() {
  const t = useTranslation();
  return (
    <Box component="span" sx={{ color: COLORS.secondary, fontWeight: 700, ml: 0.5 }}>
      {t("suggest.form.required")}
    </Box>
  );
}

export function SuggestStoryForm({
  idToken,
  onSuccess,
  onRequireLogin,
}: {
  idToken: string;
  onSuccess: (ideaId: string) => void;
  onRequireLogin: () => void;
}) {
  const t = useTranslation();
  const { language, isRTL, direction } = useLanguage();
  const { topics, loading: topicsLoading, error: topicsError } = useTopics();

  const [values, setValues] = useState<IdeaFormValues>({
    title: "",
    topicId: "",
    ageRange: "",
    description: "",
    motivation: "",
    contactConsent: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const titleTrim = values.title.trim();
  const descTrim = values.description.trim();
  const motivationTrim = values.motivation.trim();

  const canSubmit = useMemo(() => {
    if (topicsLoading) return false;
    if (topicsError) return false;
    if (submitting) return false;
    return (
      titleTrim.length >= 3 &&
      titleTrim.length <= 80 &&
      Boolean(values.topicId) &&
      Boolean(values.ageRange) &&
      descTrim.length >= 20 &&
      descTrim.length <= 500
    );
  }, [topicsLoading, topicsError, submitting, titleTrim.length, values.topicId, values.ageRange, descTrim.length]);

  function translateSubmitError(result: SubmitResult): string {
    if (result.ok) return "";
    switch (result.errorCode) {
      case "rate_limit":
        return t("suggest.error.rate_limit");
      case "topic_not_found":
        return t("suggest.error.topic_not_found");
      case "caregiver_profile_incomplete":
        return t("suggest.error.caregiver_profile_incomplete");
      case "network_error":
        return t("suggest.error.network");
      case "server_error":
        return t("suggest.error.server");
      case "validation_error":
        return t("suggest.error.validation");
      default:
        return t("suggest.error.server");
    }
  }

  async function handleSubmit() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const result = await submitIdea(
        {
          ...values,
          // Backend expects motivation string; empty allowed and will be coerced to null server-side
          motivation: motivationTrim,
          title: titleTrim,
          description: values.description,
          language,
        },
        idToken
      );

      if (result.ok) {
        onSuccess(result.ideaId);
        return;
      }

      if (result.errorCode === "forbidden" || result.errorCode === "unauthenticated") {
        onRequireLogin();
        return;
      }

      setSubmitError(translateSubmitError(result));
    } finally {
      setSubmitting(false);
    }
  }

  const fieldSx = {
    "& .MuiOutlinedInput-root": {
      backgroundColor: COLORS.surface,
      borderRadius: 2,
      "& fieldset": {
        borderColor: COLORS.border,
      },
      "&:hover fieldset": {
        borderColor: COLORS.secondary,
      },
      "&.Mui-focused fieldset": {
        borderColor: COLORS.secondary,
        borderWidth: 2,
      },
    },
    "& .MuiInputLabel-root.Mui-focused": {
      color: COLORS.secondary,
    },
  } as const;

  return (
    <Box sx={{ width: "100%", direction }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.25 }}>
        {/* Title */}
        <Box>
          <TextField
            fullWidth
            label={
              <Box component="span">
                {t("suggest.form.title.label")}
                <RequiredMark />
              </Box>
            }
            placeholder={t("suggest.form.title.placeholder")}
            value={values.title}
            onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
            inputProps={{ maxLength: 80, dir: isRTL ? "rtl" : "ltr" }}
            sx={fieldSx}
          />
        </Box>

        {/* Topic */}
        <Box>
          <FormControl fullWidth sx={fieldSx} disabled={topicsLoading}>
            <InputLabel>
              <Box component="span">
                {t("suggest.form.topic.label")}
                <RequiredMark />
              </Box>
            </InputLabel>
            <Select
              value={values.topicId}
              label={
                // MUI Select label expects string, but ReactNode works at runtime; keep minimal.
                t("suggest.form.topic.label")
              }
              onChange={(e) => setValues((v) => ({ ...v, topicId: String(e.target.value) }))}
              displayEmpty
            >
              <MenuItem value="" disabled>
                {topicsLoading ? t("suggest.form.topic.loading") : t("suggest.form.topic.placeholder")}
              </MenuItem>
              {topics.map((tp) => (
                <MenuItem key={tp.id} value={tp.id}>
                  {tp.label}
                </MenuItem>
              ))}
            </Select>
            {topicsError ? (
              <FormHelperText sx={{ color: COLORS.error }}>
                {t("suggest.form.topic.error")}
              </FormHelperText>
            ) : null}
          </FormControl>
        </Box>

        {/* Age */}
        <Box>
          <Typography sx={{ fontWeight: 600, color: COLORS.textPrimary, mb: 1 }}>
            {t("suggest.form.age.label")}
            <RequiredMark />
          </Typography>
          <Box
            sx={{
              display: "flex",
              gap: 1,
              flexDirection: isRTL ? "row-reverse" : "row",
            }}
          >
            {AGE_OPTIONS.map((opt) => {
              const selected = values.ageRange === opt.value;
              return (
                <Button
                  key={opt.value}
                  onClick={() => setValues((v) => ({ ...v, ageRange: opt.value }))}
                  variant="outlined"
                  sx={{
                    flex: 1,
                    borderRadius: 3,
                    borderColor: selected ? COLORS.secondary : COLORS.border,
                    backgroundColor: selected ? COLORS.secondary : COLORS.surface,
                    color: selected ? "#fff" : COLORS.textPrimary,
                    fontWeight: 700,
                    py: 1.25,
                    "&:hover": {
                      borderColor: selected ? COLORS.secondary : COLORS.secondary,
                      backgroundColor: selected ? "#6D404D" : "rgba(130, 77, 92, 0.06)",
                    },
                  }}
                >
                  {opt.label}
                </Button>
              );
            })}
          </Box>
        </Box>

        {/* Description */}
        <Box>
          <TextField
            fullWidth
            multiline
            rows={5}
            label={
              <Box component="span">
                {t("suggest.form.description.label")}
                <RequiredMark />
              </Box>
            }
            placeholder={t("suggest.form.description.placeholder")}
            value={values.description}
            onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
            inputProps={{ maxLength: 500, dir: isRTL ? "rtl" : "ltr" }}
            sx={fieldSx}
          />
          <Typography
            sx={{
              mt: 0.5,
              fontSize: 12,
              color: COLORS.textSecondary,
              textAlign: isRTL ? "left" : "right",
            }}
          >
            {values.description.length}/500
          </Typography>
        </Box>

        {/* Motivation */}
        <Box>
          <TextField
            fullWidth
            multiline
            rows={3}
            label={
              <Box component="span">
                {t("suggest.form.motivation.label")}{" "}
                <Box component="span" sx={{ color: COLORS.textSecondary, fontWeight: 400 }}>
                  {t("suggest.form.motivation.optional")}
                </Box>
              </Box>
            }
            placeholder={t("suggest.form.motivation.placeholder")}
            value={values.motivation}
            onChange={(e) => setValues((v) => ({ ...v, motivation: e.target.value }))}
            inputProps={{ maxLength: 300, dir: isRTL ? "rtl" : "ltr" }}
            sx={fieldSx}
          />
          <Typography
            sx={{
              mt: 0.5,
              fontSize: 12,
              color: COLORS.textSecondary,
              textAlign: isRTL ? "left" : "right",
            }}
          >
            {values.motivation.length}/300
          </Typography>
        </Box>

        {/* Consent */}
        <Box
          sx={{
            p: 1.5,
            borderRadius: 3,
            border: `1px solid ${COLORS.border}`,
            backgroundColor: "rgba(130, 77, 92, 0.04)",
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={values.contactConsent}
                onChange={(e) => setValues((v) => ({ ...v, contactConsent: e.target.checked }))}
                sx={{
                  color: COLORS.secondary,
                  "&.Mui-checked": { color: COLORS.secondary },
                }}
              />
            }
            label={
              <Typography sx={{ color: COLORS.textPrimary, fontSize: 14 }}>
                {t("suggest.form.consent.label")}
              </Typography>
            }
          />
        </Box>

        {/* Error row */}
        {submitError ? (
          <Typography sx={{ color: COLORS.error, fontWeight: 600 }}>
            {submitError}
          </Typography>
        ) : null}

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          variant="contained"
          sx={{
            backgroundColor: COLORS.secondary,
            "&:hover": { backgroundColor: "#6D404D" },
            py: 1.6,
            borderRadius: 3,
            fontWeight: 700,
            textTransform: "none",
            position: "relative",
          }}
        >
          {submitting ? (
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={18} sx={{ color: "#fff" }} />
              {t("suggest.form.submitting")}
            </Box>
          ) : (
            t("suggest.form.submit")
          )}
        </Button>

        <Typography sx={{ fontSize: 12.5, color: COLORS.textSecondary, lineHeight: 1.7 }}>
          {t("suggest.form.microcopy")}
        </Typography>
      </Box>
    </Box>
  );
}

