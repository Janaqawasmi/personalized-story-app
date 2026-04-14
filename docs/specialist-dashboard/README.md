# Specialist Dashboard — Documentation Index

This is the entry point for the Specialist Dashboard rewrite. The dashboard is the workspace where licensed child psychologists create, generate, edit, and approve therapeutic stories on the DAMMAH platform.

## Why this rewrite exists

The current dashboard models a **brief** as the unit of work. That worked when Agent 1 didn't exist. It does not work now. Specialists think in **stories**, not briefs — a story moves through phases (`brief → draft → review → edit → approved → published`), and "the bathroom story for ages 3–5" is one continuous thing whether the brief is half-filled, fully submitted, or has an Agent 1 draft sitting on top of it.

This rewrite reframes the dashboard around the Story entity, introduces a status state machine, abstracts storage behind a swappable interface (so we can move from `localStorage` to Firestore without touching consumer code), and adds the Story Workspace — the page where specialists actually live once Agent 1 is producing drafts.

## Pilot scope (what this spec covers)

- **Story type:** Fear & Anxiety only (matches Agent 1 pilot scope)
- **Age ranges:** 3–5, 5–7, 7–9, 9–12
- **Storage:** `localStorage` for drafts at launch, behind a `DraftStore` interface that can swap to Firestore later without consumer changes
- **Editor:** plain `<textarea>` with placeholder helpers and a side panel showing the must-never list. No rich text, no collaborative editing, no comments.
- **Audit:** the History tab is a chronological event log. No diff visualization in the pilot.

## Reading order

1. **`client/src/specialist/docs/00-overview.md`** — what the dashboard is, the mental model, the 8 design decisions that shaped it. Read first.
2. **`client/src/specialist/docs/01-data-model.md`** — the `Story` entity, the status state machine, all the TypeScript types, how `brief` becomes a sub-document of `Story`.
3. **`client/src/specialist/docs/02-routes-and-pages.md`** — every route, every page, the dashboard table layout, the new Workspace page tabs.
4. **`client/src/specialist/docs/03-storage-adapter.md`** — the `DraftStore` interface, `LocalDraftStore` (today), `FirestoreDraftStore` (later), the swap procedure.
5. **`client/src/specialist/docs/04-workspace-page.md`** — the deep spec for the Story Workspace: Brief tab, Draft tab, History tab, the editor surface, the Agent 1 review controls.
6. **`server/src/specialist/docs/05-api-surface.md`** — every endpoint, every payload, the state transition rules enforced server-side, auth.
7. **`client/src/specialist/docs/06-migration-plan.md`** — three-PR sequencing (storage adapter → Story model → routes), rollback for each phase.
8. **`client/src/specialist/docs/07-out-of-scope.md`** — explicit non-goals. Read this when someone proposes a feature; if it's on this list, push back.

## File map

```
docs/
└── specialist-dashboard/
    └── README.md                              ← this file (entry point)

client/
└── src/
    └── specialist/
        └── docs/
            ├── 00-overview.md                 ← mental model + decisions
            ├── 01-data-model.md               ← Story entity, status state machine
            ├── 02-routes-and-pages.md         ← every route, every page
            ├── 03-storage-adapter.md          ← DraftStore interface + impls
            ├── 04-workspace-page.md           ← deep spec for the Workspace
            ├── 06-migration-plan.md           ← three-PR sequencing
            └── 07-out-of-scope.md             ← non-goals

server/
└── src/
    └── specialist/
        └── docs/
            └── 05-api-surface.md              ← endpoints, payloads, auth
```

## Hard rules for AI agents and human contributors

These six rules exist because each one corresponds to a specific failure that has either happened on a similar codebase or is one wrong PR away from happening here. Treat them as non-negotiable.

1. **Story is the unit. Brief is a sub-document.** Never add a route, table, or component that operates on a brief without a containing Story. If you find yourself wanting to, you've misunderstood the model — re-read `01-data-model.md`.
2. **Never call `localStorage` from a component.** All storage goes through the `DraftStore` interface. The tests assert this with a grep. See `03-storage-adapter.md`.
3. **Status transitions are server-enforced.** The client suggests, the server decides. Never trust a client-supplied status. The state machine in `01-data-model.md` is the source of truth and it lives on the server.
4. **The "brief" tab is read-only once `briefStatus === 'submitted'`.** A submitted brief is immutable. Revisions create a new Story with `parentStoryId` pointing back. No exceptions, no "just this once" edits.
5. **Soft delete only.** "Delete" sets `status: archived`. No row is ever removed from the database from a UI action. A 30-day hard-delete sweep can be added later as a server-side job; UI never hard-deletes.
6. **Cold-start fallback for examples is permanent.** The Agent 1 example bank starts empty. The cold-start path in the prompts is not temporary. Ages 9–12 will run on cold-start at launch and that is intended.

## Out of scope (also see `07-out-of-scope.md`)

Not in this spec:
- Parent-facing features (browsing, personalization, reading)
- Publishing pipeline (what happens after a specialist approves a story)
- Illustration generation and integration
- Multi-language support beyond what already exists in the routing layer
- Analytics, reporting, or any dashboard charts
- Collaborative editing, comments, @mentions, review requests
- Rich-text editor, tracked changes, diff viewer
- Bulk actions
- Notifications

## How this relates to the Agent 1 spec set

The Agent 1 spec set (in `docs/agent1/` and `server/src/agent1/docs/`) defines the generation pipeline. This dashboard spec defines the workspace that drives it. The seam between them is exactly two things:

- The dashboard calls `generateStoryDraft(storyId, options)` from `server/src/agent1/index.ts` (the public API defined in `server/src/agent1/docs/01-architecture.md`).
- The dashboard reads back an `Agent1Result` (defined in `server/src/agent1/docs/02-data-contracts.md`) and renders it in the Workspace > Draft tab.

The dashboard does not know how Agent 1 works internally. The Agent 1 pipeline does not know what the dashboard does with its output. This separation is intentional and load-bearing — keep it.

## Status

**Version:** 1.0
**Pilot:** Fear & Anxiety, all four age ranges
**Last updated:** April 2026
