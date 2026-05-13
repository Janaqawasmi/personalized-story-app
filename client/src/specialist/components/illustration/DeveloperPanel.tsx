import { useEffect, useState } from "react";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebase";
import type { FinalPromptArtefact, ImageArtefact, ScenePlanArtefact } from "../../../types/illustration";
import { STORIES_COLLECTION } from "../../../types/story";

interface Props {
  storyId: string;
  pageNumber: number;
  scenePlanVersion: number;
  imageVersion: number | null;
  currentVisualBibleVersion: number;
}

export default function DeveloperPanel({
  storyId,
  pageNumber,
  scenePlanVersion,
  imageVersion,
  currentVisualBibleVersion,
}: Props) {
  const [sp, setSp] = useState<ScenePlanArtefact | null>(null);
  const [finalPrompts, setFinalPrompts] = useState<FinalPromptArtefact[]>([]);
  const [images, setImages] = useState<ImageArtefact[]>([]);

  useEffect(() => {
    const ref = doc(
      db,
      STORIES_COLLECTION,
      storyId,
      "scenePlans",
      `${pageNumber}-${scenePlanVersion}`,
    );
    return onSnapshot(ref, (snap) => {
      setSp(snap.exists() ? (snap.data() as ScenePlanArtefact) : null);
    });
  }, [storyId, pageNumber, scenePlanVersion]);

  useEffect(() => {
    const col = collection(db, STORIES_COLLECTION, storyId, "finalPrompts");
    return onSnapshot(col, (snap) => {
      const list: FinalPromptArtefact[] = [];
      snap.forEach((d) => {
        list.push(d.data() as FinalPromptArtefact);
      });
      setFinalPrompts(list);
    });
  }, [storyId]);

  useEffect(() => {
    const col = collection(db, STORIES_COLLECTION, storyId, "images");
    return onSnapshot(col, (snap) => {
      const list: ImageArtefact[] = [];
      snap.forEach((d) => {
        list.push(d.data() as ImageArtefact);
      });
      setImages(list);
    });
  }, [storyId]);

  const fpsForPage = finalPrompts.filter((f) => f.pageNumber === pageNumber);
  const forCurrentScenePlan = fpsForPage
    .filter((f) => f.parentScenePlanVersion === scenePlanVersion)
    .slice()
    .sort((a, b) => b.version - a.version);
  const fp = forCurrentScenePlan[0] ?? null;

  const img =
    imageVersion === null
      ? null
      : images.find((i) => i.pageNumber === pageNumber && i.version === imageVersion) ?? null;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  return (
    <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}>
      <Typography variant="overline" color="text.secondary" display="block" sx={{ mb: 1 }}>
        Developer
      </Typography>
      <Stack spacing={1}>
        <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: "divider" }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon fontSize="small" />}>
            <Typography variant="subtitle2">Scene Plan</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {sp ? (
              <Stack spacing={1}>
                <Typography variant="caption" color="text.secondary">
                  v{sp.version} · {sp.llmCall.model} · in {sp.llmCall.latencyMs}ms · tokens{" "}
                  {sp.llmCall.inputTokens}/{sp.llmCall.outputTokens} · scene VB v
                  {sp.visualBibleVersion} (current story VB v{currentVisualBibleVersion})
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {sp.prose}
                </Typography>
                <Accordion>
                  <AccordionSummary>Raw LLM prompt / response</AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="caption" component="pre" sx={{ whiteSpace: "pre-wrap" }}>
                      {sp.llmCall.prompt}
                    </Typography>
                    <Typography variant="caption" component="pre" sx={{ whiteSpace: "pre-wrap", mt: 1 }}>
                      {sp.llmCall.response}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No scene plan loaded.
              </Typography>
            )}
          </AccordionDetails>
        </Accordion>

        <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: "divider" }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon fontSize="small" />}>
            <Typography variant="subtitle2">Structured Prompt</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {sp?.structuredPrompt ? (
              <Stack spacing={1}>
                <Typography variant="caption" color="text.secondary">
                  Stage 2 · {sp.stage2LLMCall?.model ?? "—"} · {sp.stage2LLMCall?.latencyMs ?? "—"}ms
                </Typography>
                {(["setting", "character", "focalPoint", "composition", "lighting"] as const).map(
                  (k) => (
                    <Box key={k}>
                      <Typography variant="caption" fontWeight={600}>
                        {k}
                      </Typography>
                      <Typography variant="body2">{sp.structuredPrompt![k]}</Typography>
                    </Box>
                  ),
                )}
                {sp.stage2LLMCall ? (
                  <Accordion>
                    <AccordionSummary>Raw Stage 2 prompt</AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="caption" component="pre" sx={{ whiteSpace: "pre-wrap" }}>
                        {sp.stage2LLMCall.prompt}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                ) : null}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Not written yet. The structured prompt is created when you click Generate and Stage 2
                (prompt engineer) finishes successfully.
              </Typography>
            )}
          </AccordionDetails>
        </Accordion>

        <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: "divider" }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon fontSize="small" />}>
            <Typography variant="subtitle2">Final Image-Model Prompt</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {fp ? (
              <Stack spacing={1}>
                <Typography variant="caption" color="text.secondary">
                  v{fp.version} · {fp.charCount} chars · order: {fp.promptOrder.join(" → ")}
                </Typography>
                <Stack direction="row" gap={1}>
                  <Button size="small" startIcon={<ContentCopyIcon />} onClick={() => copy(fp.finalPromptString)}>
                    Copy
                  </Button>
                </Stack>
                <Typography variant="caption" component="pre" sx={{ whiteSpace: "pre-wrap" }}>
                  {fp.finalPromptString}
                </Typography>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {fpsForPage.length > 0 ? (
                  <>
                    No final prompt for scene plan v{scenePlanVersion} yet (older prompts may exist
                    for other scene plan versions). Appears after a successful Generate (Stage 3).
                  </>
                ) : (
                  <>No final prompt for this page yet. Appears after a successful Generate (Stage 3).</>
                )}
              </Typography>
            )}
          </AccordionDetails>
        </Accordion>

        <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: "divider" }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon fontSize="small" />}>
            <Typography variant="subtitle2">Image</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {img ? (
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary">
                  {img.providerId} · {img.modelId} · {img.latencyMs}ms · {img.mimeType} · {img.bytes}{" "}
                  bytes
                </Typography>
                <Typography variant="caption" component="div">
                  review: {img.reviewStatus}
                </Typography>
                <Typography variant="caption" component="div" sx={{ fontWeight: 600 }}>
                  Safety checks:{" "}
                  {(img.safetyFlags?.length ?? 0) === 0 ? "No flags raised" : img.safetyFlags!.join(", ")}
                </Typography>
                <Typography variant="caption" component="pre" sx={{ whiteSpace: "pre-wrap" }}>
                  {img.storagePath}
                </Typography>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {imageVersion === null
                  ? "No image on this page yet — click Generate to run the image step (Stage 4)."
                  : `No image document for page ${pageNumber} image v${imageVersion} (still generating, failed, or not written).`}
              </Typography>
            )}
          </AccordionDetails>
        </Accordion>
      </Stack>
    </Box>
  );
}
