import {
  Card,
  Box,
  Typography,
  Button,
  useTheme,
} from "@mui/material";
import { useLanguage } from "../i18n/context/useLanguage";

type Props = {
  title: string;
  description?: string;
  imageUrl?: string;
  onClick: () => void;
};

export default function StoryGridCard({
  title,
  description,
  imageUrl,
  onClick,
}: Props) {
  const theme = useTheme();
  const { language } = useLanguage();
  
  const buttonText = language === "en" ? "Personalize" : "התאמה אישית";

  return (
    <Card
      elevation={0}
      sx={{
        backgroundColor: "transparent",
        borderRadius: 6,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 380,                // 🔹 smaller card
        overflow: "hidden",
        transition: "all 0.3s ease",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
        },
      }}
    >
      {/* Image */}
      <Box
        sx={{
          height: 190,                  // 🔹 shorter image
          backgroundImage: `url(${imageUrl || "/book-placeholder.jpg"})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* Content */}
      <Box
        sx={{
          px: 3,
          pt: 2,
          pb: 2.5,
          display: "flex",
          flexDirection: "column",
          gap: 1.2,
          flexGrow: 1,
          textAlign: "center",
        }}
      >
        {/* Title */}
        <Typography
          sx={{
            fontSize: "0.95rem",
            fontWeight: 600,
            lineHeight: 1.4,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {title}
        </Typography>

        {/* Situation (now has space) */}
        {description && (
          <Typography
            sx={{
              fontSize: "0.85rem",
              color: theme.palette.text.secondary,
              lineHeight: 1.6,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              minHeight: "2.8em",        // 🔹 reserves space
            }}
          >
            {description}
          </Typography>
        )}

        {/* Button pushed DOWN */}
        <Button
          variant="contained"
          onClick={onClick}
          sx={{
            mt: "auto",                 // 🔹 pushes button to bottom
            alignSelf: "center",
            px: 2.8,
            py: 0.7,
            fontSize: "0.82rem",
            fontWeight: 500,
            borderRadius: 6,
            textTransform: "none",
            backgroundColor: theme.palette.primary.main,
            "&:hover": {
              backgroundColor: theme.palette.primary.dark,
            },
          }}
        >
          {buttonText}
        </Button>
      </Box>
    </Card>
  );
}
