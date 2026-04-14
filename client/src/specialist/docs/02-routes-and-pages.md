# 02 — Routes and Pages

This file specifies every route in the specialist surface, every page mounted on those routes, and the layout of each page.

## Route table

| Current route | New route | Component | Purpose |
|---|---|---|---|
| `/:lang/specialist/briefs` | `/:lang/specialist/stories` | `SpecialistStoriesPage` | Dashboard — list of all stories |
| `/:lang/specialist/briefs/:briefId` | `/:lang/specialist/stories/:storyId` | `StoryWorkspacePage` | The Workspace — Brief / Draft / History tabs |
| `/:lang/specialist/create-brief` | `/:lang/specialist/stories/new` | `NewStoryRedirect` | Creates a Story, redirects to its Brief tab |
| `/:lang/specialist/create-brief/:draftId` | `/:lang/specialist/stories/:storyId/brief` | `StoryWorkspacePage` (Brief tab forced) | Direct deep link into the brief editor |

The new routes are mounted under the same `RequireAuth` + `SpecialistLayout` shell that exists today. The auth and role gating do not change.

### Why the rename

`stories` is the noun the specialist thinks in (see `00-overview.md`, D1). `briefs` is the noun the storage backend thinks in. URLs should match the user's mental model, not the schema.

### Old-route compatibility

For one release, the old routes (`/specialist/briefs`, `/specialist/briefs/:briefId`, `/specialist/create-brief`, `/specialist/create-brief/:draftId`) redirect (HTTP 301-equivalent on the client) to the new routes. If a specialist has a bookmark, it still works. After one release, the redirects are removed.

The mapping is:

- `/specialist/briefs` → `/specialist/stories`
- `/specialist/briefs/:briefId` → `/specialist/stories/:briefId` (the briefId becomes the storyId because the migration preserves IDs — see `06-migration-plan.md`)
- `/specialist/create-brief` → `/specialist/stories/new`
- `/specialist/create-brief/:draftId` → `/specialist/stories/:draftId/brief`

## Page 1 — Stories Dashboard (`SpecialistStoriesPage`)

Route: `/:lang/specialist/stories`

This is the page the specialist lands on after logging in. It replaces the current two-table dashboard with a single Stories table plus filtering, search, and sorting.

### Layout

Top bar (above the table):

- **Left.** "My stories" heading. Below it, a count: "12 stories · 3 in review · 2 awaiting review".
- **Right.** A primary "New Story" button. Clicking it routes to `/specialist/stories/new`.

Filter row (above the table):

- **Status chips.** All / Draft / Generating / Awaiting review / In review / Approved / Archived. Default: All except Archived. Clicking a chip toggles it. Multiple chips can be selected (logical OR). Status counts shown next to each chip.
- **Search box.** Right-aligned. Searches `title`, `tags`, and the brief's free-text fields (`population`, `specificTrigger`). Debounced 200ms. Pilot implementation: client-side string match on the loaded story list. Server-side full-text search is post-pilot.
- **Sort dropdown.** Default "Last activity (newest first)". Other options: "Created (newest first)", "Created (oldest first)", "Title (A–Z)".

The Stories table:

