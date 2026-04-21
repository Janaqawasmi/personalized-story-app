# Draft Tab — Direction B (Editorial Manuscript)

**Implementation spec · React + MUI**
**Audience:** frontend engineer replacing the current `DraftTab.tsx` with Direction B.
**Status:** v1 — treat as the source of truth for behavior; defer UI polish questions to design review.

---

## 0. Summary of what changes vs. today

Today's `DraftTab.tsx` is a two-zone layout: plain-text editor on the left, a tall evidence column on the right with Safety Review + must-never + accordioned reasoning + placeholders + coping. Direction B keeps the same data contract but restructures the surface around four ideas:

1. **Manuscript editor.** The body reads like a book page — centered column, serif, generous leading, drop cap, ornamental divider, paper card on a warm background.
2. **Tabbed right rail.** Evidence becomes three tabs (`Safety`, `Reasoning`, `Tools`) instead of one long scroll. Safety is the default tab and carries a count badge.
3. **Inline safety anchors.** Each `postValidationFlag` gets a numbered footnote marker (`[1]`, `[2]` …) rendered inline on the flagged passage. Clicking the marker scrolls the Safety tab to that finding; hovering the finding highlights the passage.
4. **Split action hierarchy.** Save is a quiet affordance near the manuscript. Approve/Regenerate live in a prominent floating bar with a circular readiness gauge and an explicit checklist of gates.

No changes to the data model, the `draftStore` API, or status transitions. All existing status-driven modes (`generating`, `needs_revision`, `approved`, `archived`) remain.

---

## 1. Architecture

```
DraftTabB (container)
├── ArchivedBanner                      // status === 'archived'
├── VersionTimeline                     // replaces VersionSelectorRow
├── ManuscriptEditor                    // replaces left column
│   ├── PaperCard
│   │   ├── TypeRibbon                  // "MANUSCRIPT · v{n}"
│   │   ├── TitleInput
│   │   ├── MetaLine                    // Ages · story type · coping tool
│   │   └── ManuscriptBody
│   │       ├── DropCapParagraph
│   │       ├── AnnotatedParagraph[]    // with footnote markers
│   │       └── OrnamentalDivider
│   ├── SaveStatusBar                   // quiet inline save row
│   └── ApprovedStamp                   // status === 'approved'
├── EvidenceRail                        // replaces right column
│   ├── RailTabs                        // Safety | Reasoning | Tools
│   ├── SafetyPanel                     // default tab
│   │   ├── FindingsSummary
│   │   ├── SafetyFinding[]
│   │   └── MustNeverChecklist
│   ├── ReasoningPanel
│   │   ├── EmotionalTruthSection
│   │   ├── BlueprintSection
│   │   ├── CompressionSection          // conditional
│   │   └── AlignmentNote               // conditional
│   └── ToolsPanel
│       ├── PlaceholderInserter
│       ├── CopingReminder
│       └── StoryContextCard
├── ApproveBar                          // floating, not rendered when archived/approved
│   ├── ReadinessGauge
│   ├── ReadinessChecklist
│   └── ActionCluster                   // Regenerate + Mark approved
├── RegenerateDialog                    // unchanged from today
├── VersionSwitchConfirmDialog          // unchanged from today
└── ErrorSnackbar                       // unchanged
```

Files to add under `client/src/specialist/components/draftB/`:

- `DraftTabB.tsx` (container, state, handlers)
- `VersionTimeline.tsx`
- `ManuscriptEditor.tsx`
- `ManuscriptBody.tsx`
- `SaveStatusBar.tsx`
- `EvidenceRail.tsx`
- `SafetyPanel.tsx`
- `ReasoningPanel.tsx`
- `ToolsPanel.tsx`
- `ApproveBar.tsx`
- `tokens.ts` (new — see §4)

Shared code reused from today: `FeedbackDialog`, `GeneratingState`, `VersionSwitchConfirmDialog`, `RegenerateDialog`, `mustNeverFlaggedForIndex`, `countUndismissedFlags`, `getTopUndismissedBlockers`, the `PLACEHOLDERS` const, `CHECK_TYPE_LABELS`, `MAX_VERSIONS`.

---

## 2. Props and state

### 2.1 `DraftTabB` props

Same as existing `DraftTabProps` — no change:

