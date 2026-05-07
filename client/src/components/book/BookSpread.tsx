import {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
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

  /* Mobile-only: control panel state injected from BookReaderPage.
     When this prop is present and the viewport is mobile, BookSpread renders
     a tap-to-toggle controls panel that gives full TTS parity with desktop. */
  mobileControls?: {
    onClose: () => void;
    onReadStory: () => void;
    onPauseResume: () => void;
    onStopReading: () => void;
    onToggleAutoRead: () => void;
    autoRead: boolean;
    isReading: boolean;
    isPaused: boolean;
    voices: SpeechSynthesisVoice[];
    selectedVoiceName: string;
    onSelectVoice: (name: string) => void;
    labels: {
      close: string;
      read: string;
      pause: string;
      resume: string;
      stop: string;
      autoRead: string;
      voice: string;
      voiceAuto: string;
    };
  };
}

export type BookSpreadHandle = {
  flipNext: () => void;
  flipPrev: () => void;
};

const FLIP_DURATION_MS = 850;
const DRAG_THRESHOLD = 70;
const DRAG_RANGE = 280;
const MOBILE_CONTROLS_AUTO_HIDE_MS = 3500;

const BOOK_CSS = `
.bs2-scene {
  perspective: 2800px;
  position: relative;
  width: 100%;
  height: 100%;
}
.bs2-book {
  position: relative; display: flex;
  width: 100%; height: 100%;
  transform-style: preserve-3d;
  border-radius: 4px 8px 8px 4px;
  overflow: hidden;
  /* Border IS the cover — nothing can render outside this box */
  border-left:   5px solid #3C1C28;
  border-right:  5px solid #3C1C28;
  border-top:    1px solid rgba(60,28,40,.4);
  border-bottom: 1px solid rgba(60,28,40,.4);
  box-shadow:
    0 24px 50px rgba(90,48,64,.38),
    0 4px 12px rgba(90,48,64,.2),
    inset  1px 0 0 rgba(176,122,138,.18),
    inset -1px 0 0 rgba(176,122,138,.18);
  --bs2-flip: 0.85s;
  --bs2-fs: clamp(18px, 1.6vw, 28px);
  --bs2-lh: 1.9;
}
.bs2-book.bs2-fullscreen {
  border-radius: 0;
  border-left-width:  0;
  border-right-width: 0;
  border-top-width:   0;
  border-bottom-width:0;
  box-shadow: none;
}
.bs2-book.bs2-fullscreen .bs2-stack { display: none; }
.bs2-book.bs2-fullscreen .bs2-spine { width: max(20px, 1.4vw); }
.bs2-book.bs2-fullscreen .bs2-curl { width: 64px; height: 64px; }
.bs2-book.bs2-fullscreen .bs2-curl-prev { width: 64px; height: 64px; }

/* Fan stacks — anchored to left:0 / right:0 inside the clipping border */
.bs2-stack {
  position: absolute; top: 0; bottom: 0; width: 18px;
  z-index: 3; pointer-events: none; overflow: hidden;
}
.bs2-stack.left  { left:  0; }
.bs2-stack.right { right: 0; }

.bs2-ps { position: absolute; top: 0; bottom: 0; }

/* LEFT fan: darkest at left edge (outer), lightest at right edge (inner) */
.bs2-stack.left .bs2-ps:nth-child(1) { left:  0;    right: 0; background: #B0A098; }
.bs2-stack.left .bs2-ps:nth-child(2) { left:  2px;  right: 0; background: #BEAEA6; }
.bs2-stack.left .bs2-ps:nth-child(3) { left:  4px;  right: 0; background: #CABDB5; }
.bs2-stack.left .bs2-ps:nth-child(4) { left:  6px;  right: 0; top: 1px; bottom: 1px; background: #D5C8C0; }
.bs2-stack.left .bs2-ps:nth-child(5) { left:  8px;  right: 0; top: 2px; bottom: 2px; background: #DEDAD2; }
.bs2-stack.left .bs2-ps:nth-child(6) { left: 10px;  right: 0; top: 2px; bottom: 2px; background: #E6DDD6; }
.bs2-stack.left .bs2-ps:nth-child(7) { left: 12px;  right: 0; top: 3px; bottom: 3px; background: #EDE4DC; }
.bs2-stack.left .bs2-ps:nth-child(8) { left: 14px;  right: 0; top: 4px; bottom: 4px; background: #F2EBE3; border-right: 1px solid rgba(130,77,92,.18); }

/* RIGHT fan: exact mirror — darkest at right edge (outer), lightest at left edge (inner) */
.bs2-stack.right .bs2-ps:nth-child(1) { right:  0;    left: 0; background: #B0A098; }
.bs2-stack.right .bs2-ps:nth-child(2) { right:  2px;  left: 0; background: #BEAEA6; }
.bs2-stack.right .bs2-ps:nth-child(3) { right:  4px;  left: 0; background: #CABDB5; }
.bs2-stack.right .bs2-ps:nth-child(4) { right:  6px;  left: 0; top: 1px; bottom: 1px; background: #D5C8C0; }
.bs2-stack.right .bs2-ps:nth-child(5) { right:  8px;  left: 0; top: 2px; bottom: 2px; background: #DEDAD2; }
.bs2-stack.right .bs2-ps:nth-child(6) { right: 10px;  left: 0; top: 2px; bottom: 2px; background: #E6DDD6; }
.bs2-stack.right .bs2-ps:nth-child(7) { right: 12px;  left: 0; top: 3px; bottom: 3px; background: #EDE4DC; }
.bs2-stack.right .bs2-ps:nth-child(8) { right: 14px;  left: 0; top: 4px; bottom: 4px; background: #F2EBE3; border-left: 1px solid rgba(130,77,92,.18); }

/* Cover boards replaced by .bs2-book border — these divs are kept in JSX but hidden */
.bs2-cover-board { display: none; }

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
/* RTL: fan positions are symmetric so no change needed — both fans stay at left:0 / right:0.
   Border radius flips to match RTL book orientation. */
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
  transition: transform var(--bs2-flip) cubic-bezier(0.33, 0.1, 0.25, 1);
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

/* Mobile-only elements are hidden on desktop */
.bs2-mobile-nav            { display: none; }
.bs2-mobile-topbar         { display: none; }
.bs2-mobile-controls-panel { display: none; }
.bs2-mobile-tap-zone       { display: none; }

@media (max-width: 768px) {
  /* Book container fills the whole viewport */
  .bs2-scene {
    perspective: none;
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    height: 100svh;
    z-index: 9000;
    background: #1a0e14;
  }
  .bs2-book {
    position: relative;
    width: 100%;
    height: 100%;
    flex-direction: row;
    border-radius: 0;
    filter: none;
    box-shadow: none;
    overflow: hidden;
  }
  .bs2-book.bs2-rtl { flex-direction: row; }

  /* Illustration fills the entire screen */
  .bs2-page-left {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border-radius: 0;
    cursor: default;
    flex-shrink: unset;
    z-index: 1;
  }
  .bs2-page-left:hover { filter: none; }
  .bs2-page-left::after,
  .bs2-page-left::before { display: none; }
  .bs2-page-left img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center top;
  }

  /* Always-on contrast gradient */
  .bs2-cinema-gradient {
    position: absolute;
    left: 0; right: 0; bottom: 0;
    height: 72%;
    background: linear-gradient(to top,
      rgba(20,6,14,0.97) 0%,
      rgba(20,6,14,0.88) 28%,
      rgba(20,6,14,0.55) 52%,
      rgba(20,6,14,0.15) 72%,
      transparent 100%);
    pointer-events: none;
    z-index: 3;
  }

  /* Right panel: full-screen overlay */
  .bs2-right {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    flex-shrink: unset;
    z-index: 4;
  }

  /* Flip wrapper: transparent, no 3D */
  .bs2-flip {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border-radius: 0;
    background: transparent;
    transform: none !important;
    transform-style: flat !important;
    transition: opacity 0.35s ease !important;
    cursor: default;
  }
  .bs2-flip.bs2-flipped { opacity: 0; pointer-events: none; position: absolute; }

  /* Flip front: transparent, text pushed to bottom */
  .bs2-flip-front {
    background: transparent;
    border-radius: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 0;
    min-height: unset;
    overflow: visible;
  }
  .bs2-flip-front::before,
  .bs2-flip-front::after { display: none; }

  /* Story text */
  .bs2-text-content {
    max-width: 100%;
    width: 100%;
    padding: 0 28px;
    align-items: center;
  }
  .bs2-title-label {
    color: rgba(176,122,138,0.9);
    margin-bottom: 12px;
  }
  .bs2-ornament { opacity: 0.4; }
  .bs2-ornament.b { display: none; }
  .bs2-story-text {
    font-size: 17px;
    line-height: 1.75;
    color: rgba(253,245,238,0.95);
    text-shadow: 0 1px 8px rgba(0,0,0,0.6);
    margin-bottom: 0;
  }

  /* Mobile bottom nav (always visible) */
  .bs2-mobile-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 28px 36px;
    width: 100%;
    flex-shrink: 0;
    position: relative;
    z-index: 6;
  }
  .bs2-mobile-btn {
    width: 44px; height: 44px;
    border-radius: 50%;
    border: none;
    background: linear-gradient(135deg, #824D5C, #B07A8A);
    color: #FDF5EE;
    font-size: 22px;
    line-height: 1;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(90,48,64,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s ease, opacity 0.15s ease;
    padding-bottom: 2px;
  }
  .bs2-mobile-btn:disabled {
    background: rgba(130,77,92,0.15);
    box-shadow: none;
    opacity: 0.35;
    cursor: default;
  }
  .bs2-mobile-btn:not(:disabled):active { transform: scale(0.93); }
  .bs2-mobile-progress {
    flex: 1;
    height: 3px;
    background: rgba(253,245,238,0.15);
    border-radius: 2px;
    margin: 0 16px;
    overflow: hidden;
  }
  .bs2-mobile-progress-fill {
    height: 100%;
    border-radius: 2px;
    background: linear-gradient(to right, #824D5C, #B07A8A);
    transition: width 0.4s ease;
  }

  /* Subtle title bar (always visible until controls panel opens) */
  .bs2-mobile-topbar {
    display: flex;
    position: absolute;
    top: 0; left: 0; right: 0;
    padding: 14px 20px;
    align-items: center;
    justify-content: center;
    background: linear-gradient(to bottom, rgba(0,0,0,0.45), transparent);
    z-index: 8;
    pointer-events: none;
    transition: opacity 0.25s ease;
  }
  .bs2-mobile-topbar-title {
    font-family: 'Playfair Display', serif;
    font-size: 10px;
    font-style: italic;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(253,245,238,0.7);
    text-align: center;
  }
  /* Hide the basic topbar when the full controls panel is showing */
  .bs2-scene.bs2-controls-open .bs2-mobile-topbar { opacity: 0; }

  /* Tap zone — covers the central area; tapping it toggles the controls panel.
     Sits below the bottom nav and the bottom story text so they remain interactive. */
  .bs2-mobile-tap-zone {
    display: block;
    position: absolute;
    top: 56px;
    left: 0; right: 0;
    bottom: 130px;
    z-index: 5;
    background: transparent;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  /* Slide-down controls panel — appears on tap, auto-hides after a few seconds */
  .bs2-mobile-controls-panel {
    display: flex;
    flex-direction: column;
    gap: 10px;
    position: absolute;
    top: 0; left: 0; right: 0;
    padding: 14px 16px 16px;
    background: linear-gradient(to bottom, rgba(20,6,14,0.92) 0%, rgba(20,6,14,0.78) 70%, rgba(20,6,14,0) 100%);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    z-index: 11;
    transform: translateY(-100%);
    opacity: 0;
    pointer-events: none;
    transition: transform 0.28s cubic-bezier(.2,.7,.2,1), opacity 0.22s ease;
  }
  .bs2-mobile-controls-panel.bs2-show {
    transform: translateY(0);
    opacity: 1;
    pointer-events: auto;
  }

  .bs2-mobile-controls-row {
    display: flex; align-items: center; gap: 8px;
  }
  .bs2-mobile-controls-row.spread { justify-content: space-between; }

  .bs2-mobile-iconbtn {
    width: 38px; height: 38px;
    border-radius: 50%;
    border: 1px solid rgba(253,245,238,0.18);
    background: rgba(253,245,238,0.08);
    color: #FDF5EE;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s ease, transform 0.1s ease, border-color 0.15s ease;
    padding: 0;
    flex-shrink: 0;
  }
  .bs2-mobile-iconbtn:not(:disabled):active { transform: scale(0.92); }
  .bs2-mobile-iconbtn:disabled { opacity: 0.35; cursor: default; }
  .bs2-mobile-iconbtn.bs2-active {
    background: rgba(176,122,138,0.4);
    border-color: rgba(176,122,138,0.7);
  }
  .bs2-mobile-iconbtn svg { width: 18px; height: 18px; }

  .bs2-mobile-controls-title {
    flex: 1;
    font-family: 'Playfair Display', serif;
    font-size: 11px;
    font-style: italic;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(253,245,238,0.85);
    text-align: center;
  }

  .bs2-mobile-voice-select {
    flex: 1;
    background: rgba(253,245,238,0.08);
    color: #FDF5EE;
    border: 1px solid rgba(253,245,238,0.18);
    border-radius: 18px;
    padding: 7px 14px;
    font-family: inherit;
    font-size: 13px;
    -webkit-appearance: none;
    appearance: none;
    cursor: pointer;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path d='M1 1l4 4 4-4' stroke='%23FDF5EE' stroke-width='1.5' fill='none' stroke-linecap='round'/></svg>");
    background-repeat: no-repeat;
    background-position: right 12px center;
    padding-inline-end: 28px;
  }
  .bs2-mobile-voice-select option { background: #1a0e14; color: #FDF5EE; }

  /* Hide all desktop-only elements */
  .bs2-flip-back, .bs2-fold-shadow, .bs2-under,
  .bs2-stack, .bs2-cover-board, .bs2-spine,
  .bs2-curl, .bs2-curl-prev, .bs2-edge-shadow,
  .bs2-corner-orn, .bs2-counter { display: none; }
}
`;

