import { Box, Typography, Button, Container } from "@mui/material";
import { useLangNavigate } from "../i18n/navigation";
import { useTranslation } from "../i18n/useTranslation";

type Props = {
  title: string;
  message?: string;
};

export default function PlaceholderPage({ title, message }: Props) {
  const navigate = useLangNavigate();
  const t = useTranslation();

  return (
    <Container maxWidth="md" sx={{ py: 8, textAlign: "center" }}>
      <Typography variant="h4" gutterBottom>
        {title}
      </Typography>
      {message && (
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          {message}
        </Typography>
      )}
      <Button variant="contained" onClick={() => navigate("/")}>
        {t("pages.placeholder.backToHome")}
      </Button>
    </Container>
  );
}