```ts
interface DraftTabProps {
  story: Story;
  onStoryUpdate: (story: Story) => void;
  onNavigateToTab?: (tab: "brief" | "history") => void;
  onUnsavedDraftChange?: (hasUnsaved: boolean) => void;
}
```

### 2.2 Local state

```ts
// existing
const [selectedVersionIndex, setSelectedVersionIndex] = useState(versions.length - 1);
const [editorTitle, setEditorTitle] = useState(...);
const [editorBody, setEditorBody] = useState(...);
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
const [isSaving, setIsSaving] = useState(false);
const [dismissedFlags, setDismissedFlags] = useState<Set<number>>(new Set());
const [feedback, setFeedback] = useState<Record<string, string>>({});
const [pendingVersionIndex, setPendingVersionIndex] = useState<number | null>(null);
const [regenDialogOpen, setRegenDialogOpen] = useState(false);
const [regenFeedback, setRegenFeedback] = useState("");
const [regenSubmitting, setRegenSubmitting] = useState(false);
const [snackbar, setSnackbar] = useState<string | null>(null);

// new
const [activeRailTab, setActiveRailTab] = useState<"safety" | "reasoning" | "tools">("safety");
const [hoveredFlagIndex, setHoveredFlagIndex] = useState<number | null>(null);
const [storyFont, setStoryFont] = useState<"serif" | "sans">("serif"); // persisted to sessionStorage
```

### 2.3 Removed state

- `reviewMode` — replaced by the rail being permanently visible. Review-only reading can be achieved by closing the rail (not part of v1).

### 2.4 Persisted preferences

```ts
// sessionStorage keys
"dammah.draftB.storyFont"       // "serif" | "sans", default "serif"
"dammah.draftB.activeRailTab"   // "safety" | "reasoning" | "tools", default "safety"
```

---

## 3. Component specs

### 3.1 `VersionTimeline`

Replaces the `Select` dropdown with an inline, scannable strip.

**Props**

```ts
interface VersionTimelineProps {
  versions: Agent1Result[];
  selectedIndex: number;
  onSelect: (index: number) => void;  // caller handles unsaved-edits guard
  wordCount: number;
  targetRange: [number, number];
  regenRemaining: number;
}
```

**Layout**

```
[icon "Versions"]   ●v1 First draft ─── ●v2 Current · 18m ago    ┄ v3 via Regenerate
                                                                    248 words · target 240–320
```

- Pills are rounded buttons; selected = filled with `COLORS.primary`, unselected = outlined.
- Each pill shows: avatar circle with `v{n}`, stacked label (`First draft` / `Revision N`) and subtitle (`18m ago` / `current`).
- Dashed ghost pill for the next slot when `versions.length < MAX_VERSIONS`; copy: `v{n} available via Regenerate`. Not clickable.
- Word-count / target line sits right-aligned on the same row (use `Stack direction="row" justifyContent="space-between"`). Turn error color when `wordCount < min || wordCount > max`.

**Interaction**

- Click → `onSelect(index)`. Caller (container) performs the dirty-check and routes to `VersionSwitchConfirmDialog` if `hasUnsavedChanges`.
- Keyboard: each pill is a `<button>` in tab order; `Enter`/`Space` activates. Arrow keys are *not* wired in v1.

---

### 3.2 `ManuscriptEditor`

**Props**

```ts
interface ManuscriptEditorProps {
  title: string;
  body: string;
  onTitleChange: (t: string) => void;
  onBodyChange: (b: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  readOnly: boolean;
  storyFont: "serif" | "sans";
  meta: { ageRange: string; storyTypeLabel: string; copingToolLabel: string | null };
  versionNumber: number;
  flags: PostValidationFlag[];
  dismissedFlags: Set<number>;
  hoveredFlagIndex: number | null;
  onFlagMarkerClick: (flagIndex: number) => void;  // switches rail to "safety" + scrolls
  onParagraphHover: (flagIndex: number | null) => void;
}
```

**Layout**

- Outer column: `max-width: 680px`, centered, padding `36px 48px 140px` to leave room for the floating approve bar.
- Paper card: `background: #fffdf9`, `1px solid COLORS.border`, `border-radius: 2px`, dual shadow (`0 1px 2px rgba(60,50,40,0.05), 0 20px 60px rgba(60,50,40,0.08)`), padding `56px 72px 48px`.
- Type ribbon: absolutely positioned `top: -14px, left: 40px`; `MANUSCRIPT · v{n}` in uppercase 10px/700/1.2 letter-spacing on `COLORS.rose` background.

