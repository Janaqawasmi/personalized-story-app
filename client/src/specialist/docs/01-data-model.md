# 01 — Data Model

This file is the source of truth for the dashboard's data shapes. If a type appears here, components and API handlers import it from `client/src/specialist/types/` (mirrored from `server/src/specialist/types/` — same file, same exports). They never redefine it locally.

## Overview

The top-level entity is `Story`. A Story wraps everything related to one therapeutic story: the brief (the structured clinical input), the Agent 1 results (the generated draft and metadata), the current edited prose, the edit history, the status, and a few pieces of metadata for display and navigation.

The brief itself — the `CompleteBrief` shape defined in `client/src/types/storyBrief.ts` — is unchanged. It just lives inside `Story.brief` instead of being a top-level entity. Every component that currently reads `brief.therapeuticArchitecture.copingTool` will read `story.brief.therapeuticArchitecture.copingTool` after the migration. The path inside the brief object does not change.

## The `Story` entity

```ts
import type { CompleteBrief } from '@/types/storyBrief';
import type { Agent1Result } from '@/agent1/types';

export interface Story {
  // Identity
  id: string;                           // server-generated UUID
  ownerUid: string;                     // Firebase UID of the specialist who owns this story
  parentStoryId: string | null;         // set when this story is a revision of another (D8)

  // Display metadata
  title: string;                        // working title, editable, defaults to "Untitled story"
  storyType: StoryTypeToken;            // 'fear_anxiety' for the pilot
  ageRange: AgeRangeToken | null;       // null until the brief sets it
  tags: string[];                       // optional, specialist-defined; pilot UI displays but does not filter

  // Status
  status: StoryStatus;                  // see StoryStatus enum below
  briefStatus: BriefStatus;             // 'draft' until submitted to Agent 1, then 'submitted'

  // Content
  brief: CompleteBrief;                 // the structured brief object
  agent1Result: Agent1Result | null;    // null until Agent 1 has run at least once
  agent1Versions: Agent1Result[];       // history (max 3 retained, including current)
  currentDraft: StoryDraft | null;      // the editable prose; starts as a copy of agent1Result.story
  editHistory: EditHistoryEntry[];      // chronological log of edits to currentDraft

  // Timestamps
  createdAt: number;                    // ms since epoch
  updatedAt: number;                    // ms since epoch — bumped on any field change
  lastOpenedAt: number;                 // ms since epoch — bumped when specialist opens the Workspace
  submittedAt: number | null;           // ms since epoch — set when briefStatus → 'submitted'
  approvedAt: number | null;            // ms since epoch — set when status → 'approved'
}
```

A few things to notice:

- **Three timestamps for "when did something happen."** `updatedAt` for any change, `lastOpenedAt` for sort-by-recent-activity in the dashboard, `submittedAt` and `approvedAt` for phase markers. Don't conflate them — each one answers a different question.
- **`agent1Result` and `agent1Versions` are both present.** `agent1Result` is the *currently selected* version (for convenience in components that don't care about history). `agent1Versions[0]` is the most recent. They're kept in sync server-side; clients never write to either directly.
- **`currentDraft` starts as a copy of `agent1Result.story`** the first time the specialist enters `in_review`. From that point, edits go to `currentDraft` and never back-modify `agent1Result`. If the specialist regenerates, the new Agent 1 result becomes `agent1Result` and `currentDraft` is reset to a copy of the new draft (with a confirmation prompt warning the specialist they'll lose their edits).

## The status state machine

```ts
export type StoryStatus =
  | 'draft_brief'         // brief is being filled in, has not been submitted to Agent 1
  | 'generating'          // Agent 1 is running
  | 'awaiting_review'     // Agent 1 finished, specialist has not opened the Workspace yet
  | 'in_review'           // specialist is actively reviewing/editing
  | 'needs_revision'      // specialist requested a regeneration; Agent 1 is running again
  | 'approved'            // specialist signed off; ready for the publishing pipeline (out of scope)
  | 'published'           // live for parents (out of scope; the column exists for forward compatibility)
  | 'archived';           // soft-deleted

export type BriefStatus = 'draft' | 'submitted';
```

### Allowed transitions

This table is the **only** source of truth for transitions. The server-side state machine in `server/src/specialist/stateMachine.ts` is generated from it. The client never decides whether a transition is allowed.

| From | To | Trigger | Notes |
|---|---|---|---|
| `draft_brief` | `generating` | specialist submits brief | sets `briefStatus = 'submitted'`, `submittedAt = now` |
| `draft_brief` | `archived` | specialist archives | from the dashboard or the workspace |
| `generating` | `awaiting_review` | Agent 1 succeeds | populates `agent1Result` and `agent1Versions[0]` |
| `generating` | `draft_brief` | Agent 1 fails terminally | brief returns to draft state, `briefStatus = 'draft'` again, error surfaced to specialist |
| `awaiting_review` | `in_review` | specialist opens the Workspace | sets `lastOpenedAt = now` |
| `in_review` | `needs_revision` | specialist clicks Regenerate | requires feedback text |
| `in_review` | `approved` | specialist clicks Approve | sets `approvedAt = now` |
| `in_review` | `archived` | specialist archives | |
| `needs_revision` | `awaiting_review` | Agent 1 succeeds | new version pushed to `agent1Versions`, becomes `agent1Result` |
| `needs_revision` | `in_review` | Agent 1 fails terminally | specialist sees error and stays in review on the previous version |
| `approved` | `published` | publishing pipeline | out of scope for the pilot; transition exists for forward compatibility |
| `approved` | `in_review` | specialist reopens (within 24h) | safety hatch for accidental approvals; pilot-only, may be removed later |
| `approved` | `archived` | specialist archives | |
| `published` | `archived` | specialist archives | |
| `archived` | `draft_brief` | specialist restores from archive | only allowed if `briefStatus === 'draft'`; otherwise restore goes to the previous status |
| `archived` | `in_review` | specialist restores from archive | when `briefStatus === 'submitted'` and `agent1Result !== null` |

Any transition not listed in this table is **not allowed**. The server returns 409 Conflict if the client attempts one.

### Transition rules in code

```ts
type Transition = { from: StoryStatus; to: StoryStatus };

export const ALLOWED_TRANSITIONS: ReadonlyArray<Transition> = [
  { from: 'draft_brief',     to: 'generating' },
  { from: 'draft_brief',     to: 'archived' },
  { from: 'generating',      to: 'awaiting_review' },
  { from: 'generating',      to: 'draft_brief' },
  { from: 'awaiting_review', to: 'in_review' },
  { from: 'in_review',       to: 'needs_revision' },
  { from: 'in_review',       to: 'approved' },
  { from: 'in_review',       to: 'archived' },
  { from: 'needs_revision',  to: 'awaiting_review' },
  { from: 'needs_revision',  to: 'in_review' },
  { from: 'approved',        to: 'published' },
  { from: 'approved',        to: 'in_review' },
  { from: 'approved',        to: 'archived' },
  { from: 'published',       to: 'archived' },
  { from: 'archived',        to: 'draft_brief' },
  { from: 'archived',        to: 'in_review' },
];

export function isTransitionAllowed(from: StoryStatus, to: StoryStatus): boolean {
  return ALLOWED_TRANSITIONS.some(t => t.from === from && t.to === to);
}
```

The server's transition handler imports `isTransitionAllowed` directly. The client may also import it for proactive UI affordances (graying out buttons that would fail), but the server check is the authoritative one.

## Supporting types

### `StoryDraft`

```ts
export interface StoryDraft {
  title: string;
  body: string;
  wordCount: number;       // computed on save, used for the editor's word counter
  updatedAt: number;
}
```

The body is plain text with personalization placeholders (`[CHILD_NAME]`, `[HE/SHE/THEY]`, `[HIS/HER/THEIR]`) inline. The pilot does not render these as rich tokens — they're literal strings the specialist sees and can edit around.

### `EditHistoryEntry`

```ts
export type EditHistoryEvent =
  | { kind: 'draft_created'; agent1Version: number }                  // when currentDraft is initialized from an Agent 1 result
  | { kind: 'draft_edited'; snapshot: StoryDraft }                    // full snapshot on every save (no diffs in pilot)
  | { kind: 'status_changed'; from: StoryStatus; to: StoryStatus }
  | { kind: 'brief_submitted' }
  | { kind: 'agent1_generated'; version: number; succeeded: boolean }
  | { kind: 'regeneration_requested'; feedback: string }
  | { kind: 'archived' }
  | { kind: 'restored' };

export interface EditHistoryEntry {
  id: string;                           // UUID
  at: number;                           // ms since epoch
  byUid: string;                        // who did it (always the owner in the pilot, but the field exists for forward compat)
  event: EditHistoryEvent;
}
```

A few notes:

- **Full snapshots, not diffs.** The pilot stores the entire `StoryDraft` on every save. Diffs are an optimization for later. For a story under 2,500 words, the storage cost is negligible.
- **Every status change is logged.** Even server-driven ones (Agent 1 succeeding, Agent 1 failing). This is the audit trail the History tab renders.
- **The history is append-only.** Nothing is ever removed from `editHistory`. If the specialist reverts to a previous draft, that's a new entry, not a deletion.

### `StoryTypeToken` and `AgeRangeToken`

These come from the brief's model file (`client/src/types/storyBrief.ts`). The dashboard never redefines them — it imports them. This is the same anti-drift rule as Agent 1's `model-file-reference.md`: the brief model file is the single source of truth for clinical tokens.

```ts
import type { StoryType, AgeRange } from '@/types/storyBrief';

export type StoryTypeToken = StoryType;   // 'fear_anxiety' | 'big_emotions' | ...
export type AgeRangeToken = AgeRange;     // '3-5' | '5-7' | '7-9' | '9-12'
```

The pilot only uses `'fear_anxiety'`. Other story types exist in the type definition but are not yet routed by the dashboard (the New Story flow only offers `fear_anxiety` as a selectable option in v1).

## What `currentDraft` looks like over time

The lifecycle of `currentDraft` is a frequent source of confusion. Here is the canonical sequence.

1. **Story is created.** `currentDraft = null`. The brief is being filled in.
2. **Brief is submitted.** Agent 1 runs. `currentDraft` is still `null`.
3. **Agent 1 succeeds.** `agent1Result` is populated. `currentDraft` is still `null`. The Story is in `awaiting_review`.
4. **Specialist opens the Workspace.** Status moves to `in_review`. `currentDraft` is initialized as a deep copy of `agent1Result.story` (the title and body from Agent 1's output). An `EditHistoryEntry` with `kind: 'draft_created'` is logged.
5. **Specialist edits the prose.** Each save updates `currentDraft.body` and appends an `EditHistoryEntry` with `kind: 'draft_edited'` containing the full new snapshot.
6. **Specialist regenerates with feedback.** Status moves to `needs_revision`. The current `currentDraft` is preserved in the history but `currentDraft` itself is *not* discarded yet — it stays in place in case the new Agent 1 run fails.
7. **New Agent 1 run succeeds.** A new version is pushed to `agent1Versions`. `agent1Result` now points to the new version. `currentDraft` is reset to a copy of the new `agent1Result.story` — but only after the specialist confirms via a modal warning them that their edits will be lost. If they cancel, `currentDraft` stays as it was and `agent1Result` still updates (so they can compare their edited version against the new generation in the versions dropdown).
8. **Specialist approves.** `currentDraft` is frozen. `status` moves to `approved`. The frozen `currentDraft` is what the publishing pipeline (out of scope) will eventually use.

## Indexes (for the Firestore migration later)

The pilot uses `localStorage` and doesn't need indexes. When the migration to Firestore happens, the following composite indexes will be needed:

- `(ownerUid, status, lastOpenedAt desc)` — the dashboard's default query
- `(ownerUid, parentStoryId)` — for finding revisions of a given story
- `(ownerUid, status, updatedAt desc)` — alternate sort

Documenting them here so the migration PR doesn't have to rediscover them.

## What is *not* in the data model

These are deliberate omissions. If you find yourself wanting to add one, push back and ask whether it really belongs here.

- **No `assignedTo` or `reviewers`.** Single-owner only in the pilot.
- **No `comments` or `feedback` on the Story itself.** Feedback to Agent 1 lives in the regeneration request and is captured in the History. Comments between humans don't exist because the pilot is single-specialist.
- **No `priority` or `dueDate`.** No project management features.
- **No `clinicalNotes` field separate from the brief.** The brief is the clinical input. If a specialist wants to add notes, they belong in the brief's free-text fields (population, trigger, one true thing, character notes).
- **No `attachments`.** No file uploads.

Now go read `02-routes-and-pages.md`.
