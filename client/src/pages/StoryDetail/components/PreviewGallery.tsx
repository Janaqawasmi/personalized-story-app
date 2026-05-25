import React, { useState, useMemo, forwardRef, useCallback } from "react";
import { Box, Typography, Button, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import type { PreviewSpreadVM, StoryTemplatePageVM } from "../types/story";
import { useTranslation } from "../../../i18n/useTranslation";
import { COLORS } from "../../../theme";
import { SDGradients, SDRadii, SDShadows } from "../StoryDetail.styles";
import {
  extractPreviewSpreadText,
  normalizeStoryLanguage,
  personalizeStoryTemplateString,
  resolveTemplatePageText,
} from "../../../utils/storyPersonalization";

/** framer-motion v11 + React 19: AnimatePresence return type includes `undefined`; cast for valid JSX. */
const MotionPresence = AnimatePresence as React.ComponentType<{
  mode?: "wait" | "sync" | "popLayout";
  children?: React.ReactNode;
}>;

function pickLang(rec: Record<string, string>, lang: string): string {
  return rec[lang] ?? rec.en ?? rec.he ?? rec.ar ?? "";
}

interface PreviewGalleryProps {
  spreads: PreviewSpreadVM[];
  language: string;
  onPersonalize: () => void;
  templatePages?: StoryTemplatePageVM[];
  storyLanguage?: string;
  childPlaceholder: string;
}

const PreviewGallery = forwardRef<HTMLDivElement, PreviewGalleryProps>(function PreviewGallery(
  { spreads, language, onPersonalize, templatePages, storyLanguage, childPlaceholder },
  ref,
) {
  const t = useTranslation();
  const theme = useTheme();
  const [activeSpread, setActiveSpread] = useState(0);
  const systemReduced = useReducedMotion();
  const reducedMotion = Boolean(systemReduced);

  const renderSpreadText = useCallback(
    (text: string): React.ReactNode => {
      const token = "[Child's name]";
      const parts = text.split(token);
      const pill = (key: number) => (
        <Box
          key={key}
          component="span"
          sx={{
            color: COLORS.primary,
            fontWeight: 700,
            fontStyle: "normal",
            fontFamily: "'Nunito', sans-serif",
            fontSize: "15px",
            background: theme.palette.primary.light,
            px: "6px",
            py: "1px",
            borderRadius: "4px",
          }}
        >
          [Child&apos;s name]
        </Box>
      );
      if (parts.length === 1) {
        const p2 = text.split("{{CHILD_NAME}}");
        if (p2.length === 1) {
          return text;
        }
        return p2.map((part, i) => (
          <React.Fragment key={i}>
            {part}
            {i < p2.length - 1 ? pill(i) : null}
          </React.Fragment>
        ));
      }
      return parts.map((part, i) => (
        <React.Fragment key={i}>
          {part}
          {i < parts.length - 1 ? pill(i) : null}
        </React.Fragment>
      ));
    },
    [theme.palette.primary.light],
  );

  const langNorm = normalizeStoryLanguage(storyLanguage);
  const publicVariant = "male" as const;

  const resolvedSpreads = useMemo(() => {
    if (!spreads || spreads.length < 2) return null;
    return spreads.map((sp, idx) => {
      const spreadText = pickLang(sp.text, language).trim() || extractPreviewSpreadText(sp);
      let raw = spreadText;
      if (!raw && templatePages?.[idx]) {
        raw = resolveTemplatePageText(templatePages[idx], publicVariant, spreadText);
      }
      raw = personalizeStoryTemplateString(raw, childPlaceholder, publicVariant, langNorm);
      return { imageUrl: sp.imageUrl, body: raw };
    });
  }, [spreads, language, templatePages, childPlaceholder, langNorm]);

  if (!resolvedSpreads) {
    return (
      <Box ref={ref} sx={{ mt: 4, mb: 4 }}>
        <Box
          sx={{
            textAlign: "center",
            py: 6,
            px: 3,
            borderRadius: SDRadii.spreadCard,
            border: `1px solid ${COLORS.border}`,
            bgcolor: COLORS.surface,
          }}
        >
          <AutoStoriesOutlinedIcon sx={{ fontSize: 40, color: alpha(COLORS.textSecondary, 0.45), mb: 1 }} />
          <Typography sx={{ color: "text.secondary", fontWeight: 600 }}>{t("storyDetail.previewComingSoon")}</Typography>
        </Box>
      </Box>
    );
  }

  const spread = resolvedSpreads[activeSpread] ?? resolvedSpreads[0];
  const pageStart = activeSpread * 2 + 1;
  const pageEnd = activeSpread * 2 + 2;
  const storyFont = language === "he" ? "'Assistant', sans-serif" : "'Playfair Display', Georgia, serif";

  const spreadInner = (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        minHeight: 280,
      }}
    >
      <Box
        sx={{
          position: "relative",
          minHeight: { xs: 200, md: "auto" },
          borderInlineEnd: { md: `1px solid ${COLORS.border}` },
          background: spread.imageUrl ? COLORS.textPrimary : SDGradients.coverBg,
        }}
      >
        {spread.imageUrl ? (
          <Box
            component="img"
            src={spread.imageUrl}
            alt={t("preview.illustrationPreview")}
            sx={{ width: "100%", height: "100%", minHeight: 240, objectFit: "cover", display: "block" }}
          />
        ) : (
          <Box
            sx={{
              height: "100%",
              minHeight: 240,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
            }}
          >
            <Typography sx={{ fontSize: "3rem" }} aria-hidden>
              📖
            </Typography>
            <Typography sx={{ fontSize: "11px", textTransform: "uppercase", color: alpha(COLORS.surface, 0.4) }}>
              {t("preview.illustrationPreview")}
            </Typography>
          </Box>
        )}
      </Box>
      <Box
        sx={{
          padding: "28px 28px 24px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          bgcolor: COLORS.surface,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              color: alpha(COLORS.textSecondary, 0.75),
              mb: 1.75,
            }}
          >
            {t("preview.pageRange", { start: pageStart, end: pageEnd })}
          </Typography>
          <Typography
            component="div"
            sx={{
              fontFamily: storyFont,
              fontSize: "18px",
              fontStyle: language === "he" ? "normal" : "italic",
              lineHeight: 1.7,
              color: COLORS.textPrimary,
              flex: 1,
              whiteSpace: "pre-wrap",
            }}
          >
            {spread.body ? renderSpreadText(spread.body) : t("storyDetail.previewComingSoon")}
          </Typography>
        </Box>
        <Box
          sx={{
            paddingTop: 2,
            borderTop: `1px solid ${COLORS.border}`,
            marginTop: 2,
            display: "flex",
            gap: 1,
            alignItems: "center",
          }}
        >
          <AutoAwesomeIcon sx={{ fontSize: 14, color: COLORS.primary }} />
          <Typography sx={{ fontSize: "12px", fontWeight: 600, color: COLORS.primary }}>{t("preview.childNameHint")}</Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box ref={ref} sx={{ mt: 4, mb: 4 }}>
      <Box
        sx={{
          background: COLORS.background,
          border: `1.5px solid ${COLORS.border}`,
          borderRadius: SDRadii.previewBanner,
          padding: "24px 28px",
          mb: 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              color: COLORS.primary,
              mb: 0.5,
            }}
          >
            {t("preview.stepLabel")}
          </Typography>
          <Typography sx={{ fontSize: "20px", fontWeight: 700, color: COLORS.textPrimary }}>{t("preview.seeInside")}</Typography>
          <Typography sx={{ fontSize: "14px", color: COLORS.textSecondary, mt: 0.5 }}>{t("preview.genericVersionNote")}</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0, flexWrap: "wrap" }}>
          <Box
            sx={{
              background: COLORS.primary,
              color: COLORS.surface,
              fontSize: "12px",
              fontWeight: 700,
              padding: "5px 14px",
              borderRadius: "20px",
            }}
          >
            {t("preview.freePreview")}
          </Box>
          <Box sx={{ display: "flex", gap: "8px" }}>
            {resolvedSpreads.map((_, i) => (
              <Button
                key={i}
                aria-label={`${t("preview.spreadNav")} ${i + 1}`}
                onClick={() => setActiveSpread(i)}
                sx={{
                  minWidth: 36,
                  width: 36,
                  height: 36,
                  padding: 0,
                  borderRadius: SDRadii.spreadNav,
                  border: `1.5px solid ${COLORS.border}`,
                  background: COLORS.surface,
                  fontSize: "13px",
                  fontWeight: 700,
                  color: activeSpread === i ? COLORS.primary : COLORS.textPrimary,
                  borderColor: activeSpread === i ? COLORS.primary : COLORS.border,
                  bgcolor: activeSpread === i ? theme.palette.primary.light : COLORS.surface,
                  "&:hover": {
                    borderColor: activeSpread === i ? COLORS.primary : COLORS.border,
                    bgcolor: activeSpread === i ? theme.palette.primary.light : alpha(COLORS.textPrimary, 0.04),
                  },
                }}
              >
                {i + 1}
              </Button>
            ))}
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          borderRadius: SDRadii.spreadCard,
          border: `1px solid ${COLORS.border}`,
          background: COLORS.surface,
          overflow: "hidden",
          transition: "box-shadow 0.2s",
          "&:hover": { boxShadow: SDShadows.spreadHover },
        }}
      >
        {reducedMotion ? (
          spreadInner
        ) : (
          <MotionPresence mode="wait">
            <motion.div
              key={activeSpread}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.35 }}
            >
              {spreadInner}
            </motion.div>
          </MotionPresence>
        )}
      </Box>

      <Box
        sx={{
          mt: 2,
          background: COLORS.surface,
          border: `1.5px solid ${COLORS.border}`,
          borderRadius: SDRadii.bridgeCta,
          padding: "18px 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography sx={{ fontSize: "14px", fontWeight: 700, color: COLORS.textPrimary, mb: 0.4 }}>
            {t("preview.bridgeTitle")}
          </Typography>
          <Typography sx={{ fontSize: "13px", color: COLORS.textSecondary }}>{t("preview.bridgeSub")}</Typography>
        </Box>
        <Button
          onClick={onPersonalize}
          sx={{
            background: COLORS.secondary,
            color: COLORS.surface,
            fontSize: "14px",
            fontWeight: 700,
            borderRadius: "12px",
            padding: "11px 22px",
            textTransform: "none",
            display: "flex",
            alignItems: "center",
            gap: 1,
            "&:hover": {
              transform: "translateY(-1px)",
              background: theme.palette.secondary.dark,
              boxShadow: SDShadows.ctaHover,
            },
          }}
        >
          <AutoAwesomeIcon sx={{ fontSize: 14 }} />
          {t("storyDetail.personalize")}
        </Button>
      </Box>
    </Box>
  );
});

export default PreviewGallery;