**Title**

- `<input>`, transparent, no border, serif italic when `storyFont === 'serif'`, 34px/500, letter-spacing `-0.6px`, centered.
- `readOnly` when status is `approved` or `archived`.

**Meta line**

- Directly under title: `AGES 5–7  ·  FEAR & ANXIETY  ·  BOX BREATHING` in 11px uppercase 600, `letter-spacing: 0.6px`, dots rendered as 3×3 circles.

**Body**

Render the textarea as two layers:

1. An invisible `<textarea>` absolutely positioned over the rendered prose (for editing) — OR v1: render the body as a contenteditable `<div>` and sync on blur (simpler; avoids caret/scroll drift). Recommendation: **ship v1 as `<TextField multiline>` in "editing" state and a formatted read-view in "reading" state**, toggled by a quiet `Edit` / `Read` switch in `SaveStatusBar`. This sidesteps the overlay problem.

   v1 behavior:
   - Default view: formatted read layout (drop cap, paragraphs, footnote markers, ornament).
   - `Edit` toggle swaps to `<TextField multiline minRows={18}>` styled with the same serif/line-height, still inside the paper card. `textareaRef` points here.
   - Save flushes the textarea content back into `editorBody`; returning to read view re-renders the formatted layout.

2. In read layout, split `body` on `\n\n` → paragraph array, render with `ManuscriptBody` (§3.3).

**Typography**

- `storyFont === 'serif'`: `'Lora', 'Iowan Old Style', Georgia, serif`, 16.5px / line-height 1.85, `text-align: justify`, `hyphens: auto`.
- `storyFont === 'sans'`: `Inter`, same size and leading, no drop cap.

**Drop cap** (serif only, first paragraph)

- First letter: `float: left; font-size: 62px; line-height: 0.85; font-weight: 600; color: COLORS.rose; padding-right: 8px; padding-top: 4px;`.

**Ornamental divider**

- After the last paragraph: centered `❦` (U+2766), 20px, letter-spacing 8px, color `COLORS.inkMuted`, 12px top margin / 6px bottom.

**Placeholder tokens**

Render `[CHILD_NAME]`, `[HE/SHE/THEY]`, `[HIM/HER/THEM]`, `[HIS/HER/THEIR]` inline as styled spans:

```css
font-family: ui-monospace, Menlo, monospace;
font-size: 0.78em;
background: COLORS.primarySoft;
color: COLORS.primaryDark;
padding: 1px 6px;
border-radius: 3px;
letter-spacing: 0.3px;
```

Use a simple `split(/(\[CHILD_NAME\]|\[HE\/SHE\/THEY\]|...)/g)` to tokenize.

---

### 3.3 `ManuscriptBody` — flag anchoring

**Goal:** footnote markers inline on flagged passages, with hover highlight and click-to-scroll.

**Algorithm**

For each `flag` in `flags`:

1. Let `needle = flag.passage.trim()` (or its first sentence if > 120 chars).
2. Find the first paragraph that `includes(needle)` — this is the anchor paragraph for that flag index.
3. Build a map `paragraphIndex → flagIndex[]`.

Store this as a memoized derivation:

```ts
const flagAnchors = useMemo(() => buildFlagAnchors(body, flags), [body, flags]);
```

`buildFlagAnchors` is deterministic — if two flags match the same paragraph, both anchor there and render `[n][m]`.

**Rendering**

```tsx
paragraphs.map((para, i) => {
  const anchoredFlags = flagAnchors[i] ?? [];
  const undismissed = anchoredFlags.filter(fi => !dismissedFlags.has(fi));
  const highlighted = undismissed.length > 0;
  const hovered = highlighted && undismissed.includes(hoveredFlagIndex);

  return (
    <p
      onMouseEnter={() => undismissed[0] != null && onParagraphHover(undismissed[0])}
      onMouseLeave={() => onParagraphHover(null)}
      style={{
        background: hovered ? "#fdeaea" : "transparent",
        transition: "background 120ms ease",
        padding: highlighted ? "0 4px" : 0,
        margin: `0 ${highlighted ? -4 : 0}px 1.1em`,
      }}
    >
      {i === 0 && storyFont === "serif" ? <DropCap char={para[0]} /> : null}
      {renderWithPlaceholderTokens(i === 0 && storyFont === "serif" ? para.slice(1) : para)}
      {undismissed.map(fi => (
        <sup
          key={fi}
          className="flag-marker"
          onClick={() => onFlagMarkerClick(fi)}
          aria-label={`Safety finding ${fi + 1}: ${CHECK_TYPE_LABELS[flags[fi].checkType]}`}
        >
          [{fi + 1}]
        </sup>
      ))}
    </p>
  );
});
```

