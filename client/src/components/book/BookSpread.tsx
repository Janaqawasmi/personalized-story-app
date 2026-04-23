import { useEffect, useRef, useState, useCallback } from "react";
import { Box } from "@mui/material";

type Page = {
  pageNumber: number;
  textTemplate: string;
  imagePromptTemplate?: string;
  imageUrl?: string;
  emotionalTone?: string;
};

interface BookSpreadProps {
  page: Page;
  title: string;
  isRTL: boolean;
  totalPages: number;
  onNext?: () => void;
  onPrev?: () => void;
  canGoNext?: boolean;
  canGoPrev?: boolean;
  isFullScreen?: boolean;
  nextPage?: Page;
}

const FLIP_DURATION_MS = 650;
const DRAG_THRESHOLD = 70;
const DRAG_RANGE = 280;

const BOOK_CSS = `
.bs2-scene { perspective: 2800px; position: relative; }
.bs2-book {
  position: relative; display: flex;
  width: 860px; height: 500px;
  transform-style: preserve-3d; border-radius: 4px 8px 8px 4px;
  filter: drop-shadow(0 24px 48px rgba(90,48,64,.38)) drop-shadow(0 4px 10px rgba(90,48,64,.2));
  --bs2-flip: 0.65s;
  --bs2-fs: 22px;
  --bs2-lh: 1.85;
}
.bs2-book.bs2-fullscreen { width: 1040px; height: 620px; }

.bs2-stack { position: absolute; top: 3px; bottom: 3px; width: 20px; display: flex; flex-direction: column; z-index: 0; pointer-events: none; }
.bs2-stack.left { left: -16px; } .bs2-stack.right { right: -16px; }
.bs2-ps { flex: 1; }
.bs2-ps:nth-child(odd) { background: #EDE4DC; border-left: 1px solid rgba(130,77,92,.12); }
.bs2-ps:nth-child(even) { background: #E4D8CE; border-left: 1px solid rgba(130,77,92,.08); }

.bs2-cover-board { position: absolute; top: -5px; bottom: -5px; width: 12px;
  background: linear-gradient(to bottom,#5A3040,#3C1C28 50%,#5A3040); z-index: 1; border-radius: 2px; }
.bs2-cover-board.left { left: -9px; box-shadow: -2px 0 8px rgba(0,0,0,.3); }
.bs2-cover-board.right { right: -9px; box-shadow: 2px 0 8px rgba(0,0,0,.3); border-radius: 2px 4px 4px 2px; }

.bs2-page-left {
  width: 50%; height: 100%; position: relative; overflow: hidden;
  border-radius: 4px 0 0 4px; background: #C8B8BE; z-index: 2;
  cursor: w-resize; flex-shrink: 0; transition: filter .3s;
}
.bs2-page-left:hover { filter: brightness(1.03); }
.bs2-page-left img { width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; transition: opacity .4s; }
.bs2-page-left::after { content: ''; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(to right, transparent 68%, rgba(90,48,64,.18) 85%, rgba(90,48,64,.3) 100%); }
.bs2-page-left::before { content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 1;
  background:
    linear-gradient(to bottom, rgba(0,0,0,.09) 0%, transparent 10%),
    linear-gradient(to top, rgba(0,0,0,.09) 0%, transparent 10%); }

.bs2-img-placeholder {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #C8B8BE 0%, #B07A8A 100%);
  color: #FDF5EE; font-family: 'Playfair Display', serif; font-style: italic;
  font-size: 14px; padding: 24px; text-align: center;
}

.bs2-counter {
  position: absolute; bottom: 18px; left: 20px; z-index: 5;
  background: rgba(247,242,236,.88); backdrop-filter: blur(6px);
  border: 1px solid rgba(130,77,92,.25); border-radius: 30px;
  padding: 4px 14px; font-family: 'Playfair Display', serif; font-size: 11px;
  letter-spacing: .14em; color: #824D5C; pointer-events: none;
}
.bs2-book.bs2-rtl .bs2-counter { left: auto; right: 20px; }

.bs2-spine { width: 20px; height: 100%; flex-shrink: 0; z-index: 10; position: relative;
  background: linear-gradient(to right,#6F404D 0%,#5A3040 30%,#7A4858 50%,#5A3040 70%,#6F404D 100%);
  box-shadow: 2px 0 6px rgba(0,0,0,.22), -2px 0 6px rgba(0,0,0,.22); }
.bs2-spine::before { content: ''; position: absolute; inset: 8px 3px;
  border: 1px solid rgba(176,122,138,.3); border-radius: 1px; }
.bs2-spine-text {
  writing-mode: vertical-rl; font-family: 'Playfair Display', serif;
  font-size: 8px; letter-spacing: .18em; color: rgba(255,235,225,.6); white-space: nowrap;
  position: absolute; top: 50%; left: 50%;
  transform: translateX(-50%) translateY(-50%) rotate(180deg) translateX(50%);
}

.bs2-right { width: 50%; height: 100%; position: relative; flex-shrink: 0; transform-style: preserve-3d; }

.bs2-book.bs2-rtl { flex-direction: row-reverse; border-radius: 8px 4px 4px 8px; }
.bs2-book.bs2-rtl .bs2-page-left { border-radius: 0 4px 4px 0; }
.bs2-book.bs2-rtl .bs2-page-left::after { background: linear-gradient(to left, transparent 68%, rgba(90,48,64,.18) 85%, rgba(90,48,64,.3) 100%); }
.bs2-book.bs2-rtl .bs2-cover-board.left { left: auto; right: -9px; box-shadow: 2px 0 8px rgba(0,0,0,.3); border-radius: 2px 4px 4px 2px; }
.bs2-book.bs2-rtl .bs2-cover-board.right { right: auto; left: -9px; box-shadow: -2px 0 8px rgba(0,0,0,.3); border-radius: 4px 2px 2px 4px; }
.bs2-book.bs2-rtl .bs2-stack.left { left: auto; right: -16px; }
.bs2-book.bs2-rtl .bs2-stack.right { right: auto; left: -16px; }
.bs2-book.bs2-rtl .bs2-flip { transform-origin: right center; }
.bs2-book.bs2-rtl .bs2-flip.bs2-flipped { transform: rotateY(180deg); }
.bs2-book.bs2-rtl .bs2-flip-back { transform: rotateY(-180deg); }
.bs2-book.bs2-rtl .bs2-flip-front::after { background: linear-gradient(to left, rgba(30,15,5,.14) 0%, transparent 20%); }
.bs2-book.bs2-rtl .bs2-fold-shadow { left: auto; right: 0; background: linear-gradient(to left, rgba(0,0,0,.2), transparent); }
.bs2-book.bs2-rtl .bs2-story-text { direction: rtl; font-family: 'Frank Ruhl Libre', serif; font-style: normal; }

.bs2-under {
  position: absolute; inset: 0;
  background: linear-gradient(135deg,#F7F2EC 0%,#EFE7DE 100%);
  border-radius: 0 8px 8px 0; z-index: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 44px 40px; overflow: hidden;
}
.bs2-under::before { content: ''; position: absolute; inset: 0; pointer-events: none; opacity: .6;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.038'/%3E%3C/svg%3E"); }

.bs2-flip {
  position: absolute; inset: 0; transform-origin: left center;
  transform-style: preserve-3d; z-index: 5; border-radius: 0 8px 8px 0;
  transition: transform var(--bs2-flip) cubic-bezier(0.645,0.045,0.355,1.000);
  cursor: e-resize;
}
.bs2-flip.bs2-flipped { transform: rotateY(-180deg); }

.bs2-flip-front {
  position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden;
  background: linear-gradient(135deg,#F7F2EC 0%,#EFE7DE 100%);
  border-radius: 0 8px 8px 0; overflow: hidden;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 44px 40px;
}
.bs2-flip-front::before { content: ''; position: absolute; inset: 0; pointer-events: none; opacity: .6;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.038'/%3E%3C/svg%3E"); }
.bs2-flip-front::after { content: ''; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(to right, rgba(30,15,5,.14) 0%, rgba(30,15,5,.04) 8%, transparent 20%); }

.bs2-edge-shadow { position: absolute; left: 0; right: 0; height: 24px; pointer-events: none; z-index: 2; }
.bs2-edge-shadow.top { top: 0; background: linear-gradient(to bottom, rgba(0,0,0,.09), transparent); }
.bs2-edge-shadow.bottom { bottom: 0; background: linear-gradient(to top, rgba(0,0,0,.09), transparent); }

.bs2-flip-back {
  position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden;
  transform: rotateY(180deg);
  background: linear-gradient(135deg,#EDE4DC 0%,#E4D8CE 100%);
  border-radius: 0 8px 8px 0; box-shadow: inset 0 0 60px rgba(0,0,0,.07);
}

.bs2-fold-shadow {
  position: absolute; top: 0; left: 0; width: 50px; height: 100%;
  background: linear-gradient(to right, rgba(0,0,0,.2), transparent);
  pointer-events: none; z-index: 6; opacity: 0; transition: opacity .2s;
}
.bs2-flip.bs2-flipped .bs2-fold-shadow { opacity: 1; }

.bs2-text-content {
  position: relative; z-index: 3;
  display: flex; flex-direction: column; align-items: center;
  text-align: center; max-width: 340px; width: 100%;
}
.bs2-title-label {
  font-family: 'Playfair Display', serif; font-size: 9px; font-weight: 600;
  letter-spacing: .26em; text-transform: uppercase; color: #824D5C;
  margin-bottom: 18px; opacity: .8;
}
.bs2-ornament { width: 52px; height: 1px;
  background: linear-gradient(to right, transparent, #824D5C, transparent);
  margin-bottom: 22px; opacity: .55; }
.bs2-ornament.b { margin-top: 22px; margin-bottom: 0; }
.bs2-story-text {
  font-family: 'Lora', serif; font-size: var(--bs2-fs); font-weight: 400; font-style: italic;
  line-height: var(--bs2-lh); color: #2C1018; white-space: pre-line; text-align: center;
  margin: 0;
}
.bs2-corner-orn { position: absolute; width: 32px; height: 32px; pointer-events: none; z-index: 2; opacity: .2; }
.bs2-corner-orn.tl { top: 14px; left: 14px; }
.bs2-corner-orn.tr { top: 14px; right: 14px; transform: scaleX(-1); }
.bs2-corner-orn.bl { bottom: 14px; left: 14px; transform: scaleY(-1); }
.bs2-corner-orn.br { bottom: 14px; right: 14px; transform: scale(-1,-1); }

@keyframes bs2-fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.bs2-text-anim { animation: bs2-fadeIn .4s ease forwards; }

.bs2-curl, .bs2-curl-prev {
  position: absolute; width: 52px; height: 52px; z-index: 20; cursor: pointer;
  transition: transform .2s, opacity .2s; background: transparent; border: none; padding: 0;
}
.bs2-curl { bottom: 0; right: 0; transform-origin: bottom right; }
.bs2-curl-prev { bottom: 0; left: 0; transform-origin: bottom left; }
.bs2-curl:hover, .bs2-curl-prev:hover { transform: scale(1.15); }
.bs2-curl:disabled, .bs2-curl-prev:disabled { cursor: default; opacity: .2 !important; pointer-events: none; }

@media (max-width: 768px) {
  .bs2-scene { perspective: none; width: 100%; }
  .bs2-book { width: 100%; height: auto; flex-direction: column; border-radius: 0; filter: none;
    box-shadow: 0 4px 24px rgba(90,48,64,.28); }
  .bs2-book.bs2-rtl { flex-direction: column; }
  .bs2-page-left { width: 100%; height: 56vw; max-height: 340px; border-radius: 0; cursor: default; flex-shrink: 0; }
  .bs2-right { width: 100%; height: auto; flex-shrink: 0; }
  .bs2-flip, .bs2-under { position: relative; border-radius: 0; transform: none !important; transition: opacity .35s !important; }
  .bs2-flip { transform-style: flat !important; }
  .bs2-flip.bs2-flipped { opacity: 0; pointer-events: none; position: absolute; }
  .bs2-flip-front { border-radius: 0; padding: 32px 28px; min-height: 200px; }
  .bs2-flip-back, .bs2-fold-shadow { display: none; }
  .bs2-under { border-radius: 0; position: absolute; inset: 0; opacity: 0; transition: opacity .35s; }
  .bs2-stack, .bs2-cover-board { display: none; }
  .bs2-spine { width: 100%; height: 8px; writing-mode: unset; }
  .bs2-spine-text { display: none; }
  .bs2-curl, .bs2-curl-prev { display: none; }
}
`;

