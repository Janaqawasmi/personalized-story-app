import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { IllustrationPage } from "../../../types/illustration";
import ScenePlanCard from "./ScenePlanCard";
import VisualBibleCard from "./VisualBibleCard";

interface Props {
  storyId: string;
  visualBibleVersion: number;
  pages: IllustrationPage[];
  manuscriptByPage: Map<number, string>;
}

export default function WorkspacePreview({
  storyId,
  visualBibleVersion,
  pages,
  manuscriptByPage,
}: Props) {
  return (
    <Stack spacing={3}>
      <VisualBibleCard storyId={storyId} version={visualBibleVersion} />
      <Typography variant="subtitle1" fontWeight={700} sx={{ pt: 1 }}>
        Scene plans
      </Typography>
      {pages.map((p) => {
        const v = p.currentScenePlanVersion;
        if (v === null) return null;
        return (
          <ScenePlanCard
            key={p.pageNumber}
            storyId={storyId}
            pageNumber={p.pageNumber}
            scenePlanVersion={v}
            manuscriptText={manuscriptByPage.get(p.pageNumber) ?? p.text}
          />
        );
      })}
    </Stack>
  );
}