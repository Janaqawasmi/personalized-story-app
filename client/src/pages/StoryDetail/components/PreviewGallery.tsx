import React, { useState, useMemo, forwardRef, useCallback } from "react";
import { Box, Typography, Button, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import type { PreviewSpreadVM, StoryTemplatePageVM } from "../types/story";
import { useTranslation } from "../../../i18n/useTranslation";
import { COLORS } from "../../../theme";
import { SDGradients, SDRadii, SDShadows } from "../StoryDetail.styles";
import {
  DEFAULT_PREVIEW_IDENTITY,
  extractPreviewSpreadText,
  normalizeStoryLanguage,
  personalizeStoryTemplateString,
  resolveTemplatePageText,
  type StoryGender,
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
  /** Real child data, if the caller ever has it (not used by the story-detail teaser today — falls back to DEFAULT_PREVIEW_IDENTITY). */
  childName?: string;
  childGender?: StoryGender;
  /**
   * Not every story supports personalization — some are fixed/"as-is" stories
   * (see CtaRow's "State B"/"State C"). The bridge block and the child-name
   * hint below the sample text must reflect that, or they promise a flow
   * this particular story can't actually run.
   */
  personalizationEnabled: boolean;
  canStartPersonalization: boolean;
  comingSoon: boolean;
  /** Only used when the story is fixed (personalizationEnabled === false). */
  onBuy?: () => void;
}

const PreviewGallery = forwardRef<HTMLDivElement, PreviewGalleryProps>(function PreviewGallery(
  {
    spreads,
    language,
    onPersonalize,
    templatePages,
    storyLanguage,
    childName,
    childGender,
    personalizationEnabled,
    canStartPersonalization,
    comingSoon,
    onBuy,
  },
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
    // No real child data yet (story-detail teaser, pre-"Personalize") ⇒ resolve
    // name/pronoun tokens against a default masculine identity for the story's
    // own frozen language, rather than leaving raw tokens unresolved.
    const identity = childName
      ? { name: childName, gender: childGender ?? publicVariant }
      : DEFAULT_PREVIEW_IDENTITY[langNorm];
    return spreads.map((sp, idx) => {
      const spreadText = pickLang(sp.text, language).trim() || extractPreviewSpreadText(sp);
      // Prefer the specialist-reviewed, gender-specific text variant
      // (pages[].textTemplate.masculine/feminine — clean prose, correctly
      // conjugated) over the raw previewSpreads snapshot, which is frozen at
      // publish time straight from Agent 1's manuscript and may still contain
      // gender-ambiguous notation (e.g. Hebrew "עמד/ה") that no token-level
      // substitution can resolve. Falls back to the raw snapshot only when no
      // variant exists yet (pre-specialist-review), via resolveTemplatePageText's
      // own spreadTextFallback.
      const raw = templatePages?.[idx]
        ? resolveTemplatePageText(templatePages[idx], identity.gender, spreadText)
        : spreadText;
      const body = personalizeStoryTemplateString(raw, identity.name, identity.gender, langNorm);
      return { imageUrl: sp.imageUrl, body };
    });
  }, [spreads, language, templatePages, childName, childGender, langNorm]);

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
              fontSize: { xs: "16px", md: "18px" },
              fontStyle: "normal",
              lineHeight: 1.85,
              color: COLORS.textPrimary,
              flex: 1,
              maxWidth: "34ch",
              whiteSpace: "pre-wrap",
            }}
          >
            {spread.body ? renderSpreadText(spread.body) : t("storyDetail.previewComingSoon")}
          </Typography>
        </Box>
        {personalizationEnabled && canStartPersonalization ? (
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
        ) : null}
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
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1, flexShrink: 0 }}>
          <Box
            sx={{
              background: COLORS.primary,
              color: COLORS.surface,
              fontSize: "12px",
              fontWeight: 700,
              padding: "5px 14px",
              borderRadius: "20px",
              alignSelf: { xs: "flex-start", sm: "flex-end" },
            }}
          >
            {t("preview.freePreview")}
          </Box>
          <Box sx={{ display: "flex", gap: "8px", flexWrap: "wrap" }} role="tablist" aria-label={t("preview.seeInside")}>
            {resolvedSpreads.map((_, i) => {
              const selected = activeSpread === i;
              return (
                <Button
                  key={i}
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveSpread(i)}
                  sx={{
                    minWidth: 0,
                    height: 38,
                    px: "16px",
                    borderRadius: SDRadii.spreadNav,
                    border: `1.5px solid ${selected ? COLORS.primary : COLORS.border}`,
                    background: selected ? COLORS.primary : COLORS.surface,
                    fontSize: "13px",
                    fontWeight: 700,
                    textTransform: "none",
                    color: selected ? COLORS.surface : COLORS.textPrimary,
                    boxShadow: selected ? `0 4px 12px ${alpha(COLORS.primary, 0.3)}` : "none",
                    "&:hover": {
                      borderColor: COLORS.primary,
                      background: selected ? theme.palette.primary.dark : alpha(COLORS.primary, 0.06),
                    },
                  }}
                >
                  {t("preview.spreadLabel", { n: i + 1 })}
                </Button>
              );
            })}
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

      <PreviewBridge
        personalizationEnabled={personalizationEnabled}
        canStartPersonalization={canStartPersonalization}
        comingSoon={comingSoon}
        onPersonalize={onPersonalize}
        onBuy={onBuy}
      />
    </Box>
  );
});

