// client/src/components/ImagePromptSuggestionCard.tsx
import React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  CircularProgress,
} from "@mui/material";
import { Check, Close, AutoFixHigh } from "@mui/icons-material";

interface ImagePromptSuggestionCardProps {
  suggestedImagePrompt: string;
  rationale?: string;
  onAccept: () => Promise<void>;
  onReject: () => void;
  accepting?: boolean;
  disabled?: boolean;
}

const ImagePromptSuggestionCard: React.FC<ImagePromptSuggestionCardProps> = ({
  suggestedImagePrompt,
  rationale,
  onAccept,
  onReject,
  accepting = false,
  disabled = false,
}) => {
  const handleAcceptClick = async () => {
    try {
      await onAccept();
    } catch (error) {
      console.error("Failed to accept image prompt suggestion:", error);
    }
  };

  return (
    <Card
      variant="outlined"
      sx={{
        mt: 2,
        backgroundColor: "action.hover",
        border: "1px solid",
        borderColor: "info.main",
      }}
    >
      <CardContent>
        <Stack spacing={2}>
          {/* Header */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <AutoFixHigh fontSize="small" color="primary" />
              <Typography variant="subtitle2" fontWeight="bold">
                Suggested Image Prompt
              </Typography>
            </Stack>
            <Chip
              label="Proposed"
              color="info"
              variant="outlined"
              size="small"
            />
          </Stack>

          <Box sx={{ height: 1, backgroundColor: "divider", my: 1 }} />

          {/* Suggested Image Prompt */}
          <Box>
            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
              Suggested Image Prompt
            </Typography>
            <Box
              sx={{
                p: 2,
                backgroundColor: "action.hover",
                borderRadius: 1,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  whiteSpace: "pre-wrap",
                  fontStyle: "italic",
                }}
              >
                {suggestedImagePrompt}
              </Typography>
            </Box>
          </Box>

          {/* Rationale */}
          {rationale && (
            <Box>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                Why this change?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                {rationale}
              </Typography>
            </Box>
          )}

          {/* Actions */}
          <Stack direction="row" spacing={1} justifyContent="flex-end" mt={2}>
            <Button
              variant="contained"
              color="success"
              startIcon={accepting ? <CircularProgress size={16} /> : <Check />}
              onClick={handleAcceptClick}
              disabled={disabled || accepting}
            >
              {accepting ? "Applying..." : "Accept"}
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Close />}
              onClick={onReject}
              disabled={disabled || accepting}
            >
              Reject
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default ImagePromptSuggestionCard;

