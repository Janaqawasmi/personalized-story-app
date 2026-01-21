// client/src/pages/PromptPreviewPage.tsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useLangNavigate } from "../i18n/navigation";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  IconButton,
  Paper,
  Stack,
  Typography,
  Tooltip,
  Snackbar,
} from "@mui/material";
import {
  ArrowBack,
  ContentCopy,
  CheckCircle,
} from "@mui/icons-material";
import { fetchPromptPreview } from "../api/api";
import SpecialistNav from "../components/SpecialistNav";

const PromptPreviewPage: React.FC = () => {
  const { briefId } = useParams<{ briefId: string }>();
  const navigate = useLangNavigate();
  const [promptPreview, setPromptPreview] = useState<string | null>(null);
  const [ragSources, setRagSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    const loadPromptPreview = async () => {
      if (!briefId) {
        setError("Brief ID is required");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await fetchPromptPreview(briefId);
        setPromptPreview(data.promptPreview);
        setRagSources(data.ragSources || []);
      } catch (err: any) {
        setError(err.message || "Failed to load prompt preview");
        setPromptPreview(null);
      } finally {
        setLoading(false);
      }
    };

    loadPromptPreview();
  }, [briefId]);

  const handleCopyToClipboard = async () => {
    if (!promptPreview) return;

    try {
      await navigator.clipboard.writeText(promptPreview);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = promptPreview;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (fallbackErr) {
        console.error("Fallback copy failed:", fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <>
      <SpecialistNav />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            Prompt Preview
          </Typography>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate("/specialist/generate-draft")}
          >
            Back to Generate Draft
          </Button>
        </Stack>

        {/* RAG Sources Info */}
        {ragSources.length > 0 && !loading && !error && (
          <Alert severity="info" sx={{ mb: 3 }}>
            RAG Sources: {ragSources.join(", ")}
          </Alert>
        )}

        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
                <Stack spacing={2} alignItems="center">
                  <CircularProgress />
                  <Typography variant="body2" color="text.secondary">
                    Loading prompt preview...
                  </Typography>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Prompt Preview Content */}
        {!loading && !error && promptPreview && (
          <Card>
            <CardContent>
              <Stack spacing={2}>
                {/* Header with Copy Button */}
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6" component="h2">
                    Prompt Preview
                  </Typography>
                  <Tooltip title="Copy to clipboard">
                    <IconButton
                      onClick={handleCopyToClipboard}
                      color={copySuccess ? "success" : "default"}
                      size="small"
                    >
                      {copySuccess ? <CheckCircle /> : <ContentCopy />}
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* Scrollable Monospace Panel */}
                <Paper
                  variant="outlined"
                  sx={{
                    position: "relative",
                    maxHeight: "70vh",
                    overflow: "auto",
                    bgcolor: "grey.50",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box
                    component="pre"
                    sx={{
                      margin: 0,
                      p: 2,
                      fontFamily: "monospace",
                      fontSize: "0.875rem",
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                      color: "text.primary",
                    }}
                  >
                    {promptPreview}
                  </Box>
                </Paper>

                {/* Helper Text */}
                <Typography variant="caption" color="text.secondary">
                  This is a read-only preview of the prompt that would be used for story generation.
                  No changes are made to the database or LLM when viewing this preview.
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Copy Success Snackbar */}
        <Snackbar
          open={copySuccess}
          autoHideDuration={2000}
          onClose={() => setCopySuccess(false)}
          message="Copied to clipboard!"
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        />
      </Container>
    </>
  );
};

export default PromptPreviewPage;