const CornerOrn = ({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) => (
  <svg className={`bs2-corner-orn ${pos}`} viewBox="0 0 32 32" fill="none" aria-hidden>
    <path d="M4 28 Q4 4 28 4" stroke="#824D5C" strokeWidth="1.5" fill="none" />
    <path d="M4 28 Q4 16 16 4" stroke="#824D5C" strokeWidth=".8" fill="none" opacity=".5" />
  </svg>
);

export default function BookSpread({
  page,
  title,
  isRTL,
  totalPages,
  onNext,
  onPrev,
  canGoNext = true,
  canGoPrev = true,
  isFullScreen = false,
  nextPage,
}: BookSpreadProps) {
  const flipRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [displayedPage, setDisplayedPage] = useState<Page>(page);
  const dragStartRef = useRef<number | null>(null);

  // Inject styles once
  useEffect(() => {
    const id = "bs2-book-style";
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = BOOK_CSS;
    document.head.appendChild(el);
  }, []);

  // Keep displayed page in sync; animate text fade-in when it changes
  useEffect(() => {
    setDisplayedPage(page);
    const node = textRef.current;
    if (node) {
      node.style.animation = "none";
      // force reflow
      void node.offsetHeight;
      node.style.animation = "bs2-fadeIn .4s ease forwards";
    }
  }, [page.pageNumber, page.textTemplate, page.imageUrl]);

  const triggerFlip = useCallback(
    (direction: "next" | "prev") => {
      if (isFlipping) return;
      if (direction === "next" && (!canGoNext || !onNext)) return;
      if (direction === "prev" && (!canGoPrev || !onPrev)) return;

      const flipEl = flipRef.current;
      const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

      if (!flipEl || isMobile) {
        // Mobile / no-flip: just invoke callback; BookReaderPage will advance and the text fade-in handles the feel
        if (direction === "next") onNext?.();
        else onPrev?.();
        return;
      }

      setIsFlipping(true);

      if (direction === "next") {
        flipEl.style.transition = `transform ${FLIP_DURATION_MS}ms cubic-bezier(0.645,0.045,0.355,1)`;
        flipEl.classList.add("bs2-flipped");
        window.setTimeout(() => {
          flipEl.style.transition = "none";
          flipEl.classList.remove("bs2-flipped");
          onNext?.();
          window.setTimeout(() => {
            flipEl.style.transition = `transform ${FLIP_DURATION_MS}ms cubic-bezier(0.645,0.045,0.355,1)`;
            setIsFlipping(false);
          }, 50);
        }, FLIP_DURATION_MS + 60);
      } else {
        flipEl.style.transition = "none";
        flipEl.classList.add("bs2-flipped");
        void flipEl.offsetHeight;
        onPrev?.();
        window.setTimeout(() => {
          flipEl.style.transition = `transform ${FLIP_DURATION_MS}ms cubic-bezier(0.645,0.045,0.355,1)`;
          flipEl.classList.remove("bs2-flipped");
          window.setTimeout(() => setIsFlipping(false), FLIP_DURATION_MS + 60);
        }, 30);
      }
    },
    [isFlipping, canGoNext, canGoPrev, onNext, onPrev]
  );

  // Desktop drag-to-flip on the right page
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (window.innerWidth <= 768) return;
    dragStartRef.current = e.clientX;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current === null || isFlipping) return;
    const flipEl = flipRef.current;
    if (!flipEl) return;
    const dx = isRTL ? dragStartRef.current - e.clientX : e.clientX - dragStartRef.current;
    const r = Math.max(0, Math.min(1, -dx / DRAG_RANGE));
    if (r > 0.02) {
      flipEl.style.transition = "none";
      flipEl.style.transform = `rotateY(${-r * 180}deg)`;
    }
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current === null) return;
    const flipEl = flipRef.current;
    const dx = isRTL ? dragStartRef.current - e.clientX : e.clientX - dragStartRef.current;
    if (flipEl) {
      flipEl.style.transform = "";
      flipEl.style.transition = `transform ${FLIP_DURATION_MS}ms cubic-bezier(0.645,0.045,0.355,1)`;
    }
    dragStartRef.current = null;
    if (dx < -DRAG_THRESHOLD) triggerFlip("next");
  };

  const onRightClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".bs2-curl, .bs2-curl-prev")) return;
    triggerFlip("next");
  };

  const bookClass = `bs2-book ${isRTL ? "bs2-rtl" : ""} ${isFullScreen ? "bs2-fullscreen" : ""}`.trim();

  const imageUrl = displayedPage.imageUrl;
  const fallbackText = displayedPage.imagePromptTemplate;
  const underText = nextPage?.textTemplate ?? "";

  return (
    <Box className="bs2-scene">
      <div className={bookClass}>
        <div className="bs2-cover-board left" />
        <div className="bs2-cover-board right" />
        <div className="bs2-stack left">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="bs2-ps" />)}
        </div>
        <div className="bs2-stack right">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="bs2-ps" />)}
        </div>

        {/* LEFT: illustration */}
        <div
          className="bs2-page-left"
          onClick={() => triggerFlip("prev")}
          role="button"
          aria-label="Previous page"
        >
          {imageUrl ? (
            <img src={imageUrl} alt="" />
          ) : (
            <div className="bs2-img-placeholder">{fallbackText || ""}</div>
          )}
          <div className="bs2-counter">
            {displayedPage.pageNumber} / {totalPages}
          </div>
        </div>

        {/* SPINE */}
        <div className="bs2-spine">
          <div className="bs2-spine-text">{title}</div>
        </div>

        {/* RIGHT: flip zone */}
        <div className="bs2-right">
          {/* Under page (next page's text shows through during flip) */}
          <div className="bs2-under">
            <CornerOrn pos="tl" />
            <CornerOrn pos="tr" />
            <CornerOrn pos="bl" />
            <CornerOrn pos="br" />
            <div className="bs2-text-content">
              <div className="bs2-title-label">{title}</div>
              <div className="bs2-ornament" />
              <p className="bs2-story-text">{underText}</p>
              <div className="bs2-ornament b" />
            </div>
          </div>

          {/* Flipping page */}
          <div
            ref={flipRef}
            className="bs2-flip"
            onClick={onRightClick}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => { dragStartRef.current = null; }}
          >
            <div className="bs2-flip-front">
              <div className="bs2-edge-shadow top" />
              <div className="bs2-edge-shadow bottom" />
              <CornerOrn pos="tl" />
              <CornerOrn pos="tr" />
              <CornerOrn pos="bl" />
              <CornerOrn pos="br" />
              <div className="bs2-text-content" ref={textRef}>
                <div className="bs2-title-label">{title}</div>
                <div className="bs2-ornament" />
                <p className="bs2-story-text">{displayedPage.textTemplate}</p>
                <div className="bs2-ornament b" />
              </div>
              <div className="bs2-fold-shadow" />
            </div>
            <div className="bs2-flip-back" />

            <button
              className="bs2-curl"
              disabled={!canGoNext}
              onClick={(e) => { e.stopPropagation(); triggerFlip("next"); }}
              aria-label="Next page"
              type="button"
            >
              <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden>
                <defs>
                  <linearGradient id="bs2cg1" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#824D5C" stopOpacity=".55" />
                    <stop offset="100%" stopColor="#F7F2EC" stopOpacity=".92" />
                  </linearGradient>
                  <filter id="bs2cs">
                    <feDropShadow dx="-2" dy="-2" stdDeviation="3" floodColor="rgba(90,48,64,.28)" />
                  </filter>
                </defs>
                <path d="M52 52 L52 22 Q52 52 22 52 Z" fill="url(#bs2cg1)" filter="url(#bs2cs)" />
                <path d="M52 22 Q38 38 22 52" stroke="rgba(130,77,92,.4)" strokeWidth="1" fill="none" />
              </svg>
            </button>
          </div>

          <button
            className="bs2-curl-prev"
            disabled={!canGoPrev}
            onClick={(e) => { e.stopPropagation(); triggerFlip("prev"); }}
            aria-label="Previous page"
            type="button"
          >
            <svg width="52" height="52" viewBox="0 0 52 52" style={{ transform: "scaleX(-1)" }} aria-hidden>
              <defs>
                <linearGradient id="bs2cg2" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#824D5C" stopOpacity=".55" />
                  <stop offset="100%" stopColor="#F7F2EC" stopOpacity=".92" />
                </linearGradient>
              </defs>
              <path d="M52 52 L52 22 Q52 52 22 52 Z" fill="url(#bs2cg2)" opacity=".65" />
              <path d="M52 22 Q38 38 22 52" stroke="rgba(130,77,92,.35)" strokeWidth="1" fill="none" />
            </svg>
          </button>
        </div>
      </div>
    </Box>
  );
}
