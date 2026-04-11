import { Box, Typography } from "@mui/material";
import { useLanguage } from "../../i18n/context/useLanguage";

interface SectionHeaderProps {
  label: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
}

export default function SectionHeader({
  label,
  title,
  subtitle,
  align = "left",
}: SectionHeaderProps) {
  const { direction } = useLanguage();
  const isRTL = direction === "rtl";

  const resolvedAlign = align === "center" ? "center" : isRTL ? "right" : "left";

  return (
    <Box sx={{ textAlign: resolvedAlign, mb: subtitle ? 0 : 5 }}>
      <Typography
        sx={{
          fontSize: "11px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "2px",
          color: "#824D5C",
          mb: 1.5,
          display: "block",
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="h2"
        sx={{
          fontFamily: "Playfair Display, serif",
          fontSize: { xs: "28px", md: "40px" },
          fontWeight: 700,
          lineHeight: 1.2,
          letterSpacing: "-0.5px",
          mb: subtitle ? 1.5 : 0,
        }}
      >
        {title}
      </Typography>
      {subtitle ? (
        <Typography
          sx={{
            fontSize: "16px",
            color: "text.secondary",
            lineHeight: 1.6,
            maxWidth: resolvedAlign === "center" ? "460px" : "520px",
            mx: resolvedAlign === "center" ? "auto" : 0,
          }}
        >
          {subtitle}
        </Typography>
      ) : null}
    </Box>
  );
}
