import { Box, useTheme } from "@mui/material";
import { ReferenceSituation } from "../../hooks/useReferenceData";
import * as s from "./styles";
import { useTranslation } from "../../i18n/useTranslation";
import { useLanguage } from "../../i18n/context/useLanguage";

type Props = {
  situations: ReferenceSituation[];
  selectedTopicKey: string | null;
  selectedSituation: string | null;
  onSelect: (id: string) => void;
  lang: "he" | "en" | "ar";
};

export function TopicColumn({
  situations,
  selectedTopicKey,
  selectedSituation,
  onSelect,
  lang,
}: Props) {
  const theme = useTheme();
  const t = useTranslation();
  const { language } = useLanguage();
  
  // Get label based on current language
  const getLabel = (situation: ReferenceSituation): string => {
    if (language === "en") {
      // For English, prefer label_en if available, fallback to label_he
      return situation.label_en || situation.label_he || situation.id;
    }
    // For Hebrew and Arabic, use label_he
    return situation.label_he || situation.id;
  };
  
  if (!selectedTopicKey) {
    return (
      <Box sx={s.column}>
        <Box sx={s.columnHeader}>{t("megaMenu.topic")}</Box>
        <Box sx={{ fontSize: "0.875rem", color: theme.palette.text.secondary, py: 1 }}>
          {t("megaMenu.selectCategory")}
        </Box>
      </Box>
    );
  }

  const filtered = situations.filter(
    (s) => s.topicKey === selectedTopicKey && s.active
  );

  return (
    <Box sx={s.column}>
      <Box sx={s.columnHeader}>{t("megaMenu.topic")}</Box>

      {filtered.map((situation) => (
        <Box
          key={situation.id}
          component="a"
          sx={[
            s.item,
            selectedSituation === situation.id && s.itemActive,
          ]}
          onClick={(e) => {
            e.preventDefault();
            onSelect(situation.id);
          }}
        >
          {getLabel(situation)}
        </Box>
      ))}
    </Box>
  );
}
