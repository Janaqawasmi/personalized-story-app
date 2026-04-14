# 04 — Story Workspace Deep Spec

The Story Workspace is the page where specialists do their work after a Story exists. It is large enough to need its own spec — three tabs, an editor, Agent 1 review controls, version history, status transitions. This file is the source of truth for all of it.

Route: `/:lang/specialist/stories/:storyId[/tab]` where `tab` is `brief`, `draft`, or `history`.

## Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Stories                                                       │
│                                                                   │
│  [Title — editable]                  [status chip] [⋯ actions]    │
│  Fear & Anxiety · Ages 5–7                                        │
│                                                                   │
│  ┌──────┬──────┬──────────┐                                        │
│  │ Brief│ Draft│ History  │                                        │
│  └──────┴──────┴──────────┘                                        │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                                                             │  │
│  │  [tab content]                                              │  │
│  │                                                             │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Header

- **Back link** → `/specialist/stories`. Always present.
- **Title.** Click to edit inline. Autosaves on blur. Empty title falls back to "Untitled story". Max 120 chars.
- **Status chip.** Reflects `story.status` with the colors defined in `02-routes-and-pages.md`. Shows a small spinner when `generating` or `needs_revision`.
- **Story type and age chips.** Read-only display. Pulled from `story.storyType` and `story.ageRange`. Age shows "—" if `null`.
- **Actions menu (`⋯`):**
  - **Archive** — soft delete; `transitionStatus(storyId, 'archived')`. Confirmation modal.
  - **Restore** — only visible if `status === 'archived'`.
  - **Open new revision** — only enabled when `briefStatus === 'submitted'` and `status` is one of `awaiting_review`, `in_review`, `needs_revision`, `approved`, or `published`. Creates a new Story with the brief copied and `parentStoryId` set. Routes to the new Story's Brief tab.
  - **Duplicate** — post-pilot. Hidden in v1.
  - **Copy story ID** — for support and debugging. Pilot-only utility, may be removed later.

### Tabs

- **Brief** — always available.
- **Draft** — disabled (greyed, with tooltip "Generate the story first") when `agent1Result === null`.
- **History** — always available.

The active tab is reflected in the URL. Switching tabs uses `replace` navigation (not `push`) so the back button takes the specialist back to the dashboard, not through the tab history.

---

## Tab 1 — Brief

The Brief tab has two modes depending on `briefStatus`.

### Mode A — Editable (`briefStatus === 'draft'`)

Renders the existing `BriefForm` component (the section-by-section editor that already exists in the codebase). The only change from the current implementation is that the brief data is loaded from and saved to the `Story` via the `DraftStore`, not directly to `localStorage`.

The flow:

1. `BriefForm` mounts with `story.brief` as its initial state.
2. The specialist edits fields. Changes are held in React state.
3. On section transition (Back / Save & continue), `BriefForm` calls `draftStore.updateBrief(storyId, currentBrief)`. The store updates `story.brief`, bumps `updatedAt`, and emits subscriptions.
4. When the specialist clicks "Submit brief" on the final section, `BriefForm` calls `draftStore.submitBrief(storyId)`. This triggers the status transition `draft_brief → generating` and kicks off Agent 1 (see `05-api-surface.md`).
5. Once `submitBrief` resolves, the Workspace re-renders with the new status, the Brief tab flips to read-only mode, and the page redirects to the Draft tab (which now shows a "Generating..." state).

A persistent save indicator at the top of the form shows "Saved 2 minutes ago" or "Saving..." pulled from `story.updatedAt`. This replaces the current implicit-save model with something visible — specialists should never wonder whether their work is safe.

A "Submit to Agent 1" button is enabled only when all required fields are complete. The completeness check is the existing one from `BriefForm`, unchanged. Disabled state shows a tooltip with the count of incomplete sections.

### Mode B — Read-only (`briefStatus === 'submitted'`)

Renders `SubmittedBriefReadView` (the existing component) showing the brief as a sectioned, human-readable summary. No editing controls.

A banner at the top: "This brief was submitted on [date]. Briefs cannot be edited after submission. To make changes, [Open new revision](#)."

The "Open new revision" link triggers the same flow as the actions menu item — creates a new Story with the brief copied and `parentStoryId` set, then routes to the new Story's Brief tab.

