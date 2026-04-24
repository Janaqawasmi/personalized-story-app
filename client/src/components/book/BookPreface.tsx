import { Box, Button, Typography } from "@mui/material";
import {
  BOOK_COLORS,
  BOOK_FONTS,
  BOOK_GRADIENTS,
  BOOK_RADII,
  BOOK_SHADOWS,
  BOOK_PAPER_NOISE_SVG,
} from "./bookTokens";

interface BookPrefaceProps {
  title: string;
  childName?: string;
  language?: string;
  onBegin: () => void;
}

const RTL_LANGUAGES = ["he", "ar", "iw", "he-il", "ar-sa", "ar-il"];

function isRtlLanguage(language?: string): boolean {
  if (!language) return false;
  return RTL_LANGUAGES.includes(language.toLowerCase());
}

type CopyBundle = {
  noteLabel: string;
  noteHeadline: string;
  noteBody: string;
  howLabel: string;
  turnTitle: string;
  turnBody: string;
  readTitle: string;
  readBody: string;
  paceTitle: string;
  paceBody: string;
  beginLabel: string;
};

const EN: CopyBundle = {
  noteLabel: "A note before we begin",
  noteHeadline: "Take your time,\nturn each page slowly.",
  noteBody: "This story was made for you.\nRead it once, then again.",
  howLabel: "How to read",
  turnTitle: "Turn a page",
  turnBody: "Tap the corner or drag it.",
  readTitle: "Read aloud",
  readBody: "Tap the speaker to hear the page.",
  paceTitle: "No rush",
  paceBody: "Stay as long as you like.",
  beginLabel: "Begin the story",
};

const HE: CopyBundle = {
  noteLabel: "לפני שנתחיל",
  noteHeadline: "קחו את הזמן,\nדפדפו לאט.",
  noteBody: "הסיפור הזה נכתב עבורכם.\nקראו אותו, ואז שוב.",
  howLabel: "איך לקרוא",
  turnTitle: "להפוך עמוד",
  turnBody: "הקישו על הפינה או גררו אותה.",
  readTitle: "הקראה קולית",
  readBody: "הקישו על הרמקול כדי לשמוע את הסיפור.",
  paceTitle: "ללא לחץ",
  paceBody: "הישארו על כל עמוד כמה שתרצו.",
  beginLabel: "להתחיל את הסיפור",
};

const AR: CopyBundle = {
  noteLabel: "قبل أن نبدأ",
  noteHeadline: "خذوا وقتكم،\nاقلبوا كل صفحة ببطء.",
  noteBody: "هذه القصة صُنعت لكم.\nاقرؤوها مرة، ثم مرة أخرى.",
  howLabel: "كيف نقرأ",
  turnTitle: "قلب الصفحة",
  turnBody: "اضغطوا على الزاوية أو اسحبوها.",
  readTitle: "الاستماع للقصة",
  readBody: "اضغطوا على السماعة لسماع الصفحة.",
  paceTitle: "دون استعجال",
  paceBody: "ابقوا على الصفحة كما تشاؤون.",
  beginLabel: "لنبدأ القصة",
};

function pickCopy(language?: string): CopyBundle {
  const lang = (language || "").toLowerCase();
  if (lang.startsWith("he") || lang === "iw") return HE;
  if (lang.startsWith("ar")) return AR;
  return EN;
}

