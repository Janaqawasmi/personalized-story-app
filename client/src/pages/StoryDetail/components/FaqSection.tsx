import { Box, Typography, Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { motion } from "framer-motion";
import { useTranslation } from "../../../i18n/useTranslation";
import { COLORS } from "../../../theme";
import { SDRadii } from "../StoryDetail.styles";
import { fadeUpVariant } from "../animations/variants";

export interface FaqRow {
  question: string;
  answer: string;
}

interface FaqSectionProps {
  items: FaqRow[];
  reducedMotion: boolean;
}

export default function FaqSection({ items, reducedMotion }: FaqSectionProps) {
  const t = useTranslation();

  const inner = (
    <Box>
      <Typography sx={{ fontSize: "22px", fontWeight: 700, mb: 2.5, color: COLORS.textPrimary }}>{t("faq.title")}</Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {items.map((item, i) => (
          <Accordion
            key={i}
            defaultExpanded={i === 0}
            elevation={0}
            sx={{
              borderRadius: `${SDRadii.faqItem} !important`,
              border: `1px solid ${COLORS.border}`,
              boxShadow: "none",
              mb: 0,
              "&:before": { display: "none" },
              "&.Mui-expanded": { margin: 0 },
              "&:hover": { bgcolor: COLORS.background },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ color: COLORS.textSecondary }} />}
              sx={{
                px: 2.5,
                "&.Mui-expanded": { bgcolor: COLORS.background },
                "& .MuiAccordionSummary-expandIconWrapper": {
                  transition: "transform 0.3s ease",
                },
                "&.Mui-expanded .MuiAccordionSummary-expandIconWrapper": {
                  transform: "rotate(180deg)",
                },
                "& .MuiAccordionSummary-content": {
                  fontSize: "15px",
                  fontWeight: 600,
                  color: COLORS.textPrimary,
                },
              }}
            >
              {item.question}
            </AccordionSummary>
            <AccordionDetails
              sx={{
                px: 2.5,
                pb: 2.25,
                fontSize: "14px",
                lineHeight: 1.7,
                color: COLORS.textSecondary,
                borderTop: `1px solid ${COLORS.border}`,
                bgcolor: COLORS.background,
              }}
            >
              {item.answer}
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Box>
  );

  if (reducedMotion) {
    return <Box sx={{ mb: 4 }}>{inner}</Box>;
  }

  return (
    <motion.div variants={fadeUpVariant} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}>
      <Box sx={{ mb: 4 }}>{inner}</Box>
    </motion.div>
  );
}
