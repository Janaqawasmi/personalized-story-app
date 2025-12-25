import { Box, Typography } from "@mui/material";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import CardGiftcardOutlinedIcon from "@mui/icons-material/CardGiftcardOutlined";

const steps = [
  {
    icon: <MenuBookOutlinedIcon fontSize="large" />,
    title: "מצאו סיפור",
    text: "עיינו בספריית סיפורים טיפוליים שנכתבו ואושרו על ידי אנשי מקצוע",
  },
  {
    icon: <EditOutlinedIcon fontSize="large" />,
    title: "התאמה אישית",
    text: "הוסיפו שם, גיל ופרטים קטנים שהופכים את הסיפור לאישי",
  },
  {
    icon: <FavoriteBorderOutlinedIcon fontSize="large" />,
    title: "מסר משמעותי",
    text: "שלבו מסר רגשי עדין המותאם לעולמו של הילד",
  },
  {
    icon: <CardGiftcardOutlinedIcon fontSize="large" />,
    title: "חוויה שנשארת",
    text: "סיפור שילד ירצה לחזור אליו שוב ושוב",
  },
];

export default function MeaningfulStepsSection() {
  return (
    <Box
      sx={{
        backgroundColor: "#FAF4E8",
        py: 6,
        mt: 6,
      }}
    >
      <Box sx={{ maxWidth: "lg", mx: "auto", px: 3 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            mb: 4,
            textAlign: "right",
          }}
        >
          סיפורים משמעותיים — בכמה דקות
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "1fr 1fr",
              md: "repeat(4, 1fr)",
            },
            gap: 4,
          }}
        >
          {steps.map((step, idx) => (
            <Box
              key={idx}
              sx={{
                display: "flex",
                gap: 2,
                alignItems: "flex-start",
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  backgroundColor: "#1F4F46",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {step.icon}
              </Box>

              <Box>
                <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
                  {step.title}
                </Typography>
                <Typography sx={{ fontSize: "0.95rem", color: "rgba(0,0,0,0.7)" }}>
                  {step.text}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
