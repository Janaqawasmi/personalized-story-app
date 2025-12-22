import {
  Box,
  Typography,
  TextField,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  Card,
  Button,
} from "@mui/material";
import { useState } from "react";
import { COLORS } from "../../theme";
import PhotoUploadCard from "./PhotoUploadCard";
import StepIndicator from "./StepIndicator";
import PreviewCard from "./PreviewCard";

/* ✅ UPDATED PROPS */
type Props = {
  storyTitle: string;
  onBack: () => void;
  onContinue: (data: {
    age: number;
    gender: string | null;
    photo: {
      file: File;
      previewUrl: string;
    } | null;
  }) => void;
};

export default function ChildInfoForm({
  storyTitle,
  onBack,
  onContinue,
}: Props) {
  const [age, setAge] = useState<number>(5);
  const [gender, setGender] = useState<string | null>(null);
  const [photo, setPhoto] = useState<{
    file: File;
    previewUrl: string;
  } | null>(null);

  return (
    <Box maxWidth={600} mx="auto" mt={6}>
      {/* Back */}
      <Button
        onClick={onBack}
        sx={{ mb: 2, textTransform: "none" }}
      >
        ← Back to stories
      </Button>

      {/* Step indicator */}
      <StepIndicator
        step={2}
        totalSteps={3}
        label="Personalization"
      />

      {/* Context */}
      <Typography variant="h6" mb={1}>
        Personalizing: <strong>{storyTitle}</strong>
      </Typography>

      {/* Title */}
      <Typography
        variant="h4"
        fontWeight={700}
        mb={1}
        color={COLORS.primary}
      >
        Let’s get to know your child
      </Typography>

      <Typography
        variant="body1"
        color={COLORS.textSecondary}
        mb={4}
      >
        This will help us personalize the story in a gentle and meaningful way.
      </Typography>

      {/* Card wrapper */}
      <Card
        elevation={0}
        sx={{
          p: 4,
          borderRadius: 3,
          border: `1px solid ${COLORS.border}`,
          backgroundColor: COLORS.surface,
        }}
      >
        {/* Photo upload */}
        <PhotoUploadCard
          onPhotoSelected={(file, previewUrl) =>
            setPhoto({ file, previewUrl })
          }
        />

        {/* Preview */}
        <PreviewCard storyTitle={storyTitle} />

        {/* Child name */}
        <Box mb={4}>
          <Typography fontWeight={600} mb={1}>
            Child’s name
          </Typography>
          <TextField
            fullWidth
            placeholder="e.g. Lina"
            variant="outlined"
          />
        </Box>

        {/* Age */}
        <Box mb={4}>
          <Typography fontWeight={600} mb={1}>
            Child’s age
          </Typography>
          <Slider
            value={age}
            min={0}
            max={12}
            step={1}
            valueLabelDisplay="on"
            onChange={(_, value) =>
              setAge(value as number)
            }
            sx={{ color: COLORS.primary }}
          />
        </Box>

        {/* Gender */}
        <Box mb={4}>
          <Typography fontWeight={600} mb={1}>
            Gender (optional)
          </Typography>
          <ToggleButtonGroup
            exclusive
            value={gender}
            onChange={(_, val) => setGender(val)}
            sx={{
              "& .MuiToggleButton-root": {
                textTransform: "none",
                px: 3,
              },
            }}
          >
            <ToggleButton value="female">Girl</ToggleButton>
            <ToggleButton value="male">Boy</ToggleButton>
            <ToggleButton value="neutral">
              Prefer not to say
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* CTA */}
        <Button
          variant="contained"
          fullWidth
          onClick={() =>
            onContinue({
              age,
              gender,
              photo,
            })
          }
          sx={{
            mt: 2,
            py: 1.5,
            backgroundColor: COLORS.primary,
            fontSize: 16,
            fontWeight: 600,
            "&:hover": {
              backgroundColor: COLORS.secondary,
            },
          }}
        >
          Continue
        </Button>
      </Card>
    </Box>
  );
}
