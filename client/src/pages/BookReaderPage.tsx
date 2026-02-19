import { Box, Typography, IconButton, useTheme, Tooltip } from "@mui/material";
import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { useLangNavigate } from "../i18n/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import PauseIcon from "@mui/icons-material/Pause";
import StopIcon from "@mui/icons-material/Stop";
import AutoplayIcon from "@mui/icons-material/PlayCircleOutline";
import BookCover from "../components/book/BookCover";
import BookSpread from "../components/book/BookSpread";
import InstructionModal from "../components/InstructionModal";
import { useTranslation } from "../i18n/useTranslation";
import { useReader } from "../contexts/ReaderContext";
import {
  ttsSpeak,
  ttsPause,
  ttsResume,
  ttsStop,
  ttsIsSpeaking,
  ttsIsPaused,
} from "../utils/tts";

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
  const t = useTranslation();
  const [story, setStory] = useState<StoryTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCover, setShowCover] = useState(true);
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const { isFullScreen, toggleFullScreen } = useReader();
  const [isReading, setIsReading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [autoRead, setAutoRead] = useState(false);
  const autoReadRef = useRef(autoRead);
  const spreadIndexRef = useRef(spreadIndex);

  const CURRENT_LANGUAGE = getCurrentLanguage();
  const isRTL = CURRENT_LANGUAGE === "he" || CURRENT_LANGUAGE === "ar";
  const ttsLang = CURRENT_LANGUAGE === "ar" ? "ar-SA" : CURRENT_LANGUAGE === "he" ? "he-IL" : "en-US";

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
        ).map((page: Page) => ({
          ...page,
          // Add temporary placeholder image URL based on page number
          imageUrl: `/story-images/placeholders/${page.pageNumber}.jpg`,
        }));

        setStory({
          id: storySnap.id,
          title: data.title || t("search.storyWithoutName"),
          pages,
          language: storyLanguage,
          status: data.status,
        });
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

  // IMPORTANT: stop reading when leaving the page
  useEffect(() => {
    return () => {
      ttsStop();
    };
  }, []);

  // Sync refs with state
  useEffect(() => {
    autoReadRef.current = autoRead;
  }, [autoRead]);

  useEffect(() => {
    spreadIndexRef.current = spreadIndex;
  }, [spreadIndex]);

  // Lock scroll when full screen is enabled and scroll to top
  // ✅ Only lock scroll in fullscreen
  useEffect(() => {
    if (!isFullScreen) {
      // Restore scroll when exiting fullscreen
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      return;
    }

    // Scroll to top when entering fullscreen (before locking scroll)
    // Note: "auto" provides instant scrolling (no animation), which is what "instant" would do
    window.scrollTo({ top: 0, behavior: "auto" });
    // Also force html/body scrollTop to 0 (covers Safari / edge cases)
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // Lock scroll when entering fullscreen
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [isFullScreen]);

  // ESC to exit full screen (with priority)
  useEffect(() => {
    if (!isFullScreen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        toggleFullScreen();
      }
    };

    window.addEventListener("keydown", onKeyDown, true); // Use capture phase for priority
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [isFullScreen, toggleFullScreen]);

  // Keyboard navigation
  useEffect(() => {
    if (loading || showCover || isFullScreen) return; // Don't handle navigation in fullscreen

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
  }, [spreadIndex, story, showCover, loading, isRTL, navigate, isFullScreen]);

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

  const readCurrentPage = () => {
    const currentIndex = spreadIndexRef.current;
    const currentPage = story?.pages[currentIndex];
    const textToRead = currentPage?.textTemplate || "";
    if (!textToRead.trim()) return;

    setIsReading(true);
    setIsPaused(false);

    ttsSpeak({
      text: textToRead,
      lang: ttsLang,
      rate: 0.9,
      pitch: 1,
      onEnd: () => {
        // If auto-read is OFF → stop here
        if (!autoReadRef.current) {
          setIsReading(false);
          setIsPaused(false);
          return;
        }

        // Get latest values from refs
        const latestIndex = spreadIndexRef.current;
        const latestStory = story;

        // If no next page → stop
        if (!(latestStory && latestIndex < latestStory.pages.length - 1)) {
          setIsReading(false);
          setIsPaused(false);
          return;
        }

        // Move to next page directly (bypass handleNext to avoid stopping)
        setSpreadIndex(latestIndex + 1);

        // Wait a moment for the next page state to load, then read again
        setTimeout(() => {
          readNextPageAfterFlip();
        }, 150);
      },
    });
  };

  const readNextPageAfterFlip = () => {
    // page will be updated after onNext; readCurrentPage will read new page text
    const currentIndex = spreadIndexRef.current;
    const currentPage = story?.pages[currentIndex];
    const nextText = currentPage?.textTemplate || "";
    if (!nextText.trim()) {
      // If the page text didn't update yet, try once more shortly
      setTimeout(() => {
        const retryIndex = spreadIndexRef.current;
        const retryPage = story?.pages[retryIndex];
        const retryText = retryPage?.textTemplate || "";
        if (retryText.trim()) readCurrentPage();
        else {
          setIsReading(false);
          setIsPaused(false);
        }
      }, 200);
      return;
    }

    readCurrentPage();
  };

  const handleReadStory = () => {
    readCurrentPage();
  };

  const handlePauseResume = () => {
    if (!ttsIsSpeaking() && !isReading) return;

    if (ttsIsPaused() || isPaused) {
      ttsResume();
      setIsPaused(false);
    } else {
      ttsPause();
      setIsPaused(true);
    }
  };

  const handleStopReading = () => {
    ttsStop();
    setIsReading(false);
    setIsPaused(false);
  };

  const handlePrev = () => {
    // if user manually clicks Prev, stop reading
    if (!autoRead) handleStopReading();
    if (spreadIndex > 0) {
      setSpreadIndex(spreadIndex - 1);
    }
  };

  const handleNext = () => {
    // if user manually clicks Next, stop reading
    if (!autoRead) handleStopReading();
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
          {t("pages.bookReader.loading")}
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
          {error || t("pages.bookReader.error")}
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
          {t("pages.bookReader.noPages")}
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
              // Always visible in fullscreen, otherwise fade based on mouse movement
              opacity: isFullScreen ? 1 : (controlsVisible ? 1 : 0),
              transition: "opacity 0.3s ease",
              pointerEvents: isFullScreen ? "auto" : (controlsVisible ? "auto" : "none"),
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

            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography
                sx={{
                  fontSize: "0.85rem",
                  color: theme.palette.text.secondary,
                }}
              >
                {t("pages.bookReader.pageOf", { current: spreadIndex + 1, total: story.pages.length })}
              </Typography>

              <Tooltip title="Read story" arrow>
                <span>
                  <IconButton
                    onClick={handleReadStory}
                    disabled={isReading}
                    sx={{
                      color: theme.palette.text.primary,
                    }}
                  >
                    <VolumeUpIcon />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title={isPaused ? "Resume" : "Pause"} arrow>
                <span>
                  <IconButton
                    onClick={handlePauseResume}
                    disabled={!isReading}
                    sx={{
                      color: theme.palette.text.primary,
                    }}
                  >
                    <PauseIcon />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title="Stop" arrow>
                <span>
                  <IconButton
                    onClick={handleStopReading}
                    disabled={!isReading}
                    sx={{
                      color: theme.palette.text.primary,
                    }}
                  >
                    <StopIcon />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title={autoRead ? "Auto-read: ON" : "Auto-read: OFF"} arrow>
                <IconButton
                  onClick={() => setAutoRead((p) => !p)}
                  sx={{
                    color: autoRead ? theme.palette.primary.main : theme.palette.text.primary,
                  }}
                >
                  <AutoplayIcon />
                </IconButton>
              </Tooltip>

              <Tooltip
                title={isFullScreen ? t("pages.bookReader.exitFullScreen") : t("pages.bookReader.fullScreen")}
                arrow
              >
                <IconButton
                  onClick={toggleFullScreen}
                  sx={{
                    color: theme.palette.text.primary,
                  }}
                >
                  {isFullScreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Book Content */}
          <Box
            sx={{
              pt: isFullScreen ? 4 : 12, // Very minimal top padding in full-screen mode for tighter spacing
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
              {/* Fullscreen button - always visible in normal mode */}
              {!isFullScreen && (
                <Box
                  sx={{
                    maxWidth: 1200,
                    mx: "auto",
                    mb: 1.5,
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    px: { xs: 1, md: 0 },
                  }}
                >
                  <Tooltip
                    title={t("pages.bookReader.fullScreen")}
                    arrow
                  >
                    <IconButton
                      onClick={toggleFullScreen}
                      sx={{
                        background: "rgba(255,255,255,0.7)",
                        border: "1px solid rgba(0,0,0,0.10)",
                        backdropFilter: "blur(6px)",
                        "&:hover": { background: "rgba(255,255,255,0.9)" },
                      }}
                    >
                      <FullscreenIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}

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
                  isFullScreen={isFullScreen}
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

