// client/src/components/AISuggestionCard.tsx
import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  CircularProgress,
  Divider,
} from "@mui/material";
import { Check, Close, AutoAwesome } from "@mui/icons-material";
import { DraftSuggestion } from "../api/api";

interface AISuggestionCardProps {
  suggestion: DraftSuggestion;
  onAccept: (suggestionId: string) => Promise<void>;
  onReject: (suggestionId: string) => Promise<void>;
  isRTL?: boolean;
  accepting?: boolean;
  rejecting?: boolean;
  disabled?: boolean;
}

const AISuggestionCard: React.FC<AISuggestionCardProps> = ({
  suggestion,
  onAccept,
  onReject,
  isRTL = false,
  accepting = false,
  rejecting = false,
  disabled = false,
}) => {
  const [isRejected, setIsRejected] = useState(false);

  const handleAccept = async () => {
    try {
      await onAccept(suggestion.id);
      // Success is handled by parent component (reloads draft)
    } catch (err) {
      // Error is handled by parent
    }
  };

  const handleReject = async () => {
    try {
      await onReject(suggestion.id);
      setIsRejected(true);
    } catch (err) {
      // Error is handled by parent
    }
  };

  // Don't render if rejected and collapsed
  if (isRejected) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
          Suggestion rejected
        </Typography>
      </Box>
    );
  }

  // Don't render accepted suggestions (they're already applied)
  if (suggestion.status === "accepted") {
    return (
      <Box sx={{ mt: 2 }}>
        <Chip
          label="Applied"
          color="success"
          size="small"
          icon={<Check />}
          sx={{ mb: 1 }}
        />
      </Box>
    );
  }

  // Only render proposed suggestions
  if (suggestion.status !== "proposed") {
    return null;
  }

  return (
    <Card
      variant="outlined"
      sx={{
        mt: 2,
        borderColor: "primary.light",
        backgroundColor: "action.hover",
      }}
    >
      <CardContent>
        <Stack spacing={2}>
          {/* Header */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <AutoAwesome fontSize="small" color="primary" />
              <Typography variant="subtitle2" fontWeight="bold">
                AI Suggested Change
              </Typography>
            </Stack>
            <Chip
              label="Proposed"
              color="info"
              variant="outlined"
              size="small"
            />
          </Stack>

          <Divider />

          {/* Suggested Text */}
          <Box>
            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
              Suggested Text
            </Typography>
            <Box
              sx={{
                p: 2,
                backgroundColor: "action.hover",
                borderRadius: 1,
                border: "1px solid",
                borderColor: "primary.main",
              }}
            >
              <Typography
                variant="body1"
                sx={{
                  whiteSpace: "pre-wrap",
                  direction: isRTL ? "rtl" : "ltr",
                  textAlign: isRTL ? "right" : "left",
                  fontFamily: isRTL ? "'Noto Sans Arabic', 'Noto Sans Hebrew', sans-serif" : undefined,
                }}
              >
                {suggestion.suggestedText}
              </Typography>
            </Box>
          </Box>

          {/* Rationale */}
          {suggestion.rationale && (
            <Box>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                Why this change?
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontStyle: "italic", pl: 1 }}
              >
                {suggestion.rationale}
              </Typography>
            </Box>
          )}

          {/* Actions */}
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Button
              variant="contained"
              color="success"
              startIcon={accepting ? <CircularProgress size={16} /> : <Check />}
              onClick={handleAccept}
              disabled={disabled || accepting || rejecting}
              size="small"
            >
              {accepting ? "Applying..." : "Accept"}
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={rejecting ? <CircularProgress size={16} /> : <Close />}
              onClick={handleReject}
              disabled={disabled || accepting || rejecting}
              size="small"
            >
              {rejecting ? "Rejecting..." : "Reject"}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default AISuggestionCard;

