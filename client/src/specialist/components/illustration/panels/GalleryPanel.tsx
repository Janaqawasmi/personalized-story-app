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
import { ChipTone } from "../shared/ChipTone";

function pageCardTitle(text: string): string {
  const line = text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? text;
  const t = line.trim();
  return t.length > 48 ? `${t.slice(0, 45)}…` : t;
}

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
  const approvedPages = pages.filter((p) => p.subStatus === "approved");
  const tiles = approvedPages.length > 0 ? approvedPages : pages;
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

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            sm: "repeat(3, minmax(0, 1fr))",
            md: "repeat(4, minmax(0, 1fr))",
          },
          gap: 1.75,
        }}
      >
        {tiles.map((p) => (
          <Box
            key={p.pageNumber}
            sx={{
              bgcolor: COLORS.surface,
              border: `1px solid ${DRAFT_B.borderSoft}`,
              borderRadius: "10px",
              p: 1,
            }}
          >
            <Box
              sx={{
                position: "relative",
                width: "100%",
                aspectRatio: "1 / 1",
                borderRadius: "8px",
                overflow: "hidden",
                bgcolor: DRAFT_B.cream,
              }}
            >
              {p.imageUrl ? (
                <Box
                  component="img"
                  src={p.imageUrl}
                  alt=""
                  sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                <Box
                  sx={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: DRAFT_B.inkMuted,
                    fontSize: 12,
                    fontFamily: FONTS.mono,
                  }}
                >
                  p.{p.pageNumber}
                </Box>
              )}
            </Box>
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.75}
              sx={{ pt: 1, px: 0.5, pb: 0.5, gap: 0.75 }}
            >
              <Typography
                sx={{
                  fontFamily: FONTS.mono,
                  fontSize: 12,
                  color: DRAFT_B.inkMuted,
                  flexShrink: 0,
                }}
              >
                p.{p.pageNumber}
              </Typography>
              <Typography
                sx={{
                  flex: 1,
                  minWidth: 0,
                  fontFamily: `'Playfair Display', Georgia, serif`,
                  fontWeight: 700,
                  color: DRAFT_B.ink,
                  fontSize: 13,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={pageCardTitle(p.text)}
              >
                {pageCardTitle(p.text)}
              </Typography>
              {p.subStatus === "approved" ? (
                <ChipTone
                  tone="success"
                  chipSize="sm"
                  label="✓"
                  sx={{ height: 22, "& .MuiChip-label": { px: 0.75 } }}
                />
              ) : null}
            </Stack>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