function CornerOrn({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const placement: Record<string, object> = {
    tl: { top: 14, left: 14 },
    tr: { top: 14, right: 14, transform: "scaleX(-1)" },
    bl: { bottom: 14, left: 14, transform: "scaleY(-1)" },
    br: { bottom: 14, right: 14, transform: "scale(-1,-1)" },
  };
  return (
    <Box
      aria-hidden
      sx={{
        position: "absolute",
        width: 28,
        height: 28,
        pointerEvents: "none",
        opacity: 0.2,
        ...placement[pos],
      }}
    >
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <path
          d="M4 28 Q4 4 28 4"
          stroke={BOOK_COLORS.rose}
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M4 28 Q4 16 16 4"
          stroke={BOOK_COLORS.rose}
          strokeWidth="0.8"
          fill="none"
          opacity="0.5"
        />
      </svg>
    </Box>
  );
}

function OrnamentRule({ mb = 0, mt = 0 }: { mb?: number; mt?: number }) {
  return (
    <Box
      aria-hidden
      sx={{
        width: 52,
        height: "1px",
        background:
          "linear-gradient(to right, transparent, #824D5C, transparent)",
        opacity: 0.55,
        mb: `${mb}px`,
        mt: `${mt}px`,
      }}
    />
  );
}

function InstructionRow({
  icon,
  title,
  body,
  isRTL,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  isRTL: boolean;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        gap: "14px",
        alignItems: "flex-start",
        flexDirection: isRTL ? "row-reverse" : "row",
        textAlign: isRTL ? "right" : "left",
        width: "100%",
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: "rgba(130,77,92,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          component="div"
          sx={{
            fontFamily: BOOK_FONTS.display,
            fontSize: 13,
            fontWeight: 600,
            color: BOOK_COLORS.ink,
            mb: "3px",
          }}
        >
          {title}
        </Typography>
        <Typography
          component="div"
          sx={{
            fontFamily: isRTL ? BOOK_FONTS.bodyRtl : BOOK_FONTS.bodyLtr,
            fontSize: 12,
            fontStyle: isRTL ? "normal" : "italic",
            color: BOOK_COLORS.inkSoft,
            lineHeight: 1.55,
          }}
        >
          {body}
        </Typography>
      </Box>
    </Box>
  );
}

export default function BookPreface({
  title,
  childName,
  language,
  onBegin,
}: BookPrefaceProps) {
  const isRTL = isRtlLanguage(language);
  const copy = pickCopy(language);

  const noteLabel = childName
    ? isRTL
      ? `פתק ל${childName}`
      : `A note to ${childName}`
    : copy.noteLabel;

  const bodyFont = isRTL ? BOOK_FONTS.bodyRtl : BOOK_FONTS.bodyLtr;
  const bodyStyle = isRTL ? "normal" : "italic";

  const leftPage = (
    <Box
      sx={{
        width: { xs: "100%", md: "50%" },
        height: { xs: "auto", md: "100%" },
        minHeight: { xs: 240, md: "auto" },
        position: "relative",
        background: BOOK_GRADIENTS.parchment,
        borderRadius: { xs: 0, md: isRTL ? "0 4px 4px 0" : "4px 0 0 4px" },
        overflow: "hidden",
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          opacity: 0.6,
          pointerEvents: "none",
          backgroundImage: BOOK_PAPER_NOISE_SVG,
        }}
      />
      <CornerOrn pos="tl" />
      <CornerOrn pos="tr" />
      <CornerOrn pos="bl" />
      <CornerOrn pos="br" />

      <Box
        sx={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: { xs: "32px 28px", md: "52px 44px" },
          textAlign: "center",
          direction: isRTL ? "rtl" : "ltr",
        }}
      >
        <Typography
          component="div"
          sx={{
            fontFamily: BOOK_FONTS.display,
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.26em",
            textTransform: "uppercase",
            color: BOOK_COLORS.rose,
            opacity: 0.7,
            mb: "20px",
          }}
        >
          {noteLabel}
        </Typography>

        <OrnamentRule mb={24} />

        <Typography
          component="div"
          sx={{
            fontFamily: BOOK_FONTS.display,
            fontSize: { xs: 20, md: 24 },
            fontWeight: 700,
            fontStyle: "italic",
            color: BOOK_COLORS.ink,
            lineHeight: 1.25,
            mb: "18px",
            whiteSpace: "pre-line",
          }}
        >
          {copy.noteHeadline}
        </Typography>

        <Typography
          component="div"
          sx={{
            fontFamily: bodyFont,
            fontStyle: bodyStyle,
            fontSize: 14,
            color: BOOK_COLORS.inkSoft,
            lineHeight: 1.75,
            maxWidth: 260,
            whiteSpace: "pre-line",
          }}
        >
          {copy.noteBody}
        </Typography>

        <OrnamentRule mt={28} />
      </Box>
    </Box>
  );

  const rightPage = (
    <Box
      sx={{
        width: { xs: "100%", md: "50%" },
        height: { xs: "auto", md: "100%" },
        minHeight: { xs: 320, md: "auto" },
        position: "relative",
        background: BOOK_GRADIENTS.parchment,
        borderRadius: { xs: 0, md: isRTL ? "4px 0 0 4px" : "0 8px 8px 0" },
        overflow: "hidden",
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          opacity: 0.6,
          pointerEvents: "none",
          backgroundImage: BOOK_PAPER_NOISE_SVG,
        }}
      />
      <CornerOrn pos="tl" />
      <CornerOrn pos="tr" />
      <CornerOrn pos="bl" />
      <CornerOrn pos="br" />

      <Box
        sx={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: { xs: "32px 28px", md: "38px 44px" },
          direction: isRTL ? "rtl" : "ltr",
        }}
      >
        <Typography
          component="div"
          sx={{
            fontFamily: BOOK_FONTS.display,
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.26em",
            textTransform: "uppercase",
            color: BOOK_COLORS.rose,
            opacity: 0.7,
            mb: "16px",
          }}
        >
          {copy.howLabel}
        </Typography>

        <OrnamentRule mb={24} />

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            width: "100%",
            maxWidth: 260,
          }}
        >
          <InstructionRow
            isRTL={isRTL}
            title={copy.turnTitle}
            body={copy.turnBody}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 4h12v16l-6-3-6 3V4z"
                  stroke={BOOK_COLORS.rose}
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            }
          />
          <InstructionRow
            isRTL={isRTL}
            title={copy.readTitle}
            body={copy.readBody}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M11 5L6 9H2v6h4l5 4V5z"
                  stroke={BOOK_COLORS.rose}
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                  fill="none"
                />
                <path
                  d="M15.5 8.5a5 5 0 010 7"
                  stroke={BOOK_COLORS.rose}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            }
          />
          <InstructionRow
            isRTL={isRTL}
            title={copy.paceTitle}
            body={copy.paceBody}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12"
                  cy="12"
                  r="8"
                  stroke={BOOK_COLORS.rose}
                  strokeWidth="1.6"
                  fill="none"
                />
                <path
                  d="M12 8v4l3 2"
                  stroke={BOOK_COLORS.rose}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            }
          />
        </Box>

        <OrnamentRule mt={22} mb={16} />

        <Button
          onClick={onBegin}
          sx={{
            padding: "11px 30px",
            borderRadius: BOOK_RADII.pill,
            background: BOOK_GRADIENTS.ctaPrimary,
            fontFamily: BOOK_FONTS.sans,
            fontSize: 11,
            fontWeight: 800,
            color: BOOK_COLORS.cream,
            letterSpacing: "0.08em",
            boxShadow: BOOK_SHADOWS.ctaPrimary,
            textTransform: "none",
            "&:hover": {
              background: BOOK_GRADIENTS.ctaPrimaryHover,
              boxShadow: "0 6px 18px rgba(90,48,64,0.38)",
            },
          }}
        >
          {copy.beginLabel} →
        </Button>
      </Box>
    </Box>
  );

  const spine = (
    <Box
      aria-hidden
      sx={{
        display: { xs: "none", md: "block" },
        width: 20,
        height: "100%",
        flexShrink: 0,
        zIndex: 10,
        position: "relative",
        background: BOOK_GRADIENTS.spine,
        boxShadow:
          "2px 0 6px rgba(0,0,0,.22), -2px 0 6px rgba(0,0,0,.22)",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: "8px 3px",
          border: "1px solid rgba(176,122,138,.3)",
          borderRadius: "1px",
        }}
      />
    </Box>
  );

  const coverBoardLeft = (
    <Box
      aria-hidden
      sx={{
        display: { xs: "none", md: "block" },
        position: "absolute",
        top: -5,
        bottom: -5,
        left: isRTL ? "auto" : -9,
        right: isRTL ? -9 : "auto",
        width: 12,
        background: BOOK_GRADIENTS.coverBoard,
        zIndex: 1,
        borderRadius: isRTL ? "2px 4px 4px 2px" : "2px",
        boxShadow: isRTL
          ? "2px 0 8px rgba(0,0,0,.3)"
          : "-2px 0 8px rgba(0,0,0,.3)",
      }}
    />
  );

  const coverBoardRight = (
    <Box
      aria-hidden
      sx={{
        display: { xs: "none", md: "block" },
        position: "absolute",
        top: -5,
        bottom: -5,
        left: isRTL ? -9 : "auto",
        right: isRTL ? "auto" : -9,
        width: 12,
        background: BOOK_GRADIENTS.coverBoard,
        zIndex: 1,
        borderRadius: isRTL ? "2px" : "2px 4px 4px 2px",
        boxShadow: isRTL
          ? "-2px 0 8px rgba(0,0,0,.3)"
          : "2px 0 8px rgba(0,0,0,.3)",
      }}
    />
  );

  return (
    <Box
      dir="ltr"
      sx={{
        minHeight: "100vh",
        background: BOOK_COLORS.pageBgRadial,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: { xs: "32px 16px", md: "48px 24px" },
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: { xs: "100%", md: 720 },
          maxWidth: "100%",
          height: { xs: "auto", md: 440 },
          display: "flex",
          flexDirection: { xs: "column", md: isRTL ? "row-reverse" : "row" },
          filter: { xs: "none", md: BOOK_SHADOWS.bookDrop },
          boxShadow: {
            xs: "0 4px 24px rgba(90,48,64,.28)",
            md: "none",
          },
          borderRadius: { xs: 0, md: BOOK_RADII.bookOuter },
        }}
      >
        {coverBoardLeft}
        {coverBoardRight}
        {leftPage}
        {spine}
        {rightPage}
      </Box>
    </Box>
  );
}

/*
Verify:
1. File compiles with no TypeScript errors.
2. Nothing imports it yet — we wire it up next.
*/
