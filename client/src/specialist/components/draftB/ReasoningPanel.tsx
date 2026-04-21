import React, { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ExploreIcon from "@mui/icons-material/Explore";
import FavoriteIcon from "@mui/icons-material/Favorite";
import LayersIcon from "@mui/icons-material/Layers";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

import type { Agent1Result } from "../../../types/agent1Result";
import { COLORS } from "../../../theme";
import { FeedbackDialog } from "./shared";
import { DRAFT_B } from "./tokens";

const cardSx = {
  mb: "14px",
  p: "12px",
  borderRadius: "8px",
  border: `1px solid ${DRAFT_B.border}`,
  background: "white",
} as const;

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
    return (
      <Chip label="Feedback noted" size="small" sx={{ mt: 1 }} variant="outlined" />
    );
  }

  return (
    <>
      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
        <Button
          size="small"
          variant="outlined"
          color="success"
          onClick={() => setConfirmed(true)}
        >
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
      <Box sx={cardSx}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: "6px",
              bgcolor: DRAFT_B.primarySoft,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FavoriteIcon sx={{ fontSize: 16, color: COLORS.primary }} />
          </Box>
          <Typography sx={{ fontSize: "13px", fontWeight: 700 }}>Emotional truth</Typography>
        </Stack>
        <Typography sx={{ fontSize: "13px", color: DRAFT_B.inkSoft, lineHeight: 1.6, mt: 1 }}>
          {result.emotionalTruth}
        </Typography>
        <FeedbackRow
          cardKey="emotionalTruth"
          feedbackTitle="Emotional truth — what did it miss?"
          readOnly={readOnly}
          onFeedback={onFeedback}
        />
      </Box>

      <Box sx={cardSx}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: "6px",
              bgcolor: DRAFT_B.primarySoft,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ExploreIcon sx={{ fontSize: 16, color: COLORS.primary }} />
          </Box>
          <Typography sx={{ fontSize: "13px", fontWeight: 700 }}>Narrative blueprint</Typography>
        </Stack>
        <Box component="ol" sx={{ pl: 2, mt: 1, fontSize: "12.5px", lineHeight: 1.5 }}>
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
      </Box>

      {result.compressionMetadata && (
        <Box
          sx={{
            ...cardSx,
            borderLeft: `3px solid ${COLORS.warning}`,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <LayersIcon sx={{ fontSize: 20, color: COLORS.warning }} />
            <Typography sx={{ fontSize: "13px", fontWeight: 700 }}>Compression</Typography>
          </Stack>

          <Typography sx={{ fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", color: COLORS.success, mb: 0.5 }}>
            FULLY INCLUDED
          </Typography>
          <Box component="ul" sx={{ pl: 2, mb: 1.5 }}>
            {result.compressionMetadata.fullyIncluded.map((item, i) => (
              <li key={i}>
                <Typography sx={{ fontSize: "12px" }}>{item}</Typography>
              </li>
            ))}
          </Box>

          <Typography sx={{ fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", color: COLORS.warning, mb: 0.5 }}>
            COMPRESSED
          </Typography>
          <Box component="ul" sx={{ pl: 2, mb: 1.5 }}>
            {result.compressionMetadata.compressed.map((item, i) => (
              <li key={i}>
                <Typography sx={{ fontSize: "12px" }}>
                  {item.obligation} — {item.how}
                </Typography>
              </li>
            ))}
          </Box>

          <Typography sx={{ fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", color: COLORS.error, mb: 0.5 }}>
            OMITTED
          </Typography>
          <Box component="ul" sx={{ pl: 2 }}>
            {result.compressionMetadata.omitted.map((item, i) => (
              <li key={i}>
                <Typography sx={{ fontSize: "12px" }}>
                  {item.obligation} — {item.why}
                </Typography>
              </li>
            ))}
          </Box>
        </Box>
      )}

      {intention && (
        <Box sx={cardSx}>
          <Typography sx={{ fontSize: "13px", fontWeight: 700, mb: 1 }}>Inferred intention</Typography>
          <Typography sx={{ fontSize: "12.5px", mb: 0.5 }}>
            <strong>Feel:</strong> {intention.feel}
          </Typography>
          <Typography sx={{ fontSize: "12.5px", mb: 0.5 }}>
            <strong>Because:</strong> {intention.because}
          </Typography>
          <Typography sx={{ fontSize: "12.5px", mb: 1.5 }}>
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
        </Box>
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
          <Typography sx={{ fontSize: "13px", color: DRAFT_B.inkSoft, fontStyle: "italic", lineHeight: 1.6 }}>
            {result.alignmentNote}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
