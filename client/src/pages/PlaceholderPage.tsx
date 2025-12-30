import { Box, Typography, Button, Container } from "@mui/material";
import { useNavigate } from "react-router-dom";

type Props = {
  title: string;
  message?: string;
};

export default function PlaceholderPage({ title, message }: Props) {
  const navigate = useNavigate();

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
        חזרה לדף הבית
      </Button>
    </Container>
  );
}

