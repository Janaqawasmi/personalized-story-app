import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { fetchPageIllustrationHistory } from "../../../api/illustrationApi";
import type { ImageArtefact, ScenePlanArtefact } from "../../../types/illustration";

function findScenePlanForImage(
  scenePlans: ScenePlanArtefact[],
  imageVersion: number,
): ScenePlanArtefact | undefined {
  return scenePlans.find((sp) => sp.version === imageVersion);
}

interface Props {
  open: boolean;
  onClose: () => void;
  storyId: string;
  pageNumber: number;
  currentImageVersion: number;
  currentScenePlanVersion: number;
  compareImageVersion: number;
}

export default function PageCardComparisonModal({
  open,
  onClose,
  storyId,
  pageNumber,
  currentImageVersion,
  currentScenePlanVersion,
  compareImageVersion,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<{
    currentImage: ImageArtefact | null;
    compareImage: ImageArtefact | null;
    currentSp: ScenePlanArtefact | undefined;
    compareSp: ScenePlanArtefact | undefined;
  } | null>(null);

  useEffect(() => {
    if (!open) {
      setData(null);
      setErr(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const { scenePlans, images } = await fetchPageIllustrationHistory(storyId, pageNumber);
        if (cancelled) return;
        const currentImage =
          images.find((i) => i.version === currentImageVersion) ?? null;
        const compareImage =
          images.find((i) => i.version === compareImageVersion) ?? null;
        setData({
          currentImage,
          compareImage,
          currentSp: findScenePlanForImage(scenePlans, currentScenePlanVersion),
          compareSp: findScenePlanForImage(scenePlans, compareImageVersion),
        });
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    open,
    storyId,
    pageNumber,
    currentImageVersion,
    currentScenePlanVersion,
    compareImageVersion,
  ]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Compare versions (read-only)</DialogTitle>
      <DialogContent>
        {loading ? (
          <Stack alignItems="center" py={4}>
            <CircularProgress size={32} />
          </Stack>
        ) : err ? (
          <Typography color="error">{err}</Typography>
        ) : data ? (
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ pt: 1 }}>
            <Stack spacing={1} flex={1}>
              <Typography variant="subtitle2" fontWeight={700}>
                Version {compareImageVersion} (historical)
              </Typography>
              {data.compareImage ? (
                <Box
                  component="img"
                  src={data.compareImage.publicUrl}
                  alt=""
                  sx={{ maxWidth: "100%", borderRadius: 1, border: 1, borderColor: "divider" }}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Image not found.
                </Typography>
              )}
              {data.compareImage?.rejectionNote ? (
                <Typography variant="caption" color="text.secondary">
                  Rejection note: {data.compareImage.rejectionNote}
                </Typography>
              ) : null}
              {data.compareSp ? (
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  <strong>{data.compareSp.title}</strong>
                  {"\n"}
                  {data.compareSp.prose}
                </Typography>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  No scene plan with matching version in history.
                </Typography>
              )}
            </Stack>
            <Stack spacing={1} flex={1}>
              <Typography variant="subtitle2" fontWeight={700}>
                Current (v{currentImageVersion})
              </Typography>
              {data.currentImage ? (
                <Box
                  component="img"
                  src={data.currentImage.publicUrl}
                  alt=""
                  sx={{ maxWidth: "100%", borderRadius: 1, border: 1, borderColor: "divider" }}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No current image.
                </Typography>
              )}
              {data.currentSp ? (
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  <strong>{data.currentSp.title}</strong>
                  {"\n"}
                  {data.currentSp.prose}
                </Typography>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Scene plan unavailable.
                </Typography>
              )}
            </Stack>
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
