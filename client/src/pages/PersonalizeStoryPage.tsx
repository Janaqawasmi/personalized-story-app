import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  CardMedia,
  Stepper,
  Step,
  StepLabel,
  IconButton,
  useTheme,
  CircularProgress,
} from "@mui/material";
import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

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
  gender: "female" | "male" | "neutral";
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

const STEPS = [
  "שם הילד",
  "מגדר ודקדוק",
  "תמונת הילד",
  "סגנון ויזואלי",
  "סיכום ואישור",
];

const GENDER_OPTIONS = [
  { value: "female" as const, label: "בת", icon: "👧" },
  { value: "male" as const, label: "בן", icon: "👦" },
  { value: "neutral" as const, label: "ניטרלי / מעדיף לא לציין", icon: "⚪" },
];


// Visual style configuration
// Each style is represented by a static reference image selected by the user
// The chosen style ID is later injected into the generative prompt
const VISUAL_STYLES = [
  {
    id: "watercolor" as const,
    label: "Watercolour",
    labelHebrew: "צבעי מים",
    description: "Soft, dreamy, hand-painted illustrations",
    descriptionHebrew: "איורים רכים, חלומיים, צבועים ביד",
    image: watercolorImg,
  },
  {
    id: "semi_realistic" as const,
    label: "Semi-Realistic",
    labelHebrew: "חצי-ריאליסטי",
    description: "Gentle realism with emotional depth",
    descriptionHebrew: "ריאליזם עדין עם עומק רגשי",
    image: semiRealisticImg,
  },
  {
    id: "flat_cartoon" as const,
    label: "Flat Digital Cartoon",
    labelHebrew: "קריקטורה דיגיטלית שטוחה",
    description: "Clean shapes and bright digital colors",
    descriptionHebrew: "צורות נקיות וצבעים דיגיטליים בהירים",
    image: flatCartoonImg,
  },
  {
    id: "paper_craft" as const,
    label: "Paper-Craft Children's Book",
    labelHebrew: "ספר ילדים מלאכת יד",
    description: "Layered, handcrafted paper textures",
    descriptionHebrew: "מרקמי נייר בשכבות, מלאכת יד",
    image: paperCraftImg,
  },
  {
    id: "vintage_1950s_little_golden" as const,
    label: "Vintage 1950s Little Golden Storybook",
    labelHebrew: "וינטג' שנות ה-50 · ספר זהב",
    description: "Classic 1950s Little Golden Books aesthetic",
    descriptionHebrew: "אסתטיקה קלאסית של ספרי הזהב משנות ה-50",
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
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [story, setStory] = useState<StoryTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [personalization, setPersonalization] = useState<Partial<StoryPersonalizationData>>({
    childName: "",
    gender: "neutral",
    visualStyle: "watercolor", // Default to first style
  });
  const [session, setSession] = useState<PersonalizationSession | null>(null);
  const [showResumeScreen, setShowResumeScreen] = useState(false);
  const [showCompletedScreen, setShowCompletedScreen] = useState(false);
  const [showFinalError, setShowFinalError] = useState(false);

  const isRTL = true; // Hebrew/Arabic

  // Load story template
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
          title: data.title || "סיפור",
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
  }, [storyId, navigate]);

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
      alert("התמונה גדולה מדי. אנא בחר תמונה קטנה מ-5MB");
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
      gender: "neutral",
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
      gender: "neutral",
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
          direction: "rtl",
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
            borderRadius: 3,
          }}
        >
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
            המשך התאמה אישית
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            התחלת להתאים את הסיפור הזה. מה תרצה לעשות?
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
              המשך מהמקום שעצרת
            </Button>
            <Button
              variant="outlined"
              onClick={handleStartOver}
              fullWidth
              sx={{ py: 1.5 }}
            >
              התחל מחדש
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
          direction: "rtl",
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
            borderRadius: 3,
          }}
        >
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
            כבר התאמת את הסיפור הזה
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            מה תרצה לעשות?
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
              התחל התאמה אישית חדשה
            </Button>
            <Button
              variant="outlined"
              onClick={handleUsePrevious}
              fullWidth
              sx={{ py: 1.5 }}
            >
              השתמש בהתאמה הקודמת
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
        direction: "rtl",
        py: 4,
        px: { xs: 2, md: 4 },
      }}
    >
      <Box sx={{ maxWidth: 800, mx: "auto" }}>
        {/* Header */}
        <Box sx={{ mb: 4, textAlign: "center" }}>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            התאמה אישית של הסיפור
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {story.title}
          </Typography>
        </Box>

        {/* Progress Stepper */}
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step Content */}
        <Card
          sx={{
            mb: 4,
            borderRadius: 3,
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          }}
        >
          <CardContent sx={{ p: { xs: 3, md: 5 } }}>
            {/* Step 1: Child's Name */}
            {activeStep === 0 && (
              <Box>
                <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                  מה שם הילד שלך?
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  השם הזה יופיע בסיפור.
                </Typography>
                <TextField
                  fullWidth
                  value={personalization.childName || ""}
                  onChange={(e) => {
                    const updated = { ...personalization, childName: e.target.value };
                    setPersonalization(updated);
                    // Auto-save draft on change
                    if (storyId && e.target.value.trim().length >= 2) {
                      savePersonalizationSession(
                        storyId,
                        {
                          childName: e.target.value,
                          gender: personalization.gender || "neutral",
                          photoPreviewUrl: personalization.photoPreviewUrl || "",
                          visualStyle: personalization.visualStyle || "watercolor",
                        },
                        "draft"
                      );
                    }
                  }}
                  placeholder="הכנס שם"
                  sx={{ mb: 2 }}
                  inputProps={{ maxLength: 50 }}
                />
                {personalization.childName &&
                  personalization.childName.length > 0 &&
                  personalization.childName.length < 2 && (
                    <Typography variant="caption" color="error">
                      השם חייב להכיל לפחות 2 תווים
                    </Typography>
                  )}
              </Box>
            )}

            {/* Step 2: Gender */}
            {activeStep === 1 && (
              <Box>
                <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                  איך הסיפור צריך לדבר על הילד שלך?
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  זה עוזר לנו ליצור שפה דקדוקית נכונה ומכבדת.
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
                        border:
                          personalization.gender === option.value
                            ? `2px solid ${theme.palette.primary.main}`
                            : "2px solid transparent",
                        transition: "all 0.2s ease",
                        "&:hover": {
                          border: `2px solid ${theme.palette.primary.light}`,
                          transform: "translateY(-2px)",
                        },
                      }}
                    >
                      <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Typography sx={{ fontSize: "2rem" }}>{option.icon}</Typography>
                        <Typography variant="h6">{option.label}</Typography>
                        {personalization.gender === option.value && (
                          <CheckCircleIcon
                            sx={{ ml: "auto", color: theme.palette.primary.main }}
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
              <Box>
                <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
                  הוסף תמונת הילד
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  תמונה נדרשת להתאמה אישית של האיורים בסיפור.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontSize: "0.85rem" }}>
                  התמונה תשמש רק להתאמה אישית ולא תוצג בפומבי.
                </Typography>

                {personalization.photoPreviewUrl ? (
                  <Box sx={{ textAlign: "center", mb: 3 }}>
                    <Box
                      component="img"
                      src={personalization.photoPreviewUrl}
                      alt="תמונת הילד"
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
                      החלף תמונה
                    </Button>
                  </Box>
                ) : (
                  <Box
                    onClick={() => fileInputRef.current?.click()}
                    sx={{
                      border: "2px dashed",
                      borderColor: theme.palette.divider,
                      borderRadius: 2,
                      p: 4,
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        borderColor: theme.palette.primary.main,
                        backgroundColor: theme.palette.action.hover,
                      },
                    }}
                  >
                    <PhotoCameraIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      לחץ להעלאת תמונה
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      עד 5MB
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
                    יש להעלות תמונה כדי להמשיך
                  </Typography>
                )}
              </Box>
            )}

            {/* Step 4: Visual Style */}
            {activeStep === 3 && (
              <Box>
                <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
                  בחר את הסגנון הוויזואלי של הסיפור
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  זה ישפיע על איך האיורים ייראו לאורך הספר.
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
                    gap: 2.5,
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
                          alt={style.label}
                          sx={{
                            height: 200,
                            objectFit: "cover",
                            backgroundColor: theme.palette.grey[200],
                          }}
                        />
                        <CardContent sx={{ position: "relative", pb: 2 }}>
                          <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 600 }}>
                            {style.labelHebrew}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.85rem" }}>
                            {style.descriptionHebrew}
                          </Typography>
                          {isSelected && (
                            <CheckCircleIcon
                              sx={{
                                position: "absolute",
                                top: 8,
                                right: 8,
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
              <Box>
                <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
                  סיכום ואישור
                </Typography>
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
                      אנא מלא את כל השדות הנדרשים לפני שתסיים
                    </Typography>
                  </Box>
                )}
                <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        שם הילד
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {personalization.childName || ""}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        מגדר
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {GENDER_OPTIONS.find((g) => g.value === personalization.gender)?.label || ""}
                      </Typography>
                    </Box>
                    {story && (story.ageGroup || story.targetAgeGroup) && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          טווח גיל (מהסיפור)
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {story.ageGroup || story.targetAgeGroup || story.generationConfig?.targetAgeGroup}
                        </Typography>
                      </Box>
                    )}
                    {personalization.photoPreviewUrl && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                          תמונת הילד
                        </Typography>
                        <Box
                          component="img"
                          src={personalization.photoPreviewUrl}
                          alt="תמונת הילד"
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
                        סגנון ויזואלי
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {VISUAL_STYLES.find((s) => s.id === personalization.visualStyle)?.labelHebrew || ""}
                      </Typography>
                    </Box>
                  </Box>
                </Card>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
          <Button
            onClick={handleBack}
            disabled={activeStep === 0}
            startIcon={<ArrowBackIcon />}
            variant="outlined"
          >
            חזור
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
              המשך
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
              התאם אישית וקרא את הסיפור
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}

