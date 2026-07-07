import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Link as RouterLink } from "react-router-dom";
import type { PageCardViewModel } from "../../../hooks/useIllustrationWorkspaceState";
import { useSpecialistDeskUi } from "../../../../i18n/specialistDeskUi";
import { COLORS, DESIGN_TOKENS } from "../../../../theme";
import { DRAFT_B, FONTS } from "../../draftB/tokens";
import ApprovedIllustrationsGrid from "./ApprovedIllustrationsGrid";

interface Props {
  published: boolean;
  storyTitle: string;
  storyId: string;
  lang: string;
  pages: PageCardViewModel[];
  canPreview: boolean;
  onPreviewClick: () => void;
  onPublishClick: () => void;
}

export default function GalleryPanel({
  published,
  storyTitle,
  storyId,
  lang,
  pages,
  canPreview,
  onPreviewClick,
  onPublishClick,
}: Props) {
  const desk = useSpecialistDeskUi();
  const pageCount = pages.length;
  const storyTabHref = `/${lang}/specialist/stories/${encodeURIComponent(storyId)}/story`;

  return (
    <Box>
      <Box
        sx={{
          background: `linear-gradient(135deg, ${DESIGN_TOKENS.parchment} 0%, ${DRAFT_B.cream} 100%)`,
          border: `1px solid ${DRAFT_B.border}`,
          borderRadius: "14px",
          px: { xs: 2, sm: 3.5 },
          py: { xs: 2.5, sm: 3.5 },
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 2.75,
          mb: 2.75,
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: "18px",
            bgcolor: published ? COLORS.success : COLORS.primary,
            color: COLORS.surface,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <MenuBookOutlinedIcon sx={{ fontSize: 28 }} aria-hidden />
        </Box>
        <Box sx={{ flex: "1 1 200px", minWidth: 0 }}>
          <Typography
            component="h2"
            sx={{
              m: 0,
              fontFamily: `'Playfair Display', Georgia, serif`,
              fontWeight: 700,
              fontSize: { xs: 22, sm: 26 },
              color: DRAFT_B.ink,
              letterSpacing: "-0.02em",
            }}
          >
            {published ? desk.illGalPublished : desk.illGalAllApproved}
          </Typography>
          <Typography sx={{ color: DRAFT_B.inkSoft, fontSize: 14, mt: 0.5 }}>
            {published ? desk.illGalPublishedSub : desk.illGalAllApprovedSub(pageCount)}
          </Typography>
          {storyTitle.trim() ? (
            <Typography
              sx={{
                color: DRAFT_B.inkMuted,
                fontSize: 13,
                mt: 0.75,
                fontFamily: FONTS.sans,
                fontStyle: "italic",
              }}
              noWrap
              title={storyTitle}
            >
              {storyTitle}
            </Typography>
          ) : null}
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ flexShrink: 0 }}>
          <Button
            variant="outlined"
            startIcon={<VisibilityOutlinedIcon />}
            disabled={!canPreview}
            onClick={onPreviewClick}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            {desk.illGalPreview}
          </Button>
          {!published ? (
            <Button
              variant="contained"
              startIcon={<MenuBookOutlinedIcon />}
              onClick={onPublishClick}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              {desk.illGalPublish}
            </Button>
          ) : (
            <Button
              variant="text"
              component={RouterLink}
              to={storyTabHref}
              sx={{ textTransform: "none", fontWeight: 600, color: DRAFT_B.inkSoft }}
            >
              {desk.illGalReopen}
            </Button>
          )}
        </Stack>
      </Box>

      <ApprovedIllustrationsGrid pages={pages} />
    </Box>
  );
}
