// client/src/components/PageAISuggestionBox.tsx
import React, { useState } from "react";
import {
  Button,
  TextField,
  Typography,
  Card,
  CardContent,
  Stack,
  CircularProgress,
  Divider,
} from "@mui/material";
import { AutoAwesome } from "@mui/icons-material";

interface PageAISuggestionBoxProps {
  pageNumber: number;
  onRequestSuggestion: (instruction: string) => Promise<void>;
  disabled?: boolean;
  loading?: boolean;
}

const PageAISuggestionBox: React.FC<PageAISuggestionBoxProps> = ({
  pageNumber,
  onRequestSuggestion,
  disabled = false,
  loading = false,
}) => {
  const [instruction, setInstruction] = useState("");
  const [error, setError] = useState<string | null>(null);

  const placeholderExamples = [
    "Make the tone calmer",
    "Simplify language",
    "Reduce fear and reassure the child",
    "Make the caregiver presence clearer",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim()) {
      setError("Please enter an instruction for the AI");
      return;
    }

    setError(null);
    try {
      await onRequestSuggestion(instruction.trim());
      setInstruction(""); // Clear input on success
    } catch (err: any) {
      setError(err.message || "Failed to request suggestion");
    }
  };

  return (
    <Card variant="outlined" sx={{ mt: 2, backgroundColor: "action.hover" }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <AutoAwesome fontSize="small" color="primary" />
            <Typography variant="subtitle2" fontWeight="bold">
              AI Assistant
            </Typography>
          </Stack>
          
          <Divider />

          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                fullWidth
                multiline
                rows={2}
                value={instruction}
                onChange={(e) => {
                  setInstruction(e.target.value);
                  setError(null);
                }}
                placeholder={placeholderExamples[pageNumber % placeholderExamples.length]}
                variant="outlined"
                size="small"
                disabled={disabled || loading}
                error={!!error}
                helperText={error}
              />

              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={disabled || loading || !instruction.trim()}
                startIcon={loading ? <CircularProgress size={16} /> : <AutoAwesome />}
                sx={{ alignSelf: "flex-start" }}
              >
                {loading ? "Generating..." : "Ask AI"}
              </Button>
            </Stack>
          </form>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default PageAISuggestionBox;

