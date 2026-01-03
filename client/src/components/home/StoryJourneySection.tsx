import { Box, Container, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

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
    caption: "בוחרים סיפור שמתחיל ברגש",
    initials: "ס",
  },
  {
    id: "2",
    image: childImg,
    caption: "הילד שלכם במרכז הסיפור",
    initials: "י",
  },
  {
    id: "3",
    image: customChildImg,
    caption: "התאמה אישית עדינה ומדויקת",
    initials: "א",
  },
  {
    id: "4",
    image: childInBookImg,
    caption: "סיפור שמרגיש שלו באמת",
    initials: "ס",
  },
];

export default function StoryJourneySection() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        backgroundColor: "#E5DFD9",
        py: { xs: 6, md: 8 },
        direction: "rtl",
      }}
    >
      <Container maxWidth="lg">
        {/* Title and Subtitle */}
        <Box sx={{ textAlign: "center", mb: { xs: 5, md: 6 } }}>
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
          sx={{
            display: "flex",
            flexDirection: { xs: "row", md: "row" },
            justifyContent: "center",
            alignItems: "flex-start",
            gap: { xs: 3, md: 4 },
            mb: 6,
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
          {journeySteps.map((step, index) => (
            <Box key={step.id}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  scrollSnapAlign: { xs: "start", md: "none" },
                  minWidth: { xs: "200px", md: "auto" },
                }}
              >
                {/* Step Circle */}
                <Box
                  sx={{
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    flex: 1,
                  }}
                >
                  {/* Circle Image */}
                  <Box
                    sx={{
                      width: { xs: "84px", md: "110px" },
                      height: { xs: "84px", md: "110px" },
                      borderRadius: "50%",
                      border: "4px solid white",
                      background:
                        "radial-gradient(circle at top, #6f88a3 0%, #617891 70%)",
                      overflow: "hidden",
                      position: "relative",
                      boxShadow: "0 10px 30px rgba(97,120,145,0.25)",
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

                  {/* Caption Card */}
                  <Box
                    sx={{
                      mt: 3,
                      background: "#ffffff",
                      borderRadius: "16px",
                      px: "16px",
                      py: "10px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                      minWidth: "140px",
                      textAlign: "center",
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: { xs: "14px", md: "16px" },
                        fontWeight: 500,
                        color: "#617891",
                        lineHeight: 1.4,
                      }}
                    >
                      {step.caption}
                    </Typography>
                  </Box>
                </Box>

                {/* Connecting Line */}
                {index < journeySteps.length - 1 && (
                  <Box
                    sx={{
                      display: { xs: "none", md: "flex" },
                      alignItems: "center",
                      mx: 1,
                      flex: "0 0 auto",
                    }}
                  >
                    <Box
                      sx={{
                        width: "40px",
                        height: "2px",
                        background:
                          "linear-gradient(to left, rgba(130,77,92,0.4), rgba(130,77,92,0))",
                        borderRadius: "2px",
                      }}
                    />
                  </Box>
                )}
              </Box>
            </Box>
          ))}
        </Box>

        {/* CTA Button */}
        <Box sx={{ textAlign: "center" }}>
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