**Marker style**

```css
.flag-marker {
  color: COLORS.error;
  font-weight: 700;
  font-size: 10px;
  font-family: Inter, sans-serif;
  vertical-align: super;
  margin-left: 2px;
  cursor: pointer;
  user-select: none;
}
.flag-marker:hover { text-decoration: underline; }
```

**Interaction contract**

- Hovering the paragraph → highlights the passage *and* the matching finding card in the Safety panel (via `hoveredFlagIndex`).
- Clicking a marker → `setActiveRailTab("safety")` and scrolls the finding into view: `document.querySelector(\`[data-flag="\${fi}"]\`)?.scrollIntoView({ behavior: "smooth", block: "nearest" })`. **Do not use `Element.scrollIntoView` if it lives outside the rail's scroll container** — scope it by querying inside the rail's scrollable `<div ref={railScrollRef}>` to avoid scrolling the whole page.
- Clicking a flag card in the rail → reverse path: briefly flashes the anchored paragraph (`hoveredFlagIndex = fi` for 900ms, then null).

**Edge cases**

- If `needle` not found in any paragraph → anchor to the first paragraph and render the marker at end of paragraph. Log a `console.warn` in dev; this indicates drift between the model's quoted passage and the editor body (common after edits).
- If `body` is edited after flags were generated, a stale anchor is fine — the marker just sits on the closest matching paragraph or the first. **Do not re-run the matcher after every keystroke**; run it on body change debounced 400ms.

---

### 3.4 `SaveStatusBar`

Quiet strip below the paper card.

**Props**

```ts
interface SaveStatusBarProps {
  unsaved: boolean;
  isSaving: boolean;
  lastSavedAt: number | null;
  onSave: () => void;
  mode: "read" | "edit";
  onModeToggle: () => void;
  readOnly: boolean;
}
```

**Layout**

- Row with 10px 14px padding, translucent white background (`rgba(255,255,255,0.6)` with 4px blur), 1px border, 10px radius, 20px top margin.
- Left: pen icon + status text.
  - Saving → `Saving…` (in primary).
  - Unsaved → `● Unsaved changes` (warning color `#7a5a1e`, dot in same color).
  - Clean → `Saved {formatRelativeTime(lastSavedAt)}` (muted).
- Right: `Preview` / `Edit` toggle (ghost button), then `Save draft` primary button. `Save draft` disabled when `!unsaved || isSaving`.

Not rendered when `readOnly === true`.

---

### 3.5 `EvidenceRail`

**Props**

```ts
interface EvidenceRailProps {
  story: Story;
  result: Agent1Result;
  dismissedFlags: Set<number>;
  onToggleFlag: (i: number) => void;
  onFlagHover: (i: number | null) => void;
  activeTab: "safety" | "reasoning" | "tools";
  onTabChange: (t: "safety" | "reasoning" | "tools") => void;
  onFeedback: (card: string, text: string) => void;
  onInsertPlaceholder: (token: string) => void;
  onNavigateToBrief?: () => void;
  readOnly: boolean;
  width: number;  // from design tokens / responsive
}
```

**Shell**

- `position: sticky; top: 0; height: 100vh; overflow: hidden; display: flex; flex-direction: column;`
- `background: COLORS.cream; border-left: 1px solid COLORS.border;`

**Tab row**

- 3 buttons, 8px 12px padding, 2px bottom border for active (`COLORS.primary`), muted gray for inactive.
- `Safety` gets a count badge when `undismissedCount > 0` (red pill, white text, min-width 16px) or a green check icon when `undismissedCount === 0 && flags.length > 0`.
- Tab row has `border-bottom: 1px solid COLORS.border` spanning full width; active tab's bottom border overlays it with `margin-bottom: -1px`.

