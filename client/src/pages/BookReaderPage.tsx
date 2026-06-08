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
import { useEffect, useState, useRef, useMemo, useCallback, useLayoutEffect } from "react";
import { useParams } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { useLangNavigate } from "../i18n/navigation";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";
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
import BookSpread, { type BookSpreadHandle } from "../components/book/BookSpread";
import ReaderPreviewGate from "../components/book/ReaderPreviewGate";
import { Z_INDEX_BOOK_READER_TOP_CONTROLS } from "../constants/zIndex";
import BookPreface from "../components/book/BookPreface";
import { LOCAL_STORAGE_PREFACE_SEEN_KEY } from "../components/book/bookTokens";
import { useTranslation } from "../i18n/useTranslation";
import { useLanguage } from "../i18n/context/LanguageContext";
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
  applyPreviewOverridesToReaderPages,
  buildPersonalizedReaderPages,
  extractPreviewSpreadImageUrl,
  extractPreviewSpreadText,
  getStoryPersonalizationStorageKey,
  normalizeStoryLanguage,
  resolveGenderForPreview,
  PREVIEW_SPREAD_LIMIT,
  type ReaderPageBuilt,
} from "../utils/storyPersonalization";
import {
  loadPreviewReaderOverrides,
  previewOverridesFromDocData,
  type PreviewReaderOverride,
} from "../utils/readerPreviewLoader";
import { preloadReaderImages } from "../utils/readerImageCache";
import {
  collectReaderImageUrls,
  readerPagesFingerprint,
} from "../utils/readerPagesFingerprint";

type StoryTemplate = {
  id: string;
  title: string;
  pages: ReaderPageBuilt[];
  language?: string;
  generationConfig?: {
    language?: string;
  };
  status?: string;
  coverImage?: string;
  childName?: string;
};

