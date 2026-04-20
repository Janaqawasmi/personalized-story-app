import { useState } from "react";
import { Link as RouterLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { Box, Button, Stack, Typography } from "@mui/material";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import EditNoteOutlinedIcon from "@mui/icons-material/EditNoteOutlined";
import ListAltOutlinedIcon from "@mui/icons-material/ListAltOutlined";
import { COLORS } from "../../theme";
import { useSpecialistUi } from "../../i18n/specialistUi";
import { Z_INDEX_SPECIALIST_NAVBAR } from "../../constants/zIndex";
import { draftStore } from "../../specialist/storage";

/**
 * Secondary navigation for specialist routes (below the main app Navbar).
 */
export default function SpecialistNavBar() {
  const { lang } = useParams<{ lang: string }>();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const base = `/${lang ?? "he"}/specialist`;
  const sp = useSpecialistUi();

  const [storyBriefLoading, setStoryBriefLoading] = useState(false);

  const isBriefsArea = pathname.includes("/specialist/stories");
  const isEditor =
    pathname.includes("/specialist/stories/new") ||
    pathname.includes("/brief");

  async function handleStoryBriefClick() {
    setStoryBriefLoading(true);
    try {
      const results = await draftStore.listStories({
        statuses: ["draft_brief"],
        sortBy: "lastOpenedAt",
        sortDir: "desc",
        limit: 1,
      });
      if (results.length > 0) {
        navigate(`${base}/stories/${results[0].id}/brief`);
      } else {
        navigate(`${base}/stories/new`);
      }
    } catch {
      navigate(`${base}/stories/new`);
    } finally {
      setStoryBriefLoading(false);
    }
  }

  const btn = (active: boolean) => ({
    borderRadius: 2,
    fontWeight: 700,
    textTransform: "none" as const,
    px: 2,
    py: 1,
    minHeight: 40,
    ...(active
      ? {
          bgcolor: "rgba(97, 120, 145, 0.14)",
          color: COLORS.primary,
          border: `1px solid rgba(97, 120, 145, 0.35)`,
        }
      : {
          color: COLORS.textSecondary,
          border: "1px solid transparent",
          "&:hover": {
            bgcolor: "rgba(97, 120, 145, 0.08)",
            color: COLORS.primary,
          },
        }),
  });

  return (
    <Box
      component="nav"
      aria-label={sp.workspaceNavAriaLabel}
      sx={{
        borderBottom: `1px solid ${COLORS.border}`,
        bgcolor: COLORS.surface,
        boxShadow: "0 2px 8px rgba(97, 120, 145, 0.06)",
        position: "sticky",
        top: { xs: 56, md: 60 },
        zIndex: Z_INDEX_SPECIALIST_NAVBAR,
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
        gap={1.5}
        sx={{
          maxWidth: 1100,
          mx: "auto",
          px: { xs: 2, sm: 3.5, md: 5 },
          py: 1.5,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
          <ArticleOutlinedIcon sx={{ color: COLORS.primary, fontSize: 26, flexShrink: 0 }} aria-hidden />
          <Typography
            variant="subtitle1"
            fontWeight={800}
            sx={{ color: COLORS.primary, letterSpacing: "-0.02em" }}
          >
            {sp.workspaceTitle}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent={{ xs: "flex-start", sm: "flex-end" }}>
          <Button
            component={RouterLink}
            to={`${base}/stories`}
            startIcon={<ListAltOutlinedIcon />}
            sx={btn(isBriefsArea)}
          >
            {sp.navBriefs}
          </Button>
          <Button
            startIcon={<EditNoteOutlinedIcon />}
            disabled={storyBriefLoading}
            onClick={handleStoryBriefClick}
            sx={btn(isEditor)}
          >
            {sp.navStoryBrief}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