**Scroll container**

- `overflow-y: auto; flex: 1; padding: 16px 16px 24px;`
- This is the ref target for marker-click scrolling (see §3.3).

**Responsive**

- Desktop ≥ 1200px: rail width per `width` prop (default 360–380px).
- Below 1200px: rail collapses to a bottom drawer (MUI `Drawer anchor="right"`). v1 scope: keep fixed and let the page scroll horizontally; full responsive treatment is v1.1.

---

### 3.6 `SafetyPanel`

Tab content when `activeTab === "safety"`.

**Order**

1. **Header strip** — summary of findings state.
2. **Finding cards** — one per `postValidationFlags[i]`.
3. **Must-never checklist** — always visible below findings.

**Header strip**

```tsx
if (flags.length === 0) {
  return <AllClearStrip />; // green, shield icon, "No safety concerns detected"
}
<SummaryStrip
  tone={undismissed > 0 ? "error" : "success"}
  title={undismissed > 0
    ? `${undismissed} finding${undismissed === 1 ? "" : "s"} awaiting review`
    : "All findings reviewed"}
  subtitle="Each finding gates approval until dismissed or addressed in the prose." />
```

**Finding card** (`data-flag={i}` required for marker-click scroll)

```
┌──────────────────────────────────────────┐
│ ①  Must-never violation           LIKELY │
│ "What if they don't want me? What if…"   │
│ Rumination spiral without coping tool... │
│ [Go to passage]  [Dismiss]               │
└──────────────────────────────────────────┘
```

