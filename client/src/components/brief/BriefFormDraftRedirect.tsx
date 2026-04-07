import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { getOrCreateMostRecentDraftId } from "../../utils/briefDraftStorage";

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
    <Box display="flex" justifyContent="center" py={8}>
      <CircularProgress />
    </Box>
  );
}
