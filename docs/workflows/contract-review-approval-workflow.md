# Contract Review and Approval Workflow

## Overview
This document describes the complete workflow for reviewing and approving generation contracts, from brief creation to story generation.

## Workflow States

### Contract Status Lifecycle
```
invalid → valid → approved → [generation allowed]
                ↓
            rejected → [must rebuild] → valid (archived to history)
```

**Status Definitions:**
- `invalid`: Contract has validation errors, cannot be approved
- `valid`: Contract built successfully, awaiting review
- `approved`: Specialist approved — generation is allowed (with expiry check)
- `rejected`: Specialist rejected — generation is blocked

**Note:** `pending_review` was removed as it was an undefined alias for `valid`. All contracts awaiting review use `valid` status.

---

## Step-by-Step Workflow

### 1. Brief Creation
**Location:** `client/src/pages/AdminStoryBriefForm.tsx` → `POST /api/admin/story-briefs`

**Process:**
1. Specialist fills out story brief form
2. `createStoryBrief` controller:
   - Validates input
   - Sets `createdBy` from authenticated user (`req.user.uid`) — **NOT from request body**
   - Creates brief with status `"created"`
   - Logs `"brief.created"` to audit trail
   - Returns brief with ID

**Audit Trail:**
```json
{
  "action": "brief.created",
  "actor": { "uid": "...", "email": "...", "displayName": "...", "role": "specialist" },
  "resourceType": "storyBrief",
  "resourceId": "<briefId>",
  "metadata": { "topic": "...", "ageGroup": "..." }
}
```

---

### 2. Navigate to Contract Review Page
**Location:** `client/src/pages/AdminContractReviewPage.tsx`

**URL:** `/specialist/story-briefs/:briefId/contract`

**Process:**
1. Page loads and calls `useEffect`
2. Loads brief: `fetchStoryBriefById(briefId)`
3. **Tries to load persisted contract:**
   - `fetchFullContract(briefId)` → `GET /api/agent1/contracts/:briefId/full`
   - If contract exists → use it
   - If contract doesn't exist → fall back to `previewContract()` (doesn't save)
4. Sets `isContractPersisted` flag
5. Loads audit history: `fetchAuditHistory(briefId)`

**UI States:**
- If `!isContractPersisted`: Shows "Build Contract" button
- If `isContractPersisted && status === "valid"`: Shows "Approve" / "Reject" buttons
- If `status === "approved"`: Shows "Proceed to Generation" button
- If `status === "rejected"`: Shows rejection reason, no actions available

---

### 3. Build Contract (if not persisted)
**Location:** `client/src/pages/AdminContractReviewPage.tsx` → `handleBuildContract()`

**API:** `POST /api/admin/story-briefs/:briefId/build-contract`

**Process:**
1. Calls `buildContract(briefId)` API
2. Backend (`buildContract` controller):
   - Calls `buildGenerationContractFromBriefId(briefId)`
   - Validates brief against clinical rules
   - Applies age-appropriate constraints
   - Generates contract with status `"valid"` or `"invalid"`
   - Saves to Firestore: `generationContracts/{briefId}`
   - Logs `"contract.built"` to audit trail
   - Reads contract back from Firestore to get resolved timestamps
   - Serializes timestamps to ISO strings
   - Returns contract
3. Client updates state:
   - Sets `contract` state
   - Sets `isContractPersisted = true`
   - Refreshes audit history

**Audit Trail:**
```json
{
  "action": "contract.built",
  "actor": { ... },
  "resourceType": "generationContract",
  "resourceId": "<briefId>",
  "metadata": {
    "status": "valid",
    "rulesVersionUsed": "v1",
    "errorCount": 0,
    "warningCount": 0
  }
}
```

---

### 4. Review Contract
**Location:** `client/src/pages/AdminContractReviewPage.tsx`

**Display Sections:**
1. **Validation Alerts**: Shows `contract.errors` and `contract.warnings`
2. **Brief Summary Card**: Read-only fields from original brief
3. **Contract Details Card**: Read-only contract fields
4. **Style Rules Section**: Language complexity, dialogue policy, etc.
5. **Ending Requirements Section**: Ending style, must include/avoid
6. **Metadata Section** (collapsible): Rules version, contract ID, timestamps
7. **Override Section**: Allows specialist to override coping tool selection
8. **Approval Actions**: Approve/Reject buttons (only if `canApprove`)
9. **Audit History** (collapsible): Shows all audit events

**Approval Conditions (`canApprove`):**
```typescript
const canApprove =
  (contract.status === "valid" || contract.status === "pending_review") &&
  !hasErrors &&
  isContractPersisted;
```

---