- Border: `1px solid`, left border `3px solid COLORS.error` (unless dismissed: `COLORS.border`).
- Dismissed state: `opacity: 0.5`, left border muted, `Restore` replaces `Dismiss`.
- Number badge: circular, `COLORS.error` bg, white text, `{i+1}`.
- Severity tag (top-right, 10px uppercase 700): `LIKELY` (`COLORS.error`) or `REVIEW` (`COLORS.warning`).
- Passage: italic, 12px, left border rule 2px × `COLORS.error40`, 8px left padding.
- Reasoning: 11.5px, `COLORS.inkSoft`, 1.55 line-height.
- Actions (only when `!readOnly`):
  - `Go to passage` — primary-outline; calls `document.querySelector('.flag-anchor-{i}')?.scrollIntoView(...)` (you'll need to stamp a class on the anchored paragraph in `ManuscriptBody`).
  - `Dismiss` / `Restore` — neutral outline; toggles `dismissedFlags`.

**Hover coupling**

- `onMouseEnter` on the card → `onFlagHover(i)`; the manuscript paragraph highlights in response.
- `onMouseLeave` → `onFlagHover(null)`.

**Must-never checklist**

- Section header: 10.5px uppercase 700, `COLORS.inkMuted`, 0.6 letter-spacing, shield icon.
- One row per `story.brief.section3.mustNeverList[i]`:
  - Check icon (green) if `!mustNeverFlaggedForIndex(i, item, flags)`, else warn icon (warning).
  - Item text, 11.5px `COLORS.inkSoft`.
- Empty state: muted row "No must-never items defined."

---

### 3.7 `ReasoningPanel`

Tab content when `activeTab === "reasoning"`.

**Sections (in order, each as a white card with 1px border, 8px radius, 12px padding, 14px bottom margin)**

1. **Emotional truth** — heart icon (24×24 rounded square, `COLORS.primarySoft` bg).
   - Body: `result.emotionalTruth`.
   - Feedback row (hidden when `readOnly`): `Right` / `Missed something` — binary toggle (not a dialog in v1; if user picks `Missed something`, open the existing `FeedbackDialog` with title "What did the emotional truth miss?").

2. **Narrative blueprint** — compass icon.
   - Ordered list of `result.blueprint` points.
   - Sub-card (cream bg, 10px padding, 6px radius) with two bolded rows: `Coping placement.` `{result.copingToolPlacement}` and `Approach.` `{result.approachInstruction}`.
   - Same binary feedback row.

3. **Compression** (conditional — only if `result.compressionMetadata`) — layers icon, warning accent (`borderLeft: 3px solid COLORS.warning`).
   - Three blocks: `Fully included` (green label), `Compressed` (warning label), `Omitted` (error label).
   - Each block: uppercase 10.5px label + bulleted list of items.

4. **Inferred intention** (conditional — only if `result.inferredIntention`).
   - Three field rows: Feel / Because / Reason.
   - Actions: `Use inferred` (accepted chip on click) / `Edit brief instead` (triggers existing `createStory → updateBrief → navigate` flow; lift the handler up to the container).

5. **Alignment note** (conditional) — `COLORS.primarySoft` background block at the bottom of the panel.

---

### 3.8 `ToolsPanel`

Tab content when `activeTab === "tools"`.

**Three cards stacked (12px gap):**

1. **Placeholders** — grid of chips, each calls `onInsertPlaceholder(token)`.
   - Chip style: `COLORS.primarySoft` bg, `COLORS.primaryDark` text, monospaced, 11px, 6px 10px padding, 6px radius.
   - On click: insert at caret in the editor textarea. Caret handling is identical to today's `EvidencePanel.insertPlaceholder`.

2. **Coping tool** — rose-accented card (`COLORS.roseSoft` bg).
   - Heart icon + uppercase `COPING TOOL` label.
   - `result.copingTool` label (bold).
   - `result.copingToolPlacement` body.
   - `← Back to brief` link calling `onNavigateToBrief()`.

3. **Story context** — white card with a 2-column grid of `key / value` rows:
   - Type / Fear & Anxiety
   - Ages / 5–7
   - Target / 240–320 words
   - Revision / `{selectedVersionIndex + 1} of {MAX_VERSIONS}`

---

### 3.9 `ApproveBar`

Floating sticky bar at the bottom of the manuscript column. `position: sticky; bottom: 16px; margin: 0 40px 16px;`.

**Props**

```ts
interface ApproveBarProps {
  checks: Array<{ ok: boolean; label: string; }>;
  canApprove: boolean;
  status: Story["status"];
  regenCount: number;
  regenRemaining: number;
  onRegenerate: () => void;   // opens dialog
  onApprove: () => void;
  onReopen: () => void;       // only in approved state
}
```

**Layout (left → right)**

1. **Readiness gauge** — 42×42 SVG ring. Track = `COLORS.borderSoft`. Progress = `COLORS.primary` (or `COLORS.success` when 100%). Center text = `{okCount}/{total}`, 11px 700.
2. **Readiness label** — two-line block: title (`Ready to approve` / `Readiness checklist`) + subtitle (`All gates passed.` / `N items remaining`).
3. **Vertical divider** — 1px × full height.
4. **Checklist row** — flex-wrap, one chip per check:
   - `ok` → filled green circle with ✓, label in `#4a5f3f`.
   - `!ok` → outlined gray circle, label in `COLORS.inkMuted`.
   - Checks (computed in container): `Edits saved`, `Safety findings resolved (N left)`, `Word count within target`, `Must-never list validated`.
5. **Action cluster** (right-aligned):
   - Regen info (11px): `{regenRemaining} regen left`.
   - `Regenerate` — neutral button with refresh icon.
   - `Mark approved` — success primary, 42px tall, disabled state when `!canApprove`.

**Approved state replacement**

When `status === "approved"`: replace the checklist with a green "Approved" chip + `approvedAt` date, and replace the action cluster with a single `Reopen for editing` button (calls `handleReopen` — unchanged transition).

**Not rendered** when `status === "archived"`.

---

## 4. Design tokens (`tokens.ts`)

Extend the existing `COLORS` theme import; new tokens live alongside. **Do not overwrite `COLORS` in the global theme** — expose them as a named export so Direction B can be swapped without touching other tabs.

```ts
// client/src/specialist/components/draftB/tokens.ts
import { COLORS } from "../../../theme";

export const DRAFT_B = {
  ...COLORS,
  paper:        "#E5DFD9",  // page background
  paperDeep:    "#d9d1c8",
  cream:        "#f5f1eb",  // rail bg, sub-card bg
  manuscript:   "#fffdf9",  // paper card bg
  ink:          "#2a2421",
  inkSoft:      "#4c4440",
  inkMuted:     "#7a716a",
  border:       "#d7cfc4",
  borderSoft:   "#e6dfd5",
  rose:         "#824D5C",
  roseDark:     "#6a3d4a",
  roseSoft:     "#f0e4e8",
  primarySoft:  "#e7ecf1",
  successSoft:  "#eaf0e4",
  warningSoft:  "#f5ecd7",
  errorSoft:    "#f0dcdc",
  errorInk:     "#6d2f2f",
};

export const FONTS = {
  sans: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`,
  serif: `'Lora', 'Iowan Old Style', Georgia, 'Times New Roman', serif`,
  mono: `ui-monospace, SFMono-Regular, Menlo, monospace`,
};

