# 00 — Dashboard Overview

## What the Specialist Dashboard is

The Specialist Dashboard is the workspace where licensed child psychologists do every part of their work on DAMMAH except writing the brief by hand and reading the final published story to children. It is the only surface a specialist sees, and every action they take — creating a story, designing the brief, generating a draft with Agent 1, reviewing the output, editing the prose, approving the result — happens here.

## The mental model

The unit of work is a **Story**. A Story is one therapeutic story for children, identified by a working title the specialist gives it ("the bathroom story for 3–5s") rather than by a database ID. A Story has a status that tells the specialist (and the system) what phase it's in. The specialist's job is to move stories through the phases.

The phases are:

```
draft_brief  →  generating  →  awaiting_review  →  in_review  ⇄  needs_revision
                                                       ↓
                                                   approved  →  published
                                                       ↓
                                                   archived
```

A Story sits in `draft_brief` while the specialist fills in the brief. When they submit, it moves to `generating` and Agent 1 runs. When Agent 1 finishes, it moves to `awaiting_review`. The specialist opens it (now `in_review`), reviews the emotional truth, blueprint, and story draft, and decides: approve and move on, edit the prose directly, or request a regeneration with feedback. A regeneration moves to `needs_revision` until Agent 1 finishes again. Approval moves to `approved`. Publishing moves to `published`. Archiving (soft delete) moves to `archived`.

This is the only mental model that matters. Every feature decision in this spec serves it.

## Why this is a rewrite, not an extension

The current dashboard models a brief as the unit of work. That model has three problems that get worse the longer they live:

1. **No place for Agent 1 outputs.** The current submitted-brief view shows the brief and a JSON dump. Agent 1 produces an emotional truth paragraph, a blueprint, an alignment note, possibly safety flags, possibly compression metadata. There's nowhere to put any of it.
2. **No place for editing.** Once Agent 1 produces a draft, the specialist needs to edit the prose. The current spec ends at "view the brief." Story editing is the entire reason this platform exists and it has no UI surface.
3. **No status, no filtering, no search.** Two flat tables work for five briefs. They fall apart at thirty. A specialist with six months of work needs to filter by status, sort by activity, and search by title.

Bolting status, editing, and Agent 1 review onto the brief-as-unit model produces a UX where the specialist's mental model and the system's mental model never line up. Refactoring to Story-as-unit takes more code but produces a system the specialist can actually reason about.

## The 8 design decisions that shaped this spec

These are the load-bearing decisions. Each one has alternatives that were considered and rejected. If you want to revisit one, read the rationale first.

### D1 — Story is the unit, brief is a sub-document

**Decision.** The top-level entity is `Story`. A Story has a `brief: CompleteBrief` field. Brief is never the top-level handle for anything in the dashboard.

**Why not keep brief as the unit and bolt status onto it.** Because the moment Agent 1 lands, "the bathroom story" is no longer just a brief — it's a brief plus a draft plus an edit history plus a status. The brief is one component of the story, not the story itself. If we bolt status onto brief, the data model lies about what a brief is, and every future feature has to navigate around the lie.

**Why not introduce Story as a wrapper without renaming brief.** Because two coexisting models for the same concept ("is this row in the briefs table or the stories table?") doubles the cognitive load on every contributor for the rest of the codebase's life. Refactor once, pay once.

**Migration cost.** One PR. The brief data shape doesn't change — only its container does. Components that read `brief.therapeuticArchitecture.copingTool` keep reading exactly that path, just through `story.brief.therapeuticArchitecture.copingTool`. See `06-migration-plan.md`.

### D2 — Status is a server-enforced state machine

**Decision.** `Story.status` is a typed enum. Transitions are validated server-side against an explicit transition table. The client suggests transitions; the server decides whether they're allowed.

**Why not let the client set status directly.** Because a buggy client, or a malicious one, can put a story into `approved` without ever generating an Agent 1 draft. Server-side enforcement is the only place this can be reliable.

**Why a state machine and not free-form status strings.** Because "what statuses exist" and "what transitions are allowed" are decisions the team makes deliberately, not things any contributor can extend by typing a new string into a field. The state machine forces the question to be explicit.

### D3 — localStorage now, server later, behind a `DraftStore` interface

**Decision.** Drafts of in-progress briefs live in `localStorage` for the pilot. All storage access goes through a `DraftStore` interface with two implementations: `LocalDraftStore` (today) and `FirestoreDraftStore` (future). No component, page, or hook ever calls `localStorage.getItem` directly.

**Why localStorage at all.** Because the pilot ships with one specialist on one device, and the backend work for proper draft storage is real. We accept the limitation (lose your draft if you clear your browser, no multi-device) for pilot velocity.

