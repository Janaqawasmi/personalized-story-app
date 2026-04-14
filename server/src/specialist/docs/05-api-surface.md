# 05 — API Surface

This file specifies the HTTP endpoints the dashboard calls. In the pilot, **none of these endpoints exist on the server** — `LocalDraftStore` handles everything locally. They are documented here so that:

1. The `DraftStore` interface in `03-storage-adapter.md` reflects the eventual server contract from day one (no surprise refactors during the migration).
2. The Firestore migration phase (see `06-migration-plan.md`) can implement the endpoints against this exact spec.
3. The Agent 1 generation endpoint — which **does** exist in some form on the server today via the existing brief submission flow — has a clear target shape.

There are two endpoints that **do exist** in the pilot and are called directly: `POST /api/specialist/stories/:storyId/generate` and the underlying Agent 1 invocation. Everything else is local.

## Auth and gating

All endpoints under `/api/specialist/*` are gated by:

- `requireAuth` — valid Firebase ID token in the `Authorization: Bearer <token>` header.
- `requireRole('specialist', 'admin')` — the existing role middleware.

No endpoint accepts an unauthenticated request. No endpoint accepts a `clientUid` parameter — the owning user is always the authenticated user. Cross-user access is rejected with 403.

The mounting point in `server/src/app.ts` is:

```ts
app.use('/api/specialist/stories', requireAuth, requireRole('specialist', 'admin'), storiesRouter);
```

## Endpoint list

| Method | Path | Purpose | Pilot? |
|---|---|---|---|
| `POST` | `/api/specialist/stories` | Create a new Story | future |
| `GET` | `/api/specialist/stories` | List Stories owned by the current specialist | future |
| `GET` | `/api/specialist/stories/:storyId` | Fetch a single Story | future |
| `PATCH` | `/api/specialist/stories/:storyId` | Update Story fields (not status, not brief) | future |
| `DELETE` | `/api/specialist/stories/:storyId` | Hard delete (admin only) | future |
| `PUT` | `/api/specialist/stories/:storyId/brief` | Update the brief (only allowed in `draft_brief` status) | future |
| `POST` | `/api/specialist/stories/:storyId/transitions` | Request a status transition | future |
| `POST` | `/api/specialist/stories/:storyId/generate` | Trigger Agent 1 generation | **pilot** |
| `POST` | `/api/specialist/stories/:storyId/regenerate` | Trigger Agent 1 regeneration with feedback | **pilot** |
| `POST` | `/api/specialist/stories/:storyId/revisions` | Create a revision (new Story with `parentStoryId`) | future |

### A note on the "pilot" rows

`POST /api/specialist/stories/:storyId/generate` is the only endpoint the pilot client actually calls — and even then, in the pilot the Story exists only in `localStorage`, so the client sends the full Story payload (not just the ID) and the server treats this as a one-shot generation request without persisting the Story in Firestore. The server stores the Agent 1 result in a transient Firestore collection (`agent1_results`) keyed by client-supplied `storyId`, and the client polls or subscribes for completion.

This is a slight architectural compromise to ship the pilot with localStorage. The migration phase replaces it with a clean version where `POST /api/specialist/stories/:storyId/generate` requires that the Story already exist on the server.

## Endpoint details (future implementations)

### `POST /api/specialist/stories`

**Purpose.** Create a new Story owned by the authenticated specialist.

**Request body:**
```json
{
  "initial": {
    "title": "Optional initial title"
  }
}
```

**Response (200):**
```json
{
  "story": { /* Story object */ }
}
```

**Server behavior.**

1. Mint a UUID.
2. Build a Story with `ownerUid` from the auth context, `status: 'draft_brief'`, `briefStatus: 'draft'`, an empty brief from `createEmptyBrief()`, and the timestamps set to `now`.
3. Append a `story_created` event to `editHistory`.
4. Write to Firestore at `stories/{storyId}`.
5. Return the Story.

**Errors.**
- 401 if no auth.
- 403 if the user lacks the specialist role.
- 500 if Firestore write fails.

---

### `GET /api/specialist/stories`

**Purpose.** List Stories owned by the authenticated specialist.

**Query parameters:**
- `statuses` — comma-separated list of statuses to include. If absent, returns all except `archived`.
- `q` — search query (matches title, tags, brief free-text).
- `sortBy` — one of `lastOpenedAt`, `createdAt`, `title`. Default `lastOpenedAt`.
- `sortDir` — `asc` or `desc`. Default `desc`.
- `limit` — max number of results. Default 100.

