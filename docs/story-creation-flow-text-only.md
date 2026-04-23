# Story Creation Flow (Text Only)

This document describes the **current implementation** of the specialist pipeline from story brief drafting until story approval.

## Scope

- Start: story exists in `draft_brief` and specialist is filling the brief.
- End: story reaches `approved`.
- Focus: text-only workflow and status transitions (no visual design details).

## Pipeline Stages

The workspace pipeline is shown as:

1. Brief
2. Generate
3. Review
4. Approved

These stages are derived from `Story.status` values:

- `draft_brief` -> Brief
- `generating` / `needs_revision` -> Generate
- `awaiting_review` / `in_review` -> Review
- `approved` / `published` -> Approved

## End-to-End Flow (Brief -> Approved)

### 1) Brief Drafting (`draft_brief`)

- A story starts in `draft_brief` with `briefStatus: "draft"`.
- Specialist fills the 5-section brief form (plus story type pre-step).
- Brief data is saved via the draft store adapter while editing.

### 2) Brief Submit Gate (before generation starts)

When specialist submits from section 5, submit pipeline runs:

1. Normalize brief defaults.
2. Run hard validation gate:
   - Hard blocks stop submission.
   - Hard warnings require explicit acknowledgment.
3. Run complexity pre-submit warning (when applicable).
4. Show final confirmation dialog.
5. On confirm, submit brief payload.

Only after these checks pass does the app call `draftStore.submitBrief(storyId)`.

### 3) Submit Brief -> Generation (`generating`)

- `submitBrief` sends the brief to the generation API.
- Story moves into generation phase (`generating`).
- Brief tab becomes read-only while generation is in progress.
- Brief tab polls until status changes.

### 4) Generation Complete -> Ready for Review (`awaiting_review`)

- Backend returns story output and transitions to `awaiting_review`.
- Workspace uses Draft tab as the review surface.
- On workspace open, app auto-opens unread output for review by transitioning:
  - `awaiting_review` -> `in_review`

### 5) Review and Editing (`in_review`)

In Draft tab, specialist can:

- Read generated manuscript.
- Edit title/body.
- Save current draft (`currentDraft`).
- Review safety/quality evidence.
- Switch versions and inspect timeline.

### 6) Optional Regeneration Loop (`in_review` -> `needs_revision` -> `awaiting_review` -> `in_review`)

If specialist requests changes:

1. Provide required feedback in regenerate dialog.
2. App transitions status:
   - `in_review` -> `needs_revision` (with feedback metadata)
3. UI shows generating state while new version is produced.
4. After generation completes, status returns to `awaiting_review`.
5. Workspace re-enters review by transitioning to `in_review`.

This loop can repeat until specialist is satisfied.

### 7) Approve (`in_review` -> `approved`)

Approval is enabled only when readiness gates pass:

- Edits saved.
- Safety findings resolved.
- Word count within target range.
- Must-never list validated.

When specialist clicks approve:

- If status is still `awaiting_review`, app first transitions to `in_review`.
- Then app transitions to `approved`.

Story is now in approved state and shown as approved in the manuscript view.

## Status Transition Path (Typical Happy Path)

`draft_brief` -> `generating` -> `awaiting_review` -> `in_review` -> `approved`

## Notes

- `awaiting_review` is a short "unopened output" state; interactive review actions are performed in `in_review`.
- Regeneration uses `needs_revision` as the in-progress regeneration status.
- Reopen from approved is supported (`approved` -> `in_review`), but that is outside this document's end scope.