| Column | Source | Notes |
|---|---|---|
| Title | `story.title` | Bold. Click to open the Workspace. Truncated at ~60 chars with ellipsis. |
| Story type | `story.storyType` | Chip. Pilot only shows "Fear & Anxiety". |
| Age | `story.ageRange` | Chip. `null` shows as "—" (brief hasn't picked an age yet). |
| Status | `story.status` | Colored chip. Draft = gray, Generating = blue (with spinner), Awaiting review = amber, In review = blue, Needs revision = orange, Approved = green, Published = teal, Archived = light gray. |
| Last activity | `story.lastOpenedAt` (fallback `updatedAt`) | "2 hours ago", "Yesterday", "Mar 14". |
| Actions | — | Three-dot menu: Open, Duplicate (post-pilot), Archive/Restore. |

Empty states:

- **No stories at all** (first-time specialist). Centered illustration, "Start your first story" copy, primary "New Story" button.
- **No stories matching filters.** Centered text, "No stories match these filters", a "Clear filters" link.
- **All stories archived, viewing default tab.** "All your stories are archived. Show archived?" with a link that toggles the Archived chip on.

### Behavior notes

- The table is virtual-scrolled for >50 stories. The pilot will not hit this number but the implementation should not assume small lists.
- Clicking a row anywhere except the actions menu opens the Workspace. The actions menu stops propagation.
- The page title in the browser tab is "Stories — DAMMAH Specialist".
- Refreshing the page fetches the latest list from the server (or the storage adapter; see `03-storage-adapter.md`).

## Page 2 — New Story redirect (`NewStoryRedirect`)

Route: `/:lang/specialist/stories/new`

This is not a page the specialist sees. It's a redirect component that:

1. Calls `draftStore.createStory()` to create a new Story with `status: draft_brief`, an empty brief, and a default title of "Untitled story".
2. Receives the new `storyId`.
3. Redirects (replace navigation, so the back button doesn't bounce them here) to `/:lang/specialist/stories/:storyId/brief`.

If `createStory()` fails, the redirect renders an inline error message and a "Try again" button. It does not navigate back to the dashboard (that would lose context for the specialist).

### Behavior of the "Story Brief" navbar button

The current `SpecialistNavBar` has a "Story Brief" button that opens the most recent in-progress draft via `getOrCreateMostRecentDraftId()`. The new behavior:

- Find the most recent Story with `status === 'draft_brief'` owned by this specialist.
- If one exists, navigate to its `/stories/:storyId/brief` route.
- If none exists, navigate to `/stories/new`.

Same UX, story-aware.

## Page 3 — Story Workspace (`StoryWorkspacePage`)

Route: `/:lang/specialist/stories/:storyId` (defaults to the appropriate tab for the current status) and `/:lang/specialist/stories/:storyId/brief` (forces Brief tab).

This is where specialists do their work once a Story exists. It is large enough to warrant its own deep spec — see `04-workspace-page.md` for the full layout, the tabs, the editor, and the Agent 1 review controls.

The summary here is just the structural shape:

### Layout

Header bar:

- **Back link** to the dashboard.
- **Editable title** (click to edit, blur to save).
- **Status chip** with the current status.
- **Story type and age chips** (read-only).
- **Actions menu**: Archive, Open new revision (only enabled in certain statuses), Duplicate (post-pilot).

Tab bar:

- **Brief** — read-only after submission, editable in `draft_brief` status.
- **Draft** — Agent 1 outputs and the editor. Disabled (greyed out) if `agent1Result === null`.
- **History** — chronological event log. Always available.

Tab body: each tab renders inside a `Paper` with consistent padding.

### Default tab logic

Which tab is shown when the specialist opens a Story without specifying one in the URL:

| Status | Default tab |
|---|---|
| `draft_brief` | Brief |
| `generating` | Brief (with a banner: "Agent 1 is working on your story...") |
| `awaiting_review` | Draft |
| `in_review` | Draft |
| `needs_revision` | Draft (with a banner: "Regenerating...") |
| `approved` | Draft |
| `published` | Draft |
| `archived` | Brief (with an "Archived" banner and a Restore button) |

The URL is updated to reflect the active tab (e.g., `/stories/abc123/draft`) so the back button and refresh work correctly.

## Page 4 — Old route redirects

Three small redirect components handle the legacy URLs:

- `BriefsListRedirect` → `/specialist/stories`
- `BriefViewRedirect` → `/specialist/stories/:briefId`
- `CreateBriefRedirect` → `/specialist/stories/new`
- `CreateBriefWithIdRedirect` → `/specialist/stories/:draftId/brief`

These exist for one release. The build plan (`06-migration-plan.md`) deletes them in the cleanup phase.

## What is *not* a route in the pilot

These are intentional omissions:

- **No `/specialist/settings`.** Specialist account settings live elsewhere in the app.
- **No `/specialist/help`.** Help is a link out to documentation.
- **No `/specialist/inbox` or notifications page.** No notifications system in the pilot.
- **No `/specialist/library` of approved stories separate from the dashboard.** The dashboard with the "Approved" filter chip is the library.
- **No `/specialist/analytics`.** No analytics in the pilot.

## Component tree

For implementers, this is the high-level component hierarchy. Names match the file names.

```
SpecialistLayout
├── SpecialistNavBar
└── <Outlet>                                  // route content goes here
    ├── SpecialistStoriesPage                 // /stories
    │   ├── StoriesPageHeader                 //   "My stories" + count + New Story button
    │   ├── StoriesFilterBar                  //   chips + search + sort
    │   ├── StoriesTable                      //   the table itself
    │   │   └── StoryRow (xN)
    │   └── StoriesEmptyState                 //   when no rows
    ├── NewStoryRedirect                      // /stories/new
    └── StoryWorkspacePage                    // /stories/:storyId[/tab]
        ├── WorkspaceHeader                   //   back link + title + status + actions
        ├── WorkspaceTabs                     //   Brief / Draft / History
        └── <TabContent>
            ├── BriefTab                      //   the brief editor or read-only view
            ├── DraftTab                      //   Agent 1 outputs + editor
            └── HistoryTab                    //   event log
```

The deep specs for `BriefTab`, `DraftTab`, and `HistoryTab` are in `04-workspace-page.md`.

Now read `03-storage-adapter.md`.
