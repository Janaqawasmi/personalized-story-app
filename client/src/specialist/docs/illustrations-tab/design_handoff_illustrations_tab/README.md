# Handoff — Illustrations Tab redesign (Specialist Desk)

> **Bundle for Claude Code.** Drop this folder anywhere in your repo (e.g.
> `docs/handoff/illustrations-tab/`) and point Claude Code at the README.
> Everything Claude needs to port the design lives here.

---

## 1. What this is

A **visual + interaction redesign** of the **Illustrations** tab inside the
Specialist Desk → Story Workspace. It does **not** change behaviour, data
contracts, or APIs — it reorganises the existing surface around the v2
spec's per-page workflow and improves hierarchy, density, status legibility,
and editorial polish.

The design is implemented as **HTML/JSX prototypes** (in `design/`) — these
are *references*, **not** files to copy into the app. The task is to
**recreate the visuals & UX in the existing React + MUI codebase**, using
the project's existing tokens (`COLORS`, `DRAFT_B`, `FONTS`) and i18n
plumbing (`useSpecialistDeskUi`).

### Fidelity
**High-fidelity.** Final colour values, typography stack, spacing, RTL
behaviour, and the 5 page-card sub-states are all decided. Pixel
measurements come from the prototypes; semantic structure and bilingual
copy are documented below.

---

## 2. Where it lives in your codebase

| Surface | File | Role |
|---|---|---|
| Tab container | `client/src/specialist/components/IllustrationsTab.tsx` | wraps `IllustrationsTabV2` — leave |
| Main edit surface | `client/src/specialist/components/illustration/IllustrationsTabV2.tsx` | **REWRITE** — top-level state router |
| View model | `client/src/specialist/hooks/useIllustrationWorkspaceState.ts` | **KEEP CONTRACT** — already exposes `WorkspaceViewModel` with the 5 page sub-statuses |
| Tokens | `client/src/theme.ts` (`COLORS`) + `client/src/specialist/components/draftB/tokens.ts` (`DRAFT_B`, `FONTS`) | **use these only** — no new colours |
| Strings | `client/src/i18n/specialistDeskLocales.ts` + `…/specialistDeskUi.ts` | add the new keys listed in §7 |
| API | `client/src/api/illustrationApi.ts` | **DO NOT TOUCH** unless you find a real bug |

The existing hook (`useIllustrationWorkspaceState`) already returns a
`WorkspaceViewModel` discriminated union: `loading | cta | pending |
running | ready | failed | illustration_metadata_incomplete`. The redesign
maps 1:1 to those cases — see §4.

---

## 3. Design system — strict reuse

Do **not** invent new colours, fonts, or spacing tokens.

### 3.1 Colours (lifted exactly from `client/src/theme.ts`)
```ts
COLORS = {
  primary: "#617891",       primaryDark: "#4a5f74",  primarySoft: "#e7ecf1",
  secondary: "#824D5C",
  background: "#E5DFD9",    cream: "#f5f1eb",        surface: "#FFFFFF",
  textPrimary: "#2a2421",   textSecondary: "#4c4440", textMuted: "#7a716a",
  border: "#d7cfc4",        borderSoft: "#e6dfd5",
  success: "#5f7a54",       successSoft: "#eaf0e4",
  warning: "#b08433",       warningSoft: "#f5ecd7",
  error:   "#a14a4a",       errorSoft:   "#f0e4e4",
}
```

### 3.2 DRAFT_B tokens (warm editorial chrome)
```ts
DRAFT_B = {
  cream: "#f5f1eb", parchment: "#efe8df", paper: "#fff",
  ink: "#2a2421",   inkSoft:  "#4c4440",  inkMuted: "#7a716a",
  border: "#d7cfc4", borderSoft: "#e6dfd5",
}
```

### 3.3 Type stack
- **Display** (h1–h6, scene-plan titles, card titles): `'Playfair Display', Georgia, serif` — weight 700, letter-spacing −0.02em.
- **Body / UI**: `'Nunito', 'Segoe UI', system-ui, sans-serif`.
- **Mono / forensic data** (page numbers, version labels, model IDs, log strips): `'JetBrains Mono', ui-monospace, Menlo, monospace`.

