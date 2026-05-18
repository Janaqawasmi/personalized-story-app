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
  /** Dark-shell layout for {@link TechnicalPanel}; omits outer “Developer” chrome. */
  embedded?: boolean;
}

export default function DeveloperPanel({
  storyId,
  pageNumber,
  scenePlanVersion,
  imageVersion,
  currentVisualBibleVersion,
  embedded = false,
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

  const img =
    imageVersion === null
      ? null
      : images.find((i) => i.pageNumber === pageNumber && i.version === imageVersion) ?? null;

  const fpsForPage = finalPrompts.filter((f) => f.pageNumber === pageNumber);
  const forCurrentScenePlan = fpsForPage
    .filter((f) => f.parentScenePlanVersion === scenePlanVersion)
    .slice()
    .sort((a, b) => b.version - a.version);
  const fpForCurrentImage =
    img?.parentFinalPromptId != null
      ? (finalPrompts.find((f) => f.id === img.parentFinalPromptId) ?? null)
      : null;
  const waitingForImagePrompt =
    img != null && Boolean(img.parentFinalPromptId) && fpForCurrentImage === null;
  const fp = fpForCurrentImage ?? (waitingForImagePrompt ? null : forCurrentScenePlan[0]) ?? null;
  const promptLinkedToCurrentImage =
    img != null && fp != null && fp.id === img.parentFinalPromptId;
  const isNaturalLanguageAssembly = fp?.promptOrder[0] === "style-lead";
  const recentPromptsForScenePlan = forCurrentScenePlan.slice(0, 5);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  const accSx = embedded
    ? {
        border: "1px solid rgba(255,255,255,0.12)",
        bgcolor: "rgba(255,255,255,0.04)",
        color: "#e9dfd2",
        "&:before": { display: "none" },
      }
    : { border: 1, borderColor: "divider" as const };

  const sumSx = embedded
    ? { color: "#e9dfd2", minHeight: 44, "& .MuiAccordionSummary-content": { my: 1 } }
    : undefined;

  const expandIc = <ExpandMoreIcon fontSize="small" sx={{ color: embedded ? "#e9dfd2" : undefined }} />;

  const capMutedSx = embedded ? { color: "rgba(233,223,210,0.65)" } : undefined;
  const bodyInkSx = embedded ? { color: "#e9dfd2" } : undefined;

  return (
    <Box
      sx={
        embedded
          ? { mt: 0, pt: 0, borderTop: "none" }
          : { mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }
      }
    >
      {!embedded ? (
        <Typography variant="overline" color="text.secondary" display="block" sx={{ mb: 1 }}>
          Developer
        </Typography>
      ) : null}
      <Stack spacing={1}>
        <Accordion disableGutters elevation={0} sx={accSx}>
          <AccordionSummary expandIcon={expandIc} sx={sumSx}>
            <Typography variant="subtitle2" sx={bodyInkSx}>
              Scene Plan
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {sp ? (
              <Stack spacing={1}>
                <Typography
                  variant="caption"
                  color={embedded ? undefined : "text.secondary"}
                  sx={capMutedSx}
                >
                  v{sp.version} · {sp.llmCall.model} · in {sp.llmCall.latencyMs}ms · tokens{" "}
                  {sp.llmCall.inputTokens}/{sp.llmCall.outputTokens} · scene VB v
                  {sp.visualBibleVersion} (current story VB v{currentVisualBibleVersion})
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", ...bodyInkSx }}>
                  {sp.prose}
                </Typography>
                <Accordion sx={embedded ? accSx : undefined}>
                  <AccordionSummary expandIcon={expandIc} sx={sumSx}>
                    <Typography variant="subtitle2" sx={bodyInkSx}>
                      Raw LLM prompt / response
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="caption" component="pre" sx={{ whiteSpace: "pre-wrap", ...capMutedSx }}>
                      {sp.llmCall.prompt}
                    </Typography>
                    <Typography variant="caption" component="pre" sx={{ whiteSpace: "pre-wrap", mt: 1, ...capMutedSx }}>
                      {sp.llmCall.response}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              </Stack>
            ) : (
              <Typography variant="body2" color={embedded ? undefined : "text.secondary"} sx={bodyInkSx}>
                No scene plan loaded.
              </Typography>
            )}
          </AccordionDetails>
        </Accordion>

        <Accordion disableGutters elevation={0} sx={accSx}>
          <AccordionSummary expandIcon={expandIc} sx={sumSx}>
            <Typography variant="subtitle2" sx={bodyInkSx}>
              Structured Prompt
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {sp?.structuredPrompt ? (
              <Stack spacing={1}>
                <Typography
                  variant="caption"
                  color={embedded ? undefined : "text.secondary"}
                  sx={capMutedSx}
                >
                  Stage 2 · {sp.stage2LLMCall?.model ?? "—"} · {sp.stage2LLMCall?.latencyMs ?? "—"}ms
                </Typography>
                {(["setting", "character", "focalPoint", "composition", "lighting"] as const).map(
                  (k) => (
                    <Box key={k}>
                      <Typography variant="caption" fontWeight={600} sx={capMutedSx}>
                        {k}
                      </Typography>
                      <Typography variant="body2" sx={bodyInkSx}>
                        {sp.structuredPrompt![k]}
                      </Typography>
                    </Box>
                  ),
                )}
                {sp.stage2LLMCall ? (
                  <Accordion sx={embedded ? accSx : undefined}>
                    <AccordionSummary expandIcon={expandIc} sx={sumSx}>
                      <Typography variant="subtitle2" sx={bodyInkSx}>
                        Raw Stage 2 prompt
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="caption" component="pre" sx={{ whiteSpace: "pre-wrap", ...capMutedSx }}>
                        {sp.stage2LLMCall.prompt}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                ) : null}
              </Stack>
            ) : (
              <Typography variant="body2" color={embedded ? undefined : "text.secondary"} sx={bodyInkSx}>
                Not written yet. The structured prompt is created when you click Generate and Stage 2
                (prompt engineer) finishes successfully.
              </Typography>
            )}
          </AccordionDetails>
        </Accordion>

        <Accordion disableGutters elevation={0} sx={accSx}>
          <AccordionSummary expandIcon={expandIc} sx={sumSx}>
            <Typography variant="subtitle2" sx={bodyInkSx}>
              Final Image-Model Prompt
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {waitingForImagePrompt ? (
              <Typography variant="body2" sx={bodyInkSx}>
                Loading final prompt for current image (image v{img?.version})… If this stays, check
                Firestore finalPrompts for parent id {img?.parentFinalPromptId}.
              </Typography>
            ) : fp ? (
              <Stack spacing={1}>
                <Typography
                  variant="caption"
                  color={embedded ? undefined : "text.secondary"}
                  sx={capMutedSx}
                >
                  v{fp.version} · {fp.charCount} chars · order: {fp.promptOrder.join(" → ")}
                  {isNaturalLanguageAssembly ? " · natural-language assembly" : " · legacy assembly"}
                  {promptLinkedToCurrentImage
                    ? " · sent with current image"
                    : img
                      ? " · not linked to current image (may be an older prompt)"
                      : ""}
                </Typography>
                <Stack direction="row" gap={1}>
                  <Button
                    size="small"
                    startIcon={<ContentCopyIcon />}
                    onClick={() => copy(fp.finalPromptString)}
                    sx={embedded ? { color: "#e9dfd2", borderColor: "rgba(255,255,255,0.35)" } : undefined}
                    variant={embedded ? "outlined" : "text"}
                  >
                    Copy
                  </Button>
                </Stack>
                <Typography variant="caption" component="pre" sx={{ whiteSpace: "pre-wrap", ...capMutedSx }}>
                  {fp.finalPromptString}
                </Typography>
                {recentPromptsForScenePlan.length > 1 ? (
                  <Stack spacing={0.5} sx={{ pt: 1, borderTop: "1px solid rgba(255,255,255,0.12)" }}>
                    <Typography variant="caption" sx={{ ...capMutedSx, fontWeight: 700 }}>
                      Recent prompts (scene plan v{scenePlanVersion})
                    </Typography>
                    {recentPromptsForScenePlan.map((row) => (
                      <Typography key={row.id} variant="caption" sx={capMutedSx}>
                        v{row.version}
                        {row.id === img?.parentFinalPromptId ? " ← current image" : ""}
                        {row.promptOrder[0] === "style-lead" ? " · NL" : " · legacy"} ·{" "}
                        {new Date(row.createdAt).toLocaleString()}
                      </Typography>
                    ))}
                  </Stack>
                ) : null}
              </Stack>
            ) : (
              <Typography variant="body2" color={embedded ? undefined : "text.secondary"} sx={bodyInkSx}>
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

        <Accordion disableGutters elevation={0} sx={accSx}>
          <AccordionSummary expandIcon={expandIc} sx={sumSx}>
            <Typography variant="subtitle2" sx={bodyInkSx}>
              Image
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {img ? (
              <Stack spacing={0.5}>
                <Typography
                  variant="caption"
                  color={embedded ? undefined : "text.secondary"}
                  sx={capMutedSx}
                >
                  {img.providerId} · {img.modelId} · {img.latencyMs}ms · {img.mimeType} · {img.bytes}{" "}
                  bytes
                </Typography>
                <Typography variant="caption" component="div" sx={bodyInkSx}>
                  review: {img.reviewStatus}
                </Typography>
                <Typography variant="caption" component="div" sx={{ fontWeight: 600, ...bodyInkSx }}>
                  Safety checks:{" "}
                  {(img.safetyFlags?.length ?? 0) === 0 ? "No flags raised" : img.safetyFlags!.join(", ")}
                </Typography>
                <Typography variant="caption" component="pre" sx={{ whiteSpace: "pre-wrap", ...capMutedSx }}>
                  {img.storagePath}
                </Typography>
              </Stack>
            ) : (
              <Typography variant="body2" color={embedded ? undefined : "text.secondary"} sx={bodyInkSx}>
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
