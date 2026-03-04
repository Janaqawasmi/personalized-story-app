// client/src/pages/AdminContractReviewPage.tsx
//
// PHASE 1 CHANGES:
//   - "Confirm & Continue" replaced with explicit Approve/Reject actions
//   - Approve calls backend API and waits for confirmation before navigation
//   - Reject requires a reason (clinical accountability)
//   - Shows current approval status and who approved/rejected
//   - Displays audit trail history
//   - Override shows warning that re-approval is required
//   - Navigation to generation only possible after backend confirms approval

import React, { useEffect, useState } from "react";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Collapse,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import HistoryIcon from "@mui/icons-material/History";
import SpecialistNav from "../components/SpecialistNav";
import {
  fetchStoryBriefById,
  previewContract,
  fetchFullContract,
  applyContractOverride,
  approveContract as apiApproveContract,
  rejectContract as apiRejectContract,
  fetchAuditHistory,
  StoryBrief,
  GenerationContract,
} from "../api/api";

// ============================================================================
// Helper Functions
// ============================================================================

function formatDisplayText(text: string): string {
  if (!text) return text;
  return text
    .split("_")
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatAgeGroup(ageGroup: string): string {
  const map: Record<string, string> = {
    "0_3": "0–3 years",
    "3_6": "3–6 years",
    "6_9": "6–9 years",
    "9_12": "9–12 years",
  };
  return map[ageGroup] || ageGroup;
}

function formatTimestamp(ts: string | undefined): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function formatAuditAction(action: string): string {
  const labels: Record<string, string> = {
    "brief.created": "Brief Created",
    "contract.built": "Contract Built",
    "contract.preview": "Contract Previewed",
    "contract.override_applied": "Override Applied",
    "contract.approved": "Contract Approved",
    "contract.rejected": "Contract Rejected",
    "contract.approval_revoked": "Approval Revoked",
    "generation.requested": "Generation Requested",
    "generation.blocked": "Generation Blocked",
    "generation.started": "Generation Started",
    "generation.completed": "Generation Completed",
    "generation.failed": "Generation Failed",
  };
  return labels[action] || action;
}

function getStatusColor(status: string | undefined): "success" | "error" | "warning" | "info" | "default" {
  switch (status) {
    case "approved": return "success";
    case "rejected": return "error";
    case "invalid": return "error";
    case "valid": return "warning";
    case "pending_review": return "info";
    default: return "default";
  }
}

// ============================================================================
// Component
// ============================================================================

const AdminContractReviewPage: React.FC = () => {
  const { briefId } = useParams<{ briefId: string }>();
  const navigate = useNavigate();

  // Data state
  const [brief, setBrief] = useState<StoryBrief | null>(null);
  const [contract, setContract] = useState<GenerationContract | null>(null);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action state
  const [approving, setApproving] = useState(false);
  const [applyingOverride, setApplyingOverride] = useState(false);

  // Reject dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Override UI
  const [selectedCopingTool, setSelectedCopingTool] = useState<string>("");
  const [overrideReason, setOverrideReason] = useState<string>("");

  // Audit history visibility
  const [showAuditHistory, setShowAuditHistory] = useState(false);

  // Approval notes
  const [approvalNotes, setApprovalNotes] = useState("");

  // ──────────────────────────────────────────────────────────
  // Load data
  // ──────────────────────────────────────────────────────────
  useEffect(() => {
    const loadContract = async () => {
      if (!briefId) {
        setError("Brief ID is required");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Load brief
        const briefData = await fetchStoryBriefById(briefId);
        setBrief(briefData);

        // Load persisted contract first, fall back to preview if none exists
        let contractData = await fetchFullContract(briefId);
        if (!contractData) {
          // No persisted contract yet — use preview
          contractData = await previewContract(briefData, briefId);
        }
        setContract(contractData);

        // Set initial coping tool selection
        if (contractData.overrideUsed && contractData.overrideDetails?.copingToolId) {
          setSelectedCopingTool(contractData.overrideDetails.copingToolId as string);
        } else if (contractData.allowedCopingTools.length > 0) {
          setSelectedCopingTool(contractData.allowedCopingTools[0]);
        }

        // Load audit history
        try {
          const history = await fetchAuditHistory(briefId, 20);
          setAuditHistory(history);
        } catch {
          // Audit history is supplementary — don't block on failure
        }
      } catch (err: any) {
        setError(err.message || "Failed to load contract");
      } finally {
        setLoading(false);
      }
    };

    loadContract();
  }, [briefId]);

  // ──────────────────────────────────────────────────────────
  // Handlers
  // ──────────────────────────────────────────────────────────

  const handleApprove = async () => {
    if (!briefId) return;

    try {
      setApproving(true);
      setError(null);

      // Call backend approval endpoint
      const result = await apiApproveContract(briefId, approvalNotes || undefined);

      // Update local state to reflect approval
      setContract((prev) =>
        prev
          ? {
              ...prev,
              status: "approved",
              approval: result.approval,
            }
          : prev
      );

      // Refresh audit history
      try {
        const history = await fetchAuditHistory(briefId, 20);
        setAuditHistory(history);
      } catch {
        // Non-blocking
      }
    } catch (err: any) {
      setError(err.message || "Failed to approve contract");
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!briefId || !rejectReason.trim()) return;

    try {
      setRejecting(true);
      setError(null);

      await apiRejectContract(briefId, rejectReason.trim());

      // Update local state
      setContract((prev) =>
        prev ? { ...prev, status: "rejected" } : prev
      );

      setRejectDialogOpen(false);
      setRejectReason("");

      // Refresh audit history
      try {
        const history = await fetchAuditHistory(briefId, 20);
        setAuditHistory(history);
      } catch {
        // Non-blocking
      }
    } catch (err: any) {
      setError(err.message || "Failed to reject contract");
    } finally {
      setRejecting(false);
    }
  };

  const handleApplyOverride = async () => {
    if (!briefId || !selectedCopingTool) {
      setError("Coping tool selection is required");
      return;
    }

    try {
      setApplyingOverride(true);
      setError(null);

      const updatedContract = await applyContractOverride(briefId, {
        copingToolId: selectedCopingTool,
        reason: overrideReason || undefined,
      });

      setContract(updatedContract);

      if (updatedContract.overrideDetails?.copingToolId) {
        setSelectedCopingTool(updatedContract.overrideDetails.copingToolId as string);
      }
      setOverrideReason("");

      // Refresh audit history
      try {
        const history = await fetchAuditHistory(briefId, 20);
        setAuditHistory(history);
      } catch {
        // Non-blocking
      }
    } catch (err: any) {
      setError(err.message || "Failed to apply override");
    } finally {
      setApplyingOverride(false);
    }
  };

  const handleProceedToGeneration = () => {
    // Only navigate if contract is approved (belt-and-suspenders with backend guard)
    if (contract?.status === "approved") {
      navigate(`/specialist/generate-draft?briefId=${briefId}`);
    }
  };

  // ──────────────────────────────────────────────────────────
  // Derived state
  // ──────────────────────────────────────────────────────────

  const isApproved = contract?.status === "approved";
  const isRejected = contract?.status === "rejected";
  const isApprovable =
    contract?.status === "valid" || contract?.status === "pending_review";
  const hasErrors = (contract?.errors?.length ?? 0) > 0;

  const overrideToolId =
    contract?.overrideUsed && contract.overrideDetails?.copingToolId
      ? typeof contract.overrideDetails.copingToolId === "string"
        ? contract.overrideDetails.copingToolId
        : null
      : null;

  // ──────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────

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

      {/* Header with status */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
        <Typography variant="h4">Contract Review</Typography>
        <Chip
          label={formatDisplayText(contract.status || "unknown")}
          color={getStatusColor(contract.status)}
          size="medium"
        />
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Review the generation contract before approving story generation
      </Typography>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Approval status banner */}
      {isApproved && contract.approval && (
        <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 3 }}>
          <Typography variant="subtitle2">
            Approved by {contract.approval.decidedByName}
          </Typography>
          <Typography variant="body2">
            {formatTimestamp(contract.approval.decidedAt)}
            {contract.approval.notes && ` — "${contract.approval.notes}"`}
          </Typography>
        </Alert>
      )}

      {isRejected && contract.approval && (
        <Alert severity="error" icon={<CancelIcon />} sx={{ mb: 3 }}>
          <Typography variant="subtitle2">
            Rejected by {contract.approval.decidedByName}
          </Typography>
          <Typography variant="body2">
            Reason: {contract.approval.notes || "No reason provided"}
          </Typography>
        </Alert>
      )}

      {/* Override re-approval warning */}
      {contract.previousApprovalRevoked && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          A previous approval was revoked because an override was applied.
          The contract must be re-approved before generation can proceed.
        </Alert>
      )}

      {/* Contract errors */}
      {hasErrors && (
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

      {/* Main content grid */}
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
                <Typography variant="caption" color="text.secondary">Topic</Typography>
                <Typography>{formatDisplayText(brief.therapeuticFocus.primaryTopic)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Situation</Typography>
                <Typography>{formatDisplayText(brief.therapeuticFocus.specificSituation)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Age Group</Typography>
                <Typography>{formatAgeGroup(brief.childProfile.ageGroup)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Emotional Sensitivity</Typography>
                <Typography>{formatDisplayText(brief.childProfile.emotionalSensitivity)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Emotional Goals</Typography>
                <Box sx={{ mt: 0.5 }}>
                  {brief.therapeuticIntent.emotionalGoals.map((goal, idx) => (
                    <Chip key={idx} label={formatDisplayText(goal)} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                  ))}
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Ending Style</Typography>
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
              <Box>
                <Typography variant="caption" color="text.secondary">Length Budget</Typography>
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
              Override the automatically selected coping tool if needed.
              {isApproved && (
                <strong> Applying an override will revoke the current approval and require re-review.</strong>
              )}
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

        {/* Approval Actions */}
        <Box sx={{ gridColumn: { xs: "1", md: "1 / -1" } }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Approval Decision
            </Typography>

            {isApprovable && !hasErrors && (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Review the contract above. Approve to allow story generation, or reject with a reason.
                </Typography>

                <TextField
                  label="Approval notes (optional)"
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Any notes about this approval..."
                  fullWidth
                  sx={{ mb: 2 }}
                />

                <Stack direction="row" spacing={2}>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircleIcon />}
                    onClick={handleApprove}
                    disabled={approving}
                  >
                    {approving ? <CircularProgress size={20} /> : "Approve Contract"}
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<CancelIcon />}
                    onClick={() => setRejectDialogOpen(true)}
                  >
                    Reject Contract
                  </Button>
                </Stack>
              </>
            )}

            {isApproved && (
              <Stack spacing={2}>
                <Alert severity="success">
                  This contract is approved. You can proceed to story generation.
                </Alert>
                <Button
                  variant="contained"
                  onClick={handleProceedToGeneration}
                >
                  Proceed to Generation
                </Button>
              </Stack>
            )}

            {isRejected && (
              <Alert severity="info">
                This contract was rejected. Update the brief and rebuild the contract to try again.
              </Alert>
            )}

            {hasErrors && !isApproved && !isRejected && (
              <Alert severity="error">
                Contract has errors and cannot be approved. Fix the brief and rebuild.
              </Alert>
            )}
          </Paper>
        </Box>

        {/* Audit History */}
        <Box sx={{ gridColumn: { xs: "1", md: "1 / -1" } }}>
          <Button
            startIcon={<HistoryIcon />}
            onClick={() => setShowAuditHistory(!showAuditHistory)}
            sx={{ mb: 1 }}
          >
            {showAuditHistory ? "Hide" : "Show"} Audit History ({auditHistory.length})
          </Button>

          <Collapse in={showAuditHistory}>
            <Paper sx={{ p: 2 }}>
              {auditHistory.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No audit events recorded yet.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {auditHistory.map((entry: any) => (
                    <Box
                      key={entry.id}
                      sx={{
                        p: 1.5,
                        borderLeft: 3,
                        borderColor:
                          entry.action.includes("approved") ? "success.main" :
                          entry.action.includes("rejected") || entry.action.includes("blocked") ? "error.main" :
                          entry.action.includes("revoked") ? "warning.main" :
                          "grey.300",
                        bgcolor: "grey.50",
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="subtitle2">
                        {formatAuditAction(entry.action)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {entry.actor.displayName} ({entry.actor.role}) — {formatTimestamp(entry.timestamp)}
                      </Typography>
                      {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                        <Typography variant="caption" color="text.secondary" component="pre" sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}>
                          {JSON.stringify(entry.metadata, null, 2)}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </Paper>
          </Collapse>
        </Box>

        {/* Navigation */}
        <Box sx={{ gridColumn: { xs: "1", md: "1 / -1" } }}>
          <Divider sx={{ my: 2 }} />
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button variant="outlined" onClick={() => navigate(-1)}>
              Back
            </Button>
          </Stack>
        </Box>
      </Box>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Contract</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Please provide a reason for rejecting this contract. This is required for clinical accountability
            and will be recorded in the audit trail.
          </Typography>
          <TextField
            label="Rejection reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Explain why this contract should not proceed to generation..."
            multiline
            rows={3}
            fullWidth
            required
            error={rejectReason.trim().length === 0 && rejecting}
            helperText={rejectReason.trim().length === 0 ? "Required" : ""}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleReject}
            disabled={rejecting || rejectReason.trim().length === 0}
          >
            {rejecting ? <CircularProgress size={20} /> : "Confirm Rejection"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminContractReviewPage;
