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
    caption: "בחרו סיפור",
    initials: "ס",
  },
  {
    id: "2",
    image: childImg,
    caption: "הזינו פרטים",
    initials: "פ",
  },
  {
    id: "3",
    image: customChildImg,
    caption: "התאמה אישית",
    initials: "א",
  },
  {
    id: "4",
    image: childInBookImg,
    caption: "קראו יחד",
    initials: "ק",
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
                      border: "4px solid rgba(255,255,255,0.8)",
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

                  {/* Check Badge */}
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: { xs: "-4px", md: "0px" },
                      right: { xs: "8px", md: "12px" },
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      backgroundColor: "#824D5C",
                      opacity: 0.9,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "2px solid #E5DFD9",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    }}
                  >
                    {/* CSS Check Mark */}
                    <Box
                      sx={{
                        width: "7px",
                        height: "11px",
                        borderBottom: "2px solid white",
                        borderRight: "2px solid white",
                        transform: "rotate(45deg)",
                        marginTop: "-2px",
                      }}
                    />
                  </Box>

                  {/* Caption Card */}
                  <Box
                    sx={{
                      mt: 3,
                      background:
                        "linear-gradient(180deg, #ffffff 0%, #f9f9f9 100%)",
                      borderRadius: "20px",
                      px: "18px",
                      py: "10px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                      minWidth: "120px",
                      textAlign: "center",
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: { xs: "14px", md: "16px" },
                        fontWeight: 600,
                        color: "#617891",
                      }}
                    >
                      {step.caption}
                    </Typography>
                  </Box>
                </Box>

                {/* Arrow Separator */}
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

