import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditNoteIcon from "@mui/icons-material/EditNote";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import { useTranslation } from "../../../i18n/useTranslation";
import { COLORS } from "../../../theme";
import { colorWithAlpha, SDRadii } from "../StoryDetail.styles";
import { fadeUpVariant } from "../animations/variants";

interface HowItWorksProps {
  reducedMotion: boolean;
  /** Not every story supports personalization — the steps must match what this story can actually do (see CtaRow). */
  personalizationEnabled: boolean;
}

const PERSONALIZABLE_STEPS = [
  { key: "preview", Icon: VisibilityIcon, titleKey: "howItWorks.step1Title" as const, descKey: "howItWorks.step1Desc" as const },
  { key: "personalize", Icon: EditNoteIcon, titleKey: "howItWorks.step2Title" as const, descKey: "howItWorks.step2Desc" as const },
  { key: "result", Icon: AutoAwesomeIcon, titleKey: "howItWorks.step3Title" as const, descKey: "howItWorks.step3Desc" as const },
];

const FIXED_STEPS = [
  { key: "preview", Icon: VisibilityIcon, titleKey: "howItWorks.step1Title" as const, descKey: "howItWorks.step1Desc" as const },
  { key: "buy", Icon: ShoppingBagOutlinedIcon, titleKey: "howItWorks.fixedStep2Title" as const, descKey: "howItWorks.fixedStep2Desc" as const },
];

/** Compact step-by-step explainer bridging the hero and the "See inside" preview. */
export default function HowItWorks({ reducedMotion, personalizationEnabled }: HowItWorksProps) {
  const t = useTranslation();
  const steps = personalizationEnabled ? PERSONALIZABLE_STEPS : FIXED_STEPS;

  const inner = (
    <Box sx={{ mb: 5 }}>
      <Typography sx={{ fontSize: "20px", fontWeight: 700, color: COLORS.textPrimary, mb: 2.5 }}>
        {t("howItWorks.title")}
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: `repeat(${steps.length}, 1fr)` },
          gap: "16px",
        }}
      >
        {steps.map(({ key, Icon, titleKey, descKey }, i) => (
          <Box
            key={key}
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: "14px",
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: SDRadii.card,
              padding: "16px 18px",
            }}
          >
            <Box
              sx={{
                position: "relative",
                width: 40,
                height: 40,
                borderRadius: "50%",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: colorWithAlpha(COLORS.primary, 0.1),
              }}
            >
              <Icon sx={{ fontSize: 20, color: COLORS.primary }} />
              <Box
                sx={{
                  position: "absolute",
                  top: -6,
                  insetInlineEnd: -6,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: COLORS.secondary,
                  color: COLORS.surface,
                  fontSize: "11px",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {i + 1}
              </Box>
            </Box>
            <Box>
              <Typography sx={{ fontSize: "14px", fontWeight: 700, color: COLORS.textPrimary, mb: 0.4 }}>
                {t(titleKey)}
              </Typography>
              <Typography sx={{ fontSize: "13px", color: COLORS.textSecondary, lineHeight: 1.5 }}>
                {t(descKey)}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );

  if (reducedMotion) return inner;

  return (
    <motion.div variants={fadeUpVariant} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
      {inner}
    </motion.div>
  );
}
