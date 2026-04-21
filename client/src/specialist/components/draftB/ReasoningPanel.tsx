import React, { useState } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExploreIcon from "@mui/icons-material/Explore";
import FavoriteIcon from "@mui/icons-material/Favorite";
import LayersIcon from "@mui/icons-material/Layers";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

import type { Agent1Result } from "../../../types/agent1Result";
import { COLORS } from "../../../theme";
import { FeedbackDialog } from "./shared";
import { DRAFT_B, FONTS } from "./tokens";

function ReasoningAccordionCard({
  title,
  icon,
  defaultExpanded = false,
  accentLeft,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultExpanded?: boolean;
  accentLeft?: string;
  children: React.ReactNode;
}) {
  return (
    <Accordion
      defaultExpanded={defaultExpanded}
      disableGutters
      elevation={0}
      sx={{
        mb: "14px",
        borderRadius: "8px",
        border: `1px solid ${DRAFT_B.border}`,
        background: "#fff",
        fontFamily: FONTS.sans,
        "&:before": { display: "none" },
        overflow: "hidden",
        ...(accentLeft ? { borderLeft: `3px solid ${accentLeft}`, pl: 0 } : {}),
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ color: DRAFT_B.inkMuted, fontSize: 22 }} />}
        sx={{
          px: "12px",
          minHeight: 48,
          "& .MuiAccordionSummary-content": {
            alignItems: "center",
            gap: 1,
            my: 1,
          },
          "&.Mui-expanded": { minHeight: 48 },
        }}
      >
        <Box
          sx={{
            width: 24,
            height: 24,
            borderRadius: "6px",
            bgcolor: DRAFT_B.primarySoft,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Typography sx={{ fontSize: "13px", fontWeight: 700, color: DRAFT_B.ink }}>{title}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0, px: "12px", pb: "12px" }}>{children}</AccordionDetails>
    </Accordion>
  );
}

export interface ReasoningPanelProps {
  result: Agent1Result;
  onFeedback: (card: string, text: string) => void;
  readOnly: boolean;
  onEditBrief: () => void | Promise<void>;
}