export const RAIL_WIDTH_DEFAULT = 360;
export const MANUSCRIPT_MAX_WIDTH = 680;
```

Fonts: add Lora (400, 500, 600, italic 400/500) and ensure Inter (400–700) are preloaded via `<link>` in the app shell or imported in CSS. If the project uses `@fontsource`, add `@fontsource/lora`.

---

## 5. Interactions — full spec

| Trigger | Effect |
|---|---|
| Edit title | `editorTitle` updated, `hasUnsavedChanges = true` |
| Edit body | Same, plus debounced (400ms) re-run of `buildFlagAnchors` |
| Click version pill | If `hasUnsavedChanges`, open `VersionSwitchConfirmDialog`; else `setSelectedVersionIndex` |
| Cmd/Ctrl+S | `handleSave()` if not saving |
| Click `Save draft` | Same as above |
| Click `Edit` / `Read` toggle | Local mode switch; scrolls the paper card to top of the body |
| Click inline footnote marker `[n]` | `setActiveRailTab("safety")` + scroll-to flag card (scoped to rail) |
| Hover a paragraph with markers | `setHoveredFlagIndex(firstFlagHere)` |
| Hover a finding card | `setHoveredFlagIndex(i)` |
| Click finding `Go to passage` | Scroll manuscript to the anchored paragraph (use `.flag-anchor-{i}` class) |
| Click finding `Dismiss` / `Restore` | Toggle `dismissedFlags` (local only — no store write) |
| Click placeholder chip | Insert token at textarea caret (existing `insertPlaceholder` logic) |
| Click `Regenerate` | Open existing `RegenerateDialog` prefilled from `feedback` map |
| Click `Mark approved` | `handleApprove()` — existing flow |
| Click `Reopen for editing` (approved) | `handleReopen()` — existing flow |
| Click `Restore` in archived banner | `handleRestore()` — existing flow |
| Browser unload with `hasUnsavedChanges` | `beforeunload` warning — unchanged |
| Tab change (`brief`/`history`) with unsaved | Workspace-level guard — unchanged |

### 5.1 Approve gating

```ts
const checks = [
  { ok: !hasUnsavedChanges,                                         label: "Edits saved" },
  { ok: undismissedFlagCount === 0,                                 label: undismissedFlagCount
                                                                             ? `Safety findings resolved (${undismissedFlagCount} left)`
                                                                             : "Safety findings resolved" },
  { ok: !wordCountOutOfRange,                                       label: "Word count within target" },
  { ok: mustNeverFlags === 0,                                       label: "Must-never list validated" },
];
const canApprove =
  checks.every(c => c.ok) &&
  story.status !== "awaiting_review";
