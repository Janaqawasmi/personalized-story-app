import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { PageCardViewModel } from "../../../hooks/useIllustrationWorkspaceState";
import { useSpecialistDeskUi } from "../../../../i18n/specialistDeskUi";
import { COLORS } from "../../../../theme";
import { DRAFT_B, FONTS } from "../../draftB/tokens";
import ImageRegion, { PageImageFooterActions } from "./ImageRegion";
import PageCardHead from "./PageCardHead";
import RejectionBanner from "./RejectionBanner";
import ScenePlanPanel from "./ScenePlanPanel";
import TechnicalPanel from "./TechnicalPanel";
import { useScenePlanArtefact } from "./useScenePlanArtefact";
const CARD_SHADOW =
  "0 1px 0 rgba(42,36,33,.02), 0 8px 24px -20px rgba(42,36,33,.08)";

interface Props {
  storyId: string;
  page: PageCardViewModel;
  readOnly: boolean;
  currentVisualBibleVersion: number;
  onGenerate: () => void;
  onApprove: () => void;
  onReject: (feedbackNote: string) => void;
  onRegenerateScenePlan: (feedbackNote?: string) => Promise<void>;
  onRegenerateImage: () => void | Promise<void>;
}

export default function PageCard({
  storyId,
  page,
  readOnly,
  currentVisualBibleVersion,
  onGenerate,
  onApprove,
  onReject,
  onRegenerateScenePlan,
  onRegenerateImage,
}: Props) {
  const desk = useSpecialistDeskUi();

  const spv = page.scenePlanVersion;  const sp = useScenePlanArtefact(storyId, page.pageNumber, spv);

  const approvedShell =
    page.subStatus === "approved" && Boolean(page.imageUrl);

  const imageProps = {
    storyId,
    page,
    readOnly,
    desk,
    onGenerate,
    onApprove,
    onReject,
    onRegenerateImage,
  };

  const sceneDesk = {
    illStaleBibleBanner: desk.illStaleBibleBanner,
    illStaleBibleAction: desk.illStaleBibleAction,
    illSecAltPlan: desk.illSecAltPlan,
    illSecSuggestChange: desk.illSecSuggestChange,
    illIntentLabel: desk.illIntentLabel,
    illDetailLabel: desk.illDetailLabel,
    headerCancel: desk.headerCancel,
    illRejectFeedbackLabel: desk.illRejectFeedbackLabel,
    illScenePlanLoading: desk.illScenePlanLoading,
    illScenePlanUpdating: desk.illScenePlanUpdating,
  };

  const headDesk = {
    illPageNumber: desk.illPageNumber,
    illStatusPlanOnly: desk.illStatusPlanOnly,
    illStatusGenerating: desk.illStatusGenerating,
    illStatusAwaiting: desk.illStatusAwaiting,
    illStatusApproved: desk.illStatusApproved,
    illStatusRejected: desk.illStatusRejected,
  };

  return (
    <Box
      component="article"
      sx={{
        position: "relative",
        borderRadius: "14px",
        border: `1px solid ${DRAFT_B.border}`,
        boxShadow: CARD_SHADOW,
        bgcolor: COLORS.surface,
        overflow: "hidden",
        ...(approvedShell
          ? {
              "&::before": {
                content: '""',
                position: "absolute",
                insetInlineStart: 0,
                top: 0,
                bottom: 0,
                width: 3,
                bgcolor: COLORS.success,
                borderStartStartRadius: 14,
                borderStartEndRadius: 0,
              },
            }
          : {}),
      }}
    >
      <Stack sx={{ p: { xs: "18px 20px", sm: "20px 22px" } }} spacing={2}>
        <PageCardHead storyId={storyId} page={page} desk={headDesk} scenePlan={sp} />

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "minmax(0,1fr) 280px" },
            columnGap: 0,
            borderTop: `1px solid ${DRAFT_B.borderSoft}`,
            pt: 2,
            mt: 0.5,
          }}
        >
          <Stack
            spacing={2}
            sx={{
              borderInlineEnd: { md: `1px solid ${DRAFT_B.borderSoft}` },
              paddingInlineEnd: { md: 2.5 },
              paddingBottom: { xs: 2, md: 0 },
            }}
          >
            <Box>
              <Typography
                variant="overline"
                sx={{
                  display: "block",
                  mb: 0.75,
                  color: COLORS.primary,
                  fontFamily: FONTS.mono,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                }}
              >
                {desk.illSourceText}
              </Typography>
              <Box
                component="blockquote"
                sx={{
                  m: 0,
                  borderInlineStart: `3px solid ${DRAFT_B.border}`,
                  bgcolor: DRAFT_B.cream,
                  p: 2,
                  borderRadius: "0 10px 10px 0",
                }}
              >
                <Typography
                  sx={{
                    fontStyle: "italic",
                    color: DRAFT_B.inkSoft,
                    whiteSpace: "pre-wrap",
                    fontFamily: FONTS.sans,
                    fontSize: "14.5px",
                    lineHeight: 1.7,
                  }}
                >
                  {page.text}
                </Typography>
              </Box>
            </Box>

            {spv === null ? (
              <Typography variant="body2" sx={{ color: DRAFT_B.inkMuted }}>
                {desk.illScenePlanUnavailable}
              </Typography>
            ) : (
              <ScenePlanPanel
                sp={sp}
                readOnly={readOnly}
                scenePlanRegenBusy={page.scenePlanRegenBusy}
                visualBibleIsStale={page.visualBibleIsStale}
                desk={sceneDesk}
                onRegenerateScenePlan={onRegenerateScenePlan}
              />
            )}

            {page.rejectionNote?.trim() ? (
              <RejectionBanner header={desk.illRejectedHeader} note={page.rejectionNote.trim()} />
            ) : null}

            {spv !== null ? (
              <TechnicalPanel
                storyId={storyId}
                pageNumber={page.pageNumber}
                scenePlanVersion={spv}
                imageVersion={page.imageVersion}
                currentVisualBibleVersion={currentVisualBibleVersion}
              />
            ) : null}
          </Stack>

          <Box
            sx={{
              bgcolor: DRAFT_B.cream,
              p: "16px 20px",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
            }}
          >
            <ImageRegion
              storyId={storyId}
              page={page}
              readOnly={readOnly}
              desk={desk}
              onGenerate={onGenerate}
              onApprove={onApprove}
              onReject={onReject}
            />
          </Box>
        </Box>

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={1.5}
          sx={{
            borderTop: `1px solid ${DRAFT_B.borderSoft}`,
            pt: 2,
            mt: 0,
            bgcolor: approvedShell ? "#f6f9f4" : "transparent",
            mx: { xs: -2.5, sm: -2.75 },
            mb: { xs: -2.5, sm: -2.75 },
            px: { xs: 2.5, sm: 2.75 },
            py: 2,
          }}
        >
          <PageImageFooterActions {...imageProps} />
          {page.lastError ? (
            <Typography variant="body2" sx={{ color: "error.main", maxWidth: 360 }}>
              {page.lastError}
            </Typography>
          ) : null}
        </Stack>
      </Stack>
    </Box>
  );
}
