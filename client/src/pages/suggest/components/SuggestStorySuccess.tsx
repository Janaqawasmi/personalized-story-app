import { Box, Button, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { COLORS } from "../../../theme";
import { useTranslation } from "../../../i18n/useTranslation";
import { useLanguage } from "../../../i18n/context/useLanguage";

export function SuggestStorySuccess({
  onSubmitAnother,
  onBrowse,
}: {
  onSubmitAnother: () => void;
  onBrowse: () => void;
}) {
  const t = useTranslation();
  const { direction } = useLanguage();

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      sx={{
        maxWidth: 480,
        width: "100%",
        mx: "auto",
        backgroundColor: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 4,
        p: { xs: 3, sm: 4 },
        textAlign: "center",
        direction,
      }}
    >
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          backgroundColor: "rgba(130, 77, 92, 0.10)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mx: "auto",
          mb: 2,
          border: `1px solid rgba(130, 77, 92, 0.20)`,
        }}
        aria-hidden
      >
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
          <path
            d="M20 7.5v8.2c0 .8-.7 1.5-1.5 1.5h-13C4.7 17.2 4 16.5 4 15.7V7.5"
            stroke={COLORS.secondary}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M20 7.5L12 12.7 4 7.5"
            stroke={COLORS.secondary}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 9.2c.7-1 2.2-1.2 3.2-.3.8.8.8 2.1-.1 2.9-.5.5-1.1.9-1.6 1.3-.5.4-.9.7-1.5 1.1-.6-.4-1-.7-1.5-1.1-.5-.4-1.1-.8-1.6-1.3-.9-.8-1-2.1-.1-2.9 1-.9 2.5-.7 3.2.3Z"
            fill="rgba(130, 77, 92, 0.18)"
            stroke={COLORS.secondary}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      </Box>

      <Typography
        variant="h4"
        sx={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontWeight: 700,
          color: COLORS.textPrimary,
          mb: 1,
        }}
      >
        {t("suggest.success.title")}
      </Typography>
      <Typography sx={{ color: COLORS.textSecondary, mb: 0.5 }}>
        {t("suggest.success.body_line_1")}
      </Typography>
      <Typography sx={{ color: COLORS.textSecondary, mb: 3 }}>
        {t("suggest.success.body_line_2")}
      </Typography>

      <Box sx={{ display: "flex", gap: 1.5, justifyContent: "center", flexWrap: "wrap" }}>
        <Button
          variant="contained"
          onClick={onSubmitAnother}
          sx={{
            backgroundColor: COLORS.secondary,
            "&:hover": { backgroundColor: "#6D404D" },
            px: 3,
            py: 1.25,
            borderRadius: 2.5,
            textTransform: "none",
            fontWeight: 600,
          }}
        >
          {t("suggest.success.submit_another")}
        </Button>

        <Button
          variant="outlined"
          onClick={onBrowse}
          sx={{
            borderColor: COLORS.secondary,
            color: COLORS.secondary,
            "&:hover": {
              borderColor: "#6D404D",
              backgroundColor: "rgba(130, 77, 92, 0.06)",
            },
            px: 3,
            py: 1.25,
            borderRadius: 2.5,
            textTransform: "none",
            fontWeight: 600,
          }}
        >
          {t("suggest.success.browse")}
        </Button>
      </Box>
    </Box>
  );
}

