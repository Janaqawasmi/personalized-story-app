# Draft Tab Specification (UI/UX + Behavior)

This document is the implementation-accurate spec for the Story Workspace Draft tab in the specialist flow. It describes what the Draft tab does today, how it behaves by status, and how the UI/UX is designed.

Primary implementation references:

- `client/src/specialist/components/DraftTab.tsx`
- `client/src/specialist/pages/StoryWorkspacePage.tsx`
- `client/src/specialist/components/WorkspaceTabs.tsx`
- `client/src/specialist/storage/DraftStore.ts`
- `client/src/types/story.ts`

---

## 1) Scope and Purpose

The Draft tab is where specialists:

- Review AI output quality and safety signals.
- Edit the generated story prose and title.
- Manage versioned outputs (up to 3 AI versions).
- Trigger regeneration with explicit feedback.
- Approve a story once review conditions are satisfied.

The tab is one panel in the Story Workspace route:

- `/:lang/specialist/stories/:storyId/:tab`
- `:tab` in `{brief, draft, history}`

The Draft tab is disabled until a story has at least one AI result (`story.agent1Result !== null`).

---

## 2) Entry Conditions and Routing

Draft tab availability and defaults:

- Tab selector source: `WorkspaceTabs`.
- Draft tab disabled when `story.agent1Result === null`.
- Workspace default tab by status (when URL tab missing/invalid):
  - `awaiting_review`, `in_review`, `needs_revision`, `approved`, `published` -> Draft tab.
  - `draft_brief`, `generating`, `archived` -> Brief tab.

Unsaved-draft leave protection:

- If specialist is on Draft and has unsaved edits:
  - Switching to Brief/History opens confirm dialog ("Leave without saving?").
  - Clicking "Stories" back link opens the same guard dialog.

---

## 3) Information Architecture (Visual Layout)

Inside `DraftTab`, the composition is:

1. Container paper with bordered card treatment.
2. Optional archived banner (Restore action).
3. Review mode toggle row.
4. Sticky validation blocker strip (if unresolved safety findings exist).
5. Main two-zone layout:
   - Left: story editing zone (primary).
   - Right: evidence sidebar (secondary).
6. Version switch confirm dialog (when unsaved edits exist).
7. Regeneration request dialog.
8. Error snackbar.

Responsive behavior:

- Mobile/small screens: stacked single column.
- Desktop:
  - Normal mode: left 60% / right 40%.
  - Review mode: left 100%, right hidden.

---

## 4) Status-Driven Rendering Modes

## 4.1 `generating` or `needs_revision`

The full editor/evidence layout is replaced by `GeneratingState`:

- Centered spinner + message ("AI is generating your story…").
- Helper text ("This usually takes 30-60 seconds.").
- Polling every 5s via `draftStore.getStory(story.id)` until status exits generating states.
- Optional action: "View previous version while you wait" if prior version exists.
  - Opens read-only modal with emotional truth, blueprint, and alignment note.

## 4.2 `in_review` / `awaiting_review`

Full editable Draft experience:

- Editable title and body.
- Save edits enabled when dirty.
- Regenerate available (subject to cap/status rules).
- Approve available only when all constraints pass.

## 4.3 `approved`

Read-only mode:

- Title/body fields become read-only.
- Evidence action buttons hidden.
- Bottom bar changes:
  - "Reopen for editing" button (transitions to `in_review`).
  - Green approved chip with date.
- No save/regenerate/approve controls in active mode.

## 4.4 `archived`

Read-only + dimmed mode:

- Whole tab opacity reduced (`0.5`).
- Warning banner shown at top with `Restore` action.
- Action bar not rendered.

---

## 5) Editor Zone (Left, Primary)

Content order:

1. Version selector row.
2. Title input.
3. Word count line.
4. Full-height multiline body editor.
5. Pinned action bar.

### 5.1 Version selector

- Source: `story.agent1Versions`.
- Dropdown label format: `v{n} — {relative time}` with `(current)` on latest.
- Additional metadata:
  - Agent output words vs target range (from selected version).
  - "Older version" chip when not on latest.
- If unsaved edits exist and user switches version:
  - Confirm dialog appears.
  - Confirming discards unsaved changes and switches.

### 5.2 Editing model

Local state fields:

- `editorTitle`
- `editorBody`
- `hasUnsavedChanges`
- `isSaving`

