import { useEffect, useState } from "react";
import { Chip, Stack, Typography } from "@mui/material";
import { Link as RouterLink, useParams } from "react-router-dom";
import { getTextVariants, type TextVariantsResponse } from "../../api/specialistTemplatesApi";
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
  pending_review: { bg: "#f5ecd7", text: "#7a5a1e" },
  ready: { bg: "#eaf0e4", text: "#4a5f3f" },
};

/**
 * Persistent, always-visible status for the Phase 3 text-variant (gendered
 * personalization) review — shown in the workspace header so a specialist
 * can discover pending review without depending on the one-time post-publish
 * toast (client/src/specialist/components/illustration/WorkspacePreview.tsx).
 * Visibility/navigation only — does not gate or change the publish flow.
 */
export default function TextVariantStatusIndicator({ templateId }: Props) {
  const desk = useSpecialistDeskUi();
  const { lang } = useParams<{ lang: string }>();
  const [data, setData] = useState<TextVariantsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!templateId) {
      setData(null);
      setLoading(false);
      return undefined;
    }
    let active = true;
    setLoading(true);
    getTextVariants(templateId)
      .then((res) => {
        if (active) setData(res);
      })
      .catch(() => {
        if (active) setData(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [templateId]);

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
          : status === "pending_review"
            ? desk.textVariantPendingReview
            : desk.textVariantNotStarted;

  const approvedCount = data.variants.filter((v) => v.reviewStatus === "approved").length;
  const totalCount = data.variants.length;
  const showProgress = status === "pending_review" && totalCount > 0;

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
      {showProgress ? (
        <Typography sx={{ fontSize: "0.72rem", color: COLORS.textMuted, fontWeight: 500 }}>
          {desk.textVariantProgress(approvedCount, totalCount)}
        </Typography>
      ) : null}
      {status !== "not_personalizable" && lang ? (
        <Typography
          component={RouterLink}
          to={`/${lang}/specialist/templates/${templateId}/text-variants`}
          sx={{
            fontSize: "0.72rem",
            color: COLORS.primary,
            fontWeight: 600,
            textDecoration: "none",
            "&:hover": { textDecoration: "underline" },
          }}
        >
          {desk.textVariantReviewLink}
        </Typography>
      ) : null}
    </Stack>
  );
}
