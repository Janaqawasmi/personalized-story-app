import { useEffect, useState } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebase";
import type { ScenePlanArtefact } from "../../../types/illustration";
import { STORIES_COLLECTION } from "../../../types/story";

const SUB = "scenePlans";

interface Props {
  storyId: string;
  pageNumber: number;
  scenePlanVersion: number;
}

export default function PageCardScenePlan({
  storyId,
  pageNumber,
  scenePlanVersion,
}: Props) {
  const [sp, setSp] = useState<ScenePlanArtefact | null>(null);

  useEffect(() => {
    const ref = doc(db, STORIES_COLLECTION, storyId, SUB, `${pageNumber}-${scenePlanVersion}`);
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setSp(snap.data() as ScenePlanArtefact);
      }
    });
  }, [storyId, pageNumber, scenePlanVersion]);

  if (!sp) {
    return (
      <Typography variant="body2" color="text.secondary">
        Loading scene plan…
      </Typography>
    );
  }

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" fontWeight={700}>
        Scene plan
      </Typography>
      <Typography variant="subtitle1" fontWeight={600}>
        {sp.title}
      </Typography>
      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
        {sp.prose}
      </Typography>
      <Typography variant="body2">
        <strong>Emotional intent:</strong> {sp.emotionalIntent}
      </Typography>
      <Typography variant="body2">
        <strong>Key visible detail:</strong> {sp.keyVisibleDetail}
      </Typography>
      <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: "divider" }}>
        <AccordionSummary>
          <Typography variant="caption" color="text.secondary">
            Developer view
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1}>
            <Typography variant="caption" component="pre" sx={{ whiteSpace: "pre-wrap" }}>
              {JSON.stringify(sp.director, null, 2)}
            </Typography>
            {sp.structuredPrompt ? (
              <Typography variant="caption" component="pre" sx={{ whiteSpace: "pre-wrap" }}>
                {JSON.stringify(sp.structuredPrompt, null, 2)}
              </Typography>
            ) : (
              <Typography variant="caption" color="text.secondary">
                Structured prompt not generated yet.
              </Typography>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Stack>
  );
}