Dirty state rules:

- Any editable change marks Draft as unsaved.
- Save clears unsaved flag on success.
- Switching version resets editor content and clears dirty flag.

Persistence:

- Save writes `currentDraft` through `draftStore.updateStory`.
- Saved payload:
  - `title`, `body`, `wordCount`, `updatedAt`.

Keyboard shortcut:

- `Cmd/Ctrl + S` triggers save when not currently saving.

Unload protection:

- Browser `beforeunload` warns when unsaved edits exist.

### 5.3 Word count UX

- Live word count derived from `editorBody`.
- Shown as: `Your draft: X words / target min-max`.
- Turns error color when outside selected version target range.

### 5.4 Review mode UX

Review mode toggle behavior:

- Stored in `sessionStorage` under `specialist-draft-review-mode`.
- When ON:
  - Evidence sidebar hidden.
  - Story area expanded to full width.
  - Larger title/body typography for reading/reviewing prose.
- When OFF:
  - Standard 60/40 editor/evidence split.

---

## 6) Evidence Sidebar (Right, Secondary)

Displayed only when Review mode is OFF.

Content stack:

1. Safety section (always first):
   - If findings: large red Safety Review card.
   - If no findings: explicit green all-clear line.
2. "Evidence" heading.
3. Must-never checklist card.
4. AI reasoning accordions (collapsed by default):
   - Emotional truth
   - Narrative blueprint
   - Compression metadata (conditional)
   - Inferred intention (conditional)
   - Alignment note (conditional)
5. Always-visible utility cards:
   - Placeholders (click-to-insert at cursor)
   - Coping tool reminder + "Back to brief" link

### 6.1 Safety Review card

Data source:

- `displayedResult.postValidationFlags`.

Per finding displays:

- Check type label (`must_never`, `shame_handling`, `coping_tool`, `age_appropriateness`).
- Severity chip:
  - `likely_violation` -> red "Likely violation"
  - otherwise -> warning "Review recommended"
- Quoted passage and reasoning.
- Dismiss/Restore button (hidden in read-only mode).

Dismiss behavior:

- Local UI-only state in `dismissedFlags` set.
- Does not mutate server story.

### 6.2 Sticky blocker strip

A compact sticky strip above layout highlights top unresolved findings:

- Prioritization:
  1. must_never
  2. shame_handling
  3. age_appropriateness
  4. coping_tool
- Shows up to top 3 unresolved findings.
- Shows unresolved count and optional `+N more` note.
- Provides quick Dismiss action unless read-only.

Approve gating dependency:

- Any undismissed safety finding blocks "Mark approved".

### 6.3 Must-never checklist

Source:

- `story.brief.section3?.mustNeverList`.

Behavior:

- Each line marked with:
  - Warning icon when linked to must-never flag.
  - Success icon otherwise.
- "No must-never items defined" empty state when list is empty.

### 6.4 AI reasoning cards

Emotional truth card:

- Displays `displayedResult.emotionalTruth`.
- Actions:
  - "Captures my intention" -> local confirmed chip.
  - "Misses something" -> feedback dialog.

Blueprint card:

- Displays numbered `displayedResult.blueprint`.
- Displays coping placement + approach instruction.
- Actions:
  - "Right journey" -> local confirmed chip.
  - "Wrong direction" -> feedback dialog.

Compression metadata card (conditional):

- Rendered when `displayedResult.compressionMetadata` exists.
- Shows fully included, compressed, omitted obligations.

Inferred intention card (conditional):

- Rendered when `displayedResult.inferredIntention` exists.
- Displays feel/because/reason fields.
- Actions:
  - "Use inferred" -> local accepted chip.
  - "Edit brief instead" -> creates new revision story and navigates to its Brief tab.

Alignment note accordion (conditional):

- Rendered only if `displayedResult.alignmentNote` is present.

Feedback capture:

- Feedback dialog writes into local `feedback` map by card key.
- Later prefilled into regenerate dialog text area.

### 6.5 Placeholders + coping reminder

Placeholders:

- Chips: `[CHILD_NAME]`, `[HE/SHE/THEY]`, `[HIM/HER/THEM]`, `[HIS/HER/THEIR]`.
- Click inserts token at caret in story textarea (preserves cursor position).

Coping tool card:

