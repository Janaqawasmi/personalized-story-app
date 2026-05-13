import { useEffect, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { BookReaderModel } from "../../../components/book/BookReaderModel";
import BookReaderCore from "../../../components/book/BookReaderCore";
import { useSpecialistDeskUi } from "../../../i18n/specialistDeskUi";
import { COLORS, DESIGN_TOKENS } from "../../../theme";
import { DRAFT_B, FONTS } from "../draftB/tokens";
import { ChipTone } from "./shared/ChipTone";

interface Props {
  open: boolean;
  onClose: () => void;
  model: BookReaderModel | null;
  /** When set, primary footer action opens the publish flow (e.g. close preview + open publish dialog). */
  onPublishFromPreview?: () => void;
}

export default function ApprovalPreviewDialog({
  open,
  onClose,
  model,
  onPublishFromPreview,
}: Props) {
  const desk = useSpecialistDeskUi();
  const [showCover, setShowCover] = useState(true);
  const [spreadIndex, setSpreadIndex] = useState(0);

  useEffect(() => {
    if (open && model) {
      setShowCover(true);
      setSpreadIndex(0);
    }
  }, [open, model]);

  const pageCount = model?.pages.length ?? 0;
  const displayTitle = model?.title?.trim() ? model.title : desk.untitledStory;
  const canNav = !!model && pageCount > 0 && !showCover;
  const canGoPrev = canNav && spreadIndex > 0;
  const canGoNext = canNav && spreadIndex < pageCount - 1;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      aria-labelledby="approval-preview-dialog-title"
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: "rgba(23,13,30,0.62)",
            backdropFilter: "blur(8px)",
          },
        },
      }}
      PaperProps={{
        sx: {
          width: "min(1080px, calc(100vw - 32px))",
          maxHeight: "min(92vh, 900px)",
          borderRadius: "18px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 30px 80px -20px rgba(0,0,0,.4)",
          bgcolor: COLORS.surface,
        },
      }}
    >
      {model ? (
        <>
          <Box
            sx={{
              px: 2.5,
              py: 2,
              borderBottom: `1px solid ${DRAFT_B.borderSoft}`,
              bgcolor: DRAFT_B.cream,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              flexShrink: 0,
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                id="approval-preview-dialog-title"
                sx={{
                  m: 0,
                  fontFamily: `'Playfair Display', Georgia, serif`,
                  fontWeight: 700,
                  fontSize: 20,
                  color: DRAFT_B.ink,
                  letterSpacing: "-0.015em",
                }}
              >
                {desk.illDlgTitle}
              </Typography>
              <Typography sx={{ color: DRAFT_B.inkMuted, fontSize: 12.5, mt: 0.25 }}>
                {desk.illDlgSubtitle(displayTitle, pageCount)}
              </Typography>
            </Box>
            <ChipTone tone="success" chipSize="sm" label={desk.illDlgAllApproved} sx={{ flexShrink: 0 }} />
            <IconButton onClick={onClose} aria-label={desk.illDlgClose} edge="end" sx={{ flexShrink: 0 }}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflow: "auto",
              bgcolor: DESIGN_TOKENS.parchment,
              px: { xs: 2, sm: 5 },
              py: { xs: 2, sm: 5 },
            }}
          >
            <BookReaderCore
              model={model}
              chromeless
              nav={{ showCover, spreadIndex, setShowCover, setSpreadIndex }}
            />
          </Box>

          {canNav ? (
            <Box
              sx={{
                px: 2.5,
                py: 1.75,
                borderTop: `1px solid ${DRAFT_B.borderSoft}`,
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 1.5,
                flexShrink: 0,
                bgcolor: COLORS.surface,
              }}
            >
              <IconButton
                size="small"
                onClick={() => setSpreadIndex((i) => Math.max(0, i - 1))}
                disabled={!canGoPrev}
                aria-label={desk.illDlgPrev}
              >
                <ArrowBackIosNewIcon fontSize="small" />
              </IconButton>
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexWrap: "wrap" }}>
                {model.pages.map((_, i) => (
                  <Box
                    key={i}
                    onClick={() => setSpreadIndex(i)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSpreadIndex(i);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={desk.illDlgSpread(i + 1, pageCount)}
                    sx={{
                      height: 6,
                      borderRadius: 999,
                      cursor: "pointer",
                      bgcolor: i === spreadIndex ? COLORS.primary : "transparent",
                      border: `1px solid ${i === spreadIndex ? COLORS.primary : DRAFT_B.border}`,
                      width: i === spreadIndex ? 18 : 6,
                      flexShrink: 0,
                      transition: "width 0.2s ease, background-color 0.2s ease",
                    }}
                  />
                ))}
              </Stack>
              <IconButton
                size="small"
                onClick={() => setSpreadIndex((i) => Math.min(pageCount - 1, i + 1))}
                disabled={!canGoNext}
                aria-label={desk.illDlgNext}
              >
                <ArrowForwardIosIcon fontSize="small" />
              </IconButton>
              <Typography
                sx={{
                  flex: 1,
                  minWidth: 120,
                  fontFamily: FONTS.mono,
                  fontSize: 12,
                  color: DRAFT_B.inkMuted,
                }}
              >
                {desk.illDlgSpread(spreadIndex + 1, pageCount)}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadOutlinedIcon />}
                disabled
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                {desk.illDlgExport}
              </Button>
              {onPublishFromPreview ? (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<MenuBookOutlinedIcon />}
                  onClick={() => {
                    onPublishFromPreview();
                  }}
                  sx={{ textTransform: "none", fontWeight: 600 }}
                >
                  {desk.illDlgPublish}
                </Button>
              ) : null}
            </Box>
          ) : null}
        </>
      ) : null}
    </Dialog>
  );
}
