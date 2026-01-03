import { Box, Container, Typography, Button, SxProps, Theme } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

// Import images
import bookImg from "../../assets/journey/journey-book.png";
import childImg from "../../assets/journey/journey-child.png";
import customChildImg from "../../assets/journey/journey-child-custom.png";
import childInBookImg from "../../assets/journey/journey-child-in-book.png";

type JourneyStep = {
  id: string;
  image: string;
  caption: string;
  initials: string;
};

const journeySteps: JourneyStep[] = [
  {
    id: "1",
    image: bookImg,
    caption: "בוחרים סיפור שמתחיל ברגש שהילד מרגיש עכשיו.\nקטן, עדין, ומותאם למה שעובר עליו ברגע הזה.",
    initials: "ס",
  },
  {
    id: "2",
    image: childImg,
    caption: "הילד שלכם הופך להיות הלב של הסיפור,\nעם נוכחות שמרגישה טבעית, קרובה ומוכרת.",
    initials: "י",
  },
  {
    id: "3",
    image: customChildImg,
    caption: "התאמה אישית עדינה, רגישה ומדויקת,\nכזו שמכבדת את העולם הפנימי של הילד.",
    initials: "א",
  },
  {
    id: "4",
    image: childInBookImg,
    caption: "סיפור שמרגיש שייך לו באמת,\nכזה שהוא רוצה לחזור אליו שוב ושוב.",
    initials: "ס",
  },
];

type Props = {
  sx?: SxProps<Theme>;
};