- Shows brief-selected coping tool label if present.
- Shows AI placement text when available.
- Includes quick nav link to Brief tab.

---

## 7) Action Bar Logic

The action bar is pinned to bottom of editor column (except archived mode).

### 7.1 Save edits

Enabled when:

- `hasUnsavedChanges === true`
- not currently saving
- not read-only

States:

- Saving spinner/text while in-flight.
- "Unsaved changes" warning text when dirty.
- "All changes saved" with check icon when clean.

### 7.2 Regenerate

Button behavior:

- Opens regeneration dialog.
- Disabled when:
  - max versions reached (`agent1Versions.length >= 3`)
  - status is `awaiting_review`

Dialog requirements:

- Feedback text required (non-empty trim).
- Shows whether current edits will be snapshotted before regeneration:
  - If edits differ from latest AI output -> snapshot version notice.
  - Else shows no-separate-snapshot notice.

Submission flow:

1. Auto-save if unsaved edits exist.
2. If status is `awaiting_review`, first transition to `in_review`.
3. Transition to `needs_revision` with metadata `{ feedback }`.
4. Parent page receives updated story and rerenders generating state.

### 7.3 Mark approved

Disabled when any is true:

- Unsaved edits exist.
- At least one safety finding remains undismissed.
- Status is `awaiting_review`.

Tooltip explains the first blocking reason.

Approve flow:

1. If in `awaiting_review`, transition to `in_review`.
2. Transition to `approved`.
3. Draft tab switches to read-only approved mode.

### 7.4 Regeneration counter text

Shown when status is not `approved`:

- `regenerated N time(s)`
- `M regeneration(s) remaining`

Cap source:

- `MAX_VERSIONS = 3`.

---

## 8) Data + Store Contracts Used by Draft Tab

Core story fields consumed:

- `status`
- `agent1Result`
- `agent1Versions`
- `currentDraft`
- `brief.section3.copingTool`
- `brief.section3.mustNeverList`
- `approvedAt`

Store methods used:

- `draftStore.getStory(storyId)` (polling in generating state)
- `draftStore.updateStory(storyId, patch)` (save edits)
- `draftStore.transitionStatus(storyId, to, metadata?)`
- `draftStore.createStory(...)` + `updateBrief(...)` + `updateStory(...)` (new revision from inferred intention)

Transition statuses triggered from Draft tab:

- `awaiting_review -> in_review`
- `in_review -> needs_revision`
- `in_review -> approved`
- `approved -> in_review`
- `archived -> draft_brief` (restore action in archived banner)

---

## 9) Error Handling and Recovery UX

All async handler failures surface in a bottom-center error snackbar.

Failure-safe patterns:

- Polling ignores transient fetch errors and retries on next tick.
- Regeneration and approval flows wrapped with try/catch and user feedback.
- Title/body save errors do not discard local edit text.

---

## 10) Accessibility and Interaction Notes

Current accessible affordances:

- Tabs use MUI tabs semantics with `aria-controls`.
- Review mode switch has descriptive `aria-label`.
- Critical controls are buttons/chips with visible labels.
- Confirm/regen dialogs use clear destructive wording.

Known practical UX decisions:

- Safety-first architecture: flags are visually prioritized and gate approval.
- Reading comfort mode: review mode enlarges text and removes sidebar noise.
- Data-loss prevention:
  - beforeunload guard
  - tab-leave guard (workspace level)
  - version-switch confirmation

---

## 11) Acceptance Checklist (Behavioral)

- Draft tab inaccessible until first AI output exists.
- Generating statuses show spinner state and 5s polling.
- Evidence sidebar hides in review mode and returns when toggled off.
- Placeholder click inserts at active caret position.
- Save via button and `Cmd/Ctrl+S` persists `currentDraft`.
- Unsaved edits block approve and trigger leave guards.
- Undismissed safety findings block approve.
- Regenerate requires non-empty feedback and enforces version cap.
- Approved state is read-only with reopen action.
- Archived state is dimmed with restore banner action.

---

## 12) Out-of-Scope / Not Implemented in Current Draft Tab

- Diff viewer between versions.
- Per-flag persistence of dismiss/restore decisions.
- Multi-user presence or collaborative edits.
- Side-panel collapse persistence (current design uses Review mode instead).
- Rich text editing (current editor is plain text multiline).

