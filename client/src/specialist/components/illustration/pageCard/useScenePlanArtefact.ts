import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../../../firebase";
import type { ScenePlanArtefact } from "../../../../types/illustration";
import { STORIES_COLLECTION } from "../../../../types/story";

const SUB = "scenePlans";

export function useScenePlanArtefact(
  storyId: string,
  pageNumber: number,
  scenePlanVersion: number | null,
): ScenePlanArtefact | null {
  const [sp, setSp] = useState<ScenePlanArtefact | null>(null);

  useEffect(() => {
    if (scenePlanVersion === null) {
      setSp(null);
      return undefined;
    }
    const ref = doc(
      db,
      STORIES_COLLECTION,
      storyId,
      SUB,
      `${pageNumber}-${scenePlanVersion}`,
    );
    return onSnapshot(ref, (snap) => {
      setSp(snap.exists() ? (snap.data() as ScenePlanArtefact) : null);
    });
  }, [storyId, pageNumber, scenePlanVersion]);

  return sp;
}