const CornerOrn = ({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) => (
  <svg className={`bs2-corner-orn ${pos}`} viewBox="0 0 32 32" fill="none" aria-hidden>
    <path d="M4 28 Q4 4 28 4" stroke="#824D5C" strokeWidth="1.5" fill="none" />
    <path d="M4 28 Q4 16 16 4" stroke="#824D5C" strokeWidth=".8" fill="none" opacity=".5" />
  </svg>
);

/* Inline icons — no external dep, streaming-safe */
const Icon = {
  close: () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M5 5l10 10M15 5l-10 10" />
    </svg>
  ),
  speaker: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M3 8v4h3l4 3V5L6 8H3z" />
      <path d="M13 7a4 4 0 010 6" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M15 5a7 7 0 010 10" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  ),
  pause: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <rect x="5" y="4" width="3.4" height="12" rx="1" />
      <rect x="11.6" y="4" width="3.4" height="12" rx="1" />
    </svg>
  ),
  play: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M6 4l10 6-10 6V4z" />
    </svg>
  ),
  stop: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <rect x="5" y="5" width="10" height="10" rx="1.5" />
    </svg>
  ),
  autoplay: () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M8.5 7.2v5.6L13 10z" fill="currentColor" stroke="none" />
    </svg>
  ),
};

