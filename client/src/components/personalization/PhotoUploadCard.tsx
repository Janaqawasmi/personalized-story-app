import {
  Box,
  Typography,
  Button,
  Card,
} from "@mui/material";
import { useRef, useState } from "react";
import { COLORS } from "../../theme";

/* ✅ NEW PROPS */
type Props = {
  onPhotoSelected?: (file: File, previewUrl: string) => void;
};

export default function PhotoUploadCard({
  onPhotoSelected,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    /* ✅ SEND DATA UP */
    onPhotoSelected?.(file, url);
  };

  return (
    <Card
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        border: `1px dashed ${COLORS.border}`,
        backgroundColor: COLORS.background,
        mb: 4,
      }}
    >
      <Typography fontWeight={600} mb={1}>
        Add a child photo (optional)
      </Typography>

      <Typography
        variant="body2"
        color={COLORS.textSecondary}
        mb={2}
      >
        This photo helps us create a gentle illustrated character
        that looks like your child.
      </Typography>

      {/* Preview */}
      {previewUrl && (
        <Box
          mb={2}
          sx={{
            width: 160,
            height: 160,
            borderRadius: 2,
            backgroundImage: `url(${previewUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            border: `1px solid ${COLORS.border}`,
          }}
        />
      )}

      {/* Hidden input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleFileChange}
      />

      {/* Action */}
      <Button
        variant="outlined"
        onClick={() => fileInputRef.current?.click()}
        sx={{
          textTransform: "none",
          borderColor: COLORS.primary,
          color: COLORS.primary,
          fontWeight: 600,
        }}
      >
        {previewUrl ? "Change photo" : "Upload photo"}
      </Button>
    </Card>
  );
}
