import { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { useTranslation } from "../../i18n/useTranslation";
import { useLanguage } from "../../i18n/context/useLanguage";
import { BOOK_COLORS, BOOK_RADII } from "../book/bookTokens";
import { getPrepareCards } from "./prepareCardsByTheme";

interface Props {
  theme?: string;
}

export default function ReadyToReadCarousel({ theme }: Props) {
  const t = useTranslation();
  const { language } = useLanguage();
  const [idx, setIdx] = useState(0);

  const cards = getPrepareCards(theme, language);

  return (
    <Box
      sx={{
        maxWidth: 320,
        mx: "auto",
        backgroundColor: BOOK_COLORS.cream,
        borderRadius: 3,
        p: 3,
      }}
    >
      <Typography
        sx={{
          fontStyle: "italic",
          fontSize: 14,
          color: BOOK_COLORS.ink,
          minHeight: 56,
        }}
      >
        {cards[idx]}
      </Typography>
      <Box sx={{ display: "flex", gap: 1, justifyContent: "center", mt: 2 }}>
        <Button
          size="small"
          onClick={() => setIdx((i) => (i - 1 + cards.length) % cards.length)}
          sx={{ color: BOOK_COLORS.rose, textTransform: "none", borderRadius: BOOK_RADII.pill }}
        >
          {t("waitingScreen.back")}
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={() => setIdx((i) => (i + 1) % cards.length)}
          sx={{
            backgroundColor: BOOK_COLORS.rose,
            textTransform: "none",
            borderRadius: BOOK_RADII.pill,
            "&:hover": { backgroundColor: BOOK_COLORS.roseDeep },
          }}
        >
          {t("waitingScreen.next")}
        </Button>
      </Box>
    </Box>
  );
}