export default function StoryJourneySection({ sx }: Props) {
  const navigate = useNavigate();

  const verticalOffsets = [0, 40, 80, 120];

  const stepsWrapRef = useRef<HTMLDivElement | null>(null);
  const circleRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [paths, setPaths] = useState<string[]>([]);

  useLayoutEffect(() => {
    const wrap = stepsWrapRef.current;
    if (!wrap) return;

    const compute = () => {
      const base = wrap.getBoundingClientRect();

      const nextPaths: string[] = [];

      for (let i = 0; i < journeySteps.length - 1; i++) {
        const from = circleRefs.current[i];
        const to = circleRefs.current[i + 1];
        if (!from || !to) continue;

        const a = from.getBoundingClientRect();
        const b = to.getBoundingClientRect();

        // RTL: from is on the RIGHT, to is on the LEFT
        const startX = a.left - base.left; // left edge of "from"
        const startY = a.top - base.top + a.height / 2;

        const endX = b.left - base.left + b.width; // right edge of "to"
        const endY = b.top - base.top + b.height / 2;

        const dx = Math.max(80, Math.abs(startX - endX));

        // alternate curve up/down for a natural "flow"
        const curve = i % 2 === 0 ? 38 : -38;

        const c1x = startX - dx * 0.35;
        const c1y = startY + curve;

        const c2x = endX + dx * 0.35;
        const c2y = endY - curve;

        nextPaths.push(
          `M ${startX} ${startY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endX} ${endY}`
        );
      }

      setPaths(nextPaths);
    };

    compute();

    const ro = new ResizeObserver(() => compute());
    ro.observe(wrap);

    window.addEventListener("resize", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, []);

  return (
    <Box
      sx={{
        backgroundColor: "#E5DFD9",
        display: "block",
        minHeight: "unset",
        mt: { xs: 0, md: -2 },
        pt: { xs: 1, md: 1 },
        pb: { xs: 5, md: 4 },
        direction: "rtl",
        ...sx,
      }}
    >
      <Container maxWidth="lg">
        {/* Title and Subtitle */}
        <Box sx={{ textAlign: "center", mb: 4, mt: 0 }}>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: { xs: "26px", md: "34px" },
              color: "#617891",
              letterSpacing: "0.5px",
              mb: 1,
            }}
          >
            כך נוצר סיפור אישי
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: "15px", md: "18px" },
              color: "#6f7f8f",
              maxWidth: "520px",
              mx: "auto",
              lineHeight: 1.7,
            }}
          >
            מסע עדין שמתחיל בילד שלכם – ומסתיים בסיפור שתרצו לקרוא יחד שוב ושוב
          </Typography>
        </Box>

        {/* Journey Steps */}
        <Box
          ref={stepsWrapRef}
          sx={{
            position: "relative",
            display: "flex",
            flexDirection: "row",
            direction: "rtl",
            justifyContent: "center",
            alignItems: "flex-start",
            minHeight: "unset",
            transform: { md: "translateY(-30px)" },
            gap: { xs: 3, md: 4 },
            mb: 4,
            overflowX: { xs: "auto", md: "visible" },
            scrollSnapType: { xs: "x mandatory", md: "none" },
            scrollBehavior: { xs: "smooth", md: "auto" },
            px: { xs: 2, md: 0 },
            "&::-webkit-scrollbar": {
              height: "4px",
            },
            "&::-webkit-scrollbar-track": {
              background: "transparent",
            },
            "&::-webkit-scrollbar-thumb": {
              background: "#617891",
              borderRadius: "2px",
            },
          }}
        >
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              display: { xs: "none", md: "block" },
              zIndex: 0,
            }}
          >
            <svg width="100%" height="100%" style={{ overflow: "visible" }}>
              <defs>
                <marker
                  id="arrowHead"
                  markerWidth="10"
                  markerHeight="10"
                  refX="8"
                  refY="5"
                  orient="auto"
                >
                  <path
                    d="M0,0 L10,5 L0,10"
                    fill="none"
                    stroke="#C8A3AB"
                    strokeWidth="2"
                  />
                </marker>
              </defs>

              {paths.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  stroke="#C8A3AB"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity={0.5}
                  markerEnd="url(#arrowHead)"
                />
              ))}
            </svg>
          </Box>
          {journeySteps.map((step, index) => (
            <Box
              key={step.id}
              sx={{
                transform: {
                  xs: "none",
                  md: `translateY(${verticalOffsets[index]}px)`,
                },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  scrollSnapAlign: { xs: "start", md: "none" },
                  minWidth: { xs: "200px", md: "auto" },
                }}
              >
                {/* Step Circle */}
                <Box
                  sx={{
                    position: "relative",
                    zIndex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    flex: 1,
                  }}
                >
                  {/* Step number – floating label */}
                  <Typography
                    sx={{
                      position: "absolute",
                      top: "-10px",
                      right: "-10px",
                      fontSize: { xs: "16px", md: "24px" },
                      fontWeight: 300,
                      color: "#1B1B1B",
                      opacity: 0.25,
                      lineHeight: 1,
                      pointerEvents: "none",
                      userSelect: "none",
                    }}
                  >
                    {index + 1}
                  </Typography>
                  {/* Circle Image */}
                  <Box
                    ref={(el: HTMLDivElement | null) => {
                      circleRefs.current[index] = el;
                    }}
                    sx={{
                      width: { xs: "84px", md: "110px" },
                      height: { xs: "84px", md: "110px" },
                      borderRadius: "50%",
                      border: "4px solid white",
                      background:
                        "radial-gradient(circle at top, #6f88a3 0%, #617891 70%)",
                      overflow: "hidden",
                      position: "relative",
                      boxShadow:
                        index === journeySteps.length - 1
                          ? "0 20px 50px rgba(97,120,145,0.35)"
                          : "0 10px 30px rgba(97,120,145,0.25)",
                      transition:
                        "transform 0.3s ease, box-shadow 0.3s ease, opacity 0.6s ease",
                      cursor: "pointer",
                      opacity: 0.95,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      "&:hover": {
                        transform: "translateY(-10px) scale(1.03)",
                        boxShadow: "0 15px 40px rgba(97,120,145,0.35)",
                      },
                    }}
                  >
                    {/* Fallback initials - shown if image fails */}
                    <Typography
                      sx={{
                        position: "absolute",
                        color: "white",
                        fontWeight: 600,
                        fontSize: { xs: "20px", md: "28px" },
                        zIndex: 1,
                      }}
                    >
                      {step.initials}
                    </Typography>
                    {/* Image - overlays initials if loaded successfully */}
                    <Box
                      component="img"
                      src={step.image}
                      alt={step.caption}
                      onError={(e) => {
                        // Hide image on error - fallback initials will show
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                      }}
                      sx={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        position: "absolute",
                        top: 0,
                        left: 0,
                        zIndex: 2,
                      }}
                    />
                  </Box>

                  {/* Caption Text */}
                  <Typography
                    sx={{
                      mt: 3,
                      maxWidth: "220px",
                      textAlign: "center",
                      fontSize: { xs: "14px", md: "15px" },
                      fontWeight: 400,
                      color: "#6f7f8f",
                      lineHeight: 1.7,
                      whiteSpace: "pre-line",
                      opacity: 0.9,
                      transition: "opacity 0.4s ease",
                    }}
                  >
                    {step.caption}
                  </Typography>

                </Box>
              </Box>
            </Box>
          ))}
        </Box>

        {/* CTA Button */}
        <Box
          sx={{
            textAlign: "center",
            mt: { xs: 20, md: 18},
            mb: { xs: 4, md: 3 },
          }}
        >
          <Button
            variant="contained"
            onClick={() => {
              // Navigate to home - user can click "עיון בסיפורים" in navbar to browse stories
              navigate("/");
            }}
            sx={{
              backgroundColor: "#617891",
              color: "#fff",
              fontWeight: 600,
              fontSize: { xs: "16px", md: "18px" },
              px: { xs: 4, md: 5 },
              py: 1.5,
              borderRadius: "14px",
              letterSpacing: "0.5px",
              textTransform: "none",
              boxShadow: "0 4px 12px rgba(97,120,145,0.3)",
              "&:hover": {
                backgroundColor: "#4f6377",
                boxShadow: "0 6px 16px rgba(97,120,145,0.4)",
              },
            }}
          >
            התחילו את הסיפור שלכם
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
