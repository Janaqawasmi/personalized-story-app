import {
  Box,
  Typography,
  IconButton,
  useTheme,
  Tooltip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";
import { useEffect, useState, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
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
import ReaderPreviewGate from "../components/book/ReaderPreviewGate";
import { Z_INDEX_BOOK_READER_TOP_CONTROLS } from "../constants/zIndex";
import InstructionModal from "../components/InstructionModal";
import { useTranslation } from "../i18n/useTranslation";
import { useReader } from "../contexts/ReaderContext";
import { addToCart, ApiError } from "../api/caregiverApi";
import {
  ttsSpeak,
  ttsPause,
  ttsResume,
  ttsStop,
  ttsIsSpeaking,
  ttsIsPaused,
  ttsGetVoices,
} from "../utils/tts";
import {
  buildPersonalizedReaderPages,
  getStoryPersonalizationStorageKey,
  normalizeStoryLanguage,
  resolveGenderForPreview,
  PREVIEW_SPREAD_LIMIT,
} from "../utils/storyPersonalization";

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

/**
 * Strong guided scroll: vertically centers the purchase block in the viewport, then nudges
 * downward so headline + Add to cart sit clearly in view (not just the CTA top edge).
 */
function scrollPreviewPurchaseBlockIntoView(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const elCenterY = rect.top + window.scrollY + rect.height / 2;
  const vh = window.innerHeight;
  const downwardBiasPx = Math.min(120, Math.round(vh * 0.18));
  const stickyNavAllowance = 56;
  const targetScroll = elCenterY - vh / 2 + downwardBiasPx - stickyNavAllowance;
  window.scrollTo({ top: Math.max(0, targetScroll), behavior: "smooth" });
}

export default function BookReaderPage() {
  const theme = useTheme();
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useLangNavigate();
  const [searchParams] = useSearchParams();
  const t = useTranslation();
  const [story, setStory] = useState<StoryTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCover, setShowCover] = useState(true);
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previewCtaSectionRef = useRef<HTMLDivElement>(null);
  const previewCtaAnchorRef = useRef<HTMLDivElement>(null);
  const hasAutoScrolledToPreviewCTARef = useRef(false);
  const isFullScreenRef = useRef(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const { isFullScreen, toggleFullScreen } = useReader();
  const [isReading, setIsReading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [autoRead, setAutoRead] = useState(false);
  const autoReadRef = useRef(autoRead);
  const spreadIndexRef = useRef(spreadIndex);
  const lastUnlockedSpreadIndexRef = useRef(0);
  const shouldClearPersonalizationRef = useRef(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>(""); // empty = auto best
  const [previewUnlockOverlayOpen, setPreviewUnlockOverlayOpen] = useState(false);

  const previewId =
    searchParams.get("previewId") ||
    (storyId ? localStorage.getItem(`dammah.preview.${storyId}`) : null);

  const CURRENT_LANGUAGE = getCurrentLanguage();
  const isRTL = CURRENT_LANGUAGE === "he" || CURRENT_LANGUAGE === "ar";
  const ttsLang = CURRENT_LANGUAGE === "ar" ? "ar-SA" : CURRENT_LANGUAGE === "he" ? "he-IL" : "en-US";

  // Filter voices for current language (so dropdown isn't huge)
  const voicesForCurrentLang = voices.filter((v) => {
    const vLang = (v.lang || "").toLowerCase();
    const target = (ttsLang || "").toLowerCase();
    return vLang === target || vLang.startsWith(target.split("-")[0]);
  });

  const lastUnlockedSpreadIndex = useMemo(
    () => (story ? Math.min(PREVIEW_SPREAD_LIMIT - 1, story.pages.length - 1) : 0),
    [story]
  );

  const hasLockedSpreadsBeyondPreview =
    !!story && story.pages.length > lastUnlockedSpreadIndex + 1;

  useEffect(() => {
    hasAutoScrolledToPreviewCTARef.current = false;
    setPreviewUnlockOverlayOpen(false);
  }, [storyId]);

  useEffect(() => {
    if (spreadIndex < lastUnlockedSpreadIndex) {
      setPreviewUnlockOverlayOpen(false);
    }
  }, [spreadIndex, lastUnlockedSpreadIndex]);

  useEffect(() => {
    isFullScreenRef.current = isFullScreen;
  }, [isFullScreen]);

  // Smooth scroll when unlock overlay opens (normal mode only); reset guard when it closes.
  useEffect(() => {
    if (!previewUnlockOverlayOpen) {
      hasAutoScrolledToPreviewCTARef.current = false;
      return;
    }
    if (loading || showCover || showInstructions || !story || isFullScreen) return;
    if (hasAutoScrolledToPreviewCTARef.current) return;

    const timeoutId = window.setTimeout(() => {
      const run = () => {
        if (hasAutoScrolledToPreviewCTARef.current || isFullScreenRef.current) return;
        const purchasePanel = previewCtaAnchorRef.current;
        const outer = previewCtaSectionRef.current;
        const target = purchasePanel ?? outer;
        if (!target) return;
        scrollPreviewPurchaseBlockIntoView(target);
        hasAutoScrolledToPreviewCTARef.current = true;
      };
      requestAnimationFrame(() => requestAnimationFrame(run));
    }, 650);

    return () => window.clearTimeout(timeoutId);
  }, [
    loading,
    showCover,
    showInstructions,
    story,
    previewUnlockOverlayOpen,
    isFullScreen,
  ]);

  // Check for personalization before loading story
  useEffect(() => {
    if (!storyId) {
      setError("Story ID is missing");
      setLoading(false);
      return;
    }

    // Check if personalization session exists and is completed
    const personalizationKey = getStoryPersonalizationStorageKey(storyId);
    const personalizationStr = localStorage.getItem(personalizationKey);
    
    if (!personalizationStr) {
      // No session - redirect to personalization
      navigate(`/stories/${storyId}/personalize`);
      return;
    }

    let session: { status: string; data?: { childName?: string; gender?: "male" | "female"; photoPreviewUrl?: string } };
    try {
      session = JSON.parse(personalizationStr);
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
        const lang = normalizeStoryLanguage(storyLanguage);
        const gender = resolveGenderForPreview(session.data?.gender);
        const placeholderName = t("storyDetail.previewPlaceholderChildName");
        const displayName = session.data?.childName?.trim()
          ? session.data.childName.trim()
          : placeholderName;
        const photo =
          session.data?.photoPreviewUrl?.trim() || undefined;

        const sortedRaw = (data.pages || []).sort(
          (a: { pageNumber: number }, b: { pageNumber: number }) => a.pageNumber - b.pageNumber
        );

        const pages: Page[] = buildPersonalizedReaderPages(sortedRaw, {
          gender,
          childDisplayName: displayName,
          language: lang,
          photoPreviewUrl: photo,
          fallbackImageUrl: (pageNumber) => `/story-images/placeholders/${pageNumber}.jpg`,
          previewSpreadLimit: PREVIEW_SPREAD_LIMIT,
          lockedPlaceholderName: t("pages.bookReader.lockedChildPlaceholder"),
        });

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
  }, [storyId, CURRENT_LANGUAGE, navigate, t]);

  // Clear personalization when component unmounts (user leaves the story)
  // This ensures personalization is session-scoped, not persistent
  useEffect(() => {
    if (!storyId) return;

    const personalizationKey = getStoryPersonalizationStorageKey(storyId);
    
    return () => {
      if (!shouldClearPersonalizationRef.current) return;
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

  useEffect(() => {
    lastUnlockedSpreadIndexRef.current = lastUnlockedSpreadIndex;
  }, [lastUnlockedSpreadIndex]);

  // Load voices once
  useEffect(() => {
    (async () => {
      const v = await ttsGetVoices();
      setVoices(v);
    })();
  }, []);

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

  // Keyboard navigation (same bounds as tap/drag; works in fullscreen too)
  useEffect(() => {
    if (loading || showCover) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (previewUnlockOverlayOpen) {
          e.preventDefault();
          setPreviewUnlockOverlayOpen(false);
          return;
        }
        navigate(-1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        if (isRTL) {
          if (e.key === "ArrowLeft") {
            if (spreadIndex < (story?.pages.length || 0) - 1) {
              handleNext();
            }
          } else if (e.key === "ArrowRight" && spreadIndex > 0) {
            handlePrev();
          }
        } else {
          if (e.key === "ArrowLeft" && spreadIndex > 0) {
            handlePrev();
          } else if (e.key === "ArrowRight") {
            if (spreadIndex < (story?.pages.length || 0) - 1) {
              handleNext();
            }
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    spreadIndex,
    story,
    showCover,
    loading,
    isRTL,
    navigate,
    previewUnlockOverlayOpen,
  ]);

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
    setPreviewUnlockOverlayOpen(false);
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
      voiceName: selectedVoiceName || undefined,
      onEnd: () => {
        // If auto-read is OFF → stop here
        if (!autoReadRef.current) {
          setIsReading(false);
          setIsPaused(false);
          return;
        }

        const latestIndex = spreadIndexRef.current;
        const latestStory = story;
        const lastUnlocked = lastUnlockedSpreadIndexRef.current;

        if (
          !latestStory ||
          latestIndex >= lastUnlocked ||
          latestIndex >= latestStory.pages.length - 1
        ) {
          setIsReading(false);
          setIsPaused(false);
          return;
        }

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

  const handleClose = () => {
    handleStopReading();

    // Exit fullscreen if active
    if (isFullScreen) {
      toggleFullScreen();
    }

    // Return to the personalized book cover/title page
    // Keep personalization data — don't navigate away
    setShowCover(true);
    setSpreadIndex(0);
    setPreviewUnlockOverlayOpen(false);
  };

  const handlePrev = () => {
    if (!autoRead) handleStopReading();
    if (spreadIndex > 0) {
      setPreviewUnlockOverlayOpen(false);
      setSpreadIndex(spreadIndex - 1);
    }
  };

  const handleNext = () => {
    if (!autoRead) handleStopReading();
    if (!story) return;
    if (spreadIndex < lastUnlockedSpreadIndex && spreadIndex < story.pages.length - 1) {
      setPreviewUnlockOverlayOpen(false);
      setSpreadIndex(spreadIndex + 1);
      return;
    }
    if (
      spreadIndex === lastUnlockedSpreadIndex &&
      spreadIndex < story.pages.length - 1
    ) {
      setPreviewUnlockOverlayOpen(true);
      return;
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
          {/* Top Controls - Fixed, only in fullscreen mode */}
          {isFullScreen && (
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
                zIndex: Z_INDEX_BOOK_READER_TOP_CONTROLS,
                opacity: 1,
                pointerEvents: "auto",
              }}
            >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <IconButton
                onClick={handleClose}
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

              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Voice</InputLabel>
                <Select
                  label="Voice"
                  value={selectedVoiceName}
                  onChange={(e) => setSelectedVoiceName(e.target.value)}
                >
                  <MenuItem value="">
                    Auto (best)
                  </MenuItem>

                  {voicesForCurrentLang.map((v) => (
                    <MenuItem key={v.name} value={v.name}>
                      {v.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

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
          )}

          {/* Book Content */}
          <Box
            sx={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
              ...(isFullScreen
                ? {
                    // Fullscreen: fill viewport below the 64px top bar, center the book vertically
                    minHeight: "calc(100vh - 64px)",
                    mt: "64px",
                    justifyContent: "center",
                    px: 3,
                    py: { xs: 2, md: 3 },
                    boxSizing: "border-box",
                  }
                : {
                    // Normal mode: keep existing top-anchored flow (control bar stays directly under header)
                    pt: 4,
                    pb: 6,
                    px: 3,
                  }),
            }}
          >
            <Box
              sx={{
                opacity: 1,
                transform: "translateX(0)",
                transition: "opacity 0.4s ease, transform 0.4s ease",
              }}
            >
              {/* ReaderControls - Regular mode (scrolls with content) */}
              {!isFullScreen && (
                <Box
                  sx={{
                    maxWidth: 1200,
                    mx: "auto",
                    mt: 2,
                    mb: 2,
                    px: { xs: 2, md: 0 },
                    py: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 2,
                    backdropFilter: "blur(8px)",
                  }}
                >
                  {/* Left side: Prev/Next + page */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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

                    <Typography
                      sx={{
                        fontSize: "0.85rem",
                        color: theme.palette.text.secondary,
                      }}
                    >
                      {t("pages.bookReader.pageOf", { current: spreadIndex + 1, total: story.pages.length })}
                    </Typography>
                  </Box>

                  {/* Right side: Sound + fullscreen */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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

                    <Tooltip title={t("pages.bookReader.fullScreen")} arrow>
                      <IconButton
                        onClick={toggleFullScreen}
                        sx={{
                          color: theme.palette.text.primary,
                        }}
                      >
                        <FullscreenIcon />
                      </IconButton>
                    </Tooltip>

                    <IconButton
                      onClick={handleClose}
                      sx={{
                        color: theme.palette.text.primary,
                      }}
                    >
                      <CloseIcon />
                    </IconButton>
                  </Box>
                </Box>
              )}

              {/* Wrapper for book and arrows */}
              <Box
                dir="ltr"
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  width: "100%",
                  mx: "auto",
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
                  nextPage={story.pages[spreadIndex + 1]}
                />

                {previewUnlockOverlayOpen && spreadIndex === lastUnlockedSpreadIndex ? (
                  <ReaderPreviewGate
                    variant="overlay"
                    sectionRef={previewCtaSectionRef}
                    teaserPage={
                      hasLockedSpreadsBeyondPreview
                        ? story.pages[lastUnlockedSpreadIndex + 1]
                        : undefined
                    }
                    title={t("pages.bookReader.previewUnlockTitle")}
                    subtitle={t("pages.bookReader.previewUnlockSubtitle")}
                    teaserLine={t("pages.bookReader.previewTeaserLine")}
                    addToCartLabel={t("pages.bookReader.addToCart")}
                    onAddToCart={async () => {
                      if (!previewId) {
                        setPreviewUnlockOverlayOpen(false);
                        navigate("/cart");
                        return;
                      }
                      try {
                        await addToCart(previewId);
                      } catch (e) {
                        // Best-effort: still take user to cart (it may already contain the item)
                        if (e instanceof ApiError) {
                          console.warn("Add to cart failed:", e.message, e.code);
                        } else {
                          console.warn("Add to cart failed:", e);
                        }
                      } finally {
                        setPreviewUnlockOverlayOpen(false);
                        navigate("/cart");
                      }
                    }}
                    onDismiss={() => setPreviewUnlockOverlayOpen(false)}
                    dismissLabel={t("pages.bookReader.previewEndModalClose")}
                    ctaAnchorRef={previewCtaAnchorRef}
                  />
                ) : null}

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

