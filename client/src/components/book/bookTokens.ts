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