```

The `Mark approved` button is `disabled` when `!canApprove`; the checklist makes the reason visible so a tooltip is no longer necessary, but keep a short tooltip on the button for keyboard users — text = the first failing check's label.

### 5.2 Read-only behavior (approved / archived)

- Title input `readOnly`, body in Read mode only (no Edit toggle).
- `SaveStatusBar` not rendered.
- Finding cards: no `Dismiss` action; hover + marker highlighting still work.
- Reasoning feedback rows hidden.
- Placeholder chips still visible in Tools tab but disabled (cursor: not-allowed, 0.5 opacity, no click handler).
- `ApproveBar` swapped for the Approved/Reopen variant (approved) or hidden (archived).
- Archived: wrap entire tab in `<div style={{ opacity: 0.58 }}>` (slightly brighter than today's 0.5 to keep the manuscript legible) + `ArchivedBanner` at top.

---

## 6. Status mode matrix

| Status | Manuscript | Rail | ApproveBar | Banners |
|---|---|---|---|---|
| `generating` | `GeneratingState` replaces entire tab | — | — | — |
| `needs_revision` | `GeneratingState` replaces entire tab | — | — | — |
| `awaiting_review` | Editable | Visible | Visible, Approve disabled | — |
| `in_review` | Editable | Visible | Visible, Approve enabled if checks pass | — |
| `approved` | Read-only + `ApprovedStamp` | Visible, no dismiss actions | Approved variant with Reopen | — |
| `archived` | Read-only, dimmed | Visible, no dismiss actions | Not rendered | `ArchivedBanner` with Restore |

---

## 7. Edge cases

- **`agent1Result` null.** Render the existing "No generation results yet." paper — unchanged.
- **No flags.** Safety tab shows the green all-clear card; `Safety findings resolved` check = ✓; manuscript renders with no markers; no paragraph highlights.
- **Flag passage not found in body.** See §3.3 edge case — anchor to paragraph 0, log warn in dev. Keep the finding card fully functional.
- **Body shorter than 2 paragraphs.** Drop cap still applied to first paragraph; no ornamental divider if there's nothing to divide.
- **Body with no `\n\n`.** Treat as a single paragraph. This shouldn't happen for real stories but don't crash.
- **Very long paragraph with multiple flags.** All markers render at the end of the paragraph in `[1][2][3]` order. Hover highlights whole paragraph; clicking each marker selects its own finding.
- **Version with no `compressionMetadata` / `inferredIntention` / `alignmentNote`.** Omit those sections in the Reasoning tab.
- **`MAX_VERSIONS` reached.** Ghost pill disappears from timeline; `Regenerate` button disabled with tooltip "Maximum 3 versions reached".
- **Unsaved edits + version switch.** Caller intercepts and opens `VersionSwitchConfirmDialog` — today's behavior.
- **Unsaved edits + Regenerate.** Regenerate flow auto-saves first (today's behavior unchanged).
- **Save failure.** Snackbar shows error; `editorBody` and `editorTitle` NOT reverted — local text is preserved for retry.
- **User toggles Read/Edit mid-typing.** Treat the current `<TextField>` value as the source of truth; the Edit toggle commits it into `editorBody` on exit.
- **Placeholder inserted while in Read mode.** Auto-switch to Edit mode first, then insert at the end of body (there's no caret in Read mode).
- **Rail tab change while a flag is hovered.** Clear `hoveredFlagIndex` on `setActiveRailTab`.
- **Coping tool missing from brief.** Tools tab Coping card shows "No coping tool selected"; Manuscript meta line omits the coping chip.
- **Must-never list empty.** Safety panel renders the empty-state row; the `Must-never list validated` check is still `ok: true`.
- **Dismiss-all-then-reload.** `dismissedFlags` is local state; reload resets them. This matches today's behavior — do not persist in v1.

---

## 8. Accessibility notes (ship-blockers only)

- Rail tabs: `role="tablist"`, each button `role="tab"`, panels `role="tabpanel"` with matching `aria-labelledby`.
- Footnote markers: `<button>` not `<sup>` under the hood, styled as superscript. `aria-label="Safety finding {n}: {checkType label}"`.
- Finding cards: `data-flag={i}`, focusable (`tabindex="0"`), `Enter` scrolls to passage, `D` dismisses (no modifier needed — scoped to the card's key handler, not global).
- Readiness gauge: present the ratio as text too (`aria-label={"{n} of {total} checks passed"}`). Screen readers don't need the SVG.
- Color contrast: confirm `#fdeaea` passage highlight against `#fffdf9` paper meets 3:1 for non-text UI — it does (≈4.0:1). Verify once in staging.

ARIA beyond this list is out of scope for v1.

---

## 9. Not in scope for v1

- Diff viewer between versions (still future).
- Persisting `dismissedFlags` to the server.
- Per-paragraph inline comments.
- Rich text editing.
- Full responsive collapse of the rail into a drawer (use horizontal scroll below 1200px).
- Side-by-side version compare.
- Presence / multi-user.

---

## 10. Rollout

1. Land Direction B behind a feature flag: `features.draftTabV2`.
2. Route `<StoryWorkspacePage>` to `DraftTabB` when the flag is on, else today's `DraftTab`.
3. Ship to internal specialists first; collect feedback for one week.
4. Flip the flag for everyone; keep the old component in the tree for one release, then remove.

Migration is data-free — no schema changes, no store changes, no server changes.