const BookSpread = forwardRef<BookSpreadHandle, BookSpreadProps>(function BookSpread(
  {
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
    mobileControls,
  },
  ref
) {
  const flipRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [displayedPage, setDisplayedPage] = useState<Page>(page);
  const dragStartRef = useRef<number | null>(null);
  const swipeTouchRef = useRef<number | null>(null);

  /* Mobile controls toggle state */
  const [showControls, setShowControls] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => setShowControls(false), MOBILE_CONTROLS_AUTO_HIDE_MS);
  }, []);

  const revealControls = useCallback(() => {
    setShowControls(true);
    scheduleHide();
  }, [scheduleHide]);

  const toggleControls = useCallback(() => {
    if (showControls) {
      setShowControls(false);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    } else {
      revealControls();
    }
  }, [showControls, revealControls]);

  // Reveal briefly when reading starts so the user sees the pause/stop
  useEffect(() => {
    if (mobileControls?.isReading) revealControls();
  }, [mobileControls?.isReading, revealControls]);

  useEffect(() => () => {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
  }, []);

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

  // Desktop drag-to-flip
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
    if (window.innerWidth <= 768) return;
    triggerFlip("next");
  };

  // Mobile swipe-to-turn (RTL-aware)
  const onMobileTouchStart = (e: React.TouchEvent) => {
    if (window.innerWidth > 768) return;
    swipeTouchRef.current = e.touches[0].clientX;
  };
  const onMobileTouchEnd = (e: React.TouchEvent) => {
    if (window.innerWidth > 768 || swipeTouchRef.current === null) return;
    const dx = swipeTouchRef.current - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 44) {
      if (dx > 0) triggerFlip(isRTL ? "prev" : "next");
      else        triggerFlip(isRTL ? "next" : "prev");
    }
    swipeTouchRef.current = null;
  };

  const sceneClass = `bs2-scene ${showControls ? "bs2-controls-open" : ""}`.trim();
  const bookClass = `bs2-book ${isRTL ? "bs2-rtl" : ""} ${isFullScreen ? "bs2-fullscreen" : ""}`.trim();

  const imageUrl = displayedPage.imageUrl;
  const fallbackText = displayedPage.imagePromptTemplate;
  const underText = nextPage?.textTemplate ?? "";
  const voicesForCurrentLang = mobileControls?.voices ?? [];

  useImperativeHandle(
    ref,
    () => ({
      flipNext: () => triggerFlip("next"),
      flipPrev: () => triggerFlip("prev"),
    }),
    [triggerFlip]
  );

  return (
    <Box className={sceneClass} sx={{ width: "100%", height: "100%" }}>
      <div className={bookClass}>

        {/* ───── Mobile controls panel (slide-down, tap-to-toggle) ───── */}
        {mobileControls ? (
          <div
            className={`bs2-mobile-controls-panel ${showControls ? "bs2-show" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Row 1: close + title (centered) */}
            <div className="bs2-mobile-controls-row spread">
              <button
                className="bs2-mobile-iconbtn"
                onClick={() => mobileControls.onClose()}
                aria-label={mobileControls.labels.close}
                type="button"
              >
                <Icon.close />
              </button>
              <span className="bs2-mobile-controls-title">{title}</span>
              <div style={{ width: 38, height: 38, flexShrink: 0 }} aria-hidden />
            </div>

            {/* Row 2: TTS controls */}
            <div className="bs2-mobile-controls-row" style={{ justifyContent: "center", gap: 14 }}>
              <button
                className="bs2-mobile-iconbtn"
                onClick={() => { mobileControls.onReadStory(); revealControls(); }}
                disabled={mobileControls.isReading}
                aria-label={mobileControls.labels.read}
                type="button"
              >
                <Icon.speaker />
              </button>
              <button
                className="bs2-mobile-iconbtn"
                onClick={() => { mobileControls.onPauseResume(); revealControls(); }}
                disabled={!mobileControls.isReading}
                aria-label={mobileControls.isPaused ? mobileControls.labels.resume : mobileControls.labels.pause}
                type="button"
              >
                {mobileControls.isPaused ? <Icon.play /> : <Icon.pause />}
              </button>
              <button
                className="bs2-mobile-iconbtn"
                onClick={() => { mobileControls.onStopReading(); revealControls(); }}
                disabled={!mobileControls.isReading}
                aria-label={mobileControls.labels.stop}
                type="button"
              >
                <Icon.stop />
              </button>
              <button
                className={`bs2-mobile-iconbtn ${mobileControls.autoRead ? "bs2-active" : ""}`}
                onClick={() => { mobileControls.onToggleAutoRead(); revealControls(); }}
                aria-label={mobileControls.labels.autoRead}
                aria-pressed={mobileControls.autoRead}
                type="button"
              >
                <Icon.autoplay />
              </button>
            </div>

            {/* Row 3: voice picker (only if voices available) */}
            {voicesForCurrentLang.length > 0 ? (
              <div className="bs2-mobile-controls-row">
                <select
                  className="bs2-mobile-voice-select"
                  value={mobileControls.selectedVoiceName}
                  onChange={(e) => { mobileControls.onSelectVoice(e.target.value); revealControls(); }}
                  aria-label={mobileControls.labels.voice}
                >
                  <option value="">{mobileControls.labels.voiceAuto}</option>
                  {voicesForCurrentLang.map((v) => (
                    <option key={v.name} value={v.name}>{v.name}</option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Mobile only — subtle title bar (always visible until controls panel opens) */}
        <div className="bs2-mobile-topbar">
          <span className="bs2-mobile-topbar-title">{title}</span>
        </div>

        {/* Mobile only — always-on contrast gradient */}
        <div className="bs2-cinema-gradient" aria-hidden />

        {/* Mobile only — invisible tap zone that toggles the controls panel */}
        {mobileControls ? (
          <div
            className="bs2-mobile-tap-zone"
            onClick={toggleControls}
            aria-hidden
          />
        ) : null}

        <div className="bs2-cover-board left" />
        <div className="bs2-cover-board right" />
        <div className="bs2-stack left">
          {[0,1,2,3,4,5,6,7].map((i) => <div key={i} className="bs2-ps" />)}
        </div>
        <div className="bs2-stack right">
          {[0,1,2,3,4,5,6,7].map((i) => <div key={i} className="bs2-ps" />)}
        </div>

        {/* LEFT: illustration */}
        <div
          className="bs2-page-left"
          onClick={() => {
            if (window.innerWidth <= 768) return;
            triggerFlip("prev");
          }}
          role="button"
          aria-label="Previous page"
        >
          {imageUrl ? (
            <img src={imageUrl} alt="" />
          ) : (
            <div className="bs2-img-placeholder">{fallbackText || ""}</div>
          )}
          <div style={{ position:"absolute", inset:0, top:0, bottom:0, left:0, width:20, background:"linear-gradient(to right,rgba(60,28,40,.16),transparent)", zIndex:3, pointerEvents:"none" }} />
          {!isFullScreen && (
            <div className="bs2-counter">
              {displayedPage.pageNumber} / {totalPages}
            </div>
          )}
        </div>

        {/* SPINE */}
        <div className="bs2-spine">
          <div className="bs2-spine-text">{title}</div>
        </div>

        {/* RIGHT: flip zone */}
        <div
          className="bs2-right"
          onTouchStart={onMobileTouchStart}
          onTouchEnd={onMobileTouchEnd}
        >
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
            {isFullScreen && (
              <div className="bs2-counter" style={{ left: "auto", right: 20, bottom: 18 }}>
                {displayedPage.pageNumber} / {totalPages}
              </div>
            )}
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
              <div style={{ position:"absolute", inset:0, top:0, bottom:0, right:0, width:20, background:"linear-gradient(to left,rgba(60,28,40,.1),transparent)", zIndex:3, pointerEvents:"none" }} />
              <div className="bs2-text-content" ref={textRef}>
                <div className="bs2-title-label">{title}</div>
                <div className="bs2-ornament" />
                <p className="bs2-story-text">{displayedPage.textTemplate}</p>
                <div className="bs2-ornament b" />
              </div>

              {/* Mobile only — bottom nav */}
              <div className="bs2-mobile-nav">
                <button
                  className="bs2-mobile-btn"
                  disabled={!canGoPrev}
                  onClick={(e) => { e.stopPropagation(); triggerFlip("prev"); }}
                  aria-label="Previous page"
                  type="button"
                >{'\u2039'}</button>
                <div className="bs2-mobile-progress">
                  <div
                    className="bs2-mobile-progress-fill"
                    style={{
                      width: `${(displayedPage.pageNumber / totalPages) * 100}%`,
                    }}
                  />
                </div>
                <button
                  className="bs2-mobile-btn"
                  disabled={!canGoNext}
                  onClick={(e) => { e.stopPropagation(); triggerFlip("next"); }}
                  aria-label="Next page"
                  type="button"
                >{'\u203A'}</button>
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
});

export default BookSpread;
