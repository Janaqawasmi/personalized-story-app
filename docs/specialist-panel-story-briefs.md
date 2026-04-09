# Specialist Panel (Dashboard) — Story Briefs

This document explains **how the Specialist Panel looks and works** for Story Briefs in this codebase: how briefs are listed, how a specialist resumes/creates briefs, and how in-progress work is stored.

## Where it is in the app (routing)

Specialist UI is mounted under `/:lang/specialist/*` in `client/src/App.tsx`:

- **Specialist shell/layout**
  - `/:lang/specialist/*` → `RequireAuth` → `SpecialistLayout` (shared specialist sub-nav)
- **Dashboard / brief list**
  - `/:lang/specialist/briefs` → `SpecialistBriefsPage`
- **Submitted brief review**
  - `/:lang/specialist/briefs/:briefId` → `SpecialistBriefReviewPage`
- **Brief editor entry**
  - `/:lang/specialist/create-brief` → `BriefFormDraftRedirect` (redirects to a draft id)
  - `/:lang/specialist/create-brief/:draftId` → `BriefForm` (the actual editor)

## How the Specialist Panel looks (layout + navigation)

### Global specialist sub-navigation

All specialist routes render `client/src/components/specialist/SpecialistLayout.tsx`, which places a sticky `SpecialistNavBar` above the page content.

`client/src/components/specialist/SpecialistNavBar.tsx` renders a **sticky** secondary navbar (below the main site navbar) with:

- **Left**: “workspace” title with an icon
- **Right**: two primary navigation buttons
  - **Briefs** → `/:lang/specialist/briefs`
  - **Story Brief** (editor) → `/:lang/specialist/create-brief`

### Page shell (background and content column)

Specialist pages are wrapped by `client/src/components/specialist/SpecialistPortalShell.tsx`:

- A soft gradient background layer
- Centered content column (default `maxWidth=960`)
- A primary `Paper` card style used for the main content (`specialistMainPaperSx`)

## Dashboard: how story briefs are listed

The dashboard is `client/src/pages/SpecialistBriefsPage.tsx`. It shows **two tables**:

### 1) In progress (local drafts)

**Source of data**: browser `localStorage` via `client/src/utils/briefDraftStorage.ts`.

Displayed fields:

- **Story focus**: derived from `draft.storyType` (shows a chip if chosen, otherwise “not started”)
- **Last saved**: derived from `draft.savedAt` (ms timestamp)
- **Actions**:
  - **Resume**: navigates to `/:lang/specialist/create-brief/:draftId`
  - **Delete**: deletes the local draft and updates the table

### 2) Submitted (server-stored briefs)

**Source of data**: backend API `GET /api/admin/damma-story-briefs?limit=...`
via `client/src/api/dammaStoryBrief.ts` → `listDammaStoryBriefs(limit)`.

Displayed fields:

- **Brief ID**: truncated display with copy-to-clipboard for full ID
- **Story focus**: `storyType` (chip)
- **Submitted**: `submittedAt` (formatted timestamp)
- **Actions**:
  - **View**: opens the submitted brief review page at `/:lang/specialist/briefs/:briefId`

## Viewing a submitted brief (read-only review page)

The page is `client/src/pages/SpecialistBriefReviewPage.tsx`.

### How data is loaded

- Fetches from `GET /api/admin/damma-story-briefs/:briefId`
  - Client: `fetchDammaStoryBrief(briefId)` in `client/src/api/dammaStoryBrief.ts`
  - Server: `getDammaStoryBrief` in `server/src/controllers/dammaStoryBrief.controller.ts`

### UI structure

- Back link to `/:lang/specialist/briefs`
- Header with:
  - “Brief ID”
  - story type chip (if present in stored payload)
  - submitted date/time (if present)
- Tabs:
  - **Brief**: sectioned, human-readable summary rendered by
    `client/src/components/specialist/SubmittedBriefReadView.tsx`
  - **JSON**: raw payload JSON (download + copy actions)

## Starting a new brief (from the dashboard)

On `SpecialistBriefsPage`, clicking **New Story Brief**:

- calls `createNewDraftIdWithEmptyBrief()` from `client/src/utils/briefDraftStorage.ts`
  - generates a `crypto.randomUUID()`
  - immediately stores an empty `CompleteBrief` under that id