A small inline link below the banner: "View as JSON" — opens a modal showing the raw `story.brief` payload with copy-to-clipboard. Useful for debugging and for the clinical team if they want to inspect a brief precisely.

### When `status === 'generating'`

The Brief tab is in read-only mode and shows an additional banner: "Agent 1 is generating your story. This usually takes 30–60 seconds." with a spinner. The page polls `draftStore.getStory(storyId)` every 5 seconds (or uses the subscription if available) to detect when status moves to `awaiting_review`, then auto-redirects to the Draft tab.

If Agent 1 fails terminally and the status returns to `draft_brief` (via the `generating → draft_brief` transition in the state machine), the banner is replaced with a red error banner: "Agent 1 was unable to generate a story. [Error message from the server]. Your brief is back in draft mode — you can edit it and try again." The tab returns to Mode A.

---

## Tab 2 — Draft

The Draft tab is the heart of the Workspace. It shows the Agent 1 outputs and the editor where the specialist refines the prose.

### Layout (top to bottom)

```
┌─────────────────────────────────────────────────────────────────┐
│  Agent 1 review                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Emotional truth                       [✓ Captures] [✗]    │    │
│  │ {paragraph}                                              │    │
│  └──────────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Narrative blueprint                   [✓ Right journey][✗]│    │
│  │ 1. ...                                                   │    │
│  │ 2. ...                                                   │    │
│  │ ...                                                      │    │
│  │ Coping tool placement: ...                               │    │
│  │ Approach: ...                                            │    │
│  └──────────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ ⚠ Compression metadata (if present)                       │    │
│  │ ⚠ Inferred intention (if present)                         │    │
│  │ ⚠ Safety flags (if present)                               │    │
│  └──────────────────────────────────────────────────────────┘    │
│  Alignment note: {2-3 sentences}                                  │
│                                                                   │
│  ┌─────────────────┬───────────────────────────────────────┐     │
│  │ Versions: [v3 ▾]│ Word count: 612 / 500–800              │     │
│  └─────────────────┴───────────────────────────────────────┘     │
│                                                                   │
│  Story                                                            │
│  ┌──────────────────────────────────────┬───────────────────┐    │
│  │ Title: [editable]                    │  Side panel       │    │
│  │ ┌────────────────────────────────┐   │                   │    │
│  │ │                                │   │  Must-never list  │    │
│  │ │ {story body — editable}        │   │  • ...            │    │
│  │ │                                │   │  • ...            │    │
│  │ │                                │   │                   │    │
│  │ │                                │   │  Placeholders     │    │
│  │ └────────────────────────────────┘   │  • [CHILD_NAME]   │    │
│  │                                       │  • [HE/SHE/THEY]  │    │
│  └──────────────────────────────────────┴───────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │ [Save edits]  [Regenerate with feedback]  [Mark approved] │     │
│  └─────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

### Agent 1 review section

The top of the Draft tab shows the structured Agent 1 outputs with approve/reject controls.

**Emotional truth card.** Shows `agent1Result.emotionalTruth` (the 60–120 word paragraph). Two buttons: "Captures my intention" (sets a UI flag — does not transition status) and "Misses something — provide feedback" (opens a feedback modal). Approving the emotional truth doesn't trigger a regeneration; it just records the specialist's confirmation in the History tab.

**Blueprint card.** Shows `agent1Result.blueprint` (the 6 numbered points), `agent1Result.copingToolPlacement` (the placement note), and `agent1Result.approachInstruction` (the plain-language approach description). Two buttons: "Right journey" and "Wrong direction — provide feedback". Same approval semantics as the emotional truth.

**Conditional cards** (only visible when present in `agent1Result`):

- **Compression metadata.** If `agent1Result.compressionMetadata !== null`, this card is shown with a yellow banner. The card lists what was fully included, what was compressed, and what was omitted. Includes a "Why is this here?" link to a tooltip explaining that the brief had more obligations than the chosen story length could fit. Includes a "Open new revision with longer length" action that pre-fills a new revision with the story length bumped up.
- **Inferred intention flag.** If `agent1Result.inferredIntention !== null`, this card is shown with an amber banner. Shows the original intention and the inferred one. Two buttons: "Use inferred" (records acceptance, no regeneration) and "Edit brief instead" (opens a new revision).
- **Safety flags.** If `agent1Result.postValidation.flags.length > 0`, this card is shown with a red border. Each flag is listed with its check number, the passage it concerns (max 15 words quoted), the reasoning, and the severity ("likely violation" / "borderline — specialist should review"). The specialist can dismiss each flag individually after reviewing, or address them via prose edits in the editor below.

**Alignment note.** Always shown below the cards. Just text — `agent1Result.postValidation.alignmentNote`. 2–3 sentences. No interaction.

### Versions dropdown

To the right of the alignment note, a dropdown showing all entries in `story.agent1Versions`. Most recent first. Format: "v3 — generated 2 hours ago (current)" or "v1 — generated yesterday". Selecting a version updates `agent1Result` to that version (the underlying data isn't modified — this is purely a UI selection that determines which version's outputs are rendered above).

If the specialist switches versions while there are unsaved edits in the editor, a confirmation modal appears: "You have unsaved edits to the current draft. Switching versions will discard them. Continue?".

### The story editor

A two-column layout: editor on the left, side panel on the right.

**Editor (left column).** Plain `<textarea>` (or a minimal contentEditable equivalent — but plain `<textarea>` is fine for the pilot). Shows the title at the top (also editable) and the story body below. Both editable. Minimum height: 400px. Resizable vertically. Word count shown at the top right of the editor: "612 words / target 500–800" with the target pulled from `STRUCTURAL_PARAMS[ageRange][length]` in the brief model file. The word count turns red if it's outside the ±30% drift threshold.

The editor saves when the specialist clicks "Save edits". Not on every keystroke. Not on blur. Explicit save only. The save indicator next to the button shows "Last saved 2 minutes ago" or "Unsaved changes" when the editor has been touched since the last save.

A keyboard shortcut: `Cmd/Ctrl+S` triggers Save edits. This is the only keyboard shortcut in the pilot.

**Side panel (right column).** Read-only reference material the specialist needs while editing:

- **Must-never list.** Renders `story.brief.therapeuticArchitecture.mustNeverList` as a bulleted list. This is the authoritative version (the specialist's edited list, not the pre-fill defaults).
- **Personalization placeholders.** Lists the placeholder strings: `[CHILD_NAME]`, `[HE/SHE/THEY]`, `[HIM/HER/THEM]`, `[HIS/HER/THEIR]`. Each is clickable — clicking inserts the placeholder at the cursor position in the editor. Pilot keyboard accessibility: each is also a button so it's tab-accessible.
- **Coping tool reminder.** A small card showing the coping tool name from the brief and the coping tool placement note from Agent 1. Helps the specialist verify their edits don't accidentally remove the coping tool moment.
- **Brief quick-reference link.** "← Back to brief" — switches to the Brief tab.

The side panel can be collapsed via a small toggle to give the editor full width. Collapsed state is remembered in `localStorage` (one of the few legitimate uses of `localStorage` outside the storage adapter — UI preferences, not data).

### Action bar (bottom of the tab)

Three buttons, arranged left to right:

- **Save edits.** Primary button. Enabled when the editor has unsaved changes. Calls `draftStore.updateStory(storyId, { currentDraft: { title, body, wordCount, updatedAt: now } })` and appends an `EditHistoryEntry` with `kind: 'draft_edited'`.
- **Regenerate with feedback.** Secondary button. Opens a modal. The modal has a textarea ("What should be different?") and a confirmation button. Submitting calls `draftStore.transitionStatus(storyId, 'needs_revision')` with the feedback attached. Disabled when `agent1Versions.length >= 3` (the cap from the Agent 1 spec).
- **Mark approved.** Primary success button. Disabled while there are unsaved edits or unaddressed safety flags (if any flags exist). Calls `draftStore.transitionStatus(storyId, 'approved')`.

A small text below the action bar: "This story has been regenerated 1 time. 1 regeneration remaining." Counts down based on `agent1Versions.length`.

### When `status === 'generating'` or `'needs_revision'`

The Draft tab shows a centered loading state instead of the full layout. "Agent 1 is generating your story..." with a spinner and an estimated time ("Usually takes 30–60 seconds"). The page polls or subscribes for status changes and auto-renders the new outputs when they arrive.

If the previous version is still in `agent1Result` (which it will be during a `needs_revision` regeneration), a small link appears: "View previous version while you wait". Clicking it shows the previous version's outputs in a read-only modal.

### When `status === 'approved'`

The action bar changes:

- **Save edits** is replaced with **Reopen for editing** — a secondary button that calls `transitionStatus(storyId, 'in_review')`. Only enabled within 24h of approval (the safety hatch from the state machine).
- **Regenerate with feedback** is hidden.
- **Mark approved** is replaced with a green "Approved" pill with the approval timestamp.

The editor is still visible but read-only. The story body has a subtle background color change to indicate it's locked.

### When `status === 'archived'`

The Draft tab is shown but everything is read-only and dimmed. A banner at the top: "This story is archived. [Restore]" with a button that calls the archive-restore transition.

---

## Tab 3 — History

The History tab shows the chronological event log from `story.editHistory` plus a few system events derived from the Story metadata.

### Layout

A single vertical timeline. Most recent at the top.

```
┌─────────────────────────────────────────────────────────────────┐
│  Today                                                            │
│  ─ 14:23  Status changed: in_review → approved                    │
│  ─ 14:18  Draft edited (612 words)                                │
│  ─ 14:05  Status changed: awaiting_review → in_review             │
│                                                                   │
│  Yesterday                                                        │
│  ─ 17:42  Agent 1 generated story (v3, 587 words)                 │
│  ─ 17:41  Regeneration requested: "make the bear more uncertain"  │
│  ─ 17:30  Agent 1 generated story (v2, 624 words)                 │
│  ─ 17:28  Regeneration requested: "tone is too cheerful"          │
│  ─ 17:15  Agent 1 generated story (v1, 598 words)                 │
│  ─ 17:14  Status changed: draft_brief → generating                │
│  ─ 17:14  Brief submitted                                         │
│                                                                   │
│  Mar 14                                                           │
│  ─ 09:32  Story created                                           │
└─────────────────────────────────────────────────────────────────┘
```

Each entry shows:

- A timestamp (relative: "2 hours ago" within the last 24h, then absolute).
- A short label describing the event.
- For `draft_edited` entries, a "View snapshot" link that opens a modal showing the saved snapshot at that point in time. The modal also has a "Restore this version" button that copies the snapshot back into `currentDraft` (creating a new edit history entry — never mutating history).
- For `regeneration_requested` entries, the feedback text the specialist provided.
- For `agent1_generated` entries, the version number and word count.
- For `status_changed` entries, the from/to statuses.

Events are grouped by day. The day header is sticky.

### What's not in History (pilot)

- No diff visualization between draft snapshots. The pilot stores full snapshots; diffs are post-pilot.
- No filtering. All events are shown.
- No search.
- No pagination. The list is short enough that virtual scrolling is not needed in v1.

### Why the History tab matters

The History tab is the audit trail. For clinical accountability, you need to be able to answer questions like "when did this story get approved" and "who edited it last and what was the regeneration feedback". The History tab is where that lives. Don't cut it for scope reasons — it's small to build and load-bearing for trust.

---

## Loading and error states

### Loading

When the Workspace mounts and is fetching the Story:

- Header skeleton (gray placeholder for the title and chips)
- Tab bar visible but disabled
- Tab content area shows a centered spinner

If the fetch takes more than 3 seconds, show a "Still loading..." message. This catches localStorage quota errors and Firestore latency.

### Story not found

If `getStory(storyId)` returns `null`:

- Centered error: "This story doesn't exist or was deleted."
- A button: "Back to stories" → `/specialist/stories`.

### Story belongs to another user

In the pilot this can't happen (single-device localStorage), but the Firestore implementation needs to handle it: server returns 403, client renders the same "doesn't exist" message (no information disclosure).

### Network/storage error

A red banner at the top of the page: "We had trouble loading this story. [Try again]". The Try again button re-fetches.

---

## Accessibility notes

- All buttons have aria labels.
- Tab bar uses the WAI-ARIA tabs pattern (`role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`).
- The editor has a visible label ("Story body").
- The status chip has a visually-hidden description for screen readers (e.g., "Status: in review, needs your attention").
- Color is never the only signal — every status chip also has a label, every flag also has an icon.

The pilot does not need a full accessibility audit, but these baselines make the difference between "usable with a screen reader" and "completely broken".

Now read `06-migration-plan.md`.
