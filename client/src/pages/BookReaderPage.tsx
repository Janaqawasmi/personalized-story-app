import { Box, Typography, IconButton, useTheme } from "@mui/material";
import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { useLangNavigate } from "../i18n/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import BookCover from "../components/book/BookCover";
import BookSpread from "../components/book/BookSpread";
import InstructionModal from "../components/InstructionModal";

type Page = {
  pageNumber: number;
  textTemplate: string;
  imagePromptTemplate?: string;
  imageUrl?: string;
  emotionalTone?: string;
};

type StoryTemplate = {
  id: string;
  title: string;
  pages: Page[];
  language?: string;
  generationConfig?: {
    language?: string;
  };
  status?: string;
};

function getCurrentLanguage(): string {
  const fromStorage =
    (typeof window !== "undefined" && localStorage.getItem("lang")) || "";
  const norm = fromStorage.toLowerCase();
  if (["he", "he-il", "iw"].includes(norm)) return "he";
  if (["ar", "ar-sa", "ar-il"].includes(norm)) return "ar";
  return "he";
}

export default function BookReaderPage() {
  const theme = useTheme();
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useLangNavigate();
  const [story, setStory] = useState<StoryTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCover, setShowCover] = useState(true);
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLanguageNotice, setShowLanguageNotice] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const CURRENT_LANGUAGE = getCurrentLanguage();
  const isRTL = CURRENT_LANGUAGE === "he" || CURRENT_LANGUAGE === "ar";

  // Check for personalization before loading story
  useEffect(() => {
    if (!storyId) {
      setError("Story ID is missing");
      setLoading(false);
      return;
    }

    // Check if personalization session exists and is completed
    const personalizationKey = `qosati_personalization_${storyId}`;
    const personalizationStr = localStorage.getItem(personalizationKey);
    
    if (!personalizationStr) {
      // No session - redirect to personalization
      navigate(`/stories/${storyId}/personalize`);
      return;
    }

    try {
      const session = JSON.parse(personalizationStr);
      if (session.status !== "completed") {
        // Draft session or invalid - redirect to personalization
        navigate(`/stories/${storyId}/personalize`);
        return;
      }
    } catch {
      // Invalid session data - redirect to personalization
      navigate(`/stories/${storyId}/personalize`);
      return;
    }

    const fetchStory = async () => {
      try {
        const storyRef = doc(db, "story_templates", storyId);
        const storySnap = await getDoc(storyRef);

        if (!storySnap.exists()) {
          setError("Story not found");
          setLoading(false);
          return;
        }

        const data = storySnap.data();
        
        // Check status
        if (data.status !== "approved") {
          setError("Story is not approved");
          setLoading(false);
          return;
        }

        // Get story language (for display, not blocking)
        const storyLanguage = data.language || data.generationConfig?.language;

        // Sort pages by pageNumber
        const pages = (data.pages || []).sort(
          (a: Page, b: Page) => a.pageNumber - b.pageNumber
        );

        setStory({
          id: storySnap.id,
          title: data.title || "סיפור ללא שם",
          pages,
          language: storyLanguage,
          status: data.status,
        });

        // Show soft notice if languages differ (non-blocking)
        if (storyLanguage && storyLanguage !== CURRENT_LANGUAGE) {
          setShowLanguageNotice(true);
          // Auto-hide after 5 seconds
          setTimeout(() => setShowLanguageNotice(false), 5000);
        }
      } catch (err: any) {
        console.error("Error fetching story:", err);
        setError(err.message || "Failed to load story");
      } finally {
        setLoading(false);
      }
    };

    fetchStory();
  }, [storyId, CURRENT_LANGUAGE, navigate]);

  // Clear personalization when component unmounts (user leaves the story)
  // This ensures personalization is session-scoped, not persistent
  useEffect(() => {
    if (!storyId) return;

    const personalizationKey = `qosati_personalization_${storyId}`;
    
    return () => {
      // Clear personalization when user leaves the story reader
      localStorage.removeItem(personalizationKey);
    };
  }, [storyId]);

  // Keyboard navigation
  useEffect(() => {
    if (loading || showCover) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        navigate(-1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        if (isRTL) {
          // RTL: ArrowLeft = next, ArrowRight = prev
          if (e.key === "ArrowLeft" && spreadIndex < (story?.pages.length || 0) - 1) {
            handleNext();
          } else if (e.key === "ArrowRight" && spreadIndex > 0) {
            handlePrev();
          }
        } else {
          // LTR: ArrowLeft = prev, ArrowRight = next
          if (e.key === "ArrowLeft" && spreadIndex > 0) {
            handlePrev();
          } else if (e.key === "ArrowRight" && spreadIndex < (story?.pages.length || 0) - 1) {
            handleNext();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [spreadIndex, story, showCover, loading, isRTL, navigate]);

  // Auto-hide controls
  useEffect(() => {
    if (showCover) return;

    const handleMouseMove = () => {
      setControlsVisible(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 2000);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showCover]);

  const handleStart = () => {
    setShowInstructions(true);
  };

  const handleInstructionsClose = () => {
    setShowInstructions(false);
    setShowCover(false);
    setSpreadIndex(0);
  };

  const handlePrev = () => {
    if (spreadIndex > 0) {
      setSpreadIndex(spreadIndex - 1);
    }
  };

  const handleNext = () => {
    if (story && spreadIndex < story.pages.length - 1) {
      setSpreadIndex(spreadIndex + 1);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.palette.background.default,
        }}
      >
        <Typography sx={{ color: theme.palette.text.secondary }}>
          טוען...
        </Typography>
      </Box>
    );
  }

  if (error || !story) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.palette.background.default,
          px: 3,
        }}
      >
        <Typography
          sx={{
            color: theme.palette.text.secondary,
            mb: 2,
            textAlign: "center",
          }}
        >
          {error || "לא נמצא סיפור"}
        </Typography>
        <IconButton onClick={() => navigate(-1)}>
          <CloseIcon />
        </IconButton>
      </Box>
    );
  }

  if (!story.pages || story.pages.length === 0) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.palette.background.default,
          px: 3,
        }}
      >
        <Typography
          sx={{
            color: theme.palette.text.secondary,
            textAlign: "center",
          }}
        >
          לא נמצאו עמודים לסיפור הזה.
        </Typography>
      </Box>
    );
  }

  const currentPage = story.pages[spreadIndex];
  const canGoPrev = spreadIndex > 0;
  const canGoNext = spreadIndex < story.pages.length - 1;

  return (
    <>
      <InstructionModal
        open={showInstructions}
        onClose={handleInstructionsClose}
      />
      <Box
        ref={containerRef}
        sx={{
          minHeight: "100vh",
          backgroundColor: theme.palette.background.default,
          direction: isRTL ? "rtl" : "ltr",
          position: "relative",
        }}
      >
        {showCover ? (
          <BookCover
            title={story.title}
            onStart={handleStart}
            language={story.language || CURRENT_LANGUAGE}
          />
        ) : (
          !showInstructions && (
            <>
          {/* Language Notice (soft, non-blocking) */}
          {showLanguageNotice && story && (
            <Box
              sx={{
                position: "fixed",
                top: 64,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 999,
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 1,
                px: 2,
                py: 1,
                boxShadow: `0 2px 8px ${theme.palette.divider}`,
                opacity: showLanguageNotice ? 1 : 0,
                transition: "opacity 0.3s ease",
                maxWidth: "90%",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.85rem",
                  color: theme.palette.text.secondary,
                  textAlign: "center",
                }}
              >
                הסיפור בשפה {story.language === "ar" ? "ערבית" : story.language === "he" ? "עברית" : story.language}
              </Typography>
            </Box>
          )}

          {/* Top Controls */}
          <Box
            sx={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              height: 64,
              backgroundColor: theme.palette.background.paper,
              borderBottom: `1px solid ${theme.palette.divider}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 3,
              zIndex: 1000,
              opacity: controlsVisible ? 1 : 0,
              transition: "opacity 0.3s ease",
              pointerEvents: controlsVisible ? "auto" : "none",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <IconButton
                onClick={() => navigate(-1)}
                sx={{
                  color: theme.palette.text.primary,
                }}
              >
                <CloseIcon />
              </IconButton>

              <IconButton
                onClick={handlePrev}
                disabled={!canGoPrev}
                sx={{
                  color: theme.palette.text.primary,
                  "&:disabled": {
                    color: theme.palette.text.secondary,
                  },
                }}
              >
                <ArrowBackIosNewIcon />
              </IconButton>

              <IconButton
                onClick={handleNext}
                disabled={!canGoNext}
                sx={{
                  color: theme.palette.text.primary,
                  "&:disabled": {
                    color: theme.palette.text.secondary,
                  },
                }}
              >
                <ArrowForwardIosIcon />
              </IconButton>
            </Box>

            <Typography
              sx={{
                fontSize: "0.85rem",
                color: theme.palette.text.secondary,
              }}
            >
              עמוד {spreadIndex + 1} מתוך {story.pages.length}
            </Typography>
          </Box>

          {/* Book Content */}
          <Box
            sx={{
              pt: 12,
              pb: 6,
              px: 3,
              position: "relative",
            }}
          >
            <Box
              sx={{
                opacity: 1,
                transform: "translateX(0)",
                transition: "opacity 0.4s ease, transform 0.4s ease",
              }}
            >
              {/* Wrapper for book and arrows */}
              <Box
                sx={{
                  position: "relative",
                  isolation: "isolate", // 🔥 VERY IMPORTANT - prevents stacking context issues
                  overflow: "visible",
                }}
              >
                {/* Book Spread */}
                <BookSpread
                  page={currentPage}
                  title={story.title}
                  isRTL={isRTL}
                  totalPages={story.pages.length}
                  onNext={handleNext}
                  onPrev={handlePrev}
                  canGoNext={canGoNext}
                  canGoPrev={canGoPrev}
                />

                {/* LEFT ARROW — NEXT PAGE (RTL) or PREVIOUS PAGE (LTR) */}
                {isRTL ? (
                  // RTL: LEFT arrow = NEXT page
                  canGoNext && (
                    <Box
                      onClick={handleNext}
                      sx={{
                        position: "absolute",
                        top: "50%",
                        left: { xs: -56, md: -72 },
                        transform: "translateY(-50%)",
                        width: { xs: 44, md: 56 },
                        height: { xs: 56, md: 72 },
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        userSelect: "none",
                        backgroundColor: "rgba(255, 255, 255, 0.9)",
                        border: `2px solid ${theme.palette.divider}`,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        transition: "opacity 0.2s ease, transform 0.2s ease, background-color 0.2s ease",
                        zIndex: 10000, // 🔥 REQUIRED - higher than page turn overlay (9999)
                        "&:hover": {
                          opacity: 1,
                          backgroundColor: "rgba(255, 255, 255, 1)",
                          transform: "translateY(-50%) scale(1.05)",
                        },
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: { xs: "1.5rem", md: "1.8rem" },
                          color: "#824D5C",
                          fontWeight: 600,
                          lineHeight: 1,
                        }}
                      >
                        ←
                      </Typography>
                    </Box>
                  )
                ) : (
                  // LTR: LEFT arrow = PREVIOUS page
                  canGoPrev && (
                    <Box
                      onClick={handlePrev}
                      sx={{
                        position: "absolute",
                        top: "50%",
                        left: { xs: -56, md: -72 },
                        transform: "translateY(-50%)",
                        width: { xs: 44, md: 56 },
                        height: { xs: 56, md: 72 },
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        userSelect: "none",
                        backgroundColor: "rgba(255, 255, 255, 0.9)",
                        border: `2px solid ${theme.palette.divider}`,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        transition: "opacity 0.2s ease, transform 0.2s ease, background-color 0.2s ease",
                        zIndex: 10000, // 🔥 REQUIRED - higher than page turn overlay (9999)
                        "&:hover": {
                          opacity: 1,
                          backgroundColor: "rgba(255, 255, 255, 1)",
                          transform: "translateY(-50%) scale(1.05)",
                        },
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: { xs: "1.5rem", md: "1.8rem" },
                          color: "#824D5C",
                          fontWeight: 600,
                          lineHeight: 1,
                        }}
                      >
                        ←
                      </Typography>
                    </Box>
                  )
                )}

                {/* RIGHT ARROW — PREVIOUS PAGE (RTL) or NEXT PAGE (LTR) */}
                {isRTL ? (
                  // RTL: RIGHT arrow = PREVIOUS page
                  canGoPrev && (
                    <Box
                      onClick={handlePrev}
                      sx={{
                        position: "absolute",
                        top: "50%",
                        right: { xs: -56, md: -72 },
                        transform: "translateY(-50%)",
                        width: { xs: 44, md: 56 },
                        height: { xs: 56, md: 72 },
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        userSelect: "none",
                        backgroundColor: "rgba(255, 255, 255, 0.9)",
                        border: `2px solid ${theme.palette.divider}`,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        transition: "opacity 0.2s ease, transform 0.2s ease, background-color 0.2s ease",
                        zIndex: 10000, // 🔥 REQUIRED - higher than page turn overlay (9999)
                        "&:hover": {
                          opacity: 1,
                          backgroundColor: "rgba(255, 255, 255, 1)",
                          transform: "translateY(-50%) scale(1.05)",
                        },
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: { xs: "1.5rem", md: "1.8rem" },
                          color: "#824D5C",
                          fontWeight: 600,
                          lineHeight: 1,
                        }}
                      >
                        →
                      </Typography>
                    </Box>
                  )
                ) : (
                  // LTR: RIGHT arrow = NEXT page
                  canGoNext && (
                    <Box
                      onClick={handleNext}
                      sx={{
                        position: "absolute",
                        top: "50%",
                        right: { xs: -56, md: -72 },
                        transform: "translateY(-50%)",
                        width: { xs: 44, md: 56 },
                        height: { xs: 56, md: 72 },
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        userSelect: "none",
                        backgroundColor: "rgba(255, 255, 255, 0.9)",
                        border: `2px solid ${theme.palette.divider}`,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        transition: "opacity 0.2s ease, transform 0.2s ease, background-color 0.2s ease",
                        zIndex: 10000, // 🔥 REQUIRED - higher than page turn overlay (9999)
                        "&:hover": {
                          opacity: 1,
                          backgroundColor: "rgba(255, 255, 255, 1)",
                          transform: "translateY(-50%) scale(1.05)",
                        },
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: { xs: "1.5rem", md: "1.8rem" },
                          color: "#824D5C",
                          fontWeight: 600,
                          lineHeight: 1,
                        }}
                      >
                        →
                      </Typography>
                    </Box>
                  )
                )}
              </Box>
            </Box>
          </Box>
          </>
          )
        )}
      </Box>
    </>
  );
}