/**
 * Bridge CTA below the preview card — its copy and action must match which
 * of CtaRow's three purchase states this story is actually in, otherwise it
 * promises a personalization flow that story can't run (see CtaRow.tsx).
 */
function PreviewBridge({
  personalizationEnabled,
  canStartPersonalization,
  comingSoon,
  onPersonalize,
  onBuy,
}: {
  personalizationEnabled: boolean;
  canStartPersonalization: boolean;
  comingSoon: boolean;
  onPersonalize: () => void;
  onBuy?: () => void;
}) {
  const t = useTranslation();
  const theme = useTheme();

  const buttonSx = {
    background: COLORS.secondary,
    color: COLORS.surface,
    fontSize: "14px",
    fontWeight: 700,
    borderRadius: "12px",
    padding: "11px 22px",
    textTransform: "none" as const,
    display: "flex",
    alignItems: "center",
    gap: 1,
    "&:hover": {
      transform: "translateY(-1px)",
      background: theme.palette.secondary.dark,
      boxShadow: SDShadows.ctaHover,
    },
  };

  // Story isn't designed for personalization at all — the bridge should
  // invite the reader to get the complete (fixed) story, not "personalize" it.
  if (!personalizationEnabled && !comingSoon) {
    return (
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
            {t("preview.bridgeTitleFixed")}
          </Typography>
          <Typography sx={{ fontSize: "13px", color: COLORS.textSecondary }}>{t("preview.bridgeSubFixed")}</Typography>
        </Box>
        <Button onClick={onBuy} sx={buttonSx}>
          <AutoStoriesOutlinedIcon sx={{ fontSize: 14 }} />
          {t("storyDetail.buyThisStory")}
        </Button>
      </Box>
    );
  }

  // Meant to be personalizable, but the wizard isn't ready yet — no button
  // that silently does nothing; be upfront that it's coming soon instead.
  if (personalizationEnabled && !canStartPersonalization && !comingSoon) {
    return (
      <Box
        sx={{
          mt: 2,
          background: COLORS.background,
          border: `1.5px solid ${COLORS.border}`,
          borderRadius: SDRadii.bridgeCta,
          padding: "18px 22px",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          flexWrap: "wrap",
        }}
      >
        <AccessTimeOutlinedIcon sx={{ fontSize: 18, color: COLORS.primary }} />
        <Typography sx={{ fontSize: "13px", fontWeight: 600, color: COLORS.textPrimary }}>
          {t("storyDetail.personalizationComingSoon")}
        </Typography>
      </Box>
    );
  }

  return (
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
      <Button onClick={onPersonalize} sx={buttonSx}>
        <AutoAwesomeIcon sx={{ fontSize: 14 }} />
        {t("storyDetail.personalize")}
      </Button>
    </Box>
  );
}

export default PreviewGallery;
