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

import React, { useEffect, useState, Fragment, useCallback } from "react";
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import HistoryIcon from "@mui/icons-material/History";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import InfoIcon from "@mui/icons-material/Info";
import SpecialistNav from "../components/SpecialistNav";
import {
  fetchStoryBriefById,
  previewContract,
  fetchFullContract,
  buildContract,
  applyContractOverride,
  approveContract as apiApproveContract,
  rejectContract as apiRejectContract,
  fetchAuditHistory,
  StoryBrief,
  GenerationContract,
} from "../api/api";

// ============================================================================
// Constants
// ============================================================================

const REQUIRED_ELEMENTS_DISPLAY_LIMIT = 10;
const MUST_AVOID_DISPLAY_LIMIT = 20;
const AUDIT_HISTORY_LIMIT = 20;

// ============================================================================
// Type Definitions
// ============================================================================

interface AuditEntry {
  id: string;
  action: string;
  actor: {
    uid: string;
    email: string;
    displayName: string;
    role: string;
  };
  resourceType: "storyBrief" | "generationContract" | "storyDraft" | string;
  resourceId: string;
  relatedResourceId?: string;
  metadata?: Record<string, unknown>;
  timestamp: string | { seconds: number; nanoseconds: number } | Date;
}

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

/**
 * Normalizes various Firestore timestamp formats to a string for display.
 * Handles:
 * - string ISO dates
 * - Date objects
 * - Firestore Timestamp objects (with toDate() method)
 * - Objects with seconds property ({ seconds: number, nanoseconds?: number })
 * - Objects with _seconds property (JSON serialized: { _seconds: number, _nanoseconds?: number })
 * - undefined/null
 */
function normalizeTimestamp(ts: unknown): string | undefined {
  if (!ts) return undefined;
  
  // String ISO date
  if (typeof ts === "string") return ts;
  
  // Date object
  if (ts instanceof Date) return ts.toISOString();
  
  // Firestore Timestamp object (has toDate method)
  if (typeof ts === "object" && ts !== null && "toDate" in ts && typeof (ts as any).toDate === "function") {
    return (ts as any).toDate().toISOString();
  }
  
  // Object with seconds property (Firestore Timestamp format)
  if (typeof ts === "object" && ts !== null) {
    if ("seconds" in ts && typeof (ts as any).seconds === "number") {
      return new Date((ts as any).seconds * 1000).toISOString();
    }
    // JSON serialized format with underscore prefix
    if ("_seconds" in ts && typeof (ts as any)._seconds === "number") {
      return new Date((ts as any)._seconds * 1000).toISOString();
    }
  }
  
  return undefined;
}

