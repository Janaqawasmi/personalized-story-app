import { useEffect, useState } from "react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebase";
import type { VisualBibleArtefact } from "../../../types/illustration";
import { STORIES_COLLECTION } from "../../../types/story";

const SUB = "visualBibles";

interface Props {
  storyId: string;
  version: number;
}

export default function VisualBibleCard({ storyId, version }: Props) {
  const [vb, setVb] = useState<VisualBibleArtefact | null>(null);

  useEffect(() => {
    const ref = doc(db, STORIES_COLLECTION, storyId, SUB, String(version));
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setVb(snap.data() as VisualBibleArtefact);
      }
    });
  }, [storyId, version]);

  if (!vb) {
    return (
      <Typography variant="body2" color="text.secondary">
        Loading Visual Bible…
      </Typography>
    );
  }

  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle1" fontWeight={700}>
          Visual Bible
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1.5}>
          <Typography variant="subtitle2" color="primary">
            Character anchor
          </Typography>
          <Typography variant="body2">{vb.characterAnchor}</Typography>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2">Character sheet</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                {vb.characterSheet}
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2">Style guide</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2">{vb.styleGuide}</Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2">Palette</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2">{vb.palette}</Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2">Consistency anchors</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack component="ul" sx={{ m: 0, pl: 2 }}>
                {vb.consistencyAnchors.map((a) => (
                  <Typography key={a} component="li" variant="body2">
                    {a}
                  </Typography>
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2">Environment registry</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={1}>
                {Object.entries(vb.environmentRegistry).map(([k, v]) => (
                  <Stack key={k} spacing={0.5}>
                    <Typography variant="caption" fontWeight={600}>
                      {k}
                    </Typography>
                    <Typography variant="body2">{v.atmosphere}</Typography>
                    <Typography variant="body2">{v.spatialLayout}</Typography>
                  </Stack>
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2">Avoid list</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack component="ul" sx={{ m: 0, pl: 2 }}>
                {vb.avoidList.map((a) => (
                  <Typography key={a} component="li" variant="body2">
                    {a}
                  </Typography>
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
