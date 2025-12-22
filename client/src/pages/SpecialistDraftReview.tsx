import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import {
  approveDraft,
  fetchDraftById,
  StoryDraft,
  createReviewSession,
  getReviewSession,
  sendMessage,
  applyProposal,
  ReviewSession,
} from "../api/api";
import SpecialistNav from "../components/SpecialistNav";
import ChatPanel from "../components/ChatPanel";

const SpecialistDraftReview: React.FC = () => {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<StoryDraft | null>(null);
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [applying, setApplying] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [specialistId, setSpecialistId] = useState("");

  const loadDraft = async () => {
    if (!draftId) {
      setError("draftId is missing from URL");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDraftById(draftId);
      setDraft(data);
    } catch (err: any) {
      setError(err.message || "Failed to load draft");
      setDraft(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  // Create session when specialist ID is entered and draft is loaded
  useEffect(() => {
    if (draft && draftId && specialistId.trim() && !session && !sessionLoading) {
      setSessionLoading(true);
      createReviewSession(draftId, specialistId.trim())
        .then((result) => getReviewSession(result.sessionId))
        .then((sessionData) => setSession(sessionData))
        .catch((err) => setError(err.message || "Failed to create/load session"))
        .finally(() => setSessionLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, draftId, specialistId]);


  const handleSendMessage = async (content: string) => {
    if (!session || !specialistId.trim()) return;

    setSending(true);
    setError(null);
    try {
      await sendMessage(session.id, content, specialistId.trim());
      // Reload session to get updated messages and proposals
      const updatedSession = await getReviewSession(session.id);
      setSession(updatedSession);
      // Reload draft in case it was updated
      await loadDraft();
    } catch (err: any) {
      setError(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleApplyProposal = async (proposalId: string) => {
    if (!session || !specialistId.trim()) return;

    setApplying(true);
    setError(null);
    try {
      await applyProposal(session.id, proposalId, specialistId.trim());
      // Reload session and draft
      const updatedSession = await getReviewSession(session.id);
      setSession(updatedSession);
      await loadDraft();
    } catch (err: any) {
      setError(err.message || "Failed to apply proposal");
    } finally {
      setApplying(false);
    }
  };

  const handleApprove = async () => {
    if (!draft || !draftId) return;
    if (!specialistId.trim()) {
      setError("Enter your specialist ID before approving.");
      return;
    }
    setApproving(true);
    setError(null);
    try {
      await approveDraft(draftId, specialistId.trim(), session?.id);
      navigate("/specialist/drafts");
    } catch (err: any) {
      setError(err.message || "Failed to approve draft");
    } finally {
      setApproving(false);
    }
  };

  const title = useMemo(() => {
    if (!draft) return "Draft Review";
    return draft.title || "Untitled Draft";
  }, [draft]);

  return (
    <>
      <SpecialistNav />
      <Box sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5">{title}</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={loadDraft} disabled={loading}>
            {loading ? <CircularProgress size={18} /> : "Refresh"}
          </Button>
          <Button variant="text" onClick={() => navigate("/specialist/drafts")} disabled={loading}>
            Back to list
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      )}

      {!loading && draft && (
        <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Card variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="body2" color="text.secondary">
                    Topic: {draft.topicKey || "N/A"} • Language: {draft.language || "N/A"} • Status:{" "}
                    {draft.status || "N/A"}
                    {session && ` • Revision: ${session.revisionCount} / 3`}
                  </Typography>

                  <Divider />

                  <Stack spacing={2}>
                    {draft.pages?.map((page, idx) => (
                      <Card key={page.pageNumber ?? idx} variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Page {page.pageNumber ?? idx + 1}
                        </Typography>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" color="text.secondary" gutterBottom>
                            Text
                          </Typography>
                          <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                            {page.text || "N/A"}
                          </Typography>
                        </Box>
                        {page.emotionalTone && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" color="text.secondary" gutterBottom>
                              Emotional Tone
                            </Typography>
                            <Typography variant="body2">
                              {page.emotionalTone}
                            </Typography>
                          </Box>
                        )}
                        {page.imagePrompt && (
                          <Box>
                            <Typography variant="caption" color="text.secondary" gutterBottom>
                              Image Prompt
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {page.imagePrompt}
                            </Typography>
                          </Box>
                        )}
                      </Card>
                    ))}
                  </Stack>

                  <Divider />

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-start">
                    <TextField
                      label="Your Specialist ID"
                      size="small"
                      value={specialistId}
                      onChange={(e) => setSpecialistId(e.target.value)}
                      required
                      disabled={!!session}
                    />
                    <Button
                      variant="contained"
                      color="success"
                      onClick={handleApprove}
                      disabled={approving || loading || !specialistId.trim() || (session?.revisionCount ?? 0) >= 3}
                    >
                      {approving ? "Approving..." : "Approve draft"}
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            {sessionLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : session ? (
              <Box sx={{ height: "600px" }}>
                <ChatPanel
                  messages={session.messages || []}
                  proposals={session.proposals || []}
                  onSendMessage={handleSendMessage}
                  onApplyProposal={handleApplyProposal}
                  sending={sending || applying}
                  revisionCount={session.revisionCount}
                />
              </Box>
            ) : (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    Enter your Specialist ID above to start a review session.
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Box>
        </Stack>
      )}

      {!loading && !draft && !error && (
        <Typography variant="body2" color="text.secondary">
          Draft not found.
        </Typography>
      )}
      </Box>
    </>
  );
};

export default SpecialistDraftReview;