**Response (200):**
```json
{
  "stories": [ /* Story[] */ ],
  "total": 47
}
```

**Server behavior.**

1. Build a Firestore query against `stories` collection with `where('ownerUid', '==', uid)`.
2. Apply status filter if present.
3. Apply sort.
4. Apply limit.
5. For server-side search, the pilot implementation can do client-side filtering on the loaded set (we won't have many stories per specialist for a while). When the corpus grows, switch to a search index. The endpoint contract doesn't change.

**Errors.**
- 401, 403, 500 as above.

---

### `GET /api/specialist/stories/:storyId`

**Purpose.** Fetch a single Story.

**Response (200):**
```json
{
  "story": { /* Story object */ }
}
```

**Server behavior.**

1. Read `stories/{storyId}`.
2. Verify `ownerUid` matches the authenticated user. If not, return 404 (not 403 — no information disclosure about whether the story exists).
3. Return the Story.

**Errors.**
- 404 if not found or not owned by the user.

---

### `PATCH /api/specialist/stories/:storyId`

**Purpose.** Update Story fields. Used for title edits, tag changes, `lastOpenedAt` bumps.

**Request body:**
```json
{
  "patch": {
    "title": "New title",
    "tags": ["tag1", "tag2"]
  }
}
```

**Allowed fields:** `title`, `tags`, `lastOpenedAt`, `currentDraft`.
**Forbidden fields:** `status`, `brief`, `agent1Result`, `agent1Versions`, `editHistory`, `ownerUid`, `id`, `parentStoryId`, `createdAt`, `submittedAt`, `approvedAt`. The server returns 400 if the patch contains any forbidden field.

**Response (200):**
```json
{
  "story": { /* updated Story */ }
}
```

**Server behavior.**

1. Read the Story; verify ownership.
2. Validate that the patch contains only allowed fields.
3. If `currentDraft` is in the patch, append a `draft_edited` event to `editHistory` with the snapshot.
4. Apply the patch, bump `updatedAt`, write back.
5. Return the updated Story.

---

### `PUT /api/specialist/stories/:storyId/brief`

**Purpose.** Update the brief on a Story. Only allowed in `draft_brief` status.

**Request body:**
```json
{
  "brief": { /* CompleteBrief */ }
}
```

**Response (200):**
```json
{
  "story": { /* updated Story */ }
}
```

**Server behavior.**

1. Read the Story; verify ownership.
2. Verify `status === 'draft_brief'`. If not, return 409 with body `{ "error": "BRIEF_LOCKED", "message": "Briefs cannot be edited after submission. Open a new revision instead." }`.
3. Validate the brief shape against the brief schema (the existing validation in `dammaStoryBrief.controller.ts`).
4. Update `story.brief`, derive `story.ageRange` from `brief.ageAndScope.ageRange`, bump `updatedAt`.
5. Return the updated Story.

---

### `POST /api/specialist/stories/:storyId/transitions`

**Purpose.** Request a status transition.

**Request body:**
```json
{
  "to": "approved",
  "feedback": "Optional, required for needs_revision transitions"
}
```

**Response (200):**
```json
{
  "story": { /* updated Story */ }
}
```

**Server behavior.**

1. Read the Story; verify ownership.
2. Validate the transition against `ALLOWED_TRANSITIONS` (from `01-data-model.md`). If not allowed, return 409 with body `{ "error": "INVALID_TRANSITION", "message": "Cannot transition from {from} to {to}." }`.
3. Apply transition-specific side effects:
   - `draft_brief → generating`: set `briefStatus: 'submitted'`, `submittedAt: now`. Kick off the Agent 1 generation job (async). The job will eventually transition the Story to `awaiting_review` or back to `draft_brief` depending on outcome.
   - `in_review → needs_revision`: require `feedback` in the request body. Append to `editHistory`. Kick off regeneration.
   - `in_review → approved`: set `approvedAt: now`.
   - `* → archived`: just update status.
4. Append a `status_changed` event to `editHistory`.
5. Bump `updatedAt`.
6. Return the updated Story.

**Errors.**
- 409 if the transition is not allowed.
- 400 if `to === 'needs_revision'` and `feedback` is missing.
- 422 if the Story is in `generating` or `needs_revision` and the user tries to start another generation.

---

### `POST /api/specialist/stories/:storyId/generate` (pilot variant)

**Purpose.** In the pilot, this is the *one* server endpoint the dashboard calls during the brief-to-draft flow. It accepts a brief, runs Agent 1, and returns the result.

**Request body (pilot):**
```json
{
  "story": { /* full Story object from localStorage */ },
  "options": {
    "modelOverride": "claude-opus-4-6"
  }
}
```

**Response (200):**
```json
{
  "agent1Result": { /* Agent1Result */ },
  "updatedStory": { /* Story with agent1Result populated and status updated */ }
}
```

**Server behavior (pilot).**

1. Validate the Story shape.
2. Validate the brief is complete enough to generate (the existing brief validation).
3. Call `generateStoryDraft(story.brief, options)` from `server/src/agent1/index.ts` (the public API defined in the Agent 1 spec).
4. Receive `Agent1Result`.
5. Merge it into the Story: `agent1Result = result`, `agent1Versions = [result]`, `status = 'awaiting_review'`, `briefStatus = 'submitted'`, `submittedAt = now`, append `agent1_generated` event to history.
6. Return the updated Story.

The client receives the updated Story and writes it back to `localStorage`.

**Errors.**
- 400 if the brief is incomplete.
- 502 if Agent 1 fails terminally. Body includes the failure mode (see Agent 1 spec `error-handling.md`).
- 504 if Agent 1 times out (>120 seconds).

**Future variant.** Once the migration to server storage completes, this endpoint changes to take `:storyId` only, look up the Story from Firestore, and update it in place. The client doesn't pass the Story object.

---

### `POST /api/specialist/stories/:storyId/regenerate` (pilot variant)

**Purpose.** Request an Agent 1 regeneration with feedback.

**Request body (pilot):**
```json
{
  "story": { /* full Story */ },
  "feedback": "make the bear more uncertain",
  "previousVersion": 1
}
```

**Response (200):** Same shape as `/generate`.

**Server behavior.**

1. Validate that `agent1Versions.length < 3` (cap from Agent 1 spec).
2. Call `regenerateStoryDraft(story.brief, story.agent1Versions[previousVersion], feedback)` from `server/src/agent1/index.ts`.
3. Receive new `Agent1Result`.
4. Push to `agent1Versions`, set `agent1Result = newResult`, `status = 'awaiting_review'`. Append history event.
5. Return updated Story.

**Errors.**
- 400 if feedback is empty.
- 422 if regeneration cap reached.

---

### `POST /api/specialist/stories/:storyId/revisions`

**Purpose.** Create a new Story that is a revision of an existing one.

**Request body:**
```json
{
  "title": "Optional new title; defaults to '[original title] (revision)'"
}
```

**Response (200):**
```json
{
  "story": { /* the new Story */ }
}
```

**Server behavior.**

1. Read the parent Story; verify ownership.
2. Verify the parent has `briefStatus === 'submitted'` (only submitted briefs can be revised; you can't "revise" something that was never submitted).
3. Mint a new Story:
   - New ID.
   - `ownerUid` from auth.
   - `parentStoryId` set to the parent ID.
   - `title` defaults to `${parent.title} (revision)`.
   - `status: 'draft_brief'`.
   - `briefStatus: 'draft'`.
   - `brief` is a deep copy of the parent's brief.
   - `agent1Result: null`, `agent1Versions: []`, `currentDraft: null`, `editHistory: []`.
4. Append a `story_created` event to the new Story's history.
5. Write to Firestore.
6. Return the new Story.

The client navigates to the new Story's Brief tab.

---

## Error response shape

All endpoints use a consistent error response:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable explanation",
  "details": { /* optional, error-specific */ }
}
```

Error codes used in this surface:

| Code | HTTP | Meaning |
|---|---|---|
| `UNAUTHENTICATED` | 401 | No valid auth token |
| `FORBIDDEN` | 403 | Authenticated but lacks permission |
| `NOT_FOUND` | 404 | Story does not exist or is not owned by the user |
| `INVALID_INPUT` | 400 | Request body failed validation |
| `BRIEF_LOCKED` | 409 | Tried to edit a submitted brief |
| `INVALID_TRANSITION` | 409 | Tried to transition status in a way the state machine forbids |
| `REGENERATION_CAP` | 422 | Too many regenerations |
| `AGENT1_FAILED` | 502 | Agent 1 generation failed terminally |
| `AGENT1_TIMEOUT` | 504 | Agent 1 took too long |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

The client maps these codes to user-facing messages. Don't show raw error messages from the server to specialists — translate them.

## Versioning

This spec is v1. If we add fields, we add them as optional (no version bump). If we change semantics or remove fields, we version the endpoints (`/api/specialist/v2/stories/...`). The pilot is v1 throughout.

Now read `06-migration-plan.md`.
