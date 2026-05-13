import { Box, Typography, TextField, Button, CircularProgress } from "@mui/material";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useLangNavigate } from "../i18n/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useTranslation } from "../i18n/useTranslation";
import { useLanguage } from "../i18n/context/useLanguage";

import watercolorImg from "../assets/story-styles/watercolor.jpeg";
import semiRealisticImg from "../assets/story-styles/semi-realistic.jpeg";
import flatCartoonImg from "../assets/story-styles/flat-cartoon.jpeg";
import paperCraftImg from "../assets/story-styles/paper-craft.jpeg";
import vintageGoldenImg from "../assets/story-styles/vintage-1950s-little-golden.jpeg";
import { buildPreviewSentence, getStoryPersonalizationStorageKey } from "../utils/storyPersonalization";
import type { StoryTemplate } from "../types/story";
import {
  sanitizeChildName,
  validateChildName,
  detectNameScriptFamily,
  getExpectedNameScriptForStoryLanguage,
  shouldWarnNameScriptMismatch,
} from "../utils/childNameValidation";
import {
  addToCart,
  createDirectPurchasePreview,
  generatePreview,
  getPreviewPersonalization,
  type AgeGroup,
  FreePreviewAlreadyUsedError,
} from "../api/caregiverApi";
import { usePreviewQuota } from "../hooks/usePreviewQuota";
import { DirectPurchaseSummary } from "../components/preview/DirectPurchaseSummary";

type VisualStyle =
  | "watercolor"
  | "semi_realistic"
  | "flat_cartoon"
  | "paper_craft"
  | "vintage_1950s_little_golden";

type StoryPersonalizationData = {
  childName: string;
  gender: "female" | "male";
  photoFile?: File;
  photoPreviewUrl: string;
  visualStyle: VisualStyle;
  /** Firestore preview API band (`/api/caregiver/previews/generate`). Default in state: `"6_9"` (~6–9y). */
  childAgeGroup?: AgeGroup;
};

type PersonalizationSession = {
  status: "draft" | "completed";
  data: StoryPersonalizationData & { childAgeGroup?: AgeGroup };
  updatedAt: number;
};

const VISUAL_STYLES = [
  { id: "watercolor" as const, image: watercolorImg },
  { id: "semi_realistic" as const, image: semiRealisticImg },
  { id: "flat_cartoon" as const, image: flatCartoonImg },
  { id: "paper_craft" as const, image: paperCraftImg },
  { id: "vintage_1950s_little_golden" as const, image: vintageGoldenImg },
];

const FORM_STEP_COUNT = 4;
const ACCEPTED_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.webp";
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB (must match server multer limit)

function pickLang(val: string | Record<string, string> | undefined, lang: string): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  return val[lang] ?? val.en ?? val.he ?? val.ar ?? "";
}

function loadPersonalizationSession(storyId: string): PersonalizationSession | null {
  const key = getStoryPersonalizationStorageKey(storyId);
  const stored = localStorage.getItem(key);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as PersonalizationSession;
  } catch {
    return null;
  }
}

function savePersonalizationSession(
  storyId: string,
  data: StoryPersonalizationData,
  status: "draft" | "completed"
): void {
  const key = getStoryPersonalizationStorageKey(storyId);
  const session: PersonalizationSession = {
    status,
    data: {
      childName: data.childName,
      gender: data.gender,
      childAgeGroup: data.childAgeGroup,
      photoPreviewUrl: data.photoPreviewUrl,
      visualStyle: data.visualStyle,
    },
    updatedAt: Date.now(),
  };
  localStorage.setItem(key, JSON.stringify(session));
}

function deletePersonalizationSession(storyId: string): void {
  const key = getStoryPersonalizationStorageKey(storyId);
  localStorage.removeItem(key);
}

