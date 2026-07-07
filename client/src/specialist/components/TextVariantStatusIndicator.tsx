import { useCallback, useEffect, useState } from "react";
import { Chip, CircularProgress, Stack, Typography } from "@mui/material";
import { getTextVariants, generateTextVariants, type TextVariantsResponse } from "../../api/specialistTemplatesApi";
import { deriveTextVariantStatus } from "../utils/textVariantStatus";
import { useSpecialistDeskUi } from "../../i18n/specialistDeskUi";
import { COLORS } from "../../theme";

interface Props {
  /** `story.publishedTemplateId` — indicator renders nothing until a story is published. */
  templateId: string | null;
}

const CHIP_STYLES: Record<string, { bg: string; text: string }> = {
  not_personalizable: { bg: "#e6dfd5", text: "#6c655e" },
  not_started: { bg: "#f5ecd7", text: "#7a5a1e" },
  generating: { bg: "#e7ecf1", text: "#3d526a" },
  ready: { bg: "#eaf0e4", text: "#4a5f3f" },
};

/**
 * Persistent, read-only status for text-variant (gendered personalization)
 * generation — shown in the workspace header. Generation runs automatically
 * right after publish and requires no specialist review/approval; the only
 * action surfaced here is a manual retry for when that automatic run failed.
 */
export default function TextVariantStatusIndicator({ templateId }: Props) {
  const desk = useSpecialistDeskUi();
  const [data, setData] = useState<TextVariantsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  const load = useCallback(() => {
    if (!templateId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    getTextVariants(templateId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [templateId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRetry() {
    if (!templateId) return;
    setRetrying(true);
    try {
      const result = await generateTextVariants(templateId);
      setData(result);
    } catch {
      // Leave status as-is; the chip still shows "not started" for another retry.
    } finally {
      setRetrying(false);
    }
  }

  if (!templateId || loading || !data) return null;

  const status = deriveTextVariantStatus(data);
  const style = CHIP_STYLES[status] ?? CHIP_STYLES.not_started!;

  const label =
    status === "not_personalizable"
      ? desk.textVariantNotPersonalizable
      : status === "ready"
        ? desk.textVariantReady
        : status === "generating"
          ? desk.textVariantGenerating
          : desk.textVariantNotStarted;

  return (
    <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap">
      <Chip
        label={label}
        size="small"
        sx={{
          bgcolor: style.bg,
          color: style.text,
          fontSize: "0.72rem",
          height: 24,
          fontWeight: 600,
          letterSpacing: "0.01em",
          "& .MuiChip-label": { px: 1.125 },
        }}
      />
      {status === "not_started" ? (
        <Typography
          component="button"
          onClick={handleRetry}
          disabled={retrying}
          sx={{
            fontSize: "0.72rem",
            color: COLORS.primary,
            fontWeight: 600,
            background: "none",
            border: "none",
            p: 0,
            cursor: retrying ? "default" : "pointer",
            textDecoration: "none",
            "&:hover": { textDecoration: retrying ? "none" : "underline" },
          }}
        >
          {retrying ? <CircularProgress size={11} sx={{ color: "inherit" }} /> : desk.textVariantRetry}
        </Typography>
      ) : null}
    </Stack>
  );
}
