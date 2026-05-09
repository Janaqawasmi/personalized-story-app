export const BOOK_COLORS = {
  leatherBase: "#5A3040",
  leatherDark: "#3C1C28",
  leatherMid: "#6F404D",
  leatherHighlight: "#7A4858",
  parchmentLight: "#F7F2EC",
  parchmentDark: "#EFE7DE",
  parchmentEdge: "#EDE4DC",
  parchmentEdgeDark: "#E4D8CE",
  ink: "#3C1C24",
  inkSoft: "rgba(60,28,36,0.62)",
  inkMuted: "rgba(60,28,36,0.45)",
  rose: "#824D5C",
  roseLight: "#B07A8A",
  roseDeep: "#6F404D",
  cream: "#FDF5EE",
  creamDim: "rgba(253,245,238,0.72)",
  creamFaint: "rgba(253,245,238,0.5)",
  pageBg: "#E5DFD9",
  pageBgRadial:
    "radial-gradient(ellipse at 60% 40%, #D4CCC6 0%, #E5DFD9 60%, #C8BEB8 100%)",
} as const;

export const BOOK_FONTS = {
  display: "'Playfair Display', serif",
  bodyLtr: "'Lora', serif",
  bodyRtl: "'Frank Ruhl Libre', serif",
  sans: "'Nunito', sans-serif",
} as const;

export const BOOK_GRADIENTS = {
  leather: `linear-gradient(145deg, ${BOOK_COLORS.leatherDark} 0%, ${BOOK_COLORS.leatherBase} 100%)`,
  leatherRich: `linear-gradient(135deg, ${BOOK_COLORS.leatherMid} 0%, ${BOOK_COLORS.leatherBase} 50%, ${BOOK_COLORS.leatherDark} 100%)`,
  spine: `linear-gradient(to right, ${BOOK_COLORS.leatherMid} 0%, ${BOOK_COLORS.leatherBase} 30%, ${BOOK_COLORS.leatherHighlight} 50%, ${BOOK_COLORS.leatherBase} 70%, ${BOOK_COLORS.leatherMid} 100%)`,
  coverBoard: `linear-gradient(to bottom, ${BOOK_COLORS.leatherBase}, ${BOOK_COLORS.leatherDark} 50%, ${BOOK_COLORS.leatherBase})`,
  parchment: `linear-gradient(135deg, ${BOOK_COLORS.parchmentLight} 0%, ${BOOK_COLORS.parchmentDark} 100%)`,
  ctaPrimary: `linear-gradient(90deg, ${BOOK_COLORS.rose}, ${BOOK_COLORS.roseLight})`,
  ctaPrimaryHover: `linear-gradient(90deg, ${BOOK_COLORS.roseDeep}, #9A6878)`,
} as const;

export const BOOK_RADII = {
  bookOuter: "4px 8px 8px 4px",
  bookOuterRtl: "8px 4px 4px 8px",
  bookPoster: "8px",
  pill: 50,
} as const;

export const BOOK_SHADOWS = {
  bookDrop:
    "drop-shadow(0 24px 48px rgba(90,48,64,.38)) drop-shadow(0 4px 10px rgba(90,48,64,.2))",
  bookDropStrong:
    "drop-shadow(0 30px 50px rgba(90,48,64,.4)) drop-shadow(0 8px 14px rgba(90,48,64,.26))",
  ctaPrimary: "0 6px 18px rgba(90,48,64,0.3)",
  ctaPrimaryStrong: "0 8px 24px rgba(90,48,64,0.36)",
} as const;

export const BOOK_PAPER_NOISE_SVG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.038'/%3E%3C/svg%3E\")";

export const BOOK_LEATHER_NOISE_SVG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.18'/%3E%3C/svg%3E\")";

// Bump version to ensure new/updated preface shows for existing users.
export const LOCAL_STORAGE_PREFACE_SEEN_KEY = "dammah.preface.seen.v2";

/** Shared outer-shell CSS for the book component.
 *  Used by both BookSpread and BookPreface so both share identical edge styling. */
export const BOOK_SHELL_CSS = `
.bs2-cover-board {
  position: absolute; top: 0; bottom: 0; width: 5px;
  background: linear-gradient(to bottom, #6F404D 0%, #3C1C28 50%, #6F404D 100%);
  z-index: 9; border-radius: 2px;
}
.bs2-cover-board.left  { left: 0;  border-radius: 4px 0 0 4px; box-shadow: -3px 0 10px rgba(0,0,0,.28), inset -1px 0 3px rgba(0,0,0,.2); }
.bs2-cover-board.right { right: 0; border-radius: 0 4px 4px 0; box-shadow:  3px 0 10px rgba(0,0,0,.28), inset  1px 0 3px rgba(0,0,0,.2); }

.bs2-stack { position: absolute; top: 0; bottom: 0; width: 18px; z-index: 3; pointer-events: none; overflow: hidden; }
.bs2-stack.left  { left: 5px; }
.bs2-stack.right { right: 5px; }

.bs2-stack.left .bs2-ps  { position: absolute; top: 0; bottom: 0; right: 0; }
.bs2-stack.left  .bs2-ps:nth-child(1) { left: 0px;  background: #B8A89E; }
.bs2-stack.left  .bs2-ps:nth-child(2) { left: 2px;  background: #C4B4AA; }
.bs2-stack.left  .bs2-ps:nth-child(3) { left: 4px;  background: #CFBFB5; }
.bs2-stack.left  .bs2-ps:nth-child(4) { left: 6px;  background: #D8CCBF; top:1px; bottom:1px; }
.bs2-stack.left  .bs2-ps:nth-child(5) { left: 8px;  background: #E0D4C8; top:1px; bottom:1px; }
.bs2-stack.left  .bs2-ps:nth-child(6) { left: 10px; background: #E8DDD3; top:2px; bottom:2px; }
.bs2-stack.left  .bs2-ps:nth-child(7) { left: 12px; background: #EDE4DC; top:2px; bottom:2px; }
.bs2-stack.left  .bs2-ps:nth-child(8) { left: 14px; background: #F2E9E1; top:3px; bottom:3px; }
.bs2-stack.left  .bs2-ps:nth-child(9) { left: 16px; background: #F7F2EC; top:4px; bottom:4px; border-right:1px solid rgba(130,77,92,.14); }

.bs2-stack.right .bs2-ps { position: absolute; top: 0; bottom: 0; left: 0; }
.bs2-stack.right .bs2-ps:nth-child(1) { right: 0px;  background: #B8A89E; }
.bs2-stack.right .bs2-ps:nth-child(2) { right: 2px;  background: #C4B4AA; }
.bs2-stack.right .bs2-ps:nth-child(3) { right: 4px;  background: #CFBFB5; }
.bs2-stack.right .bs2-ps:nth-child(4) { right: 6px;  background: #D8CCBF; top:1px; bottom:1px; }
.bs2-stack.right .bs2-ps:nth-child(5) { right: 8px;  background: #E0D4C8; top:1px; bottom:1px; }
.bs2-stack.right .bs2-ps:nth-child(6) { right: 10px; background: #E8DDD3; top:2px; bottom:2px; }
.bs2-stack.right .bs2-ps:nth-child(7) { right: 12px; background: #EDE4DC; top:2px; bottom:2px; }
.bs2-stack.right .bs2-ps:nth-child(8) { right: 14px; background: #F2E9E1; top:3px; bottom:3px; }
.bs2-stack.right .bs2-ps:nth-child(9) { right: 16px; background: #F7F2EC; top:4px; bottom:4px; border-left:1px solid rgba(130,77,92,.14); }
`;