function FeedbackRow({
  cardKey,
  feedbackTitle,
  readOnly,
  onFeedback,
}: {
  cardKey: string;
  feedbackTitle: string;
  readOnly: boolean;
  onFeedback: (card: string, text: string) => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [noted, setNoted] = useState(false);

  if (readOnly) return null;

  if (confirmed) {
    return (
      <Chip
        icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
        label="Confirmed"
        size="small"
        color="success"
        sx={{ mt: 1 }}
      />
    );
  }

  if (noted) {
    return <Chip label="Feedback noted" size="small" sx={{ mt: 1 }} variant="outlined" />;
  }

  return (
    <>
      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
        <Button size="small" variant="outlined" color="success" onClick={() => setConfirmed(true)}>
          Right
        </Button>
        <Button size="small" variant="outlined" color="warning" onClick={() => setDialogOpen(true)}>
          Missed something
        </Button>
      </Stack>
      <FeedbackDialog
        open={dialogOpen}
        title={feedbackTitle}
        onClose={() => setDialogOpen(false)}
        onSubmit={(text) => {
          onFeedback(cardKey, text);
          setNoted(true);
        }}
      />
    </>
  );
}

export default function ReasoningPanel({
  result,
  onFeedback,
  readOnly,
  onEditBrief,
}: ReasoningPanelProps) {
  const [acceptedInferred, setAcceptedInferred] = useState(false);

  const intention = result.inferredIntention;

  return (
    <Box>
      <ReasoningAccordionCard
        title="Emotional truth"
        icon={<FavoriteIcon sx={{ fontSize: 16, color: COLORS.primary }} />}
        defaultExpanded
      >
        <Typography sx={{ fontSize: "13px", color: DRAFT_B.inkSoft, lineHeight: 1.6 }}>
          {result.emotionalTruth}
        </Typography>
        <FeedbackRow
          cardKey="emotionalTruth"
          feedbackTitle="Emotional truth — what did it miss?"
          readOnly={readOnly}
          onFeedback={onFeedback}
        />
      </ReasoningAccordionCard>

      <ReasoningAccordionCard
        title="Narrative blueprint"
        icon={<ExploreIcon sx={{ fontSize: 16, color: COLORS.primary }} />}
      >
        <Box component="ol" sx={{ pl: 2, m: 0, fontSize: "12.5px", lineHeight: 1.5 }}>
          {result.blueprint.map((point) => (
            <li key={point.index}>
              <Typography component="span" sx={{ fontSize: "12.5px" }}>
                {point.text}
              </Typography>
            </li>
          ))}
        </Box>
        <Box sx={{ background: DRAFT_B.cream, borderRadius: "6px", p: "10px", mt: 1 }}>
          <Typography sx={{ fontSize: "12px", mb: 0.5 }}>
            <strong>Coping placement:</strong> {result.copingToolPlacement}
          </Typography>
          <Typography sx={{ fontSize: "12px" }}>
            <strong>Approach:</strong> {result.approachInstruction}
          </Typography>
        </Box>
        <FeedbackRow
          cardKey="blueprint"
          feedbackTitle="Narrative blueprint — what did it miss?"
          readOnly={readOnly}
          onFeedback={onFeedback}
        />
      </ReasoningAccordionCard>

      {result.compressionMetadata && (
        <ReasoningAccordionCard
          title="Compression"
          icon={<LayersIcon sx={{ fontSize: 16, color: COLORS.warning }} />}
          accentLeft={COLORS.warning}
        >
          <Typography sx={{ fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", color: COLORS.success, mb: 0.5 }}>
            Fully included
          </Typography>
          <Box component="ul" sx={{ pl: 2, mb: 1.5, mt: 0 }}>
            {result.compressionMetadata.fullyIncluded.map((item, i) => (
              <li key={i}>
                <Typography sx={{ fontSize: "12px" }}>{item}</Typography>
              </li>
            ))}
          </Box>

          <Typography sx={{ fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", color: COLORS.warning, mb: 0.5 }}>
            Compressed
          </Typography>
          <Box component="ul" sx={{ pl: 2, mb: 1.5, mt: 0 }}>
            {result.compressionMetadata.compressed.map((item, i) => (
              <li key={i}>
                <Typography sx={{ fontSize: "12px" }}>
                  {item.obligation} — {item.how}
                </Typography>
              </li>
            ))}
          </Box>

          <Typography sx={{ fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", color: COLORS.error, mb: 0.5 }}>
            Omitted
          </Typography>
          <Box component="ul" sx={{ pl: 2, m: 0 }}>
            {result.compressionMetadata.omitted.map((item, i) => (
              <li key={i}>
                <Typography sx={{ fontSize: "12px" }}>
                  {item.obligation} — {item.why}
                </Typography>
              </li>
            ))}
          </Box>
        </ReasoningAccordionCard>
      )}

      {intention && (
        <ReasoningAccordionCard title="Inferred intention" icon={<ExploreIcon sx={{ fontSize: 16, color: COLORS.primary }} />}>
          <Typography sx={{ fontSize: "12.5px", mb: 0.5 }}>
            <strong>Feel:</strong> {intention.feel}
          </Typography>
          <Typography sx={{ fontSize: "12.5px", mb: 0.5 }}>
            <strong>Because:</strong> {intention.because}
          </Typography>
          <Typography sx={{ fontSize: "12.5px", mb: readOnly ? 0 : 1.5 }}>
            <strong>Reason:</strong> {intention.reason}
          </Typography>
          {!readOnly && (
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {acceptedInferred ? (
                <Chip icon={<CheckCircleIcon />} label="Accepted" color="success" size="small" />
              ) : (
                <>
                  <Button size="small" variant="outlined" color="success" onClick={() => setAcceptedInferred(true)}>
                    Use inferred
                  </Button>
                  <Button size="small" variant="outlined" color="warning" onClick={() => void onEditBrief()}>
                    Edit brief instead
                  </Button>
                </>
              )}
            </Stack>
          )}
        </ReasoningAccordionCard>
      )}

      {result.alignmentNote && (
        <Box
          sx={{
            background: DRAFT_B.primarySoft,
            borderRadius: "8px",
            p: "12px",
            mb: "14px",
          }}
        >
          <Typography sx={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: DRAFT_B.primaryDark, mb: 0.75 }}>
            Alignment note
          </Typography>
          <Typography sx={{ fontSize: "13px", color: DRAFT_B.inkSoft, fontStyle: "italic", lineHeight: 1.6 }}>
            {result.alignmentNote}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
