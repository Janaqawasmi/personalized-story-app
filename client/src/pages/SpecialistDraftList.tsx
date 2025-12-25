import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { fetchDraftsForReview, StoryDraftView } from "../api/api";
import { useNavigate } from "react-router-dom";
import SpecialistNav from "../components/SpecialistNav";

const SpecialistDraftList: React.FC = () => {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<StoryDraftView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDrafts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDraftsForReview();
      setDrafts(data);
    } catch (err: any) {
      setError(err.message || "Failed to load drafts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrafts();
  }, []);

  return (
    <>
      <SpecialistNav />
      <Box sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5">Drafts Awaiting Specialist Review</Typography>
        <Button variant="outlined" onClick={loadDrafts} disabled={loading}>
          {loading ? <CircularProgress size={18} /> : "Refresh"}
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={2}>
          {drafts.map((draft) => (
            <Card key={draft.id} variant="outlined">
              <CardContent>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-start" justifyContent="space-between">
                  <Box>
                    <Typography variant="h6">{draft.title || "Untitled Draft"}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Age: {draft.generationConfig?.targetAgeGroup || "N/A"} • Status: {draft.status || "-"}
                    </Typography>
                  </Box>
                  <Button variant="contained" onClick={() => navigate(`/specialist/drafts/${draft.id}`)}>
                    Review
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ))}
          {!drafts.length && (
            <Typography variant="body2" color="text.secondary">
              No drafts awaiting review.
            </Typography>
          )}
        </Stack>
      )}
      </Box>
    </>
  );
};

export default SpecialistDraftList;

