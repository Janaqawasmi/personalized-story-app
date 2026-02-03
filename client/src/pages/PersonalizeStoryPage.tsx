import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  CardMedia,
  useTheme,
  CircularProgress,
} from "@mui/material";
import { useState, useRef, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useLangNavigate } from "../i18n/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useTranslation } from "../i18n/useTranslation";
import { useLanguage } from "../i18n/context/useLanguage";

// Import style images
import watercolorImg from "../assets/story-styles/watercolor.jpeg";
import semiRealisticImg from "../assets/story-styles/semi-realistic.jpeg";
import flatCartoonImg from "../assets/story-styles/flat-cartoon.jpeg";
import paperCraftImg from "../assets/story-styles/paper-craft.jpeg";
import vintageGoldenImg from "../assets/story-styles/vintage-1950s-little-golden.jpeg";

type VisualStyle =
  | "watercolor"
  | "semi_realistic"
  | "flat_cartoon"
  | "paper_craft"
  | "vintage_1950s_little_golden";

type StoryPersonalizationData = {
  childName: string;
  gender: "female" | "male";
  photoFile?: File; // Not stored in localStorage (File objects can't be serialized)
  photoPreviewUrl: string; // REQUIRED
  visualStyle: VisualStyle;
};

type PersonalizationSession = {
  status: "draft" | "completed";
  data: StoryPersonalizationData;
  updatedAt: number;
};

type StoryTemplate = {
  id: string;
  title: string;
  language?: string;
  ageGroup?: string;
  targetAgeGroup?: string;
  generationConfig?: {
    targetAgeGroup?: string;
  };
};

// STEPS and GENDER_OPTIONS are now loaded dynamically using translations



// Visual style configuration
// Each style is represented by a static reference image selected by the user
// The chosen style ID is later injected into the generative prompt
const VISUAL_STYLES = [
  {
    id: "watercolor" as const,
    image: watercolorImg,
  },
  {
    id: "semi_realistic" as const,
    image: semiRealisticImg,
  },
  {
    id: "flat_cartoon" as const,
    image: flatCartoonImg,
  },
  {
    id: "paper_craft" as const,
    image: paperCraftImg,
  },
  {
    id: "vintage_1950s_little_golden" as const,
    image: vintageGoldenImg,
  },
];

function getPersonalizationKey(storyId: string): string {
  return `qosati_personalization_${storyId}`;
}

function loadPersonalizationSession(storyId: string): PersonalizationSession | null {
  const key = getPersonalizationKey(storyId);
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
  const key = getPersonalizationKey(storyId);
  const session: PersonalizationSession = {
    status,
    data: {
      childName: data.childName,
      gender: data.gender,
      photoPreviewUrl: data.photoPreviewUrl,
      visualStyle: data.visualStyle,
      // Note: photoFile is not stored (File objects can't be serialized)
    },
    updatedAt: Date.now(),
  };
  localStorage.setItem(key, JSON.stringify(session));
}

function deletePersonalizationSession(storyId: string): void {
  const key = getPersonalizationKey(storyId);
  localStorage.removeItem(key);
}

