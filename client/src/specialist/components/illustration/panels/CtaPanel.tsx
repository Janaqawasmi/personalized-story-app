import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useSpecialistDeskUi } from "../../../../i18n/specialistDeskUi";
import { COLORS } from "../../../../theme";
import { DRAFT_B, FONTS } from "../../draftB/tokens";

interface Props {
  pageCount: number;
  disabled: boolean;
  onOpen: () => void;
}

export default function CtaPanel({ pageCount, disabled, onOpen }: Props) {
  const desk = useSpecialistDeskUi();

  return (
    <Box
      sx={{
        width: "100%",
        textAlign: "center",
        bgcolor: COLORS.surface,
        border: `1px solid ${DRAFT_B.border}`,
        borderRadius: "14px",
        px: { xs: 3, sm: 5 },
        py: { xs: 4, sm: 6 },
        boxShadow:
          "0 1px 0 rgba(42,36,33,.02), 0 12px 32px -22px rgba(42,36,33,.12)",
      }}
    >
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          bgcolor: COLORS.primarySoft,
          color: COLORS.primary,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          mb: 2.25,
        }}
      >
        <AutoAwesomeOutlinedIcon sx={{ fontSize: 32 }} aria-hidden />
      </Box>

      <Typography
        component="h2"
        sx={{
          m: 0,
          mb: 1.25,
          fontFamily: `'Playfair Display', Georgia, serif`,
          fontWeight: 700,
          fontSize: { xs: 24, sm: 28 },
          color: DRAFT_B.ink,
          letterSpacing: "-0.02em",
        }}
      >
        {desk.illCtaHeadline}
      </Typography>

      <Typography
        sx={{
          m: 0,
          mb: 3.5,
          fontSize: 15.5,
          lineHeight: 1.65,
          color: DRAFT_B.inkSoft,
          maxWidth: 480,
          mx: "auto",
          fontFamily: FONTS.sans,
        }}
      >
        {desk.illCtaBody(pageCount)}
      </Typography>

      <Button
        variant="contained"
        size="large"
        disabled={disabled}
        onClick={onOpen}
        sx={{
          textTransform: "none",
          fontWeight: 700,
          px: 3.5,
          py: 1.25,
          borderRadius: "12px",
        }}
      >
        {desk.illCtaButton}
      </Button>

      <Typography
        sx={{
          mt: 2.25,
          fontSize: 12.5,
          color: DRAFT_B.inkMuted,
          fontFamily: FONTS.mono,
        }}
      >
        {desk.illCtaMeta(pageCount)}
      </Typography>

      <Box
        sx={{
          mt: 4.5,
          pt: 3,
          borderTop: `1px solid ${DRAFT_B.borderSoft}`,
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
          gap: 2,
          textAlign: "start",
        }}
      >
        {desk.illCtaSteps.map(([stepId, title, desc]) => (
          <Box key={stepId}>
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: 11,
                color: COLORS.primary,
                fontWeight: 700,
                letterSpacing: "0.08em",
                mb: 0.5,
              }}
            >
              {stepId}
            </Typography>
            <Typography
              sx={{
                fontFamily: `'Playfair Display', Georgia, serif`,
                fontSize: 16,
                fontWeight: 700,
                color: DRAFT_B.ink,
                mb: 0.25,
              }}
            >
              {title}
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: DRAFT_B.inkMuted, lineHeight: 1.5 }}>
              {desc}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
