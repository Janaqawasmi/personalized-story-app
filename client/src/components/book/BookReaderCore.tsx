import { useMemo, useState, useRef, type Dispatch, type SetStateAction } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import CloseIcon from "@mui/icons-material/Close";
import BookCover from "./BookCover";
import BookSpread, { type BookSpreadHandle } from "./BookSpread";
import type { BookReaderModel } from "./BookReaderModel";
import { useLanguage } from "../../i18n/context/LanguageContext";

/** Parent-managed navigation (e.g. specialist approval dialog footer). */
export interface BookReaderChromelessNav {
  showCover: boolean;
  spreadIndex: number;
  setShowCover: Dispatch<SetStateAction<boolean>>;
  setSpreadIndex: Dispatch<SetStateAction<number>>;
}

interface Props {
  model: BookReaderModel;
  onClose?: () => void;
  /** When set, navigation is controlled by the parent instead of internal state. */
  nav?: BookReaderChromelessNav;
  /** Hide sticky close row and internal prev/next strip (parent supplies chrome). */
  chromeless?: boolean;
}

/**
 * Read-only book spread experience for specialist approval preview.
 * Reuses {@link BookCover} + {@link BookSpread} without personalization or commerce gates.
 */
export default function BookReaderCore({
  model,
  onClose,
  nav,
  chromeless = false,
}: Props) {
  const { language: uiLanguage } = useLanguage();
  const [internalShowCover, setInternalShowCover] = useState(true);
  const [internalSpreadIndex, setInternalSpreadIndex] = useState(0);
  const bookSpreadRef = useRef<BookSpreadHandle | null>(null);

  const showCover = nav ? nav.showCover : internalShowCover;
  const setShowCover = nav ? nav.setShowCover : setInternalShowCover;
  const spreadIndex = nav ? nav.spreadIndex : internalSpreadIndex;
  const setSpreadIndex = nav ? nav.setSpreadIndex : setInternalSpreadIndex;

  const isRTL = model.language === "he" || model.language === "ar";

  const currentPage = model.pages[spreadIndex];
  const canGoPrev = spreadIndex > 0;
  const canGoNext = spreadIndex < model.pages.length - 1;

  const storyLanguage = useMemo(
    () => (model.language === "ar" ? "ar" : "he"),
    [model.language],
  );

  if (!currentPage) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary">
          No pages to preview.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: chromeless ? 0 : "70vh",
        maxHeight: chromeless ? "none" : "90vh",
        overflow: chromeless ? "visible" : "auto",
        bgcolor: chromeless ? "transparent" : "background.default",
        direction: isRTL ? "rtl" : "ltr",
        position: "relative",
      }}
    >
      {!chromeless && onClose ? (
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            display: "flex",
            justifyContent: "flex-end",
            p: 1,
            bgcolor: "background.paper",
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <IconButton onClick={onClose} aria-label="Close preview">
            <CloseIcon />
          </IconButton>
        </Box>
      ) : null}

      {showCover ? (
        <BookCover
          title={model.title}
          onStart={() => {
            setShowCover(false);
            setSpreadIndex(0);
          }}
          language={storyLanguage}
          uiLanguage={uiLanguage}
          coverImage={model.coverImageUrl ?? undefined}
          childName={model.childDisplayName ?? undefined}
        />
      ) : (
        <Box sx={{ px: chromeless ? 0 : 2, pb: chromeless ? 2 : 4, pt: chromeless ? 0 : 2 }}>
          {!chromeless ? (
            <Box
              sx={{
                maxWidth: 1200,
                mx: "auto",
                mb: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <IconButton onClick={() => setSpreadIndex((i) => Math.max(0, i - 1))} disabled={!canGoPrev}>
                  <ArrowBackIosNewIcon />
                </IconButton>
                <IconButton
                  onClick={() => setSpreadIndex((i) => Math.min(model.pages.length - 1, i + 1))}
                  disabled={!canGoNext}
                >
                  <ArrowForwardIosIcon />
                </IconButton>
                <Typography variant="body2" color="text.secondary">
                  {spreadIndex + 1} / {model.pages.length}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Approval preview (read-only)
              </Typography>
            </Box>
          ) : null}

          <Box
            dir="ltr"
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
              mx: "auto",
            }}
          >
            <BookSpread
              ref={bookSpreadRef}
              page={currentPage}
              title={model.title}
              isRTL={isRTL}
              totalPages={model.pages.length}
              onNext={() => setSpreadIndex((i) => Math.min(model.pages.length - 1, i + 1))}
              onPrev={() => setSpreadIndex((i) => Math.max(0, i - 1))}
              canGoNext={canGoNext}
              canGoPrev={canGoPrev}
              isFullScreen={false}
              nextPage={model.pages[spreadIndex + 1]}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}
