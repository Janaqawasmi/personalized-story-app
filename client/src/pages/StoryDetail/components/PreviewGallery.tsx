import React, { useState, useMemo, forwardRef } from "react";
import { Box, Typography, Button } from "@mui/material";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import type { PreviewSpreadVM, StoryTemplatePageVM } from "../types/story";
import { useTranslation } from "../../../i18n/useTranslation";
import { SDGradients, SDRadii, SDShadows } from "../StoryDetail.styles";
import {
  normalizeStoryLanguage,
  personalizeStoryTemplateString,
  pickTextTemplateVariant,
} from "../../../utils/storyPersonalization";

/** framer-motion v11 + React 19: AnimatePresence return type includes `undefined`; cast for valid JSX. */
const MotionPresence = AnimatePresence as React.ComponentType<{
  mode?: "wait" | "sync" | "popLayout";
  children?: React.ReactNode;
}>;

function pickLang(rec: Record<string, string>, lang: string): string {
  return rec[lang] ?? rec.en ?? rec.he ?? rec.ar ?? "";
}

function renderSpreadText(text: string): React.ReactNode {
  const token = "[Child's name]";
  const parts = text.split(token);
  const pill = (key: number) => (
    <Box
      key={key}
      component="span"
      sx={{
        color: "#534AB7",
        fontWeight: 700,
        fontStyle: "normal",
        fontFamily: "'Nunito', sans-serif",
        fontSize: "15px",
        background: "#EEEDFE",
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
  const [activeSpread, setActiveSpread] = useState(0);
  const systemReduced = useReducedMotion();
  const reducedMotion = Boolean(systemReduced);

  const langNorm = normalizeStoryLanguage(storyLanguage);
  const publicVariant = "male" as const;

  const resolvedSpreads = useMemo(() => {
    if (!spreads || spreads.length < 2) return null;
    return spreads.map((sp, idx) => {
      let raw = pickLang(sp.text, language).trim();
      if (!raw && templatePages?.[idx]) {
        const page = templatePages[idx];
        const base = page.textTemplate ? pickTextTemplateVariant(page.textTemplate, publicVariant) : "";
        raw = personalizeStoryTemplateString(base, childPlaceholder, publicVariant, langNorm);
      }
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
            border: "1px solid #e5e0f8",
            bgcolor: "white",
          }}
        >
          <AutoStoriesOutlinedIcon sx={{ fontSize: 40, color: "#ccc", mb: 1 }} />
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
          borderInlineEnd: { md: "1px solid #f0eeff" },
          background: spread.imageUrl ? "#000" : SDGradients.coverBg,
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
            <Typography sx={{ fontSize: "11px", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>
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
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              color: "#aaa",
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
              color: "#2a2050",
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
            borderTop: "1px solid #f0eeff",
            marginTop: 2,
            display: "flex",
            gap: 1,
            alignItems: "center",
          }}
        >
          <AutoAwesomeIcon sx={{ fontSize: 14, color: "#7F77DD" }} />
          <Typography sx={{ fontSize: "12px", fontWeight: 600, color: "#534AB7" }}>{t("preview.childNameHint")}</Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box ref={ref} sx={{ mt: 4, mb: 4 }}>
      <Box
        sx={{
          background: "linear-gradient(135deg, #EEEDFE 0%, #f5f3ff 100%)",
          border: "1.5px solid #c8c3f5",
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
              color: "#7F77DD",
              mb: 0.5,
            }}
          >
            {t("preview.stepLabel")}
          </Typography>
          <Typography sx={{ fontSize: "20px", fontWeight: 700, color: "#1a1a2e" }}>{t("preview.seeInside")}</Typography>
          <Typography sx={{ fontSize: "14px", color: "#666", mt: 0.5 }}>{t("preview.genericVersionNote")}</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0, flexWrap: "wrap" }}>
          <Box
            sx={{
              background: "#534AB7",
              color: "white",
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
                  border: "1.5px solid #ddd",
                  background: "white",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: activeSpread === i ? "#534AB7" : "#333",
                  borderColor: activeSpread === i ? "#7F77DD" : "#ddd",
                  bgcolor: activeSpread === i ? "#EEEDFE" : "white",
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
          border: "1px solid #e5e0f8",
          background: "white",
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
          background: "white",
          border: "1.5px solid #c8c3f5",
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
          <Typography sx={{ fontSize: "14px", fontWeight: 700, color: "#1a1a2e", mb: 0.4 }}>
            {t("preview.bridgeTitle")}
          </Typography>
          <Typography sx={{ fontSize: "13px", color: "#888" }}>{t("preview.bridgeSub")}</Typography>
        </Box>
        <Button
          onClick={onPersonalize}
          sx={{
            background: SDGradients.cta,
            color: "white",
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