### 3.4 Shape & rhythm
- Cards: **radius 14**, soft border `DRAFT_B.border`, shadow `0 1px 0 rgba(42,36,33,.02), 0 8px 24px -20px rgba(42,36,33,.08)`.
- Chips & pills: **radius 999**, height 22 (sm) / 26 (md).
- Standard horizontal page padding: **36px** at the workspace surface; **20–22px** inside cards.
- Status uses **chip + dot + soft-bg**, never a banner — banners are reserved for stale Visual Bible / rejection feedback inside a page card.

### 3.5 RTL-first
All flex/grid uses logical properties (`marginInlineStart`, `paddingInlineEnd`, `borderInlineStart`, `insetInlineStart`). The back chevron in the header flips with `transform: scaleX(-1)` when `dir === "rtl"`.

---

## 4. The screens (state-by-state)

The Illustrations tab renders one of **7 visual states** mapped to the
`WorkspaceViewModel`. The corresponding prototype files in `design/` are
named to match.

### A. CTA — `viewModel.kind === "cta"`  (story.status = `approved`)
**Prototype:** state `cta` in `design/Illustrations Tab Redesign.html`.
- Centred card, max-width 720, padding 48/40.
- Big circular icon swatch (72px, `primarySoft` bg, `primary` fg).
- `<h2>` headline + 480-wide body paragraph.
- Single primary CTA: **"Open illustration workspace"** (size lg, primary).
- Below it: monospace meta line — "Generates Visual Bible + N scene plans · usually under 90s".
- Process strip: 4-column grid of `01 / 02 / 03 / 04` micro-cards explaining what's about to happen (Visual Bible → Scene plans → Generate images → Review & publish).

### B0. Pending / Running — `viewModel.kind === "pending"|"running"`
**Prototype:** state `generating`.
- Same max-width-720 card as CTA.
- Left: 52px circular spinner badge.
- Right: `<h2>` "Building the illustration workspace" + secondary line.
- Progress bar (8px, gradient `primary → secondary`).
- Two-up "stage ticker" cards:
  - Stage 1a — Visual Bible — **done** (success-soft bg, check icon, "v1 · sonnet-4-6 · 4.2s").
  - Stage 1b — Scene plans — **busy** (primary-soft bg, spinner, "9/16 complete").

The `progressHint` already comes back from the hook (`tailProgressHint`).
Use it verbatim for the second card's `meta`.

### B. Workspace — `viewModel.kind === "ready"` (the heart of the redesign)
**Prototype:** state `workspace` (and `expanded` shows the dev panel open).

Three vertical regions:

**B.1 Visual Bible card (top, sticky-feel, full width)**
- Header strip: 44px `VB` square badge (primary fill) → title + version chip + optional "Hand-edited" rose chip → action group (Edit / Regenerate).
- Two-column body (1.1fr / 1fr):
  - **Left:** Character anchor (paragraph), Style guide (paragraph), Consistency anchors (pill list).
  - **Right:** Palette swatches (rounded chip-with-dot), Environments (cream sub-cards with mono name + atmosphere/spatial grid), Avoid list (error-soft pill list).
- Use `borderInlineStart: 3px` on quote-blocks; do not use plain left-borders.

**B.2 Section header strip**
`pagesEyebrow` (mono uppercase, primary) → big `<h2>` (Playfair) → right-aligned secondary actions (Regenerate-all-plans / Generate-all-images).

**B.3 Per-page cards (loop over `viewModel.pages`)**
One `<article>` per page. **All 5 sub-statuses share the same shell** — only the chip, the image region, and the footer action change.