### 5. Apply Override (Optional)
**Location:** `client/src/pages/AdminContractReviewPage.tsx` → `handleApplyOverride()`

**API:** `POST /api/agent1/contracts/:briefId/override`

**Process:**
1. Specialist selects different coping tool from dropdown
2. Optionally provides reason
3. Calls `applyContractOverride(briefId, { copingToolId, reason })`
4. Backend (`applyOverride` controller):
   - Validates coping tool is age-compatible
   - **Checks if contract was previously approved:**
     - If `status === "approved"` → logs `"contract.approval_revoked"`
     - Sets contract status back to `"valid"` (requires re-approval)
   - Updates brief with override
   - Regenerates contract with new coping tool
   - **Safety check:** If regenerated contract somehow has `status === "approved"`, forces it back to `"valid"`
   - Logs `"contract.override_applied"` to audit trail
   - Returns updated contract
5. Client updates state and refreshes audit history

**Important:** Override **revokes approval** if contract was already approved. This ensures specialist reviews the new contract.

**Audit Trail:**
```json
{
  "action": "contract.approval_revoked",
  "actor": { ... },
  "resourceType": "generationContract",
  "resourceId": "<briefId>",
  "metadata": {
    "reason": "override_applied",
    "previousApproval": { ... },
    "overrideCopingToolId": "..."
  }
}
```

---

### 6. Approve Contract
**Location:** `client/src/pages/AdminContractReviewPage.tsx` → `handleApprove()`

**API:** `POST /api/agent1/contracts/:briefId/approve`

**Preconditions (enforced by backend):**
- Contract must exist
- Contract status must be `"valid"`
- Contract must have zero errors
- User must be authenticated (specialist or admin)

**Approval Expiry:**
- Approvals expire after 7 days (configurable)
- Expired approvals require re-approval before generation
- Expiry timestamp is stored in `approval.expiresAt`

**Process:**
1. Calls `apiApproveContract(briefId, approvalNotes)`
2. Backend (`approveContract` controller):
   - Loads contract from Firestore
   - **Validates preconditions:**
     - Status check: `["valid", "pending_review"].includes(status)`
     - Error check: `errors.length === 0`
   - Builds approval record with expiry (default: 7 days):
     ```typescript
     {
       decision: "approved",
       decidedBy: user.uid,
       decidedByName: user.displayName,
       decidedByEmail: user.email,
       decidedAt: FieldValue.serverTimestamp(),
       expiresAt: Timestamp.fromDate(expiresDate), // 7 days from now
       notes?: string
     }
     ```
   - Updates contract atomically using Firestore transaction:
     - Preserves `previousApprovals` array (adds current approval if exists)
     - Sets `status: "approved"`
     - Sets `approval: approvalRecord`
     - Creates audit entry in same transaction
   - Returns approval record
3. Client updates state:
   - Sets `contract.status = "approved"`
   - Sets `contract.approval = approvalRecord`
   - Shows success message
   - Refreshes audit history
   - "Proceed to Generation" button becomes enabled

**Audit Trail:**
```json
{
  "action": "contract.approved",
  "actor": { ... },
  "resourceType": "generationContract",
  "resourceId": "<briefId>",
  "metadata": {
    "rulesVersionUsed": "v1",
    "errorCount": 0,
    "warningCount": 0,
    "notes": "..."
  }
}
```

---

### 7. Reject Contract (Alternative to Approval)
**Location:** `client/src/pages/AdminContractReviewPage.tsx` → `handleReject()`

**API:** `POST /api/agent1/contracts/:briefId/reject`

**Preconditions:**
- Contract must exist
- Contract status must be `"valid"`
- Rejection reason is **required**

**Process:**
1. Opens rejection dialog
2. Specialist enters required reason
3. Calls `apiRejectContract(briefId, reason)`
4. Backend (`rejectContract` controller):
   - Validates preconditions
   - Builds approval record with `decision: "rejected"`
   - Updates contract atomically using Firestore transaction:
     - Preserves `previousApprovals` array
     - Sets `status: "rejected"`
     - Sets `approval: approvalRecord`
     - Creates audit entry in same transaction
5. Client updates state and shows rejection message

**Important:** Rejected contracts cannot be approved. When rebuilding after rejection:
- The rejected contract is archived to `generationContracts/{briefId}/history/{historyId}`
- The new contract replaces the rejected one
- Audit trail preserves the full history

---

### 8. Generate Story Draft (After Approval)
**Location:** `client/src/pages/AdminContractReviewPage.tsx` → `handleProceedToGeneration()`

**Navigation:** Navigates to `/specialist/generate-draft?briefId=<briefId>`

**API:** `POST /api/admin/story-briefs/:briefId/generate-draft`

