import { useState } from "react";
import { Box, Typography, ToggleButton, ToggleButtonGroup, Chip } from "@mui/material";
import { alpha } from "@mui/material/styles";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { useTranslation } from "../../../i18n/useTranslation";
import { COLORS } from "../../../theme";
import { SDRadii } from "../StoryDetail.styles";

interface PricingCardProps {
  priceDigital?: number;
  pricePrint?: number;
  currency: string;
  printAvailable: boolean;
  status: string;
}

function formatMoney(amount: number, currency: string): string {
  const c = currency.toUpperCase();
  if (c === "ILS") return `₪${amount}`;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export default function PricingCard({
  priceDigital,
  pricePrint,
  currency,
  printAvailable,
  status,
}: PricingCardProps) {
  const t = useTranslation();
  const [mode, setMode] = useState<"digital" | "print">("digital");

  const comingSoon = status === "coming_soon";
  const hasDigital = typeof priceDigital === "number" && Number.isFinite(priceDigital);
  const hasPrint = typeof pricePrint === "number" && Number.isFinite(pricePrint) && printAvailable;

  const activePrice = mode === "print" && hasPrint ? pricePrint : priceDigital;
  const hasActivePrice = typeof activePrice === "number" && Number.isFinite(activePrice);
  const showComingSoon = comingSoon || (!hasDigital && !hasPrint);

  return (
    <Box
      sx={{
        background: COLORS.background,
        border: `1px solid ${COLORS.border}`,
        borderRadius: SDRadii.card,
        padding: "20px",
        mb: 2.25,
      }}
    >
      {hasPrint ? (
        <ToggleButtonGroup
          exclusive
          value={mode}
          onChange={(_, v) => v && setMode(v)}
          sx={{
            mb: 2,
            padding: "3px",
            background: alpha(COLORS.textPrimary, 0.06),
            borderRadius: "20px",
            gap: 0,
            "& .MuiToggleButtonGroup-grouped": { border: 0, margin: 0 },
          }}
        >
          <ToggleButton
            value="digital"
            sx={{
              textTransform: "none",
              borderRadius: "20px !important",
              px: 2,
              fontWeight: 600,
              ...(mode === "digital"
                ? { background: `${COLORS.textPrimary} !important`, color: `${COLORS.surface} !important` }
                : { background: "transparent", color: COLORS.textSecondary }),
            }}
          >
            {t("pricing.digital")}
          </ToggleButton>
          <ToggleButton
            value="print"
            sx={{
              textTransform: "none",
              borderRadius: "20px !important",
              px: 2,
              fontWeight: 600,
              ...(mode === "print"
                ? { background: `${COLORS.textPrimary} !important`, color: `${COLORS.surface} !important` }
                : { background: "transparent", color: COLORS.textSecondary }),
            }}
          >
            {t("pricing.print")}
          </ToggleButton>
        </ToggleButtonGroup>
      ) : null}

      <Box sx={{ mb: 2 }}>
        {showComingSoon ? (
          <Chip label={t("pricing.comingSoon")} sx={{ fontWeight: 700, fontSize: "14px" }} />
        ) : hasActivePrice ? (
          <>
            <Typography sx={{ fontSize: "36px", fontWeight: 800, color: COLORS.textPrimary, lineHeight: 1.1 }}>
              {formatMoney(activePrice!, currency)}
            </Typography>
            <Typography sx={{ fontSize: "13px", color: COLORS.textSecondary, mt: 0.5 }}>
              {mode === "print" && hasPrint ? t("pricing.shipped") : t("pricing.oneTime")}
            </Typography>
          </>
        ) : (
          <Chip label={t("pricing.comingSoon")} sx={{ fontWeight: 700 }} />
        )}
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <CheckCircleOutlineIcon sx={{ fontSize: 14, color: COLORS.success }} />
        <Typography sx={{ fontSize: "13px", fontWeight: 600, color: COLORS.success }}>
          {t("pricing.previewBeforePaying")}
        </Typography>
      </Box>
    </Box>
  );
}