- navigates to `/:lang/specialist/create-brief/:draftId`

This means a “new brief” is always created as a **local draft first** (before any server submit).

## Entering the editor without a draft id (`/create-brief`)

The route `/:lang/specialist/create-brief` uses `client/src/components/brief/BriefFormDraftRedirect.tsx`:

- Picks a draft id with `getOrCreateMostRecentDraftId()`
  - If there are existing drafts, returns the draft with newest `savedAt`
  - If there are no drafts, creates a new empty draft id and stores it
- Redirects (replace navigation) to `/:lang/specialist/create-brief/:draftId`

Net effect: the “Story Brief” nav button always opens the **most recent** in-progress draft (or starts a new one).

## How the specialist moves through the brief (editor flow)

The editor is `client/src/components/brief/BriefForm.tsx` (route `/:lang/specialist/create-brief/:draftId`).

### Steps / sections

- `activeStep = 0` is the **pre-brief story type selector**
- `activeStep = 1..5` are the 5 brief sections

### Resume behavior (when opening a draft)

On mount (and whenever `draftId` changes), `BriefForm`:

- Loads the draft from local storage:
  - `loadDraftForDraftId(draftId) ?? createEmptyBrief()`
- Normalizes defaults
- Sets `activeStep`:
  - If story type is already selected → jumps to the **first incomplete section**
  - Else → stays on step 0 (story type selector)

### Navigation behavior (Back / Save & continue / progress indicator)

- Each section provides:
  - **Back**: `goBack(prevStep)` (does not write to storage by itself)
  - **Save & continue**: `saveAndAdvance(nextStep)`
    - stamps `savedAt = Date.now()`
    - normalizes defaults
    - writes to local storage
    - moves to the next step
- The progress indicator (`BriefProgressIndicator`) allows clicking:
  - any **past** section
  - or any **completed** section
  - to jump back for edits

## How in-progress briefs are stored “all the time”

### Storage location and key

In-progress work is stored **in the browser only** using `localStorage`, in `client/src/utils/briefDraftStorage.ts`.

- Registry key: `dammah_brief_drafts_v2`
- Format: `{ drafts: Record<draftId, CompleteBrief> }`

There is also a legacy single-slot key `dammah_brief_draft_v1` that is migrated into the v2 registry once.

### What gets saved and when

The editor stores the draft under the current `draftId`:

- **On editor open** (mount): it normalizes + writes the loaded draft back to local storage (ensures defaults are present).
- **On section change**: it may persist defaults and records `highestSectionVisited`.
- **On Save & continue**: it stamps `savedAt` and writes to local storage.
- **On the “continue” path from Story World → Section 5**: it also stamps `savedAt` and writes to local storage.

Important: field updates inside a section update React state; persistence is intentionally emphasized on **section transitions** (plus a few normalization checkpoints).

## Submitting the brief (server persistence)

On submit, `BriefForm` calls `submitDammaStoryBriefForm()` (`client/src/api/dammaStoryBrief.ts`), which does:

- `POST /api/admin/damma-story-briefs` with the full brief payload JSON

On the server:

- Router: `server/src/routes/dammaStoryBrief.routes.ts`
- Controller: `server/src/controllers/dammaStoryBrief.controller.ts` (`createDammaStoryBrief`)
  - Writes a document into Firestore collection `dammaStoryBriefs` with:
    - `schemaVersion`
    - `submittedAt` server timestamp
    - `submittedByUid`
    - `brief` (raw submitted JSON)

After successful submission:

- The local draft for that `draftId` is deleted (`deleteDraftForDraftId(draftId)`)
- The UI shows a success view
- The submitted brief then appears in the **Submitted** table on the dashboard (via list API)

## Permissions and roles (specialist access)

Specialist brief endpoints are protected server-side:

- Mounted at `server/src/app.ts` as `/api/admin/damma-story-briefs`
- All routes in `server/src/routes/dammaStoryBrief.routes.ts` use:
  - `requireAuth`
  - `requireRole("specialist", "admin")`

So the Specialist Panel expects an authenticated user with role **specialist** (or **admin**) to list/view/submit briefs.

