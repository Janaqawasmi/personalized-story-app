import { useState } from "react";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { keyframes, useTheme } from "@mui/material/styles";
import type { PageCardViewModel } from "../../../hooks/useIllustrationWorkspaceState";
import type { SpecialistDeskUi } from "../../../../i18n/specialistDeskUi.types";
import { COLORS } from "../../../../theme";
import { DRAFT_B, FONTS } from "../../draftB/tokens";
import CancelJobButton from "../CancelJobButton";
import { ChipTone } from "../shared/ChipTone";

const illShimmer = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`;

type Desk = Pick<
  SpecialistDeskUi,
  | "illNoImageHead"
  | "illNoImageHint"
  | "illDrawingPage"
  | "illUnderThirty"
  | "illNewVersionLabel"
  | "illActGenerate"
  | "illActDrawing"
  | "illActApprove"
  | "illActReject"
  | "illStatusApproved"
  | "illActRegen"
  | "illActRegenerateImage"
  | "illRejectIllustrationTitle"
  | "illRejectFeedbackLabel"
  | "headerCancel"
>;

interface Props {
  storyId: string;
  page: PageCardViewModel;
  readOnly: boolean;
  desk: Desk;
  onGenerate: () => void | Promise<void>;
  onApprove: () => void | Promise<void>;
  onReject: (feedbackNote: string) => void | Promise<void>;
  onRegenerateImage: () => void | Promise<void>;
}

function canRegenerateImage(subStatus: PageCardViewModel["subStatus"]): boolean {
  return subStatus === "awaiting_review" || subStatus === "approved" || subStatus === "needs_revision";
}

function ImageMetaStrip({ page }: { page: PageCardViewModel }) {
  const iv = page.imageVersion;
  const total = page.versionCount.images;
  if (iv === null) return null;
  const label = total > 1 ? `v${iv} of ${total}` : `v${iv}`;
  return (
    <Typography
      variant="caption"
      sx={{
        display: "block",
        fontFamily: FONTS.mono,
        color: DRAFT_B.inkMuted,
        mt: 1,
      }}
    >
      {label}
    </Typography>
  );
}

export default function ImageRegion({
  storyId,
  page,
  readOnly: _readOnly,
  desk,
  onGenerate: _onGenerate,
  onApprove: _onApprove,
  onReject: _onReject,
}: Props) {
  const theme = useTheme();
  const rtl = theme.direction === "rtl";

  if (page.subStatus === "plan_only") {
    return (
      <Stack spacing={1.5} alignItems="center" justifyContent="center" sx={{ minHeight: 220, py: 2 }}>
        <Box
          sx={{
            width: "100%",
            maxWidth: 280,
            aspectRatio: "1",
            borderRadius: 2,
            background: `repeating-linear-gradient(
              135deg,
              ${DRAFT_B.borderSoft},
              ${DRAFT_B.borderSoft} 8px,
              ${DRAFT_B.cream} 8px,
              ${DRAFT_B.cream} 16px
            )`,
            border: `1px solid ${DRAFT_B.borderSoft}`,
          }}
        />
        <Typography sx={{ fontWeight: 700, color: DRAFT_B.ink, fontFamily: FONTS.sans }}>
          {desk.illNoImageHead}
        </Typography>
        <Typography variant="body2" sx={{ color: DRAFT_B.inkMuted, textAlign: "center", px: 1 }}>
          {desk.illNoImageHint}
        </Typography>
      </Stack>
    );
  }

  if (page.subStatus === "generating_image") {
    const primarySoft = String(COLORS.primarySoft).trim();
    return (
      <Stack spacing={1.5} sx={{ minHeight: 220 }}>
        <Box
          sx={{
            position: "relative",
            width: "100%",
            maxWidth: 280,
            mx: "auto",
            aspectRatio: "1",
            borderRadius: 2,
            overflow: "hidden",
            border: `1px solid ${DRAFT_B.borderSoft}`,
            background: `linear-gradient(145deg, ${primarySoft}, ${COLORS.surface})`,
          }}
        >
          {page.imageUrl ? (
            <Box
              component="img"
              src={page.imageUrl}
              alt=""
              sx={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: 0.35,
              }}
            />
          ) : null}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              overflow: "hidden",
              "&::after": {
                content: '""',
                position: "absolute",
                insetBlock: 0,
                width: "55%",
                background:
                  "linear-gradient(110deg, transparent, rgba(255,255,255,.45), transparent)",
                animation: `${illShimmer} 1.6s linear infinite`,
                transform: rtl ? "translateX(100%)" : "translateX(-100%)",
              },
            }}
          />
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{ position: "absolute", inset: 0, gap: 1, px: 1 }}
          >
            <CircularProgress size={40} thickness={4} sx={{ color: COLORS.primary }} />
            <Typography
              sx={{
                fontWeight: 700,
                color: DRAFT_B.ink,
                textAlign: "center",
                fontFamily: FONTS.sans,
                fontSize: 15,
              }}
            >
              {desk.illDrawingPage(page.pageNumber)}
            </Typography>
            <Typography variant="caption" sx={{ fontFamily: FONTS.mono, color: DRAFT_B.inkMuted }}>
              {desk.illUnderThirty}
            </Typography>
          </Stack>
        </Box>
        {page.pendingJobId ? (
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <CancelJobButton storyId={storyId} jobId={page.pendingJobId} />
          </Box>
        ) : null}
      </Stack>
    );
  }

  if (page.subStatus === "awaiting_review" && page.imageUrl) {
    return (
      <Stack spacing={1} sx={{ maxWidth: 280, mx: "auto" }}>
        <Box
          component="img"
          src={page.imageUrl}
          alt=""
          sx={{
            width: "100%",
            aspectRatio: "1",
            objectFit: "cover",
            borderRadius: 2,
            border: `1px solid ${DRAFT_B.borderSoft}`,
            display: "block",
          }}
        />
        <ImageMetaStrip page={page} />
      </Stack>
    );
  }

  if (page.subStatus === "approved" && page.imageUrl) {
    return (
      <Stack spacing={1} sx={{ maxWidth: 280, mx: "auto" }}>
        <Box
          component="img"
          src={page.imageUrl}
          alt=""
          sx={{
            width: "100%",
            aspectRatio: "1",
            objectFit: "cover",
            borderRadius: 2,
            border: `1px solid ${DRAFT_B.borderSoft}`,
            display: "block",
          }}
        />
        <ImageMetaStrip page={page} />
      </Stack>
    );
  }

  if (page.subStatus === "needs_revision") {
    return (
      <Stack spacing={1.5} alignItems="center" sx={{ minHeight: 220 }}>
        <Box
          sx={{
            position: "relative",
            width: "100%",
            maxWidth: 280,
            mx: "auto",
            aspectRatio: "1",
            borderRadius: 2,
            border: `1px solid ${DRAFT_B.borderSoft}`,
            overflow: "hidden",
            bgcolor: DRAFT_B.cream,
          }}
        >
          {page.imageUrl ? (
            <Box
              component="img"
              src={page.imageUrl}
              alt=""
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: 0.55,
                display: "block",
              }}
            />
          ) : null}
          <Stack
            alignItems="center"
            justifyContent="center"
            spacing={1}
            sx={{
              position: "absolute",
              inset: 0,
              bgcolor: page.imageUrl ? "rgba(255,255,255,.35)" : "transparent",
            }}
          >
            <CircularProgress size={28} sx={{ color: COLORS.primary }} />
            <Typography
              variant="body2"
              sx={{ color: DRAFT_B.ink, fontWeight: 600, px: 1, textAlign: "center" }}
            >
              {desk.illNewVersionLabel}
            </Typography>
          </Stack>
        </Box>
      </Stack>
    );
  }

  return (
    <Stack spacing={1} alignItems="center" sx={{ minHeight: 160, py: 1 }}>
      <Typography variant="body2" sx={{ color: DRAFT_B.inkMuted }}>
        {desk.illNoImageHead}
      </Typography>
    </Stack>
  );
}

export function PageImageFooterActions(props: Props) {
  const { page, readOnly, desk, onGenerate, onApprove, onReject, onRegenerateImage } = props;
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [busy, setBusy] = useState(false);
  const disabled = readOnly || busy;
  const showRegenerateImage =
    !readOnly && page.imageUrl && canRegenerateImage(page.subStatus) && page.subStatus !== "generating_image";

  const regenerateImageButton = showRegenerateImage ? (
    <Button
      variant="outlined"
      disabled={disabled}
      onClick={async () => {
        setBusy(true);
        try {
          await Promise.resolve(onRegenerateImage());
        } finally {
          setBusy(false);
        }
      }}
      sx={{ textTransform: "none", fontWeight: 600, borderColor: DRAFT_B.border }}
    >
      {desk.illActRegenerateImage}
    </Button>
  ) : null;

  const rejectDialog = (
    <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>{desk.illRejectIllustrationTitle}</DialogTitle>
      <DialogContent>
        <TextField
          margin="dense"
          label={desk.illRejectFeedbackLabel}
          fullWidth
          multiline
          minRows={2}
          value={rejectNote}
          onChange={(e) => setRejectNote(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setRejectOpen(false)}>{desk.headerCancel}</Button>
        <Button
          color="warning"
          variant="contained"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onReject(rejectNote.trim());
              setRejectOpen(false);
              setRejectNote("");
            } finally {
              setBusy(false);
            }
          }}
        >
          {desk.illActReject}
        </Button>
      </DialogActions>
    </Dialog>
  );

  if (page.subStatus === "plan_only" && !readOnly) {
    return (
      <>
        <Button
          variant="contained"
          disabled={disabled}
          startIcon={<AutoAwesomeIcon />}
          onClick={async () => {
            setBusy(true);
            try {
              await Promise.resolve(onGenerate());
            } finally {
              setBusy(false);
            }
          }}
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          {desk.illActGenerate}
        </Button>
      </>
    );
  }

  if (page.subStatus === "generating_image") {
    return (
      <Button variant="outlined" disabled sx={{ textTransform: "none", fontWeight: 600 }}>
        {desk.illActDrawing}
      </Button>
    );
  }

  if (page.subStatus === "awaiting_review" && page.imageUrl && !readOnly) {
    return (
      <>
        <Stack direction="row" flexWrap="wrap" gap={1}>
          <Button
            variant="contained"
            color="success"
            disabled={disabled}
            onClick={async () => {
              setBusy(true);
              try {
                await onApprove();
              } finally {
                setBusy(false);
              }
            }}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            {desk.illActApprove}
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            disabled={disabled}
            onClick={() => setRejectOpen(true)}
            sx={{ textTransform: "none", fontWeight: 600, borderColor: DRAFT_B.border }}
          >
            {desk.illActReject}
          </Button>
          {regenerateImageButton}
        </Stack>
        {rejectDialog}
      </>
    );
  }

  if (page.subStatus === "approved" && page.imageUrl) {
    return (
      <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
        <ChipTone tone="success" chipSize="md" label={desk.illStatusApproved} />
        {regenerateImageButton}
      </Stack>
    );
  }

  if (page.subStatus === "needs_revision") {
    return (
      <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
        <Button variant="outlined" disabled sx={{ textTransform: "none", fontWeight: 600 }}>
          {desk.illActRegen}
        </Button>
        {regenerateImageButton}
      </Stack>
    );
  }

  return null;
}