**Why behind an interface.** Because the migration to server storage is a known future event. Doing the abstraction now costs one extra file and zero behavior. Doing it later means touching every consumer.

**Why not Firestore from day one.** Considered. The blocker is auth-scoped subcollection rules, server endpoints for draft CRUD, conflict resolution if a specialist edits in two tabs, offline behavior. Each one is a small task; together they're a sprint. The pilot doesn't need it.

### D4 — One table on the dashboard, not two

**Decision.** The dashboard has a single Stories table with a status column and status filter chips. The current "in-progress / submitted" split goes away.

**Why not preserve the two-table split.** Because it models the storage backend (localStorage vs Firestore), not the specialist's mental model. From the specialist's perspective, "the bathroom story for 3–5s" is one thing whether the brief is half-filled or whether Agent 1 has produced a draft. The split forces them to think about where their data lives, which is exactly the kind of cognitive overhead a dashboard should remove.

### D5 — A new page: Story Workspace

**Decision.** The current `SpecialistBriefReviewPage` is replaced by `StoryWorkspacePage` at `/:lang/specialist/stories/:storyId`. It has three tabs: Brief (read-only after submission), Draft (Agent 1 outputs + editor), and History (event log).

**Why three tabs and not three pages.** Because the specialist works on one Story at a time and needs to flip between "what did I ask for" and "what did Agent 1 produce" constantly. Tabs preserve URL stability and back-button behavior. Pages would force a full navigation every time.

**Why not put the editor on the same page as the brief.** Because the brief is read-only after submission and the editor is the specialist's primary surface in `in_review` status. Cohabiting them on one screen makes the page feel like two pages stitched together.

### D6 — Soft delete only

**Decision.** "Delete" sets `status: archived`. The row stays in the database. An "Archived" filter chip in the dashboard shows archived stories. A future server-side job can hard-delete after 30 days; the UI never does.

**Why not hard delete.** Because misclicks happen, and clinical work is the kind of thing where "I deleted my draft" is a real support ticket. Storage is cheap; recovery from hard delete is impossible.

### D7 — All Agent 1 versions are retained

**Decision.** Up to 3 Agent 1 results per story are kept (current + 2 reruns, matching the Agent 1 spec's max-2-rerun rule). A versions dropdown in the Draft tab lets the specialist switch between them. Editing the prose happens on the currently-selected version's draft.

**Why retain old versions.** Because regeneration sometimes produces a worse result, and the specialist needs to be able to fall back. The Agent 1 spec already mandates retaining all previous versions; the dashboard just exposes them.

**Why cap at 3.** Because the Agent 1 spec caps reruns at 2 and prompts the specialist to revisit the brief beyond that. More than 3 versions in a dropdown is a sign that the brief itself is wrong, not that one more regeneration will save it.

### D8 — Brief revisions create a new Story

**Decision.** If a specialist realizes after Agent 1 has run that the brief was wrong, they click "Open new revision" from the Brief tab. This creates a new Story in `draft_brief` status with the brief contents copied over and a `parentStoryId` pointing to the original. Both stories appear on the dashboard; the original is marked with a small icon showing it has a child revision.

**Why not allow editing the brief in place.** Because the brief is the input that produced the draft. If you change the brief, the draft no longer matches the brief, and the specialist has lost the ability to compare "what I asked for" against "what Agent 1 produced." Immutability of the submitted brief is what makes the audit trail trustworthy.

**Why not just regenerate with a modified brief silently.** Same reason. The original brief and the original draft are an evidence pair. You don't overwrite evidence.

## What the dashboard is not

The dashboard is not a CMS, not a publishing tool, not a parent-facing surface, not a chat interface, not a clinical record system. It is the workspace where specialists turn briefs into approved stories. Every feature should be evaluable against that one job.

If you're proposing a feature and you can't say which phase of `draft_brief → ... → published` it serves, the answer is: it doesn't belong here. Open a separate spec.

## What's in the rest of the docs

Read in order:

- **`01-data-model.md`** — the `Story` entity and the status state machine. Read this before writing any code.
- **`02-routes-and-pages.md`** — every URL, every page, the dashboard table layout.
- **`03-storage-adapter.md`** — the `DraftStore` interface and its implementations.
- **`04-workspace-page.md`** — the deep spec for the Story Workspace.
- **`05-api-surface.md`** (in `server/src/specialist/docs/`) — every endpoint.
- **`06-migration-plan.md`** — the three-PR sequencing.
- **`07-out-of-scope.md`** — features explicitly excluded from the pilot.

Now go read `01-data-model.md`.