Shell:
- **Head row** — 36px page-number badge (cream bg, Playfair) · scene-plan title (Playfair 18/700) · `vN of M` mono caret · status chip (right).
- **Body grid** — `minmax(0,1fr) 280px`, separated by `borderInlineEnd`.
  - **Left column:** manuscript blockquote (cream bg, `borderInlineStart: 3px DRAFT_B.border`, italic text in `inkSoft`) → scene prose (Nunito 14.5/1.7) → two `Detail` tiles in a 1/1 grid: **"What the reader should feel"** (accent = `secondary`) and **"Key visible detail"** (accent = `warning`) → conditional banners → secondary action row → optional expanded **TechnicalPanel** (dark `#1f1a17` block with mono content, `direction: ltr` even in RTL).
  - **Right column:** `bg = cream`, padding 16/20, single child = the image region.
- **Footer bar** — primary action (left), error string if `lastError` (right). Approved pages get `bg: #f6f9f4` here and a 3px success-coloured spine on the article's inline-start edge (absolute positioned div, top 0 / bottom 0 / width 3).

Per sub-status:

| Sub-status | Status chip | Right column (image) | Footer primary |
|---|---|---|---|
| `plan_only` | "Plan ready" (neutral) | Striped placeholder + "No image yet" + small hint | **Generate illustration** (primary, sparkle icon) |
| `generating_image` | "Drawing…" (info, mini spinner) | Soft primary-soft gradient + animated shimmer overlay + big spinner + "Drawing page N…" + mono "Usually under 30s" | "Drawing — usually under 30s" (secondary, disabled) |
| `awaiting_review` | "Awaiting review" (warning) | Final image + footer strip with mono "1024×1024 · seedream-4-0" + lightbox eye-icon micro-button | **Approve** (success) + **Reject with feedback** (secondary) |
| `approved` | "Approved" with check (success) | Final image + same footer strip | Success chip "Approved" + ghost "Reopen for edits" |
| `needs_revision` | "Rejected — regenerating" (error) | Faded image (opacity 0.55) + mini spinner + "Generating a new version" line | "Regenerating with feedback…" (secondary, disabled) |

Conditional banners on the left column:
- `viewModel.pages[i].visualBibleIsStale` → warning-soft banner "The Visual Bible has changed since this plan was written." with right-aligned **Regenerate plan** ghost button.
- `rejectionNote` (any non-empty) → error-soft banner, mono uppercase header "Feedback on the previous version", italic quote.

Secondary action row (always visible):
- `Different plan` (ghost, refresh icon) — regenerate scene plan with **no** feedback.
- `Suggest a change` (ghost, message icon) — opens a textarea, then regenerate with feedback.
- right-aligned **Technical details** disclosure (ghost, chevron rotates 180° when open).

