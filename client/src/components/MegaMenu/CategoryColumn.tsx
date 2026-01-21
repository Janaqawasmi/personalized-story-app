import { Box } from "@mui/material";
import { ReferenceTopic } from "../../hooks/useReferenceData";
import * as s from "./styles";
import { useTranslation } from "../../i18n/useTranslation";
import { useLanguage } from "../../i18n/context/useLanguage";

type Props = {
  topics: ReferenceTopic[];
  selectedTopicKey: string | null;
  onSelect: (id: string) => void;
  lang: "he" | "en" | "ar";
  onAllBooksClick?: () => void;
};

export function CategoryColumn({
  topics,
  selectedTopicKey,
  onSelect,
  lang,
  onAllBooksClick,
}: Props) {
  const t = useTranslation();
  const { language } = useLanguage();
  
  // Filter only active topics
  const activeTopics = topics.filter((topic) => topic.active);

  // Get label based on current language
  const getLabel = (topic: ReferenceTopic): string => {
    if (language === "en") {
      // For English, prefer label_en if available, fallback to label_he
      return topic.label_en || topic.label_he || topic.id;
    }
    // For Hebrew and Arabic, use label_he
    return topic.label_he || topic.id;
  };

  return (
    <Box sx={s.column}>
      <Box sx={s.columnHeader}>{t("megaMenu.category")}</Box>

      {onAllBooksClick && (
        <Box
          component="a"
          sx={[s.item, { fontWeight: 600 }]}
          onClick={(e) => {
            e.preventDefault();
            onAllBooksClick();
          }}
        >
          {t("megaMenu.allStories")}
        </Box>
      )}

      {activeTopics.map((topic) => (
        <Box
          key={topic.id}
          component="a"
          sx={[
            s.item,
            selectedTopicKey === topic.id && s.itemActive,
          ]}
          onClick={(e) => {
            e.preventDefault();
            onSelect(topic.id);
          }}
        >
          {getLabel(topic)}
        </Box>
      ))}
    </Box>
  );
}