export default function PersonalizeStoryPage() {
  const theme = useTheme();
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useLangNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslation();
  const { language, direction, isRTL } = useLanguage();
  
  // Load steps and options dynamically based on language - memoized based on language to prevent recreation
  const STEPS = useMemo(() => [
    t("personalize.steps.step1"),
    t("personalize.steps.step2"),
    t("personalize.steps.step3"),
    t("personalize.steps.step4"),
    t("personalize.steps.step5"),
  ], [t, language]); // Include language to update when language changes
  
  const GENDER_OPTIONS = useMemo(() => [
    { value: "female" as const, label: t("personalize.gender.female") },
    { value: "male" as const, label: t("personalize.gender.male") },
  ], [t, language]); // Include language to update when language changes

  const [story, setStory] = useState<StoryTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [personalization, setPersonalization] = useState<Partial<StoryPersonalizationData>>({
    childName: "",
    gender: undefined,
    visualStyle: "watercolor", // Default to first style
  });
  const [session, setSession] = useState<PersonalizationSession | null>(null);
  const [showResumeScreen, setShowResumeScreen] = useState(false);
  const [showCompletedScreen, setShowCompletedScreen] = useState(false);
  const [showFinalError, setShowFinalError] = useState(false);

  // Diagnostic: Log mount/unmount and state changes
  useEffect(() => {
    console.log("[PersonalizeStoryPage] MOUNTED - lang:", language, "storyId:", storyId, "activeStep:", activeStep);
    return () => {
      console.log("[PersonalizeStoryPage] UNMOUNTED - lang:", language, "storyId:", storyId);
    };
  }, []); // Only on mount/unmount

  useEffect(() => {
    console.log("[PersonalizeStoryPage] State update - activeStep:", activeStep, "childName:", personalization.childName, "lang:", language);
  }, [activeStep, personalization.childName, language]);

  // Load story template - ONLY when storyId changes, NOT on every render
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
          generationConfig: data.generationConfig,
        });

        // Load existing session and determine flow
        const existingSession = loadPersonalizationSession(storyId);
        setSession(existingSession);

        if (existingSession) {
          if (existingSession.status === "completed") {
            // Show completed decision screen
            setShowCompletedScreen(true);
          } else if (existingSession.status === "draft") {
            // Show resume screen
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
  }, [storyId]); // Only depend on storyId - navigate and t are stable

  // Step-specific validation (only validates current step)
  const validateCurrentStep = (step: number): boolean => {
    switch (step) {
      case 0:
        return (personalization.childName?.trim().length ?? 0) >= 2;
      case 1:
        return !!personalization.gender;
      case 2:
        // Photo is REQUIRED
        return !!(personalization.photoFile && personalization.photoPreviewUrl);
      case 3:
        return !!personalization.visualStyle;
      default:
        return true;
    }
  };

  // Global validation (only for final submit)
  const validateAllSteps = (): boolean => {
    return !!(
      personalization.childName &&
      personalization.gender &&
      personalization.photoFile &&
      personalization.photoPreviewUrl &&
      personalization.visualStyle
    );
  };

  // Infer step from data (for resume logic)
  const inferStepFromData = (data: StoryPersonalizationData): number => {
    if (!data.childName || data.childName.trim().length < 2) return 0;
    if (!data.gender) return 1;
    if (!data.photoPreviewUrl) return 2;
    if (!data.visualStyle) return 3;
    return 4; // Review step
  };

  const handleNext = () => {
    // Only validate current step, not all steps
    if (!validateCurrentStep(activeStep)) {
      // Don't show alert - just block progression
      // The UI already shows validation feedback via disabled button
      return;
    }

    if (activeStep < STEPS.length - 1) {
      setActiveStep(activeStep + 1);
      setShowFinalError(false); // Clear any previous errors
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

    if (file.size > 5 * 1024 * 1024) {
      alert(t("personalize.imageTooLarge"));
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
      
      // Auto-save as draft after photo upload
      if (storyId && updated.childName && updated.gender && updated.visualStyle) {
        savePersonalizationSession(
          storyId,
          {
            childName: updated.childName,
            gender: updated.gender,
            photoPreviewUrl: reader.result as string,
            visualStyle: updated.visualStyle,
          },
          "draft"
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const handleComplete = () => {
    if (!storyId) return;

    // Global validation ONLY on final submit
    if (!validateAllSteps()) {
      setShowFinalError(true);
      // Scroll to top to show error message
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setShowFinalError(false);

    // Create complete personalization data
    const completePersonalization: StoryPersonalizationData = {
      childName: personalization.childName!,
      gender: personalization.gender!,
      photoFile: personalization.photoFile!,
      photoPreviewUrl: personalization.photoPreviewUrl!,
      visualStyle: personalization.visualStyle!,
    };

    // Save as completed session
    savePersonalizationSession(storyId, completePersonalization, "completed");
    navigate(`/stories/${storyId}/read`);
  };


  // Resume from draft
  const handleResume = () => {
    if (!session || session.status !== "draft") return;
    
    // Restore personalization data
    setPersonalization(session.data);
    
    // Infer step from data (where user left off)
    const step = inferStepFromData(session.data);
    setActiveStep(step);
    
    // Clear any error states
    setShowFinalError(false);
    setShowResumeScreen(false);
  };

  // Start over from draft
  const handleStartOver = () => {
    if (!storyId) return;
    deletePersonalizationSession(storyId);
    setSession(null);
    setPersonalization({
      childName: "",
      gender: undefined,

      visualStyle: "watercolor",
    });
    setActiveStep(0);
    setShowResumeScreen(false);
  };

  // Start new personalization from completed
  const handleStartNew = () => {
    if (!storyId) return;
    deletePersonalizationSession(storyId);
    setSession(null);
    setPersonalization({
      childName: "",
      gender: undefined,
      visualStyle: "watercolor",
    });
    setActiveStep(0);
    setShowCompletedScreen(false);
  };

  // Use previous personalization from completed
  const handleUsePrevious = () => {
    if (!session || session.status !== "completed" || !storyId) return;
    
    // Mark as draft if user wants to edit
    // Navigate directly to reader (they can edit later if needed)
    navigate(`/stories/${storyId}/read`);
  };

  // Keep isStepValid for UI (button disabled state)
  // This uses validateCurrentStep to ensure consistency
  const isStepValid = (step: number): boolean => {
    return validateCurrentStep(step);
  };

  if (loading) {
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

  // Resume Screen (Draft exists)
  if (showResumeScreen && session?.status === "draft") {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          backgroundColor: theme.palette.background.default,
          direction: direction,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 3,
        }}
      >
        <Card
          sx={{
            maxWidth: 500,
            width: "100%",
            p: 4,
            textAlign: "center",
            borderRadius: 5,
            boxShadow: "0 30px 80px rgba(0,0,0,0.08)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.98))",
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
        </Card>
      </Box>
    );
  }

  // Completed Decision Screen
  if (showCompletedScreen && session?.status === "completed") {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          backgroundColor: theme.palette.background.default,
          direction: direction,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 3,
        }}
      >
        <Card
          sx={{
            maxWidth: 500,
            width: "100%",
            p: 4,
            textAlign: "center",
            borderRadius: 5,
            boxShadow: "0 30px 80px rgba(0,0,0,0.08)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.98))",
          }}
        >
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
            {t("personalize.alreadyCompleted")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            {t("personalize.whatToDo")}
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Button
              variant="contained"
              onClick={handleStartNew}
              fullWidth
              sx={{
                backgroundColor: "#824D5C",
                "&:hover": { backgroundColor: "#6f404d" },
                py: 1.5,
              }}
            >
              {t("personalize.newPersonalization")}
            </Button>
            <Button
              variant="outlined"
              onClick={handleUsePrevious}
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
              {t("personalize.usePrevious")}
            </Button>
          </Box>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: theme.palette.background.default,
        direction: direction,
        display: "flex",
        justifyContent: "center",
        px: { xs: 2, md: 4 },
        py: { xs: 4, md: 6 },
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 900 }}>
        <Card
          sx={{
            width: "100%",
            maxWidth: 900,
            borderRadius: 6,
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 30px 80px rgba(0,0,0,0.08)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,255,255,1))",
          }}
        >
          <CardContent
            sx={{
              display: "flex",
              flexDirection: "column",
              p: { xs: 3, md: 5 },
            }}
          >
            {/* Header Section */}
            <Box sx={{ textAlign: "center", mb: 4 }}>
              <Typography
                sx={{
                  fontSize: "0.9rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "text.secondary",
                  mb: 1,
                }}
              >
                {t("personalize.stepOf", { current: activeStep + 1, total: STEPS.length })}
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  mb: 1,
                }}
              >
                {STEPS[activeStep]}
              </Typography>
              <Box
                sx={{
                  height: 6,
                  width: "120px",
                  mx: "auto",
                  borderRadius: 99,
                  background: "linear-gradient(90deg, #824D5C, #B07A8A)",
                  opacity: 0.8,
                }}
              />
            </Box>

            {/* Content Section */}
            <Box
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
            {/* Step 1: Child's Name */}
            {activeStep === 0 && (
              <Box
                sx={{
                  maxWidth: 420,
                  mx: "auto",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: 3,
                }}
              >
                <Typography sx={{ opacity: 0.7, textAlign: "center" }}>
                  {t("personalize.childName")}
                </Typography>
                <TextField
                  key="child-name-input"
                  fullWidth
                  variant="filled"
                  value={personalization.childName || ""}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    console.log("[Step1] onChange - newValue:", newValue, "current state:", personalization.childName, "timestamp:", Date.now());
                    // Use functional update to ensure we have the latest state
                    setPersonalization((prev) => {
                      const updated = { ...prev, childName: newValue };
                      console.log("[Step1] setPersonalization - prev:", prev.childName, "updated:", updated.childName);
                      
                      // Auto-save draft on change (only if we have both name and gender)
                      // This ensures we have valid data for StoryPersonalizationData type
                      if (storyId && newValue.trim().length >= 2 && prev.gender) {
                        savePersonalizationSession(
                          storyId,
                          {
                            childName: newValue,
                            gender: prev.gender,
                            photoPreviewUrl: prev.photoPreviewUrl || "",
                            visualStyle: prev.visualStyle || "watercolor",
                          },
                          "draft"
                        );
                      }
                      
                      return updated;
                    });
                  }}
                  placeholder={t("personalize.enterName")}
                  sx={{ mb: 2 }}
                  inputProps={{ maxLength: 50 }}
                  InputProps={{
                    disableUnderline: true,
                    sx: {
                      borderRadius: 3,
                      backgroundColor: "#F4F1EE",
                      fontSize: "1.1rem",
                      px: 2,
                      direction: direction,
                      textAlign: isRTL ? "right" : "left",
                    },
                  }}
                />
                {personalization.childName &&
                  personalization.childName.length > 0 &&
                  personalization.childName.length < 2 && (
                    <Typography variant="caption" color="error" sx={{ textAlign: "center" }}>
                      {t("personalize.nameMinLength")}
                    </Typography>
                  )}
              </Box>
            )}

            {/* Step 2: Gender */}
            {activeStep === 1 && (
              <Box
                sx={{
                  maxWidth: 420,
                  mx: "auto",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: 3,
                }}
              >
                <Typography sx={{ opacity: 0.7, textAlign: "center" }}>
                  {t("personalize.sensitiveLanguage")}
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {GENDER_OPTIONS.map((option) => (
                    <Card
                      key={option.value}
                      onClick={() => {
                        const updated = { ...personalization, gender: option.value };
                        setPersonalization(updated);
                        // Auto-save draft
                        if (storyId && personalization.childName && personalization.childName.trim().length >= 2) {
                          savePersonalizationSession(
                            storyId,
                            {
                              childName: personalization.childName,
                              gender: option.value,
                              photoPreviewUrl: personalization.photoPreviewUrl || "",
                              visualStyle: personalization.visualStyle || "watercolor",
                            },
                            "draft"
                          );
                        }
                      }}
                      sx={{
                        cursor: "pointer",
                        p: 2.5,
                        borderRadius: 4,
                        backgroundColor:
                          personalization.gender === option.value
                            ? "rgba(130,77,92,0.08)"
                            : "#FAFAFA",
                        border:
                          personalization.gender === option.value
                            ? `2px solid #824D5C`
                            : "2px solid transparent",
                        transition: "all 0.2s ease",
                        "&:hover": {
                          border: `2px solid #824D5C`,
                          transform: "translateY(-2px)",
                          backgroundColor:
                            personalization.gender === option.value
                              ? "rgba(130,77,92,0.12)"
                              : "#F5F5F5",
                        },
                      }}
                    >
                      <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, p: 0 }}>
                        
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>{option.label}</Typography>
                        {personalization.gender === option.value && (
                          <CheckCircleIcon
                            sx={{ [isRTL ? "mr" : "ml"]: "auto", color: "#824D5C", fontSize: 28 }}
                          />
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Box>
            )}

            {/* Step 3: Photo (REQUIRED) */}
            {activeStep === 2 && (
              <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <Typography sx={{ opacity: 0.7, textAlign: "center", mb: 3 }}>
                  {t("personalize.photoUsage")}
                </Typography>

                {personalization.photoPreviewUrl ? (
                  <Box sx={{ textAlign: "center", mb: 3 }}>
                    <Box
                      component="img"
                      src={personalization.photoPreviewUrl}
                      alt={t("personalize.childPhoto")}
                      sx={{
                        maxWidth: "100%",
                        maxHeight: 300,
                        borderRadius: 2,
                        mb: 2,
                      }}
                    />
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setPersonalization({
                          ...personalization,
                          photoFile: undefined,
                          photoPreviewUrl: undefined,
                        });
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                    >
                      {t("personalize.replacePhoto")}
                    </Button>
                  </Box>
                ) : (
                  <Box
                    onClick={() => fileInputRef.current?.click()}
                    sx={{
                      border: "2px dashed",
                      borderColor: theme.palette.divider,
                      borderRadius: 4,
                      p: 4,
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      backgroundColor: "#FAFAFA",
                      "&:hover": {
                        borderColor: "#824D5C",
                        backgroundColor: "rgba(130,77,92,0.04)",
                      },
                    }}
                  >
                    <PhotoCameraIcon sx={{ fontSize: 48, color: "#824D5C", mb: 2, opacity: 0.7 }} />
                    <Typography sx={{ fontWeight: 600, mb: 1 }}>
                      {t("personalize.selectPhoto")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t("personalize.maxSize")}
                    </Typography>
                  </Box>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  style={{ display: "none" }}
                />

                {!personalization.photoPreviewUrl && (
                  <Typography variant="caption" color="error" sx={{ display: "block", mt: 2, textAlign: "center" }}>
                    {t("personalize.photoRequired")}
                  </Typography>
                )}
              </Box>
            )}

            {/* Step 4: Visual Style */}
            {activeStep === 3 && (
              <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <Typography sx={{ opacity: 0.7, textAlign: "center", mb: 3 }}>
                  {t("personalize.affectsIllustrations")}
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, minmax(0, 1fr))" },
                    gap: 2.5,
                    maxHeight: 420,
                    overflowY: "auto",
                    pr: 1,
                  }}
                >
                  {VISUAL_STYLES.map((style) => {
                    const isSelected = personalization.visualStyle === style.id;
                    return (
                      <Card
                        key={style.id}
                        onClick={() =>
                          setPersonalization({ ...personalization, visualStyle: style.id })
                        }
                        sx={{
                          cursor: "pointer",
                          position: "relative",
                          border: isSelected
                            ? `3px solid #824D5C`
                            : "1px solid",
                          borderColor: isSelected
                            ? "#824D5C"
                            : theme.palette.divider,
                          transition: "all 0.2s ease",
                          overflow: "hidden",
                          transform: isSelected ? "scale(1.02)" : "scale(1)",
                          boxShadow: isSelected
                            ? "0 8px 24px rgba(130, 77, 92, 0.25)"
                            : "0 2px 8px rgba(0,0,0,0.08)",
                          "&:hover": {
                            transform: "translateY(-4px) scale(1.02)",
                            boxShadow: "0 12px 32px rgba(0,0,0,0.15)",
                            borderColor: isSelected ? "#824D5C" : theme.palette.primary.light,
                          },
                        }}
                      >
                        <CardMedia
                          component="img"
                          image={style.image}
                          alt={t(`personalize.visualStyles.${style.id}.label`)}
                          sx={{
                            height: 140,
                            objectFit: "cover",
                            backgroundColor: theme.palette.grey[200],
                          }}
                        />
                        <CardContent sx={{ position: "relative", pb: 2 }}>
                          <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 600 }}>
                            {t(`personalize.visualStyles.${style.id}.label`)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.85rem" }}>
                            {t(`personalize.visualStyles.${style.id}.description`)}
                          </Typography>
                          {isSelected && (
                            <CheckCircleIcon
                              sx={{
                                position: "absolute",
                                top: 8,
                                [isRTL ? "left" : "right"]: 8,
                                color: "#824D5C",
                                fontSize: 28,
                                backgroundColor: "rgba(255, 255, 255, 0.9)",
                                borderRadius: "50%",
                                p: 0.5,
                              }}
                            />
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* Step 5: Review */}
            {activeStep === 4 && (
              <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                {showFinalError && (
                  <Box
                    sx={{
                      p: 2,
                      mb: 3,
                      backgroundColor: theme.palette.error.light,
                      borderRadius: 2,
                      border: `1px solid ${theme.palette.error.main}`,
                    }}
                  >
                    <Typography variant="body2" color="error" sx={{ fontWeight: 500 }}>
                      {t("personalize.fillAllFields")}
                    </Typography>
                  </Box>
                )}
                <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {t("personalize.requiredFields.childName")}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {personalization.childName || ""}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {t("personalize.requiredFields.gender")}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {GENDER_OPTIONS.find((g) => g.value === personalization.gender)?.label || ""}
                      </Typography>
                    </Box>
                    {story && (story.ageGroup || story.targetAgeGroup) && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {t("personalize.requiredFields.ageRange")}
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {story.ageGroup || story.targetAgeGroup || story.generationConfig?.targetAgeGroup}
                        </Typography>
                      </Box>
                    )}
                    {personalization.photoPreviewUrl && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                          {t("personalize.requiredFields.childPhoto")}
                        </Typography>
                        <Box
                          component="img"
                          src={personalization.photoPreviewUrl}
                          alt={t("personalize.childPhoto")}
                          sx={{
                            maxWidth: 150,
                            maxHeight: 150,
                            borderRadius: 2,
                          }}
                        />
                      </Box>
                    )}
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {t("personalize.requiredFields.visualStyle")}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {personalization.visualStyle ? t(`personalize.visualStyles.${personalization.visualStyle}.label`) : ""}
                      </Typography>
                    </Box>
                  </Box>
                </Card>
              </Box>
            )}
            </Box>

            {/* Navigation Buttons Footer */}
            <Box
              dir={direction}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                gap: 2,
                mt: 4,
                pt: 3,
                borderTop: "1px solid rgba(0,0,0,0.05)",
              }}
            >
          <Button
            onClick={handleBack}
            disabled={activeStep === 0}
            {...(isRTL ? { endIcon: <ArrowForwardIcon /> } : { startIcon: <ArrowForwardIcon sx={{ transform: "rotate(180deg)" }} /> })}
            variant="outlined"
            aria-label={t("personalize.back")}
            sx={{
              borderColor: "#824D5C",
              color: "#824D5C",
              "&:hover": {
                borderColor: "#6f404d",
                backgroundColor: "rgba(130,77,92,0.08)",
              },
            }}
          >
            {t("personalize.back")}
          </Button>
          {activeStep < STEPS.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!isStepValid(activeStep)}
              variant="contained"
              sx={{
                backgroundColor: "#824D5C",
                "&:hover": { backgroundColor: "#6f404d" },
              }}
            >
              {t("personalize.continueJourney")}
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              variant="contained"
              sx={{
                backgroundColor: "#824D5C",
                "&:hover": { backgroundColor: "#6f404d" },
              }}
            >
              {t("personalize.createStory")}
            </Button>
          )}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

