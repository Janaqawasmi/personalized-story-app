import {
  Box,
  Typography,
  Dialog,
  DialogContent,
  Button,
} from "@mui/material";
import { useTranslation } from "../i18n/useTranslation";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function InstructionModal({ open, onClose }: Props) {
  const t = useTranslation();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          px: 2,
          py: 3,
        },
      }}
    >
      <DialogContent>
        {/* Title */}
        <Typography
          sx={{
            fontSize: "1.4rem",
            fontWeight: 600,
            textAlign: "center",
            mb: 0.5,
          }}
        >
          {t("instructions.title")}
        </Typography>
        {/* Subtitle */}
        <Typography
          sx={{
            fontSize: "0.9rem",
            color: "text.secondary",
            textAlign: "center",
            mb: 3,
          }}
        >
          {t("instructions.subtitle")}
        </Typography>
        {/* Instructions */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Instruction
            icon="▶"
            title={t("instructions.audio.title")}
            text={t("instructions.audio.text")}
          />

          <Instruction
            icon="📄"
            title={t("instructions.pages.title")}
            text={t("instructions.pages.text")}
          />

          <Instruction
            icon="👆"
            title={t("instructions.pace.title")}
            text={t("instructions.pace.text")}
          />

          <Instruction
            icon="💗"
            title={t("instructions.personalized.title")}
            text={t("instructions.personalized.text")}
          />
        </Box>

        {/* Footer note */}
        <Typography
          sx={{
            fontSize: "0.8rem",
            color: "text.secondary",
            textAlign: "center",
            mt: 3,
          }}
        >
          {t("instructions.recommendation")}
        </Typography>

        {/* Action button */}
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <Button
            variant="contained"
            onClick={onClose}
            sx={{
              px: 4,
              py: 1.2,
              borderRadius: 999,
              backgroundColor: "#824D5C",
              "&:hover": {
                backgroundColor: "#6f404d",
              },
            }}
          >
            {t("instructions.gotIt")}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

function Instruction({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <Box sx={{ display: "flex", gap: 1.5 }}>
      <Box sx={{ fontSize: "1.2rem", lineHeight: 1 }}>{icon}</Box>
      <Box>
        <Typography sx={{ fontWeight: 500, fontSize: "0.9rem" }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
          {text}
        </Typography>
      </Box>
    </Box>
  );
}









