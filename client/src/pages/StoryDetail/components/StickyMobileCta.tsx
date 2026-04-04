import { Box, Typography, Button } from "@mui/material";
import { SDGradients } from "../StoryDetail.styles";
import { useTranslation } from "../../../i18n/useTranslation";

interface StickyMobileCtaProps {
  visible: boolean;
  title: string;
  price: string;
  onPersonalize: () => void;
  onPreviewClick: () => void;
}

export default function StickyMobileCta({ visible, title, price, onPersonalize, onPreviewClick }: StickyMobileCtaProps) {
  const t = useTranslation();

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 0,
        insetInlineStart: 0,
        insetInlineEnd: 0,
        display: { xs: "flex", md: "none" },
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        zIndex: 90,
        background: "white",
        borderTop: "1px solid #ede9f8",
        padding: "12px 20px",
        transform: visible ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.3s ease",
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontSize: "14px", fontWeight: 700, color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis" }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: "12px", color: "#888", mt: 0.25 }}>{price}</Typography>
      </Box>
      <Box sx={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
        <Button
          variant="outlined"
          onClick={onPreviewClick}
          sx={{
            borderColor: "#7F77DD",
            color: "#534AB7",
            fontSize: "13px",
            fontWeight: 700,
            borderRadius: "10px",
            textTransform: "none",
            py: 1,
            px: 1.5,
          }}
        >
          {t("preview.preview")}
        </Button>
        <Button
          variant="contained"
          disableElevation
          onClick={onPersonalize}
          sx={{
            background: SDGradients.cta,
            color: "white",
            fontSize: "13px",
            fontWeight: 700,
            borderRadius: "10px",
            textTransform: "none",
            py: 1,
            px: 1.75,
          }}
        >
          {t("storyDetail.personalize")}
        </Button>
      </Box>
    </Box>
  );
}
