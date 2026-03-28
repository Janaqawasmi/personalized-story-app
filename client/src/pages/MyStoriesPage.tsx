import { Box, Container, Typography } from "@mui/material";
import { useLangNavigate } from "../i18n/navigation";
import { useTranslation } from "../i18n/useTranslation";
import { useLanguage } from "../i18n/context/useLanguage";

export default function MyStoriesPage() {
  const t = useTranslation();
  const navigate = useLangNavigate();
  const { direction } = useLanguage();

  return (
    <Container maxWidth="md" sx={{ py: 6 }} dir={direction}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 2, textAlign: "center" }}>
        {t("pages.myStories.title")}
      </Typography>

      <Typography sx={{ color: "text.secondary", textAlign: "center", mb: 4 }}>
        {t("pages.myStories.message")}
      </Typography>

      <Box sx={{ textAlign: "center" }}>
        <Typography
          component="button"
          onClick={() => navigate("/books")}
          sx={{
            border: "none",
            background: "none",
            cursor: "pointer",
            fontSize: "0.95rem",
            color: "primary.main",
            textDecoration: "underline",
          }}
        >
          {t("pages.myStories.browseStoriesLink")}
        </Typography>
      </Box>
    </Container>
  );
}