function formatTimestamp(ts: string | undefined): string {
  if (!ts) return "—";
  try {
    const date = new Date(ts);
    // Format: D.M.YYYY, HH:mm:ss (e.g., "4.3.2026, 20:49:51")
    const day = date.getDate();
    const month = date.getMonth() + 1; // getMonth() returns 0-11
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    return `${day}.${month}.${year}, ${hours}:${minutes}:${seconds}`;
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
    // pending_review removed - use "valid" instead
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
  const [isContractPersisted, setIsContractPersisted] = useState(false);
  const [auditHistory, setAuditHistory] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Action state
  const [building, setBuilding] = useState(false);
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

  // Expandable sections
  const [expandedRequiredElements, setExpandedRequiredElements] = useState(false);
  const [expandedMustAvoid, setExpandedMustAvoid] = useState(false);
  const [expandedMetadata, setExpandedMetadata] = useState(false);

  // ──────────────────────────────────────────────────────────
  // Helper Functions
  // ──────────────────────────────────────────────────────────

  /**
   * Refreshes the audit history for the current brief.
   * Non-blocking - failures are silently ignored.
   */
  const refreshAuditHistory = useCallback(async () => {
    if (!briefId) return;
    try {
      const result = await fetchAuditHistory(briefId, AUDIT_HISTORY_LIMIT);
      setAuditHistory(result.entries);
    } catch {
      // Audit history is supplementary — don't block on failure
    }
  }, [briefId]);

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
        let isPersisted = true;
        if (!contractData) {
          // No persisted contract yet — use preview
          contractData = await previewContract(briefData, briefId);
          isPersisted = false;
        }
        setContract(contractData);
        setIsContractPersisted(isPersisted);

        // Set initial coping tool selection
        if (contractData.overrideUsed && contractData.overrideDetails?.copingToolId) {
          const toolId = contractData.overrideDetails.copingToolId;
          if (typeof toolId === "string") {
            setSelectedCopingTool(toolId);
          }
        } else if (contractData.allowedCopingTools.length > 0) {
          setSelectedCopingTool(contractData.allowedCopingTools[0]);
        }

        // Load audit history
        await refreshAuditHistory();
      } catch (err: any) {
        setError(err.message || "Failed to load contract");
      } finally {
        setLoading(false);
      }
    };

    loadContract();
  }, [briefId, refreshAuditHistory]);

  // ──────────────────────────────────────────────────────────
  // Handlers
  // ──────────────────────────────────────────────────────────

  const handleBuildContract = async () => {
    if (!briefId) return;

    try {
      setBuilding(true);
      setError(null);
      setSuccessMessage(null);

      // Build the contract (saves to database)
      const builtContract = await buildContract(briefId);
      
      // Update local state
      setContract(builtContract);
      setIsContractPersisted(true);
      setSuccessMessage("Contract built successfully!");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);

      // Refresh audit history
      await refreshAuditHistory();
    } catch (err: any) {
      setError(err.message || "Failed to build contract");
      setSuccessMessage(null);
    } finally {
      setBuilding(false);
    }
  };

  const handleApprove = async () => {
    if (!briefId) return;

    try {
      setApproving(true);
      setError(null);
      setSuccessMessage(null);

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

      setSuccessMessage("Contract approved successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);

      // Refresh audit history
      await refreshAuditHistory();
    } catch (err: any) {
      setError(err.message || "Failed to approve contract");
      setSuccessMessage(null);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!briefId || !rejectReason.trim()) return;

    try {
      setRejecting(true);
      setError(null);
      setSuccessMessage(null);

      await apiRejectContract(briefId, rejectReason.trim());

      // Fetch the updated contract to get the approval record
      const updatedContract = await fetchFullContract(briefId);
      if (updatedContract) {
        setContract(updatedContract);
      } else {
        // Fallback: update status only if fetch fails
        setContract((prev) =>
          prev ? { ...prev, status: "rejected" } : prev
        );
      }

      setRejectDialogOpen(false);
      setRejectReason("");
      setSuccessMessage("Contract rejected successfully.");
      setTimeout(() => setSuccessMessage(null), 3000);

      // Refresh audit history
      await refreshAuditHistory();
    } catch (err: any) {
      setError(err.message || "Failed to reject contract");
      setSuccessMessage(null);
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
      setSuccessMessage(null);

      const updatedContract = await applyContractOverride(briefId, {
        copingToolId: selectedCopingTool,
        reason: overrideReason || undefined,
      });

      setContract(updatedContract);

      if (updatedContract.overrideDetails?.copingToolId) {
        const toolId = updatedContract.overrideDetails.copingToolId;
        if (typeof toolId === "string") {
          setSelectedCopingTool(toolId);
        }
      }
      setOverrideReason("");

      if (updatedContract.previousApprovalRevoked) {
        setSuccessMessage("Override applied. Previous approval was revoked - contract requires re-approval.");
      } else {
        setSuccessMessage("Override applied successfully!");
      }
      setTimeout(() => setSuccessMessage(null), 5000);

      // Refresh audit history
      await refreshAuditHistory();
    } catch (err: any) {
      setError(err.message || "Failed to apply override");
      setSuccessMessage(null);
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
  // Only valid contracts can be approved
  const isApprovable = contract?.status === "valid";
  const hasErrors = (contract?.errors?.length ?? 0) > 0;
  // A contract cannot be approved if it has errors, regardless of status
  const canApprove = isApprovable && !hasErrors && isContractPersisted;

  // Override message helper
  const overrideMessage = contract && contract.overrideUsed && contract.overrideDetails?.copingToolId
    ? (() => {
        const toolId = contract.overrideDetails!.copingToolId;
        const toolText = typeof toolId === "string" ? formatDisplayText(toolId) : String(toolId);
        const reason = contract.overrideDetails!.reason;
        const reasonText = typeof reason === "string" ? reason : "";
        return `Tool: ${toolText}${reasonText ? ` — Reason: ${reasonText}` : ""}`;
      })()
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

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {/* Build Contract Alert - shown when contract is not persisted */}
      {!isContractPersisted && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Contract Preview
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            This is a preview of the contract. You need to build and save it before you can approve it.
          </Typography>
          <Button
            variant="contained"
            onClick={handleBuildContract}
            disabled={building}
            startIcon={building ? <CircularProgress size={16} /> : null}
          >
            {building ? "Building Contract..." : "Build Contract"}
          </Button>
        </Alert>
      )}

      {/* Approval status banner */}
      {isApproved && contract.approval && (
        <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 3 }}>
          <Typography variant="subtitle2">
            Approved by {contract.approval.decidedByName}
          </Typography>
          <Typography variant="body2">
            {formatTimestamp(normalizeTimestamp(contract.approval.decidedAt))}
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
              {contract.keyMessage && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Key Message</Typography>
                  <Typography>{contract.keyMessage}</Typography>
                </Box>
              )}
              <Box>
                <Typography variant="caption" color="text.secondary">Caregiver Presence</Typography>
                <Typography>{formatDisplayText(contract.caregiverPresence || brief.storyPreferences.caregiverPresence)}</Typography>
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
                  {(expandedRequiredElements ? contract.requiredElements : contract.requiredElements.slice(0, REQUIRED_ELEMENTS_DISPLAY_LIMIT)).map((elem, idx) => (
                    <Chip key={idx} label={formatDisplayText(elem)} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                  ))}
                  {contract.requiredElements.length > REQUIRED_ELEMENTS_DISPLAY_LIMIT && (
                    <Button
                      size="small"
                      onClick={() => setExpandedRequiredElements(!expandedRequiredElements)}
                      sx={{ mt: 0.5, textTransform: "none" }}
                    >
                      {expandedRequiredElements ? "Show Less" : `+${contract.requiredElements.length - REQUIRED_ELEMENTS_DISPLAY_LIMIT} more`}
                    </Button>
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
                  Must Avoid ({contract.mustAvoid.length} items)
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  {(expandedMustAvoid ? contract.mustAvoid : contract.mustAvoid.slice(0, MUST_AVOID_DISPLAY_LIMIT)).map((item, idx) => (
                    <Chip
                      key={idx}
                      label={formatDisplayText(item)}
                      size="small"
                      color="error"
                      variant="outlined"
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  ))}
                  {contract.mustAvoid.length > MUST_AVOID_DISPLAY_LIMIT && (
                    <Button
                      size="small"
                      onClick={() => setExpandedMustAvoid(!expandedMustAvoid)}
                      sx={{ mt: 0.5, textTransform: "none" }}
                    >
                      {expandedMustAvoid ? "Show Less" : `+${contract.mustAvoid.length - MUST_AVOID_DISPLAY_LIMIT} more`}
                    </Button>
                  )}
                </Box>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Style Rules Section */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Style Rules
            </Typography>
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">Max Sentence Words</Typography>
                <Typography>{contract.styleRules.maxSentenceWords} words per sentence</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Dialogue Policy</Typography>
                <Typography>{formatDisplayText(contract.styleRules.dialoguePolicy)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Abstract Concepts</Typography>
                <Typography>{formatDisplayText(contract.styleRules.abstractConcepts)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Emotional Tone</Typography>
                <Typography>{formatDisplayText(contract.styleRules.emotionalTone)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Language Complexity</Typography>
                <Typography>{formatDisplayText(contract.styleRules.languageComplexity)}</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Ending Requirements Section */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Ending Requirements
            </Typography>
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">Ending Style</Typography>
                <Typography>{formatDisplayText(contract.endingContract.endingStyle)}</Typography>
              </Box>
              {contract.endingContract.mustInclude.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Must Include ({contract.endingContract.mustInclude.length})
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {contract.endingContract.mustInclude.map((item, idx) => (
                      <Chip key={idx} label={formatDisplayText(item)} size="small" sx={{ mr: 0.5, mb: 0.5 }} color="success" />
                    ))}
                  </Box>
                </Box>
              )}
              <Box>
                <Typography variant="caption" color="text.secondary">Requirements</Typography>
                <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                  <Chip
                    label={contract.endingContract.requiresEmotionalStability ? "Requires Emotional Stability" : "No Emotional Stability Requirement"}
                    size="small"
                    color={contract.endingContract.requiresEmotionalStability ? "success" : "default"}
                    variant={contract.endingContract.requiresEmotionalStability ? "filled" : "outlined"}
                    sx={{ width: "fit-content" }}
                  />
                  <Chip
                    label={contract.endingContract.requiresSuccessMoment ? "Requires Success Moment" : "No Success Moment Requirement"}
                    size="small"
                    color={contract.endingContract.requiresSuccessMoment ? "success" : "default"}
                    variant={contract.endingContract.requiresSuccessMoment ? "filled" : "outlined"}
                    sx={{ width: "fit-content" }}
                  />
                  <Chip
                    label={contract.endingContract.requiresSafeClosure ? "Requires Safe Closure" : "No Safe Closure Requirement"}
                    size="small"
                    color={contract.endingContract.requiresSafeClosure ? "success" : "default"}
                    variant={contract.endingContract.requiresSafeClosure ? "filled" : "outlined"}
                    sx={{ width: "fit-content" }}
                  />
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Metadata Section (Collapsible) */}
        <Box sx={{ gridColumn: { xs: "1", md: "1 / -1" } }}>
          <Accordion expanded={expandedMetadata} onChange={() => setExpandedMetadata(!expandedMetadata)}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={1} alignItems="center">
                <InfoIcon fontSize="small" />
                <Typography variant="subtitle2">Contract Metadata</Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Rules Version</Typography>
                  <Typography>{contract.rulesVersionUsed || "Not specified"}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Contract ID</Typography>
                  <Typography variant="body2" sx={{ fontFamily: "monospace" }}>{briefId}</Typography>
                </Box>
                {contract.lengthBudget.targetWords && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Target Words</Typography>
                    <Typography>{contract.lengthBudget.targetWords} words</Typography>
                  </Box>
                )}
                {contract.createdAt && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Created At</Typography>
                    <Typography>{formatTimestamp(normalizeTimestamp(contract.createdAt))}</Typography>
                  </Box>
                )}
                {contract.updatedAt && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Updated At</Typography>
                    <Typography>{formatTimestamp(normalizeTimestamp(contract.updatedAt))}</Typography>
                  </Box>
                )}
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Box>

        {/* Override Section */}
        <Box sx={{ gridColumn: { xs: "1", md: "1 / -1" } }}>
          <Paper sx={{ p: 3 }}>
            <Fragment>
              <Typography variant="h6" gutterBottom>
                Override Coping Tool
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Override the automatically selected coping tool if needed.
                {isApproved && (
                  <span> <strong>Applying an override will revoke the current approval and require re-review.</strong></span>
                )}
              </Typography>
              {overrideMessage && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">Current Override Active</Typography>
                  <Typography variant="body2">{overrideMessage}</Typography>
                </Alert>
              )}
              <Stack spacing={2} direction={{ xs: "column", sm: "row" }} alignItems="flex-start">
              <FormControl sx={{ minWidth: 250 }}>
                <InputLabel>Coping Tool</InputLabel>
                <Select
                  value={selectedCopingTool}
                  onChange={(e) => setSelectedCopingTool(e.target.value)}
                  label="Coping Tool"
                >
                  {/* TODO: Issue 14 - Currently only shows goal-derived tools.
                      For a true override, we should show ALL age-compatible tools from clinical rules,
                      with goal-derived ones marked as "recommended". This requires a new API endpoint
                      to fetch all age-compatible coping tools for the contract's age band. */}
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
            </Fragment>
          </Paper>
        </Box>

        {/* Approval Actions */}
        <Box sx={{ gridColumn: { xs: "1", md: "1 / -1" } }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Approval Decision
            </Typography>

            {canApprove && (
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
                <Stack spacing={2}>
                  {auditHistory.map((entry) => (
                    <Box
                      key={entry.id}
                      sx={{
                        p: 2,
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
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {formatAuditAction(entry.action)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {entry.actor.displayName} ({entry.actor.role}) — {formatTimestamp(normalizeTimestamp(entry.timestamp))}
                      </Typography>
                      {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                        <Box
                          component="pre"
                          sx={{
                            mt: 1,
                            p: 1.5,
                            bgcolor: "background.paper",
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: 1,
                            fontSize: "0.75rem",
                            fontFamily: "monospace",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            color: "text.secondary",
                            margin: 0,
                          }}
                        >
                          {JSON.stringify(entry.metadata, null, 2)}
                        </Box>
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
