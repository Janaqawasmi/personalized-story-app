import { useState } from "react";
import Check from "@mui/icons-material/Check";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { PageCardViewModel } from "../../../hooks/useIllustrationWorkspaceState";
import { useSpecialistDeskUi } from "../../../../i18n/specialistDeskUi";
import { COLORS } from "../../../../theme";
import { DRAFT_B, FONTS } from "../../draftB/tokens";

interface Props {
  pages: PageCardViewModel[];
  readOnly: boolean;
  allApproved: boolean;
  canPreview: boolean;
  showMarkReady: boolean;
  showPublish: boolean;
  onPreviewClick: () => void;
  onPublishClick: () => void;
  onMarkReady: () => Promise<void>;
}

export default function PublishBar({
  pages,
  readOnly,
  allApproved,
  canPreview,
  showMarkReady,
  showPublish,
  onPreviewClick,
  onPublishClick,
  onMarkReady,
}: Props) {
  const desk = useSpecialistDeskUi();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [markBusy, setMarkBusy] = useState(false);
  const [markErr, setMarkErr] = useState<string | null>(null);

  const total = pages.length;
  const approvedCount = pages.filter((p) => p.subStatus === "approved").length;

  const markDisabled = readOnly || markBusy || !showMarkReady;
  const markAria = desk.illPubReady;

  const successSoft = String(COLORS.successSoft).trim();

  return (
    <Box
      sx={{
        position: "sticky",
        bottom: 0,
        zIndex: 2,
        mt: 2,
        borderRadius: "14px",
        backdropFilter: "blur(10px)",
        border: `1px solid ${allApproved ? COLORS.success : DRAFT_B.border}`,
        bgcolor: allApproved ? COLORS.surface : "rgba(255,255,255,0.88)",
        boxShadow: allApproved
          ? `0 0 0 4px ${successSoft}`
          : "0 -4px 18px -12px rgba(42,36,33,.12)",
        px: 2.5,
        py: 2,
      }}
    >
      <Stack spacing={1.5}>
        <Typography
          sx={{
            fontFamily: `'Playfair Display', Georgia, serif`,
            fontWeight: 700,
            fontSize: 20,
            color: DRAFT_B.ink,
            letterSpacing: "-0.02em",
          }}
        >
          {allApproved ? desk.illPubApprovedTitle : desk.illPubProgressTitle}
        </Typography>
        <Typography variant="body2" sx={{ color: DRAFT_B.inkSoft, fontFamily: FONTS.sans }}>
          {allApproved ? desk.illPubApprovedSub : desk.illPubProgressSub(approvedCount, total)}
        </Typography>

        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" aria-label={desk.illPubProgressSub(approvedCount, total)}>
          {pages.map((p) => (
            <Box
              key={p.pageNumber}
              sx={{
                width: 6,
                height: 10,
                borderRadius: 999,
                bgcolor: p.subStatus === "approved" ? COLORS.success : "transparent",
                border: `1px solid ${p.subStatus === "approved" ? COLORS.success : DRAFT_B.border}`,
                flexShrink: 0,
              }}
            />
          ))}
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
          {canPreview ? (
            <Button variant="outlined" onClick={onPreviewClick} sx={{ textTransform: "none", fontWeight: 600 }}>
              {desk.illWorkspacePreviewAsBook}
            </Button>
          ) : null}
          {showMarkReady ? (
            <Button
              variant="contained"
              color="success"
              disabled={markDisabled}
              startIcon={<Check />}
              aria-label={markAria}
              onClick={() => {
                setMarkErr(null);
                setConfirmOpen(true);
              }}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              {desk.illPubReady}
            </Button>
          ) : null}
          {showPublish ? (
            <Button variant="contained" color="primary" onClick={onPublishClick} sx={{ textTransform: "none", fontWeight: 600 }}>
              {desk.illWorkspacePublishLibrary}
            </Button>
          ) : null}
        </Stack>

        {markErr ? (
          <Typography variant="body2" sx={{ color: "error.main" }}>
            {markErr}
          </Typography>
        ) : null}
      </Stack>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{desk.illWorkspaceMarkReadyTitle}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">{desk.illWorkspaceMarkReadyBody(pages.length)}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>{desk.headerCancel}</Button>
          <Button
            variant="contained"
            color="success"
            disabled={markBusy}
            onClick={async () => {
              setMarkBusy(true);
              setMarkErr(null);
              try {
                await onMarkReady();
                setConfirmOpen(false);
              } catch (e) {
                setMarkErr(e instanceof Error ? e.message : String(e));
              } finally {
                setMarkBusy(false);
              }
            }}
          >
            {desk.illPubReady}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
