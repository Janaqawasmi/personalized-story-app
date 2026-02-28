// client/src/pages/AdminContractReviewPage.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Stack,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Divider,
  Card,
  CardContent,
} from "@mui/material";
import SpecialistNav from "../components/SpecialistNav";
import {
  fetchStoryBriefById,
  fetchGenerationContract,
  buildContractFromBrief,
  applyContractOverride,
  submitContractReview,
  StoryBrief,
  GenerationContract,
} from "../api/api";

// Helper function to format text for display
function formatDisplayText(text: string): string {
  if (!text) return text;
  return text
    .split("_")
    .filter((word) => word.length > 0) // Filter out empty strings from leading/trailing underscores
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Helper function to format age group
function formatAgeGroup(ageGroup: string): string {
  const map: Record<string, string> = {
    "0_3": "0\u20133 years",
    "3_6": "3\u20136 years",
    "6_9": "6\u20139 years",
    "9_12": "9\u201312 years",
  };
  return map[ageGroup] || ageGroup;
}

// Helper to get review status color
function getReviewStatusColor(
  status?: string
): "default" | "warning" | "success" | "error" | "info" {
  switch (status) {
    case "approved":
      return "success";
    case "needs_changes":
      return "warning";
    case "rejected":
      return "error";
    case "pending_review":
      return "info";
    default:
      return "default";
  }
}

const AdminContractReviewPage: React.FC = () => {
  const { briefId } = useParams<{ briefId: string }>();
  const navigate = useNavigate();

  const [brief, setBrief] = useState<StoryBrief | null>(null);
  const [contract, setContract] = useState<GenerationContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyingOverride, setApplyingOverride] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  // Override UI state
  const [selectedCopingTool, setSelectedCopingTool] = useState<string>("");
  const [overrideReason, setOverrideReason] = useState<string>("");

  // Review decision UI state
  const [reviewNotes, setReviewNotes] = useState<string>("");
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

  // Load contract data (persisted, or build if not found)
  const loadContractData = useCallback(async () => {
    if (!briefId) {
      setError("Brief ID is required");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setReviewSuccess(null);

      // Load brief
      const briefData = await fetchStoryBriefById(briefId);
      setBrief(briefData);

      // Try to load persisted contract; if not found, build one
      let contractData: GenerationContract;
      try {
        contractData = await fetchGenerationContract(briefId);
      } catch {
        // Contract doesn't exist yet — build and persist it
        contractData = await buildContractFromBrief(briefId);
        // Reload brief since buildContract updates brief.status
        const updatedBrief = await fetchStoryBriefById(briefId);
        setBrief(updatedBrief);
      }
      setContract(contractData);

      // Set initial selected coping tool if override exists
      if (contractData.overrideUsed && contractData.overrideDetails?.copingToolId) {
        setSelectedCopingTool(contractData.overrideDetails.copingToolId as string);
      } else if (contractData.allowedCopingTools.length > 0) {
        setSelectedCopingTool(contractData.allowedCopingTools[0]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load contract");
    } finally {
      setLoading(false);
    }
  }, [briefId]);

  useEffect(() => {
    loadContractData();
  }, [loadContractData]);

  const handleApplyOverride = async () => {
    if (!briefId || !selectedCopingTool) {
      setError("Coping tool selection is required");
      return;
    }

    try {
      setApplyingOverride(true);
      setError(null);
      setReviewSuccess(null);

      await applyContractOverride(briefId, {
        copingToolId: selectedCopingTool,
        reason: overrideReason || undefined,
      });

      // Reload persisted contract and brief after override (contract is regenerated)
      const updatedContract = await fetchGenerationContract(briefId);
      setContract(updatedContract);

      const updatedBrief = await fetchStoryBriefById(briefId);
      setBrief(updatedBrief);

      // Synchronize selectedCopingTool with the new override
      if (updatedContract.overrideDetails?.copingToolId) {
        setSelectedCopingTool(updatedContract.overrideDetails.copingToolId as string);
      }
      setOverrideReason(""); // Clear reason after successful override
    } catch (err: any) {
      setError(err.message || "Failed to apply override");
    } finally {
      setApplyingOverride(false);
    }
  };

  const handleReviewDecision = async (decision: "approved" | "needs_changes" | "rejected") => {
    if (!briefId) return;

    try {
      setSubmittingReview(true);
      setError(null);
      setReviewSuccess(null);

      const result = await submitContractReview(briefId, decision, reviewNotes || undefined);

      // Refresh contract and brief to reflect updated state
      const updatedContract = await fetchGenerationContract(briefId);
      setContract(updatedContract);

      const updatedBrief = await fetchStoryBriefById(briefId);
      setBrief(updatedBrief);

      setReviewNotes(""); // Clear notes after submission
      setReviewSuccess(
        `Decision "${formatDisplayText(decision)}" submitted successfully.`
      );
    } catch (err: any) {
      setError(err.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleContinueToGeneration = () => {
    navigate(`/specialist/generate-draft?briefId=${briefId}`);
  };

  // Extract override tool ID for type safety
  const overrideToolId =
    contract?.overrideUsed && contract.overrideDetails?.copingToolId
      ? typeof contract.overrideDetails.copingToolId === "string"
        ? contract.overrideDetails.copingToolId
        : null
      : null;

  // Gate conditions
  const canApprove =
    contract?.status === "valid" && (!contract.errors || contract.errors.length === 0);
  const canContinueToGeneration =
    contract?.status === "valid" && contract?.reviewStatus === "approved";

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !contract) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <SpecialistNav />
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!contract || !brief) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <SpecialistNav />
        <Alert severity="warning">Contract or brief not found</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <SpecialistNav />
      <Typography variant="h4" gutterBottom>
        Contract Review
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Review the generation contract before proceeding to story generation
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {reviewSuccess && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setReviewSuccess(null)}>
          {reviewSuccess}
        </Alert>
      )}

      {contract.errors.length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Contract Errors ({contract.errors.length}):
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {contract.errors.map((err, idx) => (
              <li key={idx}>{err.message}</li>
            ))}
          </ul>
        </Alert>
      )}

      {contract.warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Warnings ({contract.warnings.length}):
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {contract.warnings.map((warn, idx) => (
              <li key={idx}>{warn.message}</li>
            ))}
          </ul>
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 3,
        }}
      >
        {/* Brief Summary */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Brief Summary
            </Typography>
            <Stack spacing={1}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Topic
                </Typography>
                <Typography>{formatDisplayText(brief.therapeuticFocus.primaryTopic)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Situation
                </Typography>
                <Typography>{formatDisplayText(brief.therapeuticFocus.specificSituation)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Age Group
                </Typography>
                <Typography>{formatAgeGroup(brief.childProfile.ageGroup)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Emotional Sensitivity
                </Typography>
                <Typography>{formatDisplayText(brief.childProfile.emotionalSensitivity)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Emotional Goals
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  {brief.therapeuticIntent.emotionalGoals.map((goal, idx) => (
                    <Chip key={idx} label={formatDisplayText(goal)} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                  ))}
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Ending Style
                </Typography>
                <Typography>{formatDisplayText(brief.storyPreferences.endingStyle)}</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Contract Details */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Contract Details
            </Typography>
            <Stack spacing={2}>
              {/* Contract Status + Review Status */}
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Status
                </Typography>
                <Box sx={{ mt: 0.5, display: "flex", gap: 1, alignItems: "center" }}>
                  <Chip
                    label={contract.status === "valid" ? "Valid" : "Invalid"}
                    size="small"
                    color={contract.status === "valid" ? "success" : "error"}
                  />
                  <Chip
                    label={formatDisplayText(contract.reviewStatus || "pending_review")}
                    size="small"
                    color={getReviewStatusColor(contract.reviewStatus)}
                  />
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Rules Version
                </Typography>
                <Typography variant="body2">{contract.rulesVersionUsed}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Length Budget
                </Typography>
                <Typography>
                  {contract.lengthBudget.minScenes}–{contract.lengthBudget.maxScenes} scenes, max{" "}
                  {contract.lengthBudget.maxWords} words
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Required Elements ({contract.requiredElements.length})
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  {contract.requiredElements.slice(0, 10).map((elem, idx) => (
                    <Chip key={idx} label={formatDisplayText(elem)} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                  ))}
                  {contract.requiredElements.length > 10 && (
                    <Typography variant="caption" color="text.secondary">
                      +{contract.requiredElements.length - 10} more
                    </Typography>
                  )}
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Allowed Coping Tools ({contract.allowedCopingTools.length})
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  {contract.allowedCopingTools.map((tool, idx) => (
                    <Chip key={idx} label={formatDisplayText(tool)} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                  ))}
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Must Avoid (showing first 20 of {contract.mustAvoid.length})
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  {contract.mustAvoid.slice(0, 20).map((item, idx) => (
                    <Chip
                      key={idx}
                      label={formatDisplayText(item)}
                      size="small"
                      color="error"
                      variant="outlined"
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  ))}
                  {contract.mustAvoid.length > 20 && (
                    <Typography variant="caption" color="text.secondary">
                      +{contract.mustAvoid.length - 20} more
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Last review info */}
              {contract.reviewedBy && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Last Reviewed By
                  </Typography>
                  <Typography variant="body2">{contract.reviewedBy}</Typography>
                  {contract.reviewedAt && (
                    <Typography variant="caption" color="text.secondary">
                      {typeof contract.reviewedAt === "object" && contract.reviewedAt._seconds
                        ? new Date(contract.reviewedAt._seconds * 1000).toLocaleString()
                        : String(contract.reviewedAt)}
                    </Typography>
                  )}
                </Box>
              )}
              {contract.reviewNotes && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Review Notes
                  </Typography>
                  <Typography variant="body2">{contract.reviewNotes}</Typography>
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Override Section */}
        <Box sx={{ gridColumn: { xs: "1", md: "1 / -1" } }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Override Coping Tool
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Override the automatically selected coping tool if needed
            </Typography>
            <Stack spacing={2} direction={{ xs: "column", sm: "row" }} alignItems="flex-start">
              <FormControl sx={{ minWidth: 250 }}>
                <InputLabel>Coping Tool</InputLabel>
                <Select
                  value={selectedCopingTool}
                  onChange={(e) => setSelectedCopingTool(e.target.value)}
                  label="Coping Tool"
                >
                  {contract.allowedCopingTools.map((tool) => (
                    <MenuItem key={tool} value={tool}>
                      {formatDisplayText(tool)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Reason (optional)"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Why are you overriding the default?"
                sx={{ flexGrow: 1 }}
              />
              <Button
                variant="outlined"
                onClick={handleApplyOverride}
                disabled={applyingOverride || !selectedCopingTool}
              >
                {applyingOverride ? <CircularProgress size={20} /> : "Apply Override & Regenerate"}
              </Button>
            </Stack>
            {overrideToolId && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Override is currently active: {formatDisplayText(overrideToolId)}
              </Alert>
            )}
          </Paper>
        </Box>

        {/* Decision Controls (Agent 2) */}
        <Box sx={{ gridColumn: { xs: "1", md: "1 / -1" } }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Review Decision
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Approve, request changes, or reject this generation contract
            </Typography>

            <TextField
              label="Review Notes (optional)"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add notes about your review decision..."
              multiline
              rows={2}
              fullWidth
              sx={{ mb: 2 }}
            />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Button
                variant="contained"
                color="success"
                onClick={() => handleReviewDecision("approved")}
                disabled={submittingReview || !canApprove}
              >
                {submittingReview ? <CircularProgress size={20} /> : "Approve"}
              </Button>
              <Button
                variant="outlined"
                color="warning"
                onClick={() => handleReviewDecision("needs_changes")}
                disabled={submittingReview}
              >
                {submittingReview ? <CircularProgress size={20} /> : "Needs Changes"}
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={() => handleReviewDecision("rejected")}
                disabled={submittingReview}
              >
                {submittingReview ? <CircularProgress size={20} /> : "Reject"}
              </Button>
            </Stack>

            {!canApprove && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Approve is disabled because the contract is invalid or has errors.
                You can still request changes or reject.
              </Alert>
            )}
          </Paper>
        </Box>

        {/* Actions */}
        <Box sx={{ gridColumn: { xs: "1", md: "1 / -1" } }}>
          <Divider sx={{ my: 2 }} />
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button variant="outlined" onClick={() => navigate(-1)}>
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleContinueToGeneration}
              disabled={!canContinueToGeneration}
            >
              Continue to Generation
            </Button>
          </Stack>
          {!canContinueToGeneration && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block", textAlign: "right" }}>
              Contract must be valid and approved before generation can proceed.
            </Typography>
          )}
        </Box>
      </Box>
    </Container>
  );
};

export default AdminContractReviewPage;