**Multi-Layer Protection:**
1. **`requireAuth`** (middleware): Verifies Firebase ID token, populates `req.user`
2. **`requireRole("specialist", "admin")`** (middleware): Verifies user has required role
3. **`requireApprovedContract`** (middleware): **CRITICAL GATE**
   - Loads contract from Firestore
   - **Check 1:** Contract must exist
   - **Check 2:** `contract.status === "approved"`
   - **Check 3:** Contract must have zero errors
   - **Check 4:** Rules version currency — `contract.rulesVersionUsed` must match current default version
   - **Check 5:** Approval expiry — `approval.expiresAt` must not be in the past
   - If any check fails:
     - Logs `"generation.blocked"` with structured reason code (e.g., `CONTRACT_NOT_APPROVED`, `CONTRACT_RULES_OUTDATED`, `CONTRACT_APPROVAL_EXPIRED`)
     - Returns 403 with specific error message
   - If all checks pass: Attaches `req.approvedContract` to request

**Process:**
1. Generation guard middleware verifies approval
2. `generateDraftFromBrief` controller:
   - Logs `"generation.started"` to audit trail
   - Generates story draft using LLM
   - Creates draft document in Firestore
   - Logs `"generation.completed"` on success
   - Logs `"generation.failed"` on error

**Error Handling:**
- If contract not found → 404: "Generation contract not found" (`CONTRACT_NOT_FOUND`)
- If contract not approved → 403: "Generation not authorized" with status-specific message (`CONTRACT_NOT_APPROVED`)
- If contract has errors → 403: "Contract has errors" (`CONTRACT_HAS_ERRORS`)
- If contract is rejected → 403: "Contract was rejected" with rejection reason (`CONTRACT_REJECTED`)
- If rules version outdated → 403: "Contract rules version outdated" (`CONTRACT_RULES_OUTDATED`)
- If approval expired → 403: "Contract approval expired" (`CONTRACT_APPROVAL_EXPIRED`)

All blocking events are logged with structured `reason` codes for audit analysis.

---

## Security & Governance

### Backend Enforcement
All critical operations are enforced at the backend level:

1. **Authentication:** `requireAuth` middleware on all routes
2. **Authorization:** `requireRole` middleware for mutations
3. **Approval Gate:** `requireApprovedContract` middleware for generation
   - Checks contract status
   - Validates rules version currency
   - Enforces approval expiry
   - Uses structured blocking reason codes
4. **Audit Trail:** All actions logged immutably with atomic writes

### Generation Guard Layers

**Layer 1: Authentication** (`requireAuth`)
- Protects against: Unauthenticated access
- Does NOT protect against: Stale sessions, token theft

**Layer 2: Authorization** (`requireRole`)
- Protects against: Unauthorized roles
- Does NOT protect against: Self-approval, cross-organization access (if multi-tenancy added)

**Layer 3: Approval Gate** (`requireApprovedContract`)
- Protects against: Unapproved contracts, contracts with errors, rejected contracts
- **NEW:** Protects against: Stale rules versions, expired approvals
- Does NOT protect against: Contract belonging to different organization (if multi-tenancy added)

### Client-Side Protection
- Client-side checks are for **UX only**
- Backend always validates and enforces rules
- No client-side bypass possible

### Data Integrity
- `createdBy` is **always** derived from `req.user.uid` (never from request body)
- Contract status transitions are atomic (Firestore transactions)
- Approval records are preserved in `previousApprovals` array (full history)
- Rejected contracts are archived before rebuild (preserves document history)
- Audit trail writes are atomic with state changes (prevents audit gaps)

---

## Edge Cases & Error Handling

### Contract Not Found
- **On review page load:** Falls back to preview mode
- **On build:** Returns 404 error
- **On generation:** Returns 404, logs `"generation.blocked"`