function getCurrentLanguage(): string {
  const fromStorage =
    (typeof window !== "undefined" && localStorage.getItem("lang")) || "";
  const norm = fromStorage.toLowerCase();
  if (["he", "he-il", "iw"].includes(norm)) return "he";
  if (["ar", "ar-sa", "ar-il"].includes(norm)) return "ar";
  return "he";
}

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
  const { language: uiLanguage } = useLanguage();
  const [story, setStory] = useState<StoryTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCover, setShowCover] = useState(true);
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bookSpreadRef = useRef<BookSpreadHandle | null>(null);
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
  const storyLoadStartedRef = useRef(false);
  const pagesFingerprintRef = useRef("");
  const previewSnapshotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("");
  const [previewUnlockOverlayOpen, setPreviewUnlockOverlayOpen] = useState(false);

  // Mobile detection
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 768px)").matches;
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 768px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    document.body.classList.add("book-reader");
    return () => {
      document.body.classList.remove("book-reader");
    };
  }, []);

  const previewIdFromQuery = searchParams.get("previewId");
  const previewId =
    previewIdFromQuery ||
    (storyId ? localStorage.getItem(`dammah.preview.${storyId}`) : null);

  const CURRENT_LANGUAGE = uiLanguage || getCurrentLanguage();
  const isRTL = CURRENT_LANGUAGE === "he" || CURRENT_LANGUAGE === "ar";
  const ttsLang = CURRENT_LANGUAGE === "ar" ? "ar-SA" : CURRENT_LANGUAGE === "he" ? "he-IL" : "en-US";

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
    storyLoadStartedRef.current = false;
    pagesFingerprintRef.current = "";
  }, [storyId]);

  useEffect(() => {
    if (spreadIndex < lastUnlockedSpreadIndex) {
      setPreviewUnlockOverlayOpen(false);
    }
  }, [spreadIndex, lastUnlockedSpreadIndex]);

  useEffect(() => {
    isFullScreenRef.current = isFullScreen;
  }, [isFullScreen]);

  // Smooth-scroll the preview CTA only on desktop normal mode
  useEffect(() => {
    if (!previewUnlockOverlayOpen) {
      hasAutoScrolledToPreviewCTARef.current = false;
      return;
    }
    if (loading || showCover || showInstructions || !story || isFullScreen || isMobile) return;
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
  }, [loading, showCover, showInstructions, story, previewUnlockOverlayOpen, isFullScreen, isMobile]);

  // Personalization gate + story load
  useEffect(() => {
    if (!storyId) {
      setError("Story ID is missing");
      setLoading(false);
      return;
    }

    const personalizationKey = getStoryPersonalizationStorageKey(storyId);
    const personalizationStr = localStorage.getItem(personalizationKey);

    if (!personalizationStr) {
      navigate(`/stories/${storyId}/personalize`);
      return;
    }

    let session: { status: string; data?: { childName?: string; gender?: "male" | "female"; photoPreviewUrl?: string } };
    try {
      session = JSON.parse(personalizationStr);
      if (session.status !== "completed") {
        navigate(`/stories/${storyId}/personalize`);
        return;
      }
    } catch {
      navigate(`/stories/${storyId}/personalize`);
      return;
    }

    let cancelled = false;

    const fetchStory = async () => {
      const showLoadingScreen = !storyLoadStartedRef.current;
      if (showLoadingScreen) setLoading(true);
      setError(null);
      try {
        const storyRef = doc(db, "story_templates", storyId);
        const storySnap = await getDoc(storyRef);

        if (!storySnap.exists()) {
          if (!cancelled) {
            setError("Story not found");
            setLoading(false);
          }
          return;
        }

        const data = storySnap.data();

        if (data.status !== "approved") {
          if (!cancelled) {
            setError("Story is not approved");
            setLoading(false);
          }
          return;
        }

        const storyLanguage = data.language || data.generationConfig?.language;
        const lang = normalizeStoryLanguage(storyLanguage);
        const gender = resolveGenderForPreview(session.data?.gender);
        const placeholderName = t("storyDetail.previewPlaceholderChildName");
        const displayName = session.data?.childName?.trim()
          ? session.data.childName.trim()
          : placeholderName;
        const photo = session.data?.photoPreviewUrl?.trim() || undefined;

        const previewSpreads: unknown[] = Array.isArray(data.previewSpreads) ? data.previewSpreads : [];
        const spreadTextFallbacks = previewSpreads.map((sp: unknown) => extractPreviewSpreadText(sp));
        const spreadImageFallbacks = previewSpreads.map((sp: unknown) =>
          extractPreviewSpreadImageUrl(sp),
        );

        const sortedRaw = (data.pages || []).sort(
          (a: { pageNumber: number }, b: { pageNumber: number }) => a.pageNumber - b.pageNumber
        );

        let pages: ReaderPageBuilt[] = buildPersonalizedReaderPages(sortedRaw, {
          gender,
          childDisplayName: displayName,
          language: lang,
          photoPreviewUrl: photo,
          fallbackImageUrl: (pageNumber) => `/story-images/placeholders/${pageNumber}.jpg`,
          previewSpreadLimit: PREVIEW_SPREAD_LIMIT,
          lockedPlaceholderName: t("pages.bookReader.lockedChildPlaceholder"),
          spreadTextFallbacks,
          spreadImageFallbacks,
        });

        const activePreviewId =
          previewIdFromQuery ||
          (storyId ? localStorage.getItem(`dammah.preview.${storyId}`) : null);

        await auth.authStateReady();
        const ownerUid = auth.currentUser?.uid;
        if (activePreviewId && ownerUid) {
          try {
            const overrides = await loadPreviewReaderOverrides(activePreviewId, ownerUid);
            if (overrides.length) {
              pages = applyPreviewOverridesToReaderPages(
                pages,
                overrides,
                PREVIEW_SPREAD_LIMIT,
              );
            }
          } catch (previewErr) {
            console.warn(
              "[BookReader] Failed to merge storyPreviews into reader pages:",
              previewErr,
            );
          }
        }

        const resolvedCoverImage =
          (typeof data.coverImage === "string" && data.coverImage.trim()) ||
          (typeof data.coverImageUrl === "string" && data.coverImageUrl.trim()) ||
          pages.find((p) => p.pageNumber === 1)?.imageUrl ||
          pages[0]?.imageUrl ||
          undefined;

        if (!cancelled) {
          pagesFingerprintRef.current = readerPagesFingerprint(pages);
          preloadReaderImages([
            ...collectReaderImageUrls(pages),
            ...(resolvedCoverImage ? [resolvedCoverImage] : []),
          ]);
          setStory({
            id: storySnap.id,
            title: data.title || t("search.storyWithoutName"),
            pages,
            language: storyLanguage,
            status: data.status,
            coverImage: resolvedCoverImage,
            childName: displayName,
          });
          storyLoadStartedRef.current = true;
        }
      } catch (err: unknown) {
        if (!cancelled) {
          console.error("Error fetching story:", err);
          setError(err instanceof Error ? err.message : "Failed to load story");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchStory();
    return () => {
      cancelled = true;
    };
  }, [storyId, previewIdFromQuery]);

  // Live Firestore updates when preview generation completes (debounced, skip no-op writes)
  useEffect(() => {
    if (!previewId || !story?.id) return;

    let cancelled = false;
    let unsub: (() => void) | undefined;

    void (async () => {
      await auth.authStateReady();
      if (cancelled) return;

      unsub = onSnapshot(doc(db, "storyPreviews", previewId), (snap) => {
        if (!snap.exists() || cancelled) return;

        if (previewSnapshotTimerRef.current) {
          clearTimeout(previewSnapshotTimerRef.current);
        }

        previewSnapshotTimerRef.current = setTimeout(async () => {
          if (cancelled) return;
          const ownerUid = auth.currentUser?.uid;
          if (!ownerUid || cancelled) return;

          const overrides = await previewOverridesFromDocData(snap.data(), ownerUid);
          const hasUpdate = overrides.some(
            (o: PreviewReaderOverride) => o.personalizedText?.trim() || o.imageUrl?.trim(),
          );
          if (!hasUpdate || cancelled) return;

          setStory((prev) => {
            if (!prev || prev.id !== story.id) return prev;
            const pages = applyPreviewOverridesToReaderPages(
              prev.pages,
              overrides,
              PREVIEW_SPREAD_LIMIT,
            );
            const fp = readerPagesFingerprint(pages);
            if (fp === pagesFingerprintRef.current) return prev;
            pagesFingerprintRef.current = fp;
            preloadReaderImages(collectReaderImageUrls(pages));
            return { ...prev, pages };
          });
        }, 280);
      });
    })();

    return () => {
      cancelled = true;
      if (previewSnapshotTimerRef.current) {
        clearTimeout(previewSnapshotTimerRef.current);
        previewSnapshotTimerRef.current = null;
      }
      unsub?.();
    };
  }, [previewId, story?.id]);

  // Preload neighbor spreads whenever the reader index moves
  useLayoutEffect(() => {
    if (!story?.pages.length) return;
    const indices = [spreadIndex - 1, spreadIndex, spreadIndex + 1, spreadIndex + 2].filter(
      (i) => i >= 0 && i < story.pages.length
    );
    const urls = indices.flatMap((i) => {
      const p = story.pages[i];
      return [p.imageUrl, p.imageFallbackUrl, `/story-images/placeholders/${p.pageNumber}.jpg`];
    });
    preloadReaderImages(urls);
  }, [story, spreadIndex]);

  useEffect(() => {
    if (!storyId) return;
    const personalizationKey = getStoryPersonalizationStorageKey(storyId);
    return () => {
      if (!shouldClearPersonalizationRef.current) return;
      localStorage.removeItem(personalizationKey);
    };
  }, [storyId]);

  useEffect(() => () => { ttsStop(); }, []);

  useEffect(() => { autoReadRef.current = autoRead; }, [autoRead]);
  useEffect(() => { spreadIndexRef.current = spreadIndex; }, [spreadIndex]);
  useEffect(() => { lastUnlockedSpreadIndexRef.current = lastUnlockedSpreadIndex; }, [lastUnlockedSpreadIndex]);

  useEffect(() => {
    (async () => {
      const v = await ttsGetVoices();
      setVoices(v);
    })();
  }, []);

  // Lock body scroll in fullscreen OR on mobile reader (cinema overlay)
  useEffect(() => {
    const shouldLock = isFullScreen || (isMobile && !showCover && !showInstructions);
    if (!shouldLock) {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      return;
    }
    window.scrollTo({ top: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [isFullScreen, isMobile, showCover, showInstructions]);

  useEffect(() => {
    if (!isFullScreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        toggleFullScreen();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [isFullScreen, toggleFullScreen]);

  const requestFlipNext = useCallback(() => {
    if (!autoRead) handleStopReading();
    if (!story) return;
    if (spreadIndex >= story.pages.length - 1) return;
    if (
      spreadIndex === lastUnlockedSpreadIndex &&
      spreadIndex < story.pages.length - 1
    ) {
      setPreviewUnlockOverlayOpen(true);
      return;
    }
    bookSpreadRef.current?.flipNext();
  }, [autoRead, story, spreadIndex, lastUnlockedSpreadIndex]);

  const requestFlipPrev = useCallback(() => {
    if (!autoRead) handleStopReading();
    if (spreadIndex <= 0) return;
    bookSpreadRef.current?.flipPrev();
  }, [autoRead, spreadIndex]);

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
          if (e.key === "ArrowLeft") requestFlipNext();
          else if (e.key === "ArrowRight") requestFlipPrev();
        } else {
          if (e.key === "ArrowLeft") requestFlipPrev();
          else if (e.key === "ArrowRight") requestFlipNext();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showCover, loading, isRTL, navigate, previewUnlockOverlayOpen, requestFlipNext, requestFlipPrev]);

  useEffect(() => {
    if (showCover) return;
    const handleMouseMove = () => {
      setControlsVisible(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => setControlsVisible(false), 2000);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [showCover]);

  const handleStart = () => { setShowCover(false); setShowInstructions(true); };
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
        setTimeout(() => readNextPageAfterFlip(), 150);
      },
    });
  };

  const readNextPageAfterFlip = () => {
    const currentIndex = spreadIndexRef.current;
    const currentPage = story?.pages[currentIndex];
    const nextText = currentPage?.textTemplate || "";
    if (!nextText.trim()) {
      setTimeout(() => {
        const retryIndex = spreadIndexRef.current;
        const retryPage = story?.pages[retryIndex];
        const retryText = retryPage?.textTemplate || "";
        if (retryText.trim()) readCurrentPage();
        else { setIsReading(false); setIsPaused(false); }
      }, 200);
      return;
    }
    readCurrentPage();
  };

  const handleReadStory = () => readCurrentPage();
  const handlePauseResume = () => {
    if (!ttsIsSpeaking() && !isReading) return;
    if (ttsIsPaused() || isPaused) { ttsResume(); setIsPaused(false); }
    else { ttsPause(); setIsPaused(true); }
  };
  const handleStopReading = () => { ttsStop(); setIsReading(false); setIsPaused(false); };

  const handleClose = () => {
    handleStopReading();
    if (isFullScreen) toggleFullScreen();
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

  const isMobileReaderActive = isMobile && !showCover && !showInstructions;

  const tt = useCallback(
    (k: string, fallback: string) => {
      try {
        const v = (t as (key: string) => string)(k);
        return v && v !== k ? v : fallback;
      } catch {
        return fallback;
      }
    },
    [t]
  );

  const currentPage = useMemo(
    () => story?.pages?.[spreadIndex] ?? null,
    [story?.pages, spreadIndex]
  );
  const nextSpreadPage = useMemo(
    () => story?.pages?.[spreadIndex + 1],
    [story?.pages, spreadIndex]
  );

  const mobileControlsProps = useMemo(
    () =>
      isMobileReaderActive
        ? {
            onClose: handleClose,
            onReadStory: handleReadStory,
            onPauseResume: handlePauseResume,
            onStopReading: handleStopReading,
            onToggleAutoRead: () => setAutoRead((p) => !p),
            autoRead,
            isReading,
            isPaused,
            voices: voicesForCurrentLang,
            selectedVoiceName,
            onSelectVoice: setSelectedVoiceName,
            labels: {
              close: tt("pages.bookReader.close", "Close"),
              read: tt("pages.bookReader.readStory", "Read story"),
              pause: tt("pages.bookReader.pause", "Pause"),
              resume: tt("pages.bookReader.resume", "Resume"),
              stop: tt("pages.bookReader.stop", "Stop"),
              autoRead: autoRead
                ? tt("pages.bookReader.autoReadOn", "Auto-read on")
                : tt("pages.bookReader.autoReadOff", "Auto-read off"),
              voice: tt("pages.bookReader.voice", "Voice"),
              voiceAuto: tt("pages.bookReader.voiceAuto", "Auto (best)"),
            },
          }
        : undefined,
    [
      isMobileReaderActive,
      autoRead,
      isReading,
      isPaused,
      voicesForCurrentLang,
      selectedVoiceName,
      tt,
      handleClose,
      handleReadStory,
      handlePauseResume,
      handleStopReading,
    ]
  );

  // Hide Sienna widget on mobile reader to avoid overlap with nav arrows
  useEffect(() => {
    if (!isMobileReaderActive) return;
    const container = document.querySelector(".asw-container") as HTMLElement | null;
    if (!container) return;
    const prev = container.style.display;
    container.style.setProperty("display", "none", "important");
    return () => {
      container.style.display = prev;
    };
  }, [isMobileReaderActive]);

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: theme.palette.background.default }}>
        <Typography sx={{ color: theme.palette.text.secondary }}>{t("pages.bookReader.loading")}</Typography>
      </Box>
    );
  }

  if (error || !story) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: theme.palette.background.default, px: 3 }}>
        <Typography sx={{ color: theme.palette.text.secondary, mb: 2, textAlign: "center" }}>{error || t("pages.bookReader.error")}</Typography>
        <IconButton onClick={() => navigate(-1)}><CloseIcon /></IconButton>
      </Box>
    );
  }

  if (!story.pages || story.pages.length === 0) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: theme.palette.background.default, px: 3 }}>
        <Typography sx={{ color: theme.palette.text.secondary, textAlign: "center" }}>{t("pages.bookReader.noPages")}</Typography>
      </Box>
    );
  }

  const canGoPrev = spreadIndex > 0;
  const canGoNext = spreadIndex < story.pages.length - 1;

  if (!currentPage) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: theme.palette.background.default, px: 3 }}>
        <Typography sx={{ color: theme.palette.text.secondary, textAlign: "center" }}>{t("pages.bookReader.noPages")}</Typography>
      </Box>
    );
  }

  return (
    <>
      <Box
        ref={containerRef}
        className="book-reader-page"
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
            uiLanguage={CURRENT_LANGUAGE}
            coverImage={story.coverImage}
            childName={story.childName}
          />
        ) : showInstructions ? (
          <BookPreface
            title={story.title}
            childName={story.childName}
            language={CURRENT_LANGUAGE}
            onBegin={handleInstructionsClose}
          />
        ) : isMobileReaderActive ? (
          // ─── MOBILE READER (Cinema Page) ────────────────────────────────────
          <>
            <BookSpread
              ref={bookSpreadRef}
              page={currentPage}
              title={story.title}
              isRTL={isRTL}
              totalPages={story.pages.length}
              onNext={handleNext}
              onPrev={handlePrev}
              canGoNext={canGoNext}
              canGoPrev={canGoPrev}
              isFullScreen={isFullScreen}
              nextPage={nextSpreadPage}
              mobileControls={mobileControlsProps}
            />

            {/* Bottom-sheet preview gate (mobile) */}
            {previewUnlockOverlayOpen && spreadIndex === lastUnlockedSpreadIndex ? (
              <Box
                sx={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 9500,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Backdrop above the illustration's TOP 40% — keeps illustration visible */}
                <Box
                  onClick={() => setPreviewUnlockOverlayOpen(false)}
                  sx={{
                    flex: "0 0 40%",
                    background: "linear-gradient(to bottom, rgba(20,6,14,0.05), rgba(20,6,14,0.55))",
                    cursor: "pointer",
                  }}
                />
                {/* Bottom sheet — 60% of viewport */}
                <Box
                  sx={{
                    flex: "0 0 60%",
                    background: "linear-gradient(180deg, #FDF8F2 0%, #F5E6EA 100%)",
                    borderRadius: "24px 24px 0 0",
                    boxShadow: "0 -12px 40px rgba(20,6,14,0.45)",
                    px: 3,
                    py: 3,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "stretch",
                    overflow: "auto",
                    animation: "bs-sheet-in 320ms cubic-bezier(.2,.7,.2,1)",
                    "@keyframes bs-sheet-in": {
                      from: { transform: "translateY(100%)" },
                      to: { transform: "translateY(0)" },
                    },
                  }}
                >
                  {/* Drag handle */}
                  <Box sx={{
                    width: 40, height: 4, borderRadius: 2,
                    backgroundColor: "rgba(130,77,92,0.25)",
                    alignSelf: "center", mb: 2,
                  }} />

                  {/* The existing gate component, scaled to fit a sheet */}
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
                    isRTL={isRTL}
                  />
                </Box>
              </Box>
            ) : null}
          </>
        ) : (
          // ─── DESKTOP READER (unchanged) ──────────────────────────────────
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
              <IconButton onClick={handleClose} sx={{ color: theme.palette.text.primary }}><CloseIcon /></IconButton>
              <IconButton onClick={requestFlipPrev} disabled={!canGoPrev} sx={{ color: theme.palette.text.primary, "&:disabled": { color: theme.palette.text.secondary } }}><ArrowBackIosNewIcon /></IconButton>
              <IconButton onClick={requestFlipNext} disabled={!canGoNext} sx={{ color: theme.palette.text.primary, "&:disabled": { color: theme.palette.text.secondary } }}><ArrowForwardIosIcon /></IconButton>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography sx={{ fontSize: "0.85rem", color: theme.palette.text.secondary }}>
                {t("pages.bookReader.pageOf", { current: spreadIndex + 1, total: story.pages.length })}
              </Typography>
              <Tooltip title="Read story" arrow><span><IconButton onClick={handleReadStory} disabled={isReading} sx={{ color: theme.palette.text.primary }}><VolumeUpIcon /></IconButton></span></Tooltip>
              <Tooltip title={isPaused ? "Resume" : "Pause"} arrow><span><IconButton onClick={handlePauseResume} disabled={!isReading} sx={{ color: theme.palette.text.primary }}><PauseIcon /></IconButton></span></Tooltip>
              <Tooltip title="Stop" arrow><span><IconButton onClick={handleStopReading} disabled={!isReading} sx={{ color: theme.palette.text.primary }}><StopIcon /></IconButton></span></Tooltip>
              <Tooltip title={autoRead ? "Auto-read: ON" : "Auto-read: OFF"} arrow>
                <IconButton onClick={() => setAutoRead((p) => !p)} sx={{ color: autoRead ? theme.palette.primary.main : theme.palette.text.primary }}><AutoplayIcon /></IconButton>
              </Tooltip>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Voice</InputLabel>
                <Select label="Voice" value={selectedVoiceName} onChange={(e) => setSelectedVoiceName(e.target.value)}>
                  <MenuItem value="">Auto (best)</MenuItem>
                  {voicesForCurrentLang.map((v) => (<MenuItem key={v.name} value={v.name}>{v.name}</MenuItem>))}
                </Select>
              </FormControl>
              <Tooltip title={isFullScreen ? t("pages.bookReader.exitFullScreen") : t("pages.bookReader.fullScreen")} arrow>
                <IconButton onClick={toggleFullScreen} sx={{ color: theme.palette.text.primary }}>
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
                    height: "calc(100vh - 64px)",
                    minHeight: "unset",
                    mt: "64px",
                    justifyContent: "center",
                    px: 0,
                    py: 0,
                    boxSizing: "border-box",
                  }
                : { pt: 4, pb: 6, px: 0, minHeight: "600px" }),
            }}
          >
            <Box sx={{
              opacity: 1,
              transform: "translateX(0)",
              transition: "opacity 0.4s ease, transform 0.4s ease",
              width: "100%",
              height: isFullScreen ? "calc(100vh - 64px)" : "auto",
              display: isFullScreen ? "flex" : "block",
              flexDirection: "column",
            }}>
              {/* ReaderControls - Regular mode (scrolls with content) */}
              {!isFullScreen && (
                <Box
                  sx={{
                    maxWidth: "calc(100vw - 176px)", mx: "auto", mt: 2, mb: 2, px: { xs: 2, md: 0 }, py: 1,
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2,
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 2, backdropFilter: "blur(8px)",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <IconButton onClick={requestFlipPrev} disabled={!canGoPrev} sx={{ color: theme.palette.text.primary, "&:disabled": { color: theme.palette.text.secondary } }}><ArrowBackIosNewIcon /></IconButton>
                    <IconButton onClick={requestFlipNext} disabled={!canGoNext} sx={{ color: theme.palette.text.primary, "&:disabled": { color: theme.palette.text.secondary } }}><ArrowForwardIosIcon /></IconButton>
                    <Typography sx={{ fontSize: "0.85rem", color: theme.palette.text.secondary }}>
                      {t("pages.bookReader.pageOf", { current: spreadIndex + 1, total: story.pages.length })}
                    </Typography>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Tooltip title="Read story" arrow><span><IconButton onClick={handleReadStory} disabled={isReading} sx={{ color: theme.palette.text.primary }}><VolumeUpIcon /></IconButton></span></Tooltip>
                    <Tooltip title={isPaused ? "Resume" : "Pause"} arrow><span><IconButton onClick={handlePauseResume} disabled={!isReading} sx={{ color: theme.palette.text.primary }}><PauseIcon /></IconButton></span></Tooltip>
                    <Tooltip title="Stop" arrow><span><IconButton onClick={handleStopReading} disabled={!isReading} sx={{ color: theme.palette.text.primary }}><StopIcon /></IconButton></span></Tooltip>
                    <Tooltip title={autoRead ? "Auto-read: ON" : "Auto-read: OFF"} arrow>
                      <IconButton onClick={() => setAutoRead((p) => !p)} sx={{ color: autoRead ? theme.palette.primary.main : theme.palette.text.primary }}><AutoplayIcon /></IconButton>
                    </Tooltip>
                    <Tooltip title={t("pages.bookReader.fullScreen")} arrow>
                      <IconButton onClick={toggleFullScreen} sx={{ color: theme.palette.text.primary }}><FullscreenIcon /></IconButton>
                    </Tooltip>
                    <IconButton onClick={handleClose} sx={{ color: theme.palette.text.primary }}><CloseIcon /></IconButton>
                  </Box>
                </Box>
              )}

              {/* Outer row: [left-arrow] [book+gate] [right-arrow]
                  Arrows are flex siblings of the book — never positioned relative to it.
                  This means the gate's position:absolute inset:0 always resolves
                  to the book box only, never to a padded wrapper. */}
              <Box
                dir="ltr"
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: isFullScreen ? "100%" : "500px",
                  gap: 0,
                }}
              >
                {/* LEFT arrow slot — collapses to zero in fullscreen */}
                <Box sx={{
                  width: isFullScreen ? 0 : { xs: 56, md: 88 },
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  overflow: "hidden",
                }}>
                  {!isFullScreen && (isRTL ? canGoNext : canGoPrev) && (
                    <Box
                      onClick={isRTL ? requestFlipNext : requestFlipPrev}
                      sx={{
                        width: { xs: 44, md: 56 },
                        height: { xs: 44, md: 56 },
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: previewUnlockOverlayOpen ? "default" : "pointer",
                        userSelect: "none",
                        backgroundColor: "rgba(255,255,255,0.9)",
                        border: `2px solid ${theme.palette.divider}`,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        opacity: previewUnlockOverlayOpen ? 0.25 : 1,
                        pointerEvents: previewUnlockOverlayOpen ? "none" : "auto",
                        transition: "transform 0.2s ease, background-color 0.2s ease, opacity 0.2s ease",
                        "&:hover": {
                          backgroundColor: "rgba(255,255,255,1)",
                          transform: "scale(1.05)",
                        },
                      }}
                    >
                      <Typography sx={{ fontSize: { xs: "1.5rem", md: "1.8rem" }, color: "#824D5C", fontWeight: 600, lineHeight: 1 }}>
                        {isRTL ? "←" : "←"}
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Book + gate — isolated box; gate's inset:0 is relative to this */}
                <Box
                  sx={{
                    flex: 1,
                    height: "100%",
                    position: "relative",
                    isolation: "isolate",
                    overflow: isFullScreen ? "hidden" : "visible",
                    minWidth: 0,
                  }}
                >
                  <BookSpread
                    ref={bookSpreadRef}
                    page={currentPage}
                    title={story.title}
                    isRTL={isRTL}
                    totalPages={story.pages.length}
                    onNext={handleNext}
                    onPrev={handlePrev}
                    canGoNext={canGoNext}
                    canGoPrev={canGoPrev}
                    isFullScreen={isFullScreen}
                    nextPage={nextSpreadPage}
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
                      isRTL={isRTL}
                    />
                  ) : null}
                </Box>

                {/* RIGHT arrow slot — collapses to zero in fullscreen */}
                <Box sx={{
                  width: isFullScreen ? 0 : { xs: 56, md: 88 },
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  overflow: "hidden",
                }}>
                  {!isFullScreen && (isRTL ? canGoPrev : canGoNext) && (
                    <Box
                      onClick={isRTL ? requestFlipPrev : requestFlipNext}
                      sx={{
                        width: { xs: 44, md: 56 },
                        height: { xs: 44, md: 56 },
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: previewUnlockOverlayOpen ? "default" : "pointer",
                        userSelect: "none",
                        backgroundColor: "rgba(255,255,255,0.9)",
                        border: `2px solid ${theme.palette.divider}`,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        opacity: previewUnlockOverlayOpen ? 0.25 : 1,
                        pointerEvents: previewUnlockOverlayOpen ? "none" : "auto",
                        transition: "transform 0.2s ease, background-color 0.2s ease, opacity 0.2s ease",
                        "&:hover": {
                          backgroundColor: "rgba(255,255,255,1)",
                          transform: "scale(1.05)",
                        },
                      }}
                    >
                      <Typography sx={{ fontSize: { xs: "1.5rem", md: "1.8rem" }, color: "#824D5C", fontWeight: 600, lineHeight: 1 }}>
                        {isRTL ? "→" : "→"}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>
          </>
        )}
      </Box>
    </>
  );
}