When `expanded`, the TechnicalPanel matches the §13 spec:
- Always **LTR + mono** even in RTL pages.
- Dark `#1f1a17` bg, warm-gold section headers.
- Stage 1b block (model + tokens + latency + director's notes) → "show structured prompt / raw LLM call / copy final prompt" affordances.

**B.4 Sticky publish bar**
At the bottom of the page list.
- `position: sticky; bottom: 0`, radius 14, `backdrop-filter: blur(10px)`.
- When **not** all approved: white-translucent bg, `DRAFT_B.border`, `box-shadow: 0 -4px 18px -12px rgba(42,36,33,.12)`. Headline "Approval progress" + `${approved} of ${total} pages approved.` + progress-dots row (16 small pills, success when `i < approved`).
- When all approved: solid white bg, `border: success`, success-soft 4px ring (`box-shadow: 0 0 0 4px successSoft`). Headline "All pages approved" + "Ready to mark the story as ready to publish." Primary button flips to success variant with check icon: **Mark as ready to publish**.

### C. Ready — `story.status === "illustration_ready"`
**Prototype:** state `ready`.

Two parts:

**C.1 Hero card** — parchment→cream gradient, padding 26/28.
- 64px square book icon (primary or success on `published`).
- Title (Playfair 26) + sub.
- Two buttons: `Preview book` (secondary, eye) and `Publish` (primary, book).

**C.2 4-column gallery** — 8 sample cards (one per approved page).
- White card, soft border, padding 8.
- Image placeholder (aspect-1) on top.
- Footer strip: `p.N` (mono) · Title (Playfair) · success ✓ chip.

### C′. Published — `story.status === "published"`
Same as Ready, but: success-coloured icon, "The story is published" headline, `Publish` swapped for ghost `Reopen for edits`.

### D. Approval Preview Dialog (modal over Ready)
**Prototype:** state `dialog`.
- Backdrop: `rgba(23,13,30,0.62)` over a blurred Workspace.
- Dialog: max-width 1080, radius 18, `box-shadow: 0 30px 80px -20px rgba(0,0,0,.4)`.
- Header strip (`DRAFT_B.cream` bg): Playfair title + secondary line + success chip "All pages approved" + close `IconBtn`.
- Body: `parchment` bg, 40px padding, 2-column book spread. Each spread page is a white "leaf" with shadow, illustration on top + manuscript text below (Playfair 16.5/1.7) + centered `— N —` page mark.
- Footer: prev/next IconBtns + progress pip row (active = 18-wide pill, primary; others = 6-wide, border) + mono "Spread N of M" + `Export PDF` (secondary, download icon) + `Publish the book` (primary, book).

### E. Failed — `viewModel.kind === "failed"`
Same shell as Generating but with a single error card instead of the two-up stage ticker. Body shows `viewModel.error`. Primary button: "Try again" (calls the same transition that opens the workspace).

### F. Incomplete metadata — `kind === "illustration_metadata_incomplete"`
Inline alert at the top of the empty workspace; copy comes from `desk.illustrationsTabIncompleteMetadata`. No new design needed beyond MUI `<Alert severity="warning">`.

---

## 5. Animations

Two keyframes, both gentle:
```css
@keyframes ill-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
@keyframes ill-shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
```
- Spinners use `ill-spin 1s linear infinite` on the SVG path.
- The `generating_image` image region overlays a 110° linear-gradient strip animated with `ill-shimmer 1.6s linear infinite`. In RTL, mirror by setting `transform: translateX(100%)` → `-100%` (or use `dir`-aware logical CSS).

---

## 6. Accessibility

- `role="article"` on each page card (or just `<article>` as in the prototype).
- The status chip must be readable on its own; do not encode status by colour alone — every chip already pairs colour with a label and (for spinning/checked states) an icon.
- The "Technical details" disclosure must be a button with `aria-expanded` set; the panel below must have a matching `id` referenced via `aria-controls`.
- Dialog uses MUI `<Dialog>`: it already wires focus-trap + Esc-to-close + scrim-click. Keep `aria-labelledby` pointing to the title node.
- The publish bar's CTA must announce remaining count in its `aria-label` (e.g., `Approve 12 more pages — disabled`).

---

## 7. New i18n keys (add to `specialistDeskLocales.ts`)

All three languages must be filled in (EN/HE/AR). The prototype's `strings.js` is the source of truth — see `design/strings.js`. Below is the new-key checklist; lift each translation directly from there.

| Key | EN |
|---|---|
| `illSourceText` | "Source text" |
| `illIntentLabel` | "What the reader should feel" |
| `illDetailLabel` | "Key visible detail" |
| `illStaleBibleBanner` | "The Visual Bible has changed since this plan was written." |
| `illStaleBibleAction` | "Regenerate plan" |
| `illRejectedHeader` | "Feedback on the previous version" |
| `illSecAltPlan` | "Different plan" |
| `illSecSuggestChange` | "Suggest a change" |
| `illSecTechDetails` | "Technical details" |
| `illStatusPlanOnly` | "Plan ready" |
| `illStatusGenerating` | "Drawing…" |
| `illStatusAwaiting` | "Awaiting review" |
| `illStatusApproved` | "Approved" |
| `illStatusRejected` | "Rejected — regenerating" |
| `illActGenerate` | "Generate illustration" |
| `illActDrawing` | "Drawing — usually under 30s" |
| `illActApprove` | "Approve" |
| `illActReject` | "Reject with feedback" |
| `illActReopen` | "Reopen for edits" |
| `illActRegen` | "Regenerating with feedback…" |
| `illNoImageHead` | "No image yet" |
| `illNoImageHint` | "Click \"Generate illustration\" to start" |
| `illDrawingPage(n)` | `Drawing page ${n}…` |
| `illUnderThirty` | "Usually under 30 seconds" |
| `illNewVersionLabel` | "Generating a new version" |
| `illPubApprovedTitle` | "All pages approved" |
| `illPubProgressTitle` | "Approval progress" |
| `illPubApprovedSub` | "Ready to mark the story as ready to publish." |
| `illPubProgressSub(a,t)` | `${a} of ${t} pages approved.` |
| `illPubReady` | "Mark as ready to publish" |
| `illPubMore(n)` | `Approve ${n} more page${n===1?"":"s"}` |
| `illGalAllApproved` | "All illustrations approved" |
| `illGalPublished` | "The story is published" |
| `illGalAllApprovedSub` | "16 pages illustrated and approved. Preview the book and publish when you're ready." |
| `illGalPublishedSub` | "The book is live for readers. You can still preview it here." |
| `illGalPreview` | "Preview book" |
| `illGalPublish` | "Publish" |
| `illGalReopen` | "Reopen for edits" |
| `illDlgTitle` | "Preview for approval" |
| `illDlgAllApproved` | "All pages approved" |
| `illDlgSpread(n,t)` | `Spread ${n} of ${t}` |
| `illDlgExport` | "Export PDF" |
| `illDlgPublish` | "Publish the book" |
| `illVbCharacterAnchor` | "Character anchor" |
| `illVbCharacterHint` | "Embedded in every prompt" |
| `illVbStyleGuide` | "Style guide" |
| `illVbAnchors` | "Consistency anchors" |
| `illVbAnchorsHint` | "Short phrases repeated in every prompt" |
| `illVbPalette` | "Palette" |
| `illVbEnvironments` | "Environments" |
| `illVbAvoid` | "Avoid list" |
| `illVbEnvAtmosphere` | "Atmosphere" |
| `illVbEnvLayout` | "Layout" |
| `illVbEditedTag` | "Hand-edited" |
| `illCtaHeadline` | "The story is approved" |
| `illCtaBody` | "Open the illustration workspace to build a Visual Bible for the story and a scene plan for each of the N pages…" |
| `illCtaButton` | "Open illustration workspace" |
| `illCtaMeta(n)` | `Generates Visual Bible + ${n} scene plans · usually under 90s` |
| `illCtaSteps` | array of [n, title, desc] tuples |
| `illGenTitle` | "Building the illustration workspace" |
| `illGenSub` | "Usually under a minute. Stay or come back later." |
| `illGenStage1Label` | "Visual Bible" |
| `illGenStage2Label` | "Scene plans" |
| `illPagesEyebrow` | "Story pages" |
| `illPagesTitleMixed(n)` | `${n} pages · plans ready, images in progress` |
| `illPagesTitleApproved(n)` | `${n} pages · all approved` |
| `illRegenAllPlans` | "Regenerate all plans" |
| `illGenerateAllImages` | "Generate all images" |
| `illPageNumber(n)` | `Page ${n} · scene plan` |

Drop the rest of the HE and AR rows from `design/strings.js` (`STRINGS.he`, `STRINGS.ar`) into the corresponding language blocks of `specialistDeskLocales.ts`.

---

## 8. Component-level file plan

Suggested split inside `client/src/specialist/components/illustration/`:

```
IllustrationsTabV2.tsx            // dispatcher on WorkspaceViewModel.kind
panels/
  CtaPanel.tsx                    // kind=cta
  PendingPanel.tsx                // kind=pending|running|failed (different copy)
  WorkspacePanel.tsx              // kind=ready  (main)
  GalleryPanel.tsx                // illustration_ready|published
  IncompleteMetadataPanel.tsx     // kind=illustration_metadata_incomplete
visualBible/
  VisualBibleCard.tsx             // collapsible card
  PaletteSwatches.tsx
  EnvironmentRow.tsx
  AnchorPills.tsx
pageCard/
  PageCard.tsx                    // shell + sub-status switch
  PageCardHead.tsx
  SceneProse.tsx
  DetailTile.tsx
  StaleBibleBanner.tsx
  RejectionBanner.tsx
  ImageRegion.tsx                 // 5 variants by sub-status
  IllPlaceholderEmpty.tsx
  IllPlaceholderBusy.tsx
  IllImage.tsx
  TechnicalPanel.tsx              // role-gated developer details (admin or featureFlag)
  pageStatusBadge.tsx             // returns the <Chip/> for each sub-status
publish/
  PublishBar.tsx
  ProgressDots.tsx
dialogs/
  ApprovalPreviewDialog.tsx       // already exists — restyle to match
shared/
  ChipTone.tsx                    // wrap MUI Chip with our 6 tones
  SectionLabel.tsx                // mono uppercase eyebrow
```

The existing `ApprovalPreviewDialog.tsx` and `BookReaderCore.tsx` stay in
place; only their visual chrome moves to match the new dialog spec.

---

## 9. What NOT to change

- API call shapes in `illustrationApi.ts`.
- The hook's return contract — every field listed in `PageCardViewModel`
  already corresponds to a piece of UI.
- The Firestore listener wiring.
- Pipeline transitions / state-machine constants.
- The 5 sub-status string literals (`plan_only` / `generating_image` /
  `awaiting_review` / `approved` / `needs_revision`) — UI labels are
  i18n'd, the literals stay.

---

## 10. Test updates

`client/src/specialist/__tests__/IllustrationsTabV2.test.tsx` — keep the
test names (they describe behaviour, not structure), and update the queries:

- Replace text-match selectors that hit the old Hebrew copy with
  `screen.getByRole("button", { name: /illActApprove/i })`-style queries
  bound to the new i18n keys.
- The 5 page-card sub-status tests should now assert on the chip's
  `aria-label` / visible label per the table in §4.B.3.
- Add coverage for the **stale Visual Bible banner** and **rejection
  feedback banner** — both are new conditional UI driven by existing data.

---

## 11. Migration order (incremental, reviewable)

1. **Add new i18n keys** (3 languages) and verify the build is green.
2. **Add the `pageStatusBadge` + `ChipTone` shared atoms** (no UI yet).
3. Build `VisualBibleCard` and drop it in place of the existing one.
4. Build the new `PageCard` (all 5 sub-states) without touching the panels.
5. Rebuild `WorkspacePanel` to compose `VisualBibleCard` + `PageCard` list
   + `PublishBar`.
6. Rebuild `CtaPanel` + `PendingPanel` + `GalleryPanel`.
7. Restyle `ApprovalPreviewDialog`.
8. Add `TechnicalPanel` behind the `admin` role / `featureFlag.illustrationDevPanels` claim.
9. Update tests.
10. Manual QA: walk EN → HE → AR; verify RTL mirroring; verify each
    sub-status by stubbing the view model.

---

## 12. Files in this bundle

```
README.md                         — this file
design/
  Illustrations Tab Redesign.html — open in a browser to walk all 7 states
  tokens.js                       — exact COLORS / DRAFT_B / FONTS the prototype uses
  strings.js                      — full EN / HE / AR copy
  chrome.jsx                      — header + stepper + tab bar
  visual-bible.jsx                — VisualBibleCard with all sub-pieces
  page-card.jsx                   — PageCard + placeholders + TechnicalPanel
  panels.jsx                      — CTA / Generating / Gallery / Dialog
  app.jsx                         — top-level state dispatcher (mirrors IllustrationsTabV2)
  walkthrough.jsx                 — preview shell (NOT shipped; just for browsing)
```

Treat `design/` as **reference only**. The implementation goes in your
existing React + MUI files; the prototypes show *what* it should look and
feel like, not *how* the production code should be structured.
