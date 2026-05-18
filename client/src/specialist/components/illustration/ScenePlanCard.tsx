import { useEffect, useState } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
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
  manuscriptText: string;
}

export default function ScenePlanCard({
  storyId,
  pageNumber,
  scenePlanVersion,
  manuscriptText,
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

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1}>
          <Typography variant="overline">
            Page {pageNumber}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
            {manuscriptText}
          </Typography>
          {!sp ? (
            <Typography variant="body2" color="text.secondary">
              Loading scene plan…
            </Typography>
          ) : (
            <>
              <Typography variant="subtitle1" fontWeight={700}>
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
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
