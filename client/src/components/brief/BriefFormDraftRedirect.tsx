import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import EditNoteOutlinedIcon from "@mui/icons-material/EditNoteOutlined";
import { getOrCreateMostRecentDraftId } from "../../utils/briefDraftStorage";
import SpecialistPortalShell from "../specialist/SpecialistPortalShell";
import { COLORS } from "../../theme";

/**
 * `/specialist/create-brief` without a draft id redirects to the most recently
 * edited local draft (or a new empty draft).
 */
export default function BriefFormDraftRedirect() {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();

  useEffect(() => {
    const id = getOrCreateMostRecentDraftId();
    navigate(`/${lang ?? "he"}/specialist/create-brief/${id}`, { replace: true });
  }, [navigate, lang]);

  return (
    <SpecialistPortalShell maxWidth={480}>
      <Box
        sx={{
          textAlign: "center",
          py: { xs: 6, sm: 8 },
          px: 2,
        }}
      >
        <Stack spacing={2.5} alignItems="center">
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              bgcolor: "rgba(97, 120, 145, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <EditNoteOutlinedIcon sx={{ fontSize: 36, color: COLORS.primary }} aria-hidden />
          </Box>
          <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: "-0.02em" }}>
            Opening your brief
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 320, lineHeight: 1.6 }}>
            Taking you to your most recently saved draft, or a new brief if you have not started one yet.
          </Typography>
          <CircularProgress size={36} thickness={4} sx={{ color: COLORS.primary }} aria-label="Loading" />
        </Stack>
      </Box>
    </SpecialistPortalShell>
  );
}