### Contract Has Errors
- **On approval:** Returns 409, prevents approval
- **On generation:** Guard middleware blocks (contract won't be approved anyway)

### Contract Already Approved
- **On override:** 
  - Current approval is moved to `previousApprovals` array with `revokedAt` and `revokedReason`
  - Status set to `"valid"`, requires re-approval
  - Override reason is **required** if contract was previously approved
  - Override count is incremented
  - Override is added to `overrideHistory`
- **On regeneration:** Safety check forces status back to `"valid"` if somehow approved

### Contract Rejected
- **On approval attempt:** Returns 409, cannot approve rejected contract
- **On generation:** Guard middleware blocks with rejection reason
- **On rebuild:** Rejected contract is archived to `generationContracts/{briefId}/history/{historyId}` before new contract is saved
- **Resolution:** Update brief and rebuild contract (old rejected contract preserved in history)

### Timestamp Serialization
- Backend serializes Firestore Timestamps to ISO strings
- Client normalizes various timestamp formats
- Handles: Firestore Timestamp objects, Date objects, ISO strings, objects with `seconds`/`_seconds`

---

## Audit Trail Events

All events are logged with:
- `action`: Event type (e.g., `"contract.approved"`)
- `actor`: User who performed the action
- `resourceType`: Type of resource (`"storyBrief"`, `"generationContract"`, `"storyDraft"`)
- `resourceId`: ID of the resource
- `relatedResourceId`: Optional related resource ID
- `metadata`: Action-specific data
- `timestamp`: Server timestamp (automatic)

**Key Events:**
- `brief.created`
- `contract.built`
- `contract.preview`
- `contract.viewed` (when specialist loads persisted contract)
- `contract.override_applied`
- `contract.approval_revoked`
- `contract.approved`
- `contract.rejected`
- `generation.blocked` (with structured reason codes)
- `generation.started`
- `generation.completed`
- `generation.failed`

---

## UI Flow Summary

```
1. Create Brief
   ↓
2. Navigate to Contract Review Page
   ↓
3. [If no contract] Build Contract
   ↓
4. Review Contract Details
   ↓
5. [Optional] Apply Override (revokes approval if exists)
   ↓
6. Approve or Reject Contract
   ↓
7. [If approved] Proceed to Generation
   ↓
8. Generate Story Draft (enforced by guard middleware)
```

---

## Testing Checklist

### Basic Workflow
- [ ] Brief creation logs audit event
- [ ] Contract building saves to Firestore
- [ ] Contract preview doesn't save
- [ ] Contract view logs `contract.viewed` event
- [ ] Approval requires valid status and no errors
- [ ] Rejection requires reason
- [ ] Approval includes expiry timestamp (7 days default)
- [ ] Previous approvals are preserved in `previousApprovals` array

### Override Flow
- [ ] Override revokes approval if contract was approved
- [ ] Override reason required for post-approval overrides
- [ ] Override reason optional for first-time overrides
- [ ] Override count is tracked and incremented
- [ ] Override history is maintained
- [ ] Revoked approval added to `previousApprovals` with revocation metadata

### Generation Guard
- [ ] Generation blocked if contract not found (`CONTRACT_NOT_FOUND`)
- [ ] Generation blocked if contract not approved (`CONTRACT_NOT_APPROVED`)
- [ ] Generation blocked if contract has errors (`CONTRACT_HAS_ERRORS`)
- [ ] Generation blocked if contract rejected (`CONTRACT_REJECTED`)
- [ ] Generation blocked if rules version outdated (`CONTRACT_RULES_OUTDATED`)
- [ ] Generation blocked if approval expired (`CONTRACT_APPROVAL_EXPIRED`)
- [ ] All blocking events use structured reason codes

### Rejection & Rebuild
- [ ] Rejected contract archived to history subcollection before rebuild
- [ ] Rejected contract preserved with `archivedAt` and `archivedReason`
- [ ] New contract replaces rejected one (old one in history)

### Audit Trail
- [ ] Audit writes are atomic with state changes (transactions)
- [ ] Audit history supports pagination (cursor-based)
- [ ] Audit history API returns `hasMore` and `nextCursor`
- [ ] All actions logged to audit trail
- [ ] Timestamps serialize correctly

### Edge Cases
- [ ] Override applied to contract that was never approved (should not revoke non-existent approval)
- [ ] Override with invalid coping tool (should be rejected with specific error)
- [ ] Build contract while a rejected contract already exists (should archive old one)
- [ ] Approval attempted by different specialist than who created brief (should be permitted)
- [ ] Approval attempted on contract whose rules version has been deactivated (should block)
- [ ] Generation attempted after approval has expired (should block)
- [ ] Concurrent approval attempts (transaction should prevent race condition)

---

## Related Files

### Backend
- `server/src/controllers/storyBrief.controller.ts` - Brief and contract building
- `server/src/controllers/contractApproval.controller.ts` - Approval/rejection logic
- `server/src/middleware/generationGuard.middleware.ts` - Approval gate enforcement
- `server/src/services/auditTrail.service.ts` - Audit logging
- `server/src/routes/storyBrief.routes.ts` - Route definitions
- `server/src/routes/agent1.routes.ts` - Contract endpoints

### Frontend
- `client/src/pages/AdminContractReviewPage.tsx` - Review UI
- `client/src/pages/AdminStoryBriefForm.tsx` - Brief creation
- `client/src/api/api.ts` - API client functions

### Models
- `server/src/models/generationContract.model.ts` - Contract data model
- `server/src/models/storyBrief.model.ts` - Brief data model
