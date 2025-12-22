import {
    Box,
    Typography,
    Card,
    Button,
  } from "@mui/material";
  import { COLORS } from "../../theme";
  
  type Props = {
    storyTitle: string;
    data: {
      age: number;
      gender: string | null;
      photo: {
        previewUrl: string;
      } | null;
    };
    onBack: () => void;
    onGenerate: () => void;
  };
  
  export default function FinalPreviewStep({
    storyTitle,
    data,
    onBack,
    onGenerate,
  }: Props) {
    return (
      <Box maxWidth={600} mx="auto" mt={6}>
        {/* Step indicator */}
        <Typography
          variant="body2"
          color={COLORS.textSecondary}
          mb={1}
        >
          Step 3 of 3 — Final Preview
        </Typography>
  
        {/* Title */}
        <Typography
          variant="h4"
          fontWeight={700}
          mb={2}
          color={COLORS.primary}
        >
          Ready to create the story
        </Typography>
  
        <Typography
          variant="body1"
          color={COLORS.textSecondary}
          mb={4}
        >
          Please review the details below. When you’re ready,
          we’ll generate a personalized story for your child.
        </Typography>
  
        {/* Preview card */}
        <Card
          elevation={0}
          sx={{
            p: 4,
            mb: 4,
            borderRadius: 3,
            border: `1px solid ${COLORS.border}`,
            backgroundColor: COLORS.surface,
          }}
        >
          <Typography fontWeight={700} mb={2}>
            Story summary
          </Typography>
  
          {/* Photo preview (emotional WOW moment) */}
          {data.photo && (
            <Box
              mb={2}
              sx={{
                width: 120,
                height: 120,
                borderRadius: 2,
                backgroundImage: `url(${data.photo.previewUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                border: `1px solid ${COLORS.border}`,
              }}
            />
          )}
  
          <Typography mb={1}>
            <strong>Story:</strong> {storyTitle}
          </Typography>
  
          <Typography mb={1}>
            <strong>Child age:</strong> {data.age}
          </Typography>
  
          {data.gender && (
            <Typography mb={1}>
              <strong>Gender:</strong>{" "}
              {data.gender === "female"
                ? "Girl"
                : data.gender === "male"
                ? "Boy"
                : "Prefer not to say"}
            </Typography>
          )}
  
          <Typography>
            <strong>Illustrations:</strong> Gentle, child-friendly visuals
          </Typography>
        </Card>
  
        {/* Actions */}
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            fullWidth
            onClick={onBack}
            sx={{
              textTransform: "none",
              borderColor: COLORS.primary,
              color: COLORS.primary,
              fontWeight: 600,
            }}
          >
            ← Back
          </Button>
  
          <Button
            variant="contained"
            fullWidth
            onClick={onGenerate}
            sx={{
              py: 1.5,
              fontSize: 16,
              fontWeight: 700,
              backgroundColor: COLORS.primary,
              "&:hover": {
                backgroundColor: COLORS.secondary,
              },
            }}
          >
            Generate story
          </Button>
        </Box>
      </Box>
    );
  }
  