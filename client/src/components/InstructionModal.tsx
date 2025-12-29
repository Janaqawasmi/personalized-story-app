import {
  Box,
  Typography,
  Dialog,
  DialogContent,
  Button,
} from "@mui/material";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function InstructionModal({ open, onClose }: Props) {
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
          טיפים לקריאה נעימה
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
          כך תיהנו מהסיפור בצורה הטובה ביותר
        </Typography>
        {/* Instructions */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Instruction
            icon="▶"
            title="הקראה קולית"
            text="ניתן להאזין לסיפור בקול רגוע באמצעות כפתור ההקראה."
          />

          <Instruction
            icon="📄"
            title="דפדוף בעמודים"
            text="דפדפו בעזרת החיצים, לחיצה על שולי העמוד או גרירה מהפינה."
          />

          <Instruction
            icon="👆"
            title="קריאה בקצב שלכם"
            text="אפשר לעצור, לחזור אחורה ולקרוא מחדש בכל שלב."
          />

          <Instruction
            icon="💗"
            title="חוויה מותאמת אישית"
            text="הסיפור נוצר במיוחד עבור הילד שלכם, בשפה רגועה ותומכת."
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
          המלצה: מצאו מקום שקט ונעים לקריאה משותפת 💫
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
            הבנתי, בואו נתחיל
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


