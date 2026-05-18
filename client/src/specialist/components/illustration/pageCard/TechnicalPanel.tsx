import { useState } from "react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import Typography from "@mui/material/Typography";
import { useIllustrationDevPanelsGate } from "../../../hooks/useIsAdminOrDevPanelEnabled";
import { useSpecialistDeskUi } from "../../../../i18n/specialistDeskUi";
import { DESIGN_TOKENS } from "../../../../theme";
import { DRAFT_B, FONTS } from "../../draftB/tokens";
import DeveloperPanel from "../DeveloperPanel";

interface Props {
  storyId: string;
  pageNumber: number;
  scenePlanVersion: number;
  imageVersion: number | null;
  currentVisualBibleVersion: number;
}

/**
 * Admin / `illustrationDevPanels` claim only (see {@link useIllustrationDevPanelsGate}).
 * Disclosure + dark §13-style shell wrapping {@link DeveloperPanel}.
 */
export default function TechnicalPanel({
  storyId,
  pageNumber,
  scenePlanVersion,
  imageVersion,
  currentVisualBibleVersion,
}: Props) {
  const desk = useSpecialistDeskUi();
  const devGate = useIllustrationDevPanelsGate();
  const [open, setOpen] = useState(false);

  if (!devGate.ready || !devGate.allowed) {
    return null;
  }

  const panelId = `ill-tech-${pageNumber}`;

  return (
    <Box>
      <Button
        size="small"
        variant="text"
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        endIcon={
          <ExpandMoreIcon
            sx={{
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          />
        }
        sx={{ color: DRAFT_B.inkSoft, textTransform: "none", fontWeight: 600 }}
      >
        {desk.illSecTechDetails}
      </Button>
      <Collapse in={open}>
        <Box
          id={panelId}
          sx={{
            mt: 1,
            p: 2,
            borderRadius: "10px",
            bgcolor: "#1f1a17",
            color: "#e9dfd2",
            direction: "ltr",
            textAlign: "start",
            fontFamily: FONTS.mono,
            fontSize: 11.5,
            lineHeight: 1.7,
          }}
        >
          <Typography
            sx={{
              color: DESIGN_TOKENS.gold,
              mb: 1,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              fontWeight: 700,
              fontSize: 10,
              fontFamily: FONTS.mono,
            }}
          >
            {`─── ${desk.illGenStage2Label} · v${scenePlanVersion} ───`}
          </Typography>
          <DeveloperPanel
            embedded
            storyId={storyId}
            pageNumber={pageNumber}
            scenePlanVersion={scenePlanVersion}
            imageVersion={imageVersion}
            currentVisualBibleVersion={currentVisualBibleVersion}
          />
        </Box>
      </Collapse>
    </Box>
  );
}