function LeftPanel({
  story,
  personalization,
  language,
  t,
}: {
  story: StoryTemplate | null;
  personalization: Partial<StoryPersonalizationData>;
  language: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const starfieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sf = starfieldRef.current;
    if (!sf) return;
    sf.innerHTML = "";
    const configs = [
      { count: 12, size: 2, minOp: 0.1, maxOp: 0.7, durMin: 2, durMax: 4 },
      { count: 10, size: 3, minOp: 0.05, maxOp: 0.4, durMin: 3, durMax: 6 },
      { count: 6, size: 1, minOp: 0.2, maxOp: 0.9, durMin: 1.5, durMax: 3 },
    ];
    const colors = ["#fff", "#f0e8ff", "#ffe8f0", "#e8f0ff"];
    configs.forEach(({ count, size, minOp, maxOp, durMin, durMax }) => {
      for (let i = 0; i < count; i++) {
        const el = document.createElement("div");
        const s = size + Math.random() * size;
        const dur = durMin + Math.random() * (durMax - durMin);
        const delay = -(Math.random() * dur);
        const color = colors[Math.floor(Math.random() * colors.length)]!;
        el.style.cssText = `
        position:absolute; border-radius:50%;
        width:${s}px; height:${s}px;
        left:${Math.random() * 100}%;
        top:${Math.random() * 100}%;
        background:${color};
        animation:starPulse ${dur}s ease-in-out ${delay}s infinite;
        --min-op:${minOp}; --max-op:${maxOp};
      `;
        sf.appendChild(el);
      }
    });
  }, []);

  const { childName, gender } = personalization;
  const hasName = (childName?.trim().length ?? 0) >= 2;
  const avatarEmoji = gender === "female" ? "🌸" : gender === "male" ? "🌊" : "✨";
  const titleText = pickLang(story?.title, language) || t("personalize.leftStoryFallback");
  const topicText = pickLang(story?.topic, language) || t("personalize.leftTopicFallback");
  const ageText =
    story?.ageGroup || story?.targetAgeGroup || story?.generationConfig?.targetAgeGroup || "4–8";

  return (
    <Box
      sx={{
        background: "linear-gradient(165deg, #170d1e 0%, #2a1a35 45%, #1a0a2e 100%)",
        p: "36px 32px",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box
        ref={starfieldRef}
        sx={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}
      />

      {[
        { w: 260, h: 260, bg: "rgba(130,77,92,0.25)", top: -80, right: -80, delay: "0s" },
        { w: 200, h: 200, bg: "rgba(60,30,80,0.3)", bottom: -60, left: -60, delay: "-4s" },
        { w: 160, h: 160, bg: "rgba(176,122,138,0.15)", top: "40%", right: "10%", delay: "-2s" },
      ].map((a, i) => (
        <Box
          key={i}
          sx={{
            position: "absolute",
            width: a.w,
            height: a.h,
            borderRadius: "50%",
            background: a.bg,
            filter: "blur(60px)",
            top: a.top ?? "auto",
            bottom: a.bottom ?? "auto",
            left: a.left ?? "auto",
            right: a.right ?? "auto",
            pointerEvents: "none",
            animation: `auroraDrift 8s ease-in-out ${a.delay} infinite alternate`,
          }}
        />
      ))}

      <Box sx={{ position: "relative", zIndex: 1, mb: "28px", perspective: "800px" }}>
        <Box
          sx={{
            borderRadius: "14px",
            background: "linear-gradient(145deg, #3d1a2a 0%, #2a1435 40%, #16093a 100%)",
            aspectRatio: "3/4",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "14px",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow:
              "0 24px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06), 4px 0 12px rgba(0,0,0,0.4)",
            position: "relative",
            overflow: "hidden",
            transform: "rotateY(-4deg) rotateX(2deg)",
            transformStyle: "preserve-3d",
            transition: "transform 0.6s ease",
            "&:hover": {
              transform: "rotateY(-2deg) rotateX(1deg) translateY(-4px)",
            },
            "&::before": {
              content: '""',
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "12px",
              background: "linear-gradient(90deg, rgba(0,0,0,0.5), transparent)",
            },
            "&::after": {
              content: '""',
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(ellipse at 30% 20%, rgba(176,122,138,0.12) 0%, transparent 60%)",
              pointerEvents: "none",
            },
          }}
        >
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(ellipse at 60% 80%, rgba(196,150,90,0.08) 0%, transparent 60%)",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              left: "12px",
              top: 0,
              bottom: 0,
              width: "3px",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.03), rgba(255,255,255,0.08))",
            }}
          />

          <Typography
            sx={{
              fontSize: 52,
              position: "relative",
              zIndex: 1,
              filter: "drop-shadow(0 4px 16px rgba(176,122,138,0.5))",
            }}
          >
            🌟
          </Typography>
          <Box sx={{ position: "relative", zIndex: 1, textAlign: "center", px: "18px" }}>
            <Typography
              sx={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 15,
                fontWeight: 600,
                color: "rgba(255,255,255,0.88)",
                lineHeight: 1.4,
                mb: 1,
              }}
            >
              {titleText}
            </Typography>
            <Box
              component="span"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                px: "10px",
                py: "3px",
                borderRadius: "999px",
                background: "rgba(196,150,90,0.18)",
                border: "1px solid rgba(196,150,90,0.35)",
                fontSize: 10,
                color: "#c4965a",
                fontWeight: 500,
                letterSpacing: "0.06em",
              }}
            >
              ✦ {t("personalize.leftAgesLabel", { age: ageText })}
            </Box>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
          my: "20px",
          position: "relative",
          zIndex: 1,
        }}
      />

      <Box sx={{ position: "relative", zIndex: 1, mt: "auto" }}>
        <Typography
          sx={{
            fontSize: 9,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.28)",
            mb: 1,
          }}
        >
          {t("personalize.leftPersonalizing")}
        </Typography>
        <Typography
          sx={{
            fontFamily: "'Cormorant Garamond', serif",
            color: "rgba(255,255,255,0.9)",
            fontSize: 19,
            lineHeight: 1.3,
            mb: "14px",
            fontWeight: 400,
            fontStyle: "italic",
          }}
        >
          {titleText}
        </Typography>
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            px: "14px",
            py: "6px",
            borderRadius: "999px",
            background: "rgba(130,77,92,0.28)",
            border: "1px solid rgba(176,122,138,0.4)",
            fontSize: 11,
            color: "#d4a8b4",
            fontWeight: 500,
          }}
        >
          <Box sx={{ width: 5, height: 5, borderRadius: "50%", background: "#B07A8A", flexShrink: 0 }} />
          {topicText}
        </Box>
      </Box>

      <Box
        sx={{
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
          my: "20px",
          position: "relative",
          zIndex: 1,
        }}
      />

      <Box sx={{ position: "relative", zIndex: 1 }}>
        <Typography
          sx={{
            fontSize: 9,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.25)",
            mb: 1,
          }}
        >
          {t("personalize.leftYourChild")}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #4a2535, #2a1a40)",
              border: "1.5px solid rgba(176,122,138,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              flexShrink: 0,
              transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            {hasName ? avatarEmoji : "✨"}
          </Box>
          <Typography
            sx={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 16,
              fontStyle: "italic",
              color: hasName ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.38)",
              transition: "color 0.3s",
            }}
          >
            {hasName ? childName : t("personalize.leftWaitingName")}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

function ProgressBar({
  activeStep,
  totalSteps,
  onStepClick,
  t,
}: {
  activeStep: number;
  totalSteps: number;
  onStepClick: (i: number) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const labels = [
    t("personalize.steps.name"),
    t("personalize.steps.gender"),
    t("personalize.steps.photo"),
    t("personalize.steps.style"),
  ];

  const lineComplete = (segmentIndex: number) =>
    segmentIndex < activeStep || activeStep >= FORM_STEP_COUNT;

  const stepDone = (i: number) => i < activeStep || activeStep >= FORM_STEP_COUNT;
  const stepActive = (i: number) => i === activeStep && activeStep < FORM_STEP_COUNT;
  const clickable = (i: number) => i <= activeStep;

  return (
    <Box sx={{ px: "44px", pt: "32px", pb: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: "10px" }}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <React.Fragment key={i}>
            <Box
              onClick={() => clickable(i) && onStepClick(i)}
              sx={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 600,
                flexShrink: 0,
                cursor: clickable(i) ? "pointer" : "default",
                userSelect: "none",
                transition: "all 0.4s cubic-bezier(0.34,1.26,0.64,1)",
                ...(stepActive(i) && {
                  background: "#824D5C",
                  color: "#fff",
                  boxShadow: "0 0 0 5px rgba(130,77,92,0.15), 0 4px 12px rgba(130,77,92,0.3)",
                }),
                ...(stepDone(i) &&
                  !stepActive(i) && {
                    background: "#824D5C",
                    color: "#fff",
                    boxShadow: "0 2px 10px rgba(130,77,92,0.35)",
                    "&:hover": { transform: "scale(1.1)" },
                  }),
                ...(!stepDone(i) &&
                  !stepActive(i) && {
                    background: "#f8f4ef",
                    color: "#9a8a92",
                    border: "1.5px solid #ddd4ca",
                  }),
              }}
            >
              {stepDone(i) && !stepActive(i) ? "✓" : i + 1}
            </Box>

            {i < totalSteps - 1 && (
              <Box
                sx={{
                  flex: 1,
                  height: 2,
                  background: lineComplete(i) ? "#824D5C" : "#ddd4ca",
                  transition: "background 0.5s ease",
                }}
              />
            )}
          </React.Fragment>
        ))}
      </Box>

      <Box sx={{ display: "flex" }}>
        {labels.map((label, i) => (
          <Typography
            key={i}
            sx={{
              flex: 1,
              textAlign: "center",
              fontSize: 10,
              color: stepActive(i) ? "#824D5C" : "#9a8a92",
              fontWeight: stepActive(i) ? 600 : 400,
              transition: "color 0.3s",
            }}
          >
            {label}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

function StepHeader({ eyebrow, heading }: { eyebrow: string; heading: React.ReactNode }) {
  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: "10px" }}>
        <Typography
          sx={{
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#B07A8A",
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          {eyebrow}
        </Typography>
        <Box sx={{ flex: 1, height: 1, background: "linear-gradient(90deg, #ddd4ca, transparent)" }} />
      </Box>

      <Typography
        sx={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 30,
          fontWeight: 300,
          color: "#1c1118",
          lineHeight: 1.2,
          mb: 1,
          "& em": { fontStyle: "italic", color: "#824D5C" },
        }}
      >
        {heading}
      </Typography>
    </>
  );
}

export default function PersonalizeStoryPage() {
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useLangNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslation();
  const { language, direction, isRTL } = useLanguage();

  const STEPS = useMemo(
    () => [
      t("personalize.steps.step1"),
      t("personalize.steps.step2"),
      t("personalize.steps.step3"),
      t("personalize.steps.step4"),
      t("personalize.steps.step5"),
    ],
    [t]
  );

  const [story, setStory] = useState<StoryTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [personalization, setPersonalization] = useState<Partial<StoryPersonalizationData>>({
    childName: "",
    gender: undefined,
    visualStyle: "watercolor",
    childAgeGroup: "6_9",
  });
  const [session, setSession] = useState<PersonalizationSession | null>(null);
  const [showResumeScreen, setShowResumeScreen] = useState(false);
  const [showCompletedScreen, setShowCompletedScreen] = useState(false);
  const [showFinalError, setShowFinalError] = useState(false);
  const [childNameBlurred, setChildNameBlurred] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const { quota, loading: quotaLoading, refetch: refetchQuota } = usePreviewQuota();
  const [skipPreviewMode, setSkipPreviewMode] = useState(false);
  const [directPurchaseResult, setDirectPurchaseResult] = useState<{
    previewId: string;
    childName: string;
    photoPreviewUrl: string | null;
  } | null>(null);

  useEffect(() => {
    if (quota?.hasUsedPreview) {
      setSkipPreviewMode(true);
    }
  }, [quota?.hasUsedPreview]);

  const styleDisplay = useMemo(
    () => [
      {
        id: "watercolor" as const,
        label: t("personalize.visualStyles.watercolor.label"),
        emoji: "🎨",
        bg: "linear-gradient(135deg, #fce4f4, #e0f0fc)",
      },
      {
        id: "semi_realistic" as const,
        label: t("personalize.visualStyles.semi_realistic.label"),
        emoji: "🖼️",
        bg: "linear-gradient(135deg, #e4f0e4, #f0e8e4)",
      },
      {
        id: "flat_cartoon" as const,
        label: t("personalize.visualStyles.flat_cartoon.label"),
        emoji: "✏️",
        bg: "linear-gradient(135deg, #fff3e0, #fce4f4)",
      },
      {
        id: "paper_craft" as const,
        label: t("personalize.visualStyles.paper_craft.label"),
        emoji: "📄",
        bg: "linear-gradient(135deg, #f5f0e8, #e8e0d8)",
      },
      {
        id: "vintage_1950s_little_golden" as const,
        label: t("personalize.visualStyles.vintage_1950s_little_golden.label"),
        emoji: "📚",
        bg: "linear-gradient(135deg, #f0e4d4, #e8d4c0)",
      },
    ],
    [t]
  );

  const childNameValue = personalization.childName ?? "";
  const childNameValidation = useMemo(() => validateChildName(childNameValue), [childNameValue]);
  const childNameScriptFamily = useMemo(
    () => detectNameScriptFamily(childNameValue),
    [childNameValue]
  );
  const expectedNameScriptForStory = useMemo(
    () => getExpectedNameScriptForStoryLanguage(story?.language),
    [story?.language]
  );
  const showChildNameScriptWarning = useMemo(
    () =>
      childNameValidation.ok &&
      shouldWarnNameScriptMismatch(expectedNameScriptForStory, childNameScriptFamily),
    [childNameValidation.ok, expectedNameScriptForStory, childNameScriptFamily]
  );

  const childNameFieldHelperText = useMemo(() => {
    if (childNameValidation.ok) return null;
    if (childNameValidation.error === "required") {
      return childNameBlurred ? t("personalize.nameRequired") : null;
    }
    if (childNameValidation.error === "tooShort") {
      if (childNameValue.length > 0 || childNameBlurred) {
        return t("personalize.nameMinLength");
      }
      return null;
    }
    if (childNameValidation.error === "tooLong") {
      return t("personalize.nameMaxLength");
    }
    return null;
  }, [childNameValidation, childNameValue.length, childNameBlurred, t]);

  useEffect(() => {
    if (!storyId) {
      navigate("/");
      return;
    }

    const fetchStory = async () => {
      try {
        const storyRef = doc(db, "story_templates", storyId);
        const storySnap = await getDoc(storyRef);

        if (!storySnap.exists()) {
          navigate("/");
          return;
        }

        const data = storySnap.data();
        setStory({
          id: storySnap.id,
          title: data.title || t("personalize.story"),
          language: data.language || data.generationConfig?.language,
          ageGroup: data.ageGroup || data.targetAgeGroup || data.generationConfig?.targetAgeGroup,
          targetAgeGroup: data.targetAgeGroup || data.generationConfig?.targetAgeGroup,
          topic: data.primaryTopic ?? data.topicKey ?? data.topic,
          generationConfig: data.generationConfig,
          previewSentence: typeof data.previewSentence === "string" ? data.previewSentence : undefined,
        });

        const existingSession = loadPersonalizationSession(storyId);
        setSession(existingSession);

        if (existingSession) {
          if (existingSession.status === "completed") {
            setShowCompletedScreen(true);
            if (existingSession.data) {
              setPersonalization({
                childName: sanitizeChildName(existingSession.data.childName || ""),
                gender: existingSession.data.gender,
                visualStyle: existingSession.data.visualStyle || "watercolor",
                childAgeGroup: existingSession.data.childAgeGroup ?? "6_9",
              });
            }
          } else if (existingSession.status === "draft") {
            setShowResumeScreen(true);
          }
        }
      } catch (err) {
        console.error("Error fetching story:", err);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    fetchStory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId]);

  const validateCurrentStep = (step: number): boolean => {
    switch (step) {
      case 0:
        return validateChildName(personalization.childName ?? "").ok;
      case 1:
        return !!personalization.gender;
      case 2:
        return !!(personalization.photoFile && personalization.photoPreviewUrl);
      case 3:
        return !!personalization.visualStyle;
      default:
        return true;
    }
  };

  const validateAllSteps = (): boolean => {
    return !!(
      validateChildName(personalization.childName ?? "").ok &&
      personalization.gender &&
      personalization.photoFile &&
      personalization.photoPreviewUrl &&
      personalization.visualStyle
    );
  };

  const inferStepFromData = (data: StoryPersonalizationData): number => {
    if (!validateChildName(sanitizeChildName(data.childName || "")).ok) return 0;
    if (!data.gender) return 1;
    if (!data.photoPreviewUrl) return 2;
    if (!data.visualStyle) return 3;
    return 4;
  };

  const handleNext = () => {
    if (!validateCurrentStep(activeStep)) {
      return;
    }

    if (activeStep < STEPS.length - 1) {
      setActiveStep(activeStep + 1);
      setShowFinalError(false);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoUploadError(null);
    const mime = (file.type || "").toLowerCase();
    if (!ACCEPTED_MIME.includes(mime)) {
      setPhotoUploadError(t("personalize.errors.unsupportedImageFormat"));
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setPhotoUploadError(t("personalize.errors.imageTooLarge"));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const updated = {
        ...personalization,
        photoFile: file,
        photoPreviewUrl: reader.result as string,
      };
      setPersonalization(updated);

      if (storyId && validateChildName(updated.childName ?? "").ok && updated.gender && updated.visualStyle) {
        savePersonalizationSession(
          storyId,
          {
            childName: updated.childName!,
            gender: updated.gender,
            childAgeGroup: updated.childAgeGroup ?? "6_9",
            photoPreviewUrl: reader.result as string,
            visualStyle: updated.visualStyle,
          },
          "draft"
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const handleComplete = async () => {
    if (!storyId) return;

    if (!validateAllSteps()) {
      setShowFinalError(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setShowFinalError(false);
    setIsSaving(true);
    setSaveError(null);

    const completePersonalization: StoryPersonalizationData = {
      childName: personalization.childName!,
      gender: personalization.gender!,
      photoFile: personalization.photoFile!,
      photoPreviewUrl: personalization.photoPreviewUrl!,
      visualStyle: personalization.visualStyle!,
      childAgeGroup: personalization.childAgeGroup ?? "6_9",
    };

    savePersonalizationSession(storyId, completePersonalization, "completed");
    console.log("[handleComplete] localStorage saved ✅", completePersonalization);

    if (skipPreviewMode || quota?.hasUsedPreview) {
      try {
        const { previewId } = await createDirectPurchasePreview({
          templateId: storyId,
          childFirstName: completePersonalization.childName,
          childGender: completePersonalization.gender,
          childAgeGroup: completePersonalization.childAgeGroup ?? "6_9",
          photoFile: completePersonalization.photoFile!,
        });
        setDirectPurchaseResult({
          previewId,
          childName: completePersonalization.childName,
          photoPreviewUrl: completePersonalization.photoPreviewUrl ?? null,
        });
      } catch (err) {
        console.error("Direct purchase preview failed", err);
        setSaveError(t("personalize.previewGenerationFailed"));
      } finally {
        setIsSaving(false);
      }
      return;
    }

    try {
      console.log("[handleComplete] Calling generatePreview API...");
      const result = await generatePreview({
        templateId: storyId,
        childFirstName: completePersonalization.childName,
        childGender: completePersonalization.gender,
        childAgeGroup: completePersonalization.childAgeGroup ?? "6_9",
        photoFile: completePersonalization.photoFile!,
      });
      console.log("[handleComplete] Preview API succeeded ✅", result);
      try {
        localStorage.setItem(`dammah.preview.${storyId}`, result.previewId);
      } catch {
        // Non-critical: reader can still fall back to query param only.
      }

      navigate(`/stories/${storyId}/read?previewId=${encodeURIComponent(result.previewId)}`);
    } catch (err) {
      console.error("[handleComplete] Preview generation failed ❌", err);
      if (err instanceof FreePreviewAlreadyUsedError) {
        setSaveError(err.message);
        void refetchQuota();
        return;
      }
      setSaveError(t("personalize.previewGenerationFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleResume = () => {
    if (!session || session.status !== "draft") return;

    setPersonalization({
      ...session.data,
      childName: sanitizeChildName(session.data.childName || ""),
    });

    const step = inferStepFromData(session.data);
    setActiveStep(step);

    setShowFinalError(false);
    setShowResumeScreen(false);
  };

  const handleStartOver = () => {
    if (!storyId) return;
    deletePersonalizationSession(storyId);
    setSession(null);
    setPersonalization({
      childName: "",
      gender: undefined,

      visualStyle: "watercolor",
      childAgeGroup: "6_9",
    });
    setChildNameBlurred(false);
    setActiveStep(0);
    setShowResumeScreen(false);
  };

  const handleStartNew = () => {
    if (!storyId) return;
    deletePersonalizationSession(storyId);
    setSession(null);
    setPersonalization({
      childName: "",
      gender: undefined,
      visualStyle: "watercolor",
      childAgeGroup: "6_9",
    });
    setChildNameBlurred(false);
    setActiveStep(0);
    setShowCompletedScreen(false);
  };

  const handleUsePrevious = () => {
    if (!session || session.status !== "completed" || !storyId) return;

    navigate(`/stories/${storyId}/read`);
  };

  const isStepValid = (step: number): boolean => {
    return validateCurrentStep(step);
  };

  const previewResult = buildPreviewSentence(
    story?.previewSentence,
    personalization.childName ?? "",
    t("personalize.previewEmpty")
  );

  const handleGenderSelect = (g: "female" | "male") => {
    const updated = { ...personalization, gender: g };
    setPersonalization(updated);
    if (storyId && validateChildName(personalization.childName ?? "").ok) {
      savePersonalizationSession(
        storyId,
        {
          childName: personalization.childName!,
          gender: g,
          childAgeGroup: personalization.childAgeGroup ?? "6_9",
          photoPreviewUrl: personalization.photoPreviewUrl || "",
          visualStyle: personalization.visualStyle || "watercolor",
        },
        "draft"
      );
    }
  };

  const handleStyleSelect = (id: VisualStyle) => {
    setPersonalization({ ...personalization, visualStyle: id });
  };

  if (loading || quotaLoading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!story) {
    return null;
  }

  const storyTitleForUi = pickLang(story.title, language) || t("personalize.story");

  if (directPurchaseResult) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          backgroundColor: "#E5DFD9",
          direction: direction,
        }}
      >
        <DirectPurchaseSummary
          result={directPurchaseResult}
          storyTitle={storyTitleForUi}
          onAddToCart={async () => {
            try {
              await addToCart(directPurchaseResult.previewId);
            } catch (err) {
              console.warn("Add to cart failed:", err);
            } finally {
              navigate("/cart");
            }
          }}
          onBack={() => setDirectPurchaseResult(null)}
          existingPreviewId={quota?.existingPreviewId ?? null}
          existingTemplateId={quota?.existingTemplateId ?? null}
          onViewExistingPreview={async () => {
            const eid = quota?.existingPreviewId;
            const etid = quota?.existingTemplateId;
            if (!eid || !etid) return;
            try {
              const p = await getPreviewPersonalization(eid);
              const storageKey = getStoryPersonalizationStorageKey(etid);
              localStorage.setItem(
                storageKey,
                JSON.stringify({
                  status: "completed",
                  data: {
                    childName: p.childFirstName,
                    gender: p.childGender,
                    childAgeGroup: p.childAgeGroup,
                    photoPreviewUrl: "",
                    visualStyle: "watercolor",
                  },
                  updatedAt: Date.now(),
                })
              );
              localStorage.setItem(`dammah.preview.${etid}`, eid);
            } catch {
              /* navigate anyway */
            }
            navigate(`/stories/${etid}/read?previewId=${encodeURIComponent(eid)}`);
          }}
        />
      </Box>
    );
  }

  if (showResumeScreen && session?.status === "draft") {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          backgroundColor: "#E5DFD9",
          direction: direction,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 3,
        }}
      >
        <Box
          sx={{
            maxWidth: 500,
            width: "100%",
            p: 4,
            textAlign: "center",
            borderRadius: 5,
            boxShadow: "0 30px 80px rgba(28,17,24,0.12)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.98))",
            border: "1px solid rgba(196,166,146,0.3)",
          }}
        >
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
            {t("personalize.continue")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            {t("personalize.alreadyStarted")}
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Button
              variant="contained"
              onClick={handleResume}
              fullWidth
              sx={{
                backgroundColor: "#824D5C",
                "&:hover": { backgroundColor: "#6f404d" },
                py: 1.5,
              }}
            >
              {t("personalize.resume")}
            </Button>
            <Button
              variant="outlined"
              onClick={handleStartOver}
              fullWidth
              sx={{
                py: 1.5,
                borderColor: "#824D5C",
                color: "#824D5C",
                "&:hover": {
                  borderColor: "#6f404d",
                  backgroundColor: "rgba(130,77,92,0.08)",
                },
              }}
            >
              {t("personalize.restart")}
            </Button>
          </Box>
        </Box>
      </Box>
    );
  }

  const eyebrowForStep = [t("personalize.step1Of4"), t("personalize.step2Of4"), t("personalize.step3Of4"), t("personalize.step4Of4")];

  const isCelebration = activeStep === 4;
  const isFormLastStep = activeStep === 3;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: { xs: 2, md: 3 },
        py: { xs: 3, md: 4 },
        background: "radial-gradient(ellipse at 30% 20%, #ede0d4 0%, #e8ddd5 40%, #ddd4ca 100%)",
        position: "relative",
        overflow: "hidden",
        direction: direction,
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23c4b4a4' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")`,
          pointerEvents: "none",
        },
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 1024, position: "relative", zIndex: 1 }}>
        {showCompletedScreen && session?.status === "completed" && (
          <Box
            sx={{
              mb: 3,
              p: { xs: 2, md: 3 },
              borderRadius: 4,
              border: "1px solid",
              borderColor: "rgba(130,77,92,0.25)",
              background: "linear-gradient(135deg, rgba(130,77,92,0.06), rgba(130,77,92,0.02))",
              boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: { sm: "center" },
                gap: 2,
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#824D5C", mb: 0.5 }}>
                  {t("personalize.alreadyCompleted")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {session.data?.childName
                    ? t("personalize.savedFor", { name: session.data.childName })
                    : t("personalize.whatToDo")}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1.5, flexShrink: 0 }}>
                <Button
                  variant="contained"
                  onClick={handleUsePrevious}
                  size="small"
                  sx={{
                    backgroundColor: "#824D5C",
                    "&:hover": { backgroundColor: "#6f404d" },
                    px: 3,
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 600,
                  }}
                >
                  {t("personalize.usePrevious")}
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleStartNew}
                  size="small"
                  sx={{
                    borderColor: "#824D5C",
                    color: "#824D5C",
                    "&:hover": {
                      borderColor: "#6f404d",
                      backgroundColor: "rgba(130,77,92,0.08)",
                    },
                    px: 3,
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 600,
                  }}
                >
                  {t("personalize.newPersonalization")}
                </Button>
              </Box>
            </Box>
          </Box>
        )}

        <Box
          sx={{
            width: "100%",
            maxWidth: 960,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "320px 1fr" },
            borderRadius: "24px",
            overflow: "hidden",
            boxShadow: "0 32px 80px rgba(28,17,24,0.22), 0 0 0 1px rgba(196,166,146,0.3)",
            minHeight: 620,
            position: "relative",
            zIndex: 1,
            mx: "auto",
          }}
        >
          <LeftPanel story={story} personalization={personalization} language={language} t={t} />

          <Box sx={{ background: "#fff", display: "flex", flexDirection: "column" }}>
            {!isCelebration && (
              <ProgressBar
                activeStep={activeStep}
                totalSteps={FORM_STEP_COUNT}
                onStepClick={setActiveStep}
                t={t}
              />
            )}

            <Box
              sx={{
                flex: 1,
                px: "44px",
                py: "28px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              {isCelebration ? (
                <Box
                  sx={{
                    textAlign: "center",
                    py: "24px",
                    animation: "celebIn 0.5s cubic-bezier(0.34,1.26,0.64,1) forwards",
                  }}
                >
                  {showFinalError && (
                    <Box
                      sx={{
                        p: 2,
                        mb: 3,
                        backgroundColor: "error.light",
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: "error.main",
                      }}
                    >
                      <Typography variant="body2" color="error" sx={{ fontWeight: 500 }}>
                        {t("personalize.fillAllFields")}
                      </Typography>
                    </Box>
                  )}
                  <Typography
                    sx={{
                      fontSize: 72,
                      display: "block",
                      mb: "18px",
                      animation: "checkPop 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards",
                    }}
                  >
                    ✨
                  </Typography>

                  <Typography
                    sx={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: 34,
                      fontWeight: 300,
                      color: "#824D5C",
                      mb: 1,
                      fontStyle: "italic",
                    }}
                  >
                    {t("personalize.celebrateName", { name: personalization.childName ?? "" })}
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: 14,
                      color: "#9a8a92",
                      lineHeight: 1.7,
                      maxWidth: 300,
                      mx: "auto",
                      mb: 3,
                    }}
                  >
                    {t("personalize.celebrateSub", { name: personalization.childName ?? "" })}
                  </Typography>

                  <Box sx={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
                    {[
                      personalization.childName ?? "",
                      personalization.gender === "female"
                        ? `🌸 ${t("personalize.girl")}`
                        : `🌊 ${t("personalize.boy")}`,
                      t("personalize.celebrateTagPhoto"),
                      styleDisplay.find((s) => s.id === personalization.visualStyle)?.label ?? "",
                    ].map((tag, i) => (
                      <Box
                        key={i}
                        sx={{
                          px: "16px",
                          py: "8px",
                          background: "#fdf0f3",
                          borderRadius: "999px",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#824D5C",
                          border: "1px solid rgba(130,77,92,0.15)",
                          animation: `tagIn 0.4s cubic-bezier(0.34,1.26,0.64,1) ${0.1 + i * 0.1}s both`,
                        }}
                      >
                        {tag}
                      </Box>
                    ))}
                  </Box>
                </Box>
              ) : (
                <>
                  {activeStep === 0 && (
                    <Box
                      key={activeStep}
                      sx={{ animation: "stepEnter 0.38s cubic-bezier(0.4,0,0.2,1) forwards" }}
                    >
                      <StepHeader
                        eyebrow={eyebrowForStep[0]!}
                        heading={
                          <>
                            {t("personalize.nameHeadingLine1")}
                            <br />
                            <em>{t("personalize.nameHeadingLine2")}</em>
                          </>
                        }
                      />

                      <Typography
                        sx={{
                          fontSize: 13,
                          color: "#9a8a92",
                          lineHeight: 1.7,
                          mb: "28px",
                          maxWidth: 360,
                        }}
                      >
                        {t("personalize.nameSub")}
                      </Typography>

                      <TextField
                        key="child-name-input"
                        fullWidth
                        variant="standard"
                        value={personalization.childName || ""}
                        onChange={(e) => {
                          const sanitized = sanitizeChildName(e.target.value);
                          setPersonalization((prev) => {
                            const updated = { ...prev, childName: sanitized };
                            if (storyId && validateChildName(sanitized).ok && prev.gender) {
                              savePersonalizationSession(
                                storyId,
                                {
                                  childName: sanitized,
                                  gender: prev.gender,
                                  childAgeGroup: prev.childAgeGroup ?? "6_9",
                                  photoPreviewUrl: prev.photoPreviewUrl || "",
                                  visualStyle: prev.visualStyle || "watercolor",
                                },
                                "draft"
                              );
                            }
                            return updated;
                          });
                        }}
                        onBlur={() => setChildNameBlurred(true)}
                        error={Boolean(childNameFieldHelperText)}
                        helperText={
                          childNameFieldHelperText || showChildNameScriptWarning ? (
                            <>
                              {childNameFieldHelperText ? (
                                <Typography
                                  component="span"
                                  variant="caption"
                                  sx={{
                                    color: "error.main",
                                    display: "block",
                                    textAlign: isRTL ? "right" : "left",
                                  }}
                                >
                                  {childNameFieldHelperText}
                                </Typography>
                              ) : null}
                              {showChildNameScriptWarning ? (
                                <Typography
                                  component="span"
                                  variant="caption"
                                  sx={{
                                    color: "warning.main",
                                    display: "block",
                                    mt: childNameFieldHelperText ? 0.75 : 0,
                                    textAlign: isRTL ? "right" : "left",
                                  }}
                                >
                                  {t("personalize.nameScriptMismatchWarning")}
                                </Typography>
                              ) : null}
                            </>
                          ) : undefined
                        }
                        FormHelperTextProps={{
                          component: "div",
                          sx: { textAlign: isRTL ? "right" : "left" },
                        }}
                        placeholder={t("personalize.namePlaceholder")}
                        inputProps={{ maxLength: 30, dir: isRTL ? "rtl" : "ltr" }}
                        sx={{
                          mb: "6px",
                          "& .MuiInput-root": {
                            fontFamily: "'Cormorant Garamond', serif",
                            fontSize: 34,
                            fontWeight: 300,
                            color: "#1c1118",
                            "&::before": { borderBottom: "2px solid #ddd4ca" },
                            "&::after": { borderBottom: "2px solid #824D5C" },
                            "&:hover:not(.Mui-disabled):before": { borderBottom: "2px solid #B07A8A" },
                          },
                          "& .MuiInput-input": {
                            pb: "10px",
                            "&::placeholder": { color: "#ddd4ca", opacity: 1 },
                          },
                        }}
                      />

                      <Typography sx={{ fontSize: 11, color: "#9a8a92", mb: "20px" }}>
                        {t("personalize.nameHint")}
                      </Typography>

                      <Box
                        sx={{
                          p: "16px 20px",
                          background: "linear-gradient(135deg, #fdf8f5, #faf4f0)",
                          borderRadius: "12px",
                          borderLeft: "3px solid #d4a8b4",
                          fontFamily: "'Cormorant Garamond', serif",
                          fontSize: 17,
                          fontStyle: "italic",
                          color: "#5a4a52",
                          lineHeight: 1.7,
                          position: "relative",
                          overflow: "hidden",
                          transition: "all 0.4s ease",
                          "&::before": {
                            content: '"\\201C"',
                            position: "absolute",
                            top: "-6px",
                            left: "10px",
                            fontSize: 60,
                            color: "#d4a8b4",
                            opacity: 0.18,
                            fontFamily: "'Cormorant Garamond', serif",
                            lineHeight: 1,
                            pointerEvents: "none",
                          },
                        }}
                      >
                        {previewResult.filled ? (
                          <>
                            {previewResult.text.slice(0, previewResult.nameStart)}
                            <Box
                              component="span"
                              sx={{
                                fontStyle: "normal",
                                fontWeight: 600,
                                color: "#824D5C",
                                fontFamily: "'Cormorant Garamond', serif",
                                position: "relative",
                                display: "inline",
                                "&::after": {
                                  content: '""',
                                  position: "absolute",
                                  bottom: "-1px",
                                  left: 0,
                                  right: 0,
                                  height: "2px",
                                  background: "#d4a8b4",
                                  borderRadius: "1px",
                                },
                              }}
                            >
                              {previewResult.text.slice(previewResult.nameStart, previewResult.nameEnd)}
                            </Box>
                            {previewResult.text.slice(previewResult.nameEnd)}
                          </>
                        ) : (
                          <Box component="span" sx={{ color: "#9a8a92" }}>
                            {previewResult.text}
                          </Box>
                        )}
                      </Box>
                    </Box>
                  )}

                  {activeStep === 1 && (
                    <Box
                      key={activeStep}
                      sx={{ animation: "stepEnter 0.38s cubic-bezier(0.4,0,0.2,1) forwards" }}
                    >
                      <StepHeader
                        eyebrow={eyebrowForStep[1]!}
                        heading={
                          <>
                            {t("personalize.genderHeadingLine1")}
                            <br />
                            <em>{t("personalize.genderHeadingLine2")}</em>
                          </>
                        }
                      />
                      <Typography
                        sx={{
                          fontSize: 13,
                          color: "#9a8a92",
                          lineHeight: 1.7,
                          mb: "28px",
                          maxWidth: 360,
                        }}
                      >
                        {t("personalize.genderSub")}
                      </Typography>

                      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        {(["female", "male"] as const).map((g) => {
                          const isGirl = g === "female";
                          const selected = personalization.gender === g;
                          return (
                            <Box
                              key={g}
                              onClick={() => handleGenderSelect(g)}
                              sx={{
                                border: `2px solid ${selected ? (isGirl ? "#c47a8a" : "#7a9cc4") : "#ddd4ca"}`,
                                borderRadius: "20px",
                                p: "28px 20px 22px",
                                textAlign: "center",
                                cursor: "pointer",
                                position: "relative",
                                overflow: "hidden",
                                transition: "all 0.35s cubic-bezier(0.34,1.26,0.64,1)",
                                background: selected
                                  ? isGirl
                                    ? "linear-gradient(145deg, #fdf0f5, #fce5ef, #f9dde8)"
                                    : "linear-gradient(145deg, #eef3fd, #e4edfb, #dce6f8)"
                                  : "#fff",
                                transform: selected ? "translateY(-5px)" : "translateY(0)",
                                boxShadow: selected
                                  ? isGirl
                                    ? "0 12px 40px rgba(196,122,138,0.2)"
                                    : "0 12px 40px rgba(122,156,196,0.2)"
                                  : "none",
                                "&:hover": {
                                  transform: "translateY(-5px)",
                                  boxShadow: "0 12px 40px rgba(28,17,24,0.14)",
                                  background: isGirl
                                    ? "linear-gradient(145deg, #fdf0f5, #fce5ef)"
                                    : "linear-gradient(145deg, #eef3fd, #e4edfb)",
                                },
                              }}
                            >
                              {selected && (
                                <Box
                                  sx={{
                                    position: "absolute",
                                    top: "12px",
                                    right: "12px",
                                    width: 22,
                                    height: 22,
                                    borderRadius: "50%",
                                    background: "#824D5C",
                                    color: "#fff",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 11,
                                    zIndex: 2,
                                    animation: "checkPop 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards",
                                  }}
                                >
                                  ✓
                                </Box>
                              )}

                              <Typography
                                sx={{
                                  fontSize: 48,
                                  display: "block",
                                  mb: "12px",
                                  position: "relative",
                                  zIndex: 1,
                                  transition: "transform 0.35s cubic-bezier(0.34,1.26,0.64,1)",
                                  transform: selected ? "scale(1.12)" : "scale(1)",
                                }}
                              >
                                {isGirl ? "🌸" : "🌊"}
                              </Typography>

                              <Typography
                                sx={{
                                  fontSize: 16,
                                  fontWeight: 600,
                                  color: "#1c1118",
                                  position: "relative",
                                  zIndex: 1,
                                }}
                              >
                                {isGirl ? t("personalize.girl") : t("personalize.boy")}
                              </Typography>
                              <Typography
                                sx={{
                                  fontSize: 11,
                                  color: "#9a8a92",
                                  mt: "4px",
                                  position: "relative",
                                  zIndex: 1,
                                }}
                              >
                                {isGirl ? t("personalize.girlPronouns") : t("personalize.boyPronouns")}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>
                  )}

                  {activeStep === 2 && (
                    <Box
                      key={activeStep}
                      sx={{ animation: "stepEnter 0.38s cubic-bezier(0.4,0,0.2,1) forwards" }}
                    >
                      <StepHeader
                        eyebrow={eyebrowForStep[2]!}
                        heading={
                          <>
                            {t("personalize.photoHeadingLine1")}
                            <br />
                            <em>
                              {personalization.childName || t("personalize.photoHeadingFallback")}
                            </em>
                          </>
                        }
                      />
                      <Typography
                        sx={{
                          fontSize: 13,
                          color: "#9a8a92",
                          lineHeight: 1.7,
                          mb: "28px",
                          maxWidth: 360,
                        }}
                      >
                        {t("personalize.photoSub", {
                          name:
                            personalization.childName?.trim() || t("personalize.photoSubFallback"),
                        })}
                      </Typography>

                      <Box
                        onClick={() => fileInputRef.current?.click()}
                        sx={{
                          border: `2px ${personalization.photoPreviewUrl ? "solid #B07A8A" : "dashed #ddd4ca"}`,
                          borderRadius: "24px",
                          p: personalization.photoPreviewUrl ? "24px" : "36px 28px",
                          textAlign: "center",
                          cursor: "pointer",
                          transition: "all 0.35s ease",
                          background: personalization.photoPreviewUrl ? "#fff" : "#f8f4ef",
                          position: "relative",
                          overflow: "hidden",
                          "&:hover": {
                            borderColor: "#B07A8A",
                            background: "#fdf0f3",
                            ...(personalization.photoPreviewUrl && {
                              "&::after": {
                                opacity: 1,
                              },
                            }),
                          },
                          ...(personalization.photoPreviewUrl
                            ? {
                                "&::after": {
                                  content: `"${t("personalize.replacePhoto")}"`,
                                  position: "absolute",
                                  inset: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  background: "rgba(130,77,92,0.85)",
                                  color: "#fff",
                                  fontSize: 13,
                                  fontWeight: 600,
                                  borderRadius: "22px",
                                  opacity: 0,
                                  transition: "opacity 0.25s",
                                },
                              }
                            : {}),
                        }}
                      >
                        <Box
                          sx={{
                            width: 110,
                            height: 110,
                            borderRadius: "50%",
                            background: personalization.photoPreviewUrl
                              ? "transparent"
                              : "linear-gradient(135deg, #e8d5dc, #d4c0c8)",
                            mx: "auto",
                            mb: "16px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: personalization.photoPreviewUrl ? "unset" : 44,
                            border: "5px solid #fff",
                            boxShadow: personalization.photoPreviewUrl
                              ? "0 14px 40px rgba(130,77,92,0.28)"
                              : "0 8px 28px rgba(130,77,92,0.2)",
                            position: "relative",
                            zIndex: 1,
                            transition:
                              "transform 0.4s cubic-bezier(0.34,1.26,0.64,1), box-shadow 0.4s",
                            transform: personalization.photoPreviewUrl ? "scale(1.06)" : "scale(1)",
                            overflow: "hidden",
                          }}
                        >
                          {personalization.photoPreviewUrl ? (
                            <Box
                              component="img"
                              src={personalization.photoPreviewUrl}
                              alt={t("personalize.childPhoto")}
                              sx={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                borderRadius: "50%",
                              }}
                            />
                          ) : (
                            "📷"
                          )}
                        </Box>

                        {personalization.photoPreviewUrl ? (
                          <>
                            <Typography
                              sx={{
                                fontSize: 15,
                                fontWeight: 600,
                                color: "#824D5C",
                                mb: "4px",
                                position: "relative",
                                zIndex: 1,
                              }}
                            >
                              {t("personalize.photoAdded")}
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: 12,
                                color: "#9a8a92",
                                position: "relative",
                                zIndex: 1,
                              }}
                            >
                              {t("personalize.tapToReplace")}
                            </Typography>
                          </>
                        ) : (
                          <>
                            <Typography
                              sx={{
                                fontSize: 15,
                                fontWeight: 600,
                                color: "#1c1118",
                                mb: "6px",
                                position: "relative",
                                zIndex: 1,
                              }}
                            >
                              {t("personalize.uploadPhoto")}
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: 12,
                                color: "#9a8a92",
                                lineHeight: 1.6,
                                position: "relative",
                                zIndex: 1,
                                whiteSpace: "pre-line",
                              }}
                            >
                              {t("personalize.uploadHint")}
                            </Typography>
                          </>
                        )}
                      </Box>

                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "20px",
                          mt: "16px",
                          flexWrap: "wrap",
                        }}
                      >
                        {[t("personalize.trust1"), t("personalize.trust2"), t("personalize.trust3")].map(
                          (text) => (
                            <Box key={text} sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <Box
                                sx={{
                                  width: 7,
                                  height: 7,
                                  borderRadius: "50%",
                                  background: "#4caf50",
                                  flexShrink: 0,
                                }}
                              />
                              <Typography sx={{ fontSize: 11, color: "#9a8a92" }}>{text}</Typography>
                            </Box>
                          )
                        )}
                      </Box>

                      {!personalization.photoPreviewUrl && (
                        <Typography
                          variant="caption"
                          color="error"
                          sx={{ display: "block", mt: 2, textAlign: "center" }}
                        >
                          {t("personalize.photoRequired")}
                        </Typography>
                      )}

                      {photoUploadError && (
                        <Typography
                          variant="caption"
                          color="error"
                          sx={{ display: "block", mt: 1, textAlign: "center" }}
                        >
                          {photoUploadError}
                        </Typography>
                      )}

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={ACCEPTED_EXTENSIONS}
                        onChange={handlePhotoUpload}
                        style={{ display: "none" }}
                      />
                    </Box>
                  )}

                  {activeStep === 3 && (
                    <Box
                      key={activeStep}
                      sx={{ animation: "stepEnter 0.38s cubic-bezier(0.4,0,0.2,1) forwards" }}
                    >
                      <StepHeader
                        eyebrow={eyebrowForStep[3]!}
                        heading={
                          <>
                            {t("personalize.styleHeadingLine1")}
                            <br />
                            <em>{t("personalize.styleHeadingLine2")}</em>
                          </>
                        }
                      />
                      <Typography
                        sx={{
                          fontSize: 13,
                          color: "#9a8a92",
                          lineHeight: 1.7,
                          mb: "28px",
                          maxWidth: 360,
                        }}
                      >
                        {t("personalize.styleSub", {
                          name:
                            personalization.childName?.trim() || t("personalize.styleSubFallback"),
                        })}
                      </Typography>

                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)" },
                          gap: "12px",
                        }}
                      >
                        {styleDisplay.map((style) => {
                          const thumbSrc = VISUAL_STYLES.find((v) => v.id === style.id)?.image;
                          const selected = personalization.visualStyle === style.id;

                          return (
                            <Box
                              key={style.id}
                              onClick={() => handleStyleSelect(style.id)}
                              sx={{
                                borderRadius: "14px",
                                overflow: "hidden",
                                border: `2px solid ${selected ? "#824D5C" : "#ddd4ca"}`,
                                cursor: "pointer",
                                transition: "all 0.3s cubic-bezier(0.34,1.26,0.64,1)",
                                position: "relative",
                                background: "#fff",
                                boxShadow: selected ? "0 0 0 4px rgba(130,77,92,0.12)" : "none",
                                transform: selected ? "translateY(-5px) scale(1.02)" : "translateY(0)",
                                "&:hover": {
                                  transform: "translateY(-5px) scale(1.02)",
                                  boxShadow: "0 12px 40px rgba(28,17,24,0.14)",
                                },
                              }}
                            >
                              {selected && (
                                <Box
                                  sx={{
                                    position: "absolute",
                                    top: 7,
                                    right: 7,
                                    width: 18,
                                    height: 18,
                                    borderRadius: "50%",
                                    background: "#824D5C",
                                    color: "#fff",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 10,
                                    zIndex: 1,
                                  }}
                                >
                                  ✓
                                </Box>
                              )}

                              <Box
                                sx={{
                                  height: 72,
                                  background: thumbSrc ? "none" : style.bg,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  overflow: "hidden",
                                }}
                              >
                                {thumbSrc ? (
                                  <Box
                                    component="img"
                                    src={thumbSrc}
                                    alt={style.label}
                                    sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                                  />
                                ) : (
                                  <Typography sx={{ fontSize: 30 }}>{style.emoji}</Typography>
                                )}
                              </Box>

                              <Typography
                                sx={{
                                  p: "8px 10px 10px",
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: "#1c1118",
                                  textAlign: "center",
                                }}
                              >
                                {style.label}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>
                  )}
                </>
              )}
            </Box>

            <Box
              dir={direction}
              sx={{
                px: "44px",
                py: "20px",
                borderTop: "1px solid #f8f4ef",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "14px",
              }}
            >
              {isCelebration ? (
                <Box sx={{ width: "100%" }}>
                  <Button
                    onClick={handleComplete}
                    disabled={isSaving}
                    variant="contained"
                    fullWidth
                    sx={{
                      px: "28px",
                      py: "13px",
                      background: "linear-gradient(110deg, #170d1e 0%, #824D5C 100%)",
                      border: "none",
                      borderRadius: "12px",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#fff",
                      boxShadow: "0 4px 16px rgba(130,77,92,0.25)",
                      transition: "all 0.3s cubic-bezier(0.34,1.26,0.64,1)",
                      textTransform: "none",
                      position: "relative",
                      overflow: "hidden",
                      "&::before": {
                        content: '""',
                        position: "absolute",
                        inset: 0,
                        background: "linear-gradient(110deg, rgba(255,255,255,0.12), transparent)",
                        pointerEvents: "none",
                      },
                      "&:hover": {
                        transform: "translateY(-2px) scale(1.02)",
                        boxShadow: "0 10px 30px rgba(130,77,92,0.4)",
                      },
                      "&.Mui-disabled": {
                        background: "linear-gradient(110deg, #170d1e 0%, #824D5C 100%)",
                        color: "#fff",
                        opacity: 0.7,
                      },
                    }}
                  >
                    {isSaving
                      ? t("personalize.saving")
                      : skipPreviewMode || quota?.hasUsedPreview
                        ? t("personalize.continueWithoutPreview")
                        : t("personalize.startStory")}
                  </Button>
                  {saveError && (
                    <Typography color="error" variant="caption" sx={{ mt: 1, display: "block" }}>
                      {saveError}
                    </Typography>
                  )}
                </Box>
              ) : (
                <>
                  <Button
                    onClick={handleBack}
                    disabled={activeStep === 0}
                    sx={{
                      px: "22px",
                      py: "11px",
                      border: "1.5px solid #ddd4ca",
                      borderRadius: "12px",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#9a8a92",
                      background: "transparent",
                      transition: "all 0.25s",
                      "&:hover": {
                        borderColor: "#B07A8A",
                        color: "#824D5C",
                        background: "transparent",
                      },
                      "&:disabled": { opacity: 0.25 },
                      textTransform: "none",
                      "& .arrow": { transform: isRTL ? "rotate(180deg)" : "none", display: "inline-block" },
                    }}
                  >
                    <span className="arrow">←</span>&nbsp;{t("personalize.labelBack")}
                  </Button>

                  <Button
                    onClick={handleNext}
                    disabled={!isStepValid(activeStep)}
                    sx={{
                      flex: 1,
                      maxWidth: 240,
                      px: "28px",
                      py: "13px",
                      background: isFormLastStep
                        ? "linear-gradient(110deg, #170d1e 0%, #824D5C 100%)"
                        : "linear-gradient(110deg, #824D5C 0%, #B07A8A 100%)",
                      border: "none",
                      borderRadius: "12px",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#fff",
                      boxShadow: "0 4px 16px rgba(130,77,92,0.25)",
                      transition: "all 0.3s cubic-bezier(0.34,1.26,0.64,1)",
                      textTransform: "none",
                      position: "relative",
                      overflow: "hidden",
                      "&::before": {
                        content: '""',
                        position: "absolute",
                        inset: 0,
                        background: "linear-gradient(110deg, rgba(255,255,255,0.12), transparent)",
                        pointerEvents: "none",
                      },
                      "&:hover:not(:disabled)": {
                        transform: "translateY(-2px) scale(1.02)",
                        boxShadow: "0 10px 30px rgba(130,77,92,0.4)",
                      },
                      "&:active:not(:disabled)": {
                        transform: "translateY(0) scale(0.99)",
                      },
                      "&:disabled": { opacity: 0.35, transform: "none", boxShadow: "none" },
                    }}
                  >
                    {isFormLastStep
                      ? `✨ ${t("personalize.createStory")}`
                      : `${t("personalize.labelContinue")} ${isRTL ? "←" : "→"}`}
                  </Button>
                </>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
