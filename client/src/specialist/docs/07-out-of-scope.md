# 07 — Out of Scope

This file lists what the pilot dashboard does **not** do. It exists because the dashboard sits at the natural collection point for feature requests — every team in the company has an opinion about what should appear next to a story — and without an explicit non-goals list, scope creep is guaranteed.

The rule is simple: if a feature is on this list, it does not ship in the pilot. If a teammate proposes one of these features, point them at this file. If the proposal is genuinely important enough to override the non-goals list, that's a strategic decision Jana makes deliberately, not a tactical decision a contributor makes in a PR.

Each entry below explains *why* it's out of scope, not just *that* it is. Reasons matter because they're how we'll evaluate whether to bring something in later.

---

## Server-side draft storage

**What it would be.** Drafts of in-progress briefs persisted to Firestore, scoped to the specialist's UID, with multi-device sync.

**Why it's out of scope for the pilot.** The pilot has one specialist on one device. The work to do this properly — auth-scoped subcollection rules, server endpoints for draft CRUD, conflict resolution if a specialist edits in two tabs, offline behavior — is a sprint of backend work. The `DraftStore` interface exists precisely so this can be added later without touching consumer code.

**When it comes back.** When the second specialist joins the platform, or when the first specialist starts working from multiple devices. Whichever comes first.

---

## Multi-user collaboration on a single story

**What it would be.** Two specialists working on the same Story — one drafting, one reviewing, comments, @mentions, simultaneous editing with conflict resolution.

**Why it's out of scope.** DAMMAH's clinical model is single-author: one psychologist owns one story. Adding collaboration features now would force product decisions (who can edit what, who approves what, how disagreements are resolved) that the clinical workflow hasn't yet encountered. Build the single-author flow well, learn from it, then add collaboration if and when it's actually needed.

**When it comes back.** Only when there's a documented clinical need from the team using the platform — not because it's a generally good feature. If you find yourself saying "but Notion has it," that's not a reason.

---

## Comments, mentions, review requests

**What it would be.** Inline comments on a brief or draft, @-mentioning another specialist, requesting a review, threaded discussions.

**Why it's out of scope.** Same reason as collaboration: no clinical workflow uses these yet. They sound useful in the abstract; in practice, they introduce notification design problems, permission design problems, and a lot of UI complexity. None of which serves the pilot's job of getting Agent 1's outputs in front of one specialist.

**When it comes back.** Same condition as collaboration — only when there's a documented need.

---

## Rich-text editor, formatting, tracked changes

**What it would be.** A WYSIWYG editor with bold, italic, headers, lists, etc. Or tracked-changes mode for revisions. Or a diff visualizer between draft versions.

**Why it's out of scope.** The story body is read by parents and (eventually) rendered alongside illustrations. The downstream rendering is plain prose. Any formatting added in the editor would have to be stripped or translated downstream, and the specialist would build mental models around formatting that won't survive into the published version. A plain `<textarea>` is the right primitive for the pilot — it forces the specialist's mental model to match the output format.

Tracked changes specifically: every save creates a full snapshot in the `editHistory`. The specialist can view any previous snapshot and restore from it. That's the audit primitive. Diff visualization on top of that is post-pilot.

**When it comes back.** When there's a clear rendering format that supports formatting (e.g., when illustrations include text styling cues), the editor can be revisited. Even then, the simplest viable answer is probably Markdown, not WYSIWYG.

---

## Notifications

**What it would be.** Email, in-app, or push notifications for events like "Agent 1 finished generating your story," "your story was archived by an admin," etc.

**Why it's out of scope.** Notification systems are deceptively expensive — they need a delivery layer, preference management, rate limiting, an unsubscribe flow, deliverability monitoring, and a bunch of decisions about which events deserve a notification at all. Agent 1 takes 30–60 seconds; the specialist can stay on the page or check back. There's no real notification need until the platform has events that happen to a specialist while they're not looking, which the pilot doesn't.

**When it comes back.** When a workflow exists where things happen to a specialist's stories that they need to be told about — for example, when an admin or reviewer can act on a story owned by a specialist. The pilot has no such workflows.

---

## Analytics, reporting, dashboard charts

**What it would be.** Metrics on the dashboard like "stories generated this month," "average time from brief to approved," "regeneration rate by approach." Or a separate analytics page.

**Why it's out of scope.** The pilot has too few stories to make any metric statistically meaningful. The dashboard is a workspace, not an analytics surface — adding charts would clutter the primary task (working on stories). When metrics matter, they belong in a separate admin dashboard, not the specialist workspace.

**When it comes back.** When there's a real operational question metrics would answer — for example, "are we hitting Agent 1's cost ceilings?" or "which approach has the highest regeneration rate?" By that point, the metrics infrastructure (logging, aggregation) probably already exists from the operations work documented in the Agent 1 spec. The dashboard is unlikely to be where they're displayed.

---

## Bulk actions

**What it would be.** Select multiple stories and archive them, change status, export, etc.

**Why it's out of scope.** Bulk actions are a power-user feature that pays off when the user has many stories and a routine maintenance task. The pilot has neither. Adding bulk actions also forces UI decisions (multi-select checkboxes, action menus, undo) that consume design and engineering time that should go to core flow.

**When it comes back.** When a specialist has more than 50 stories and is regularly cleaning up old ones.

---

## Tags filtering and tag management UI

**What it would be.** Filter the dashboard by tag, manage a tag taxonomy, suggested tags, color-coded tags.

**Why it's out of scope, partially.** The `tags: string[]` field exists in the Story model and is displayed on Story rows in the dashboard table — but the pilot has no UI to add, edit, or filter by tags. Tags are forward-compatible storage; the UI is post-pilot.

**When it comes back.** When a specialist has enough stories that tags would help them find things faster than search. Probably around the same time as bulk actions.

---

## Saved filters / saved searches / dashboard customization

**What it would be.** "Save this filter combination as 'My in-progress fear stories'" — pinned to the navbar.

**Why it's out of scope.** Same reason as bulk actions — not enough stories to need it, and the cost of building a saved-filter UI is significant for a feature with low pilot value.

---

## Story templates / brief templates

**What it would be.** "Create a story from a template" — pre-filled brief based on a template the team has built.

**Why it's out of scope.** This is genuinely tempting. It would save time for common situations. But building a templating system requires deciding what "template" means (full brief? section? variable substitution?), how templates are managed, whether they version, who can edit them. None of which has been worked through. The clinical team can manually copy briefs from prior stories using the "Open new revision" flow if they want a starting point.

**When it comes back.** When the team has 10+ approved stories per common situation type and a clear pattern emerges. At that point templates can be derived from real briefs rather than designed in the abstract.

---

## Parent-facing surface

**What it would be.** The page where parents browse approved stories, personalize them, and read them to their child.

**Why it's out of scope.** This is a different product surface entirely. It deserves its own spec set, its own data model decisions, its own design exploration. Combining it with the specialist dashboard would muddle both. The dashboard's job ends at `status: approved`. What happens after that is the publishing pipeline and the parent surface, neither of which is pilot scope.

**When it comes back.** When the platform is ready for parents — that is, when there are enough approved stories to make parent-facing browsing worthwhile, and when the publishing pipeline exists to move approved stories into the parent-visible state.

---

## Publishing pipeline

**What it would be.** The set of steps that take an approved story and make it visible to parents — final illustration integration, final language adaptation, marketplace listing, etc.

**Why it's out of scope.** Same reason as the parent surface. The pilot's job ends at "specialist approves the story." Everything downstream is its own product.

**When it comes back.** Same condition as the parent surface.

---

## Illustration generation and integration

**What it would be.** AI-generated illustrations for the story, tied to the prose, displayed in the editor, included in the published story.

**Why it's out of scope.** The brief spec explicitly defers illustration to a separate specification (Brief spec Section 21, UI Requirement 4). Agent 1's pilot is text-only. Adding illustration to the dashboard would require coordinating with a generation pipeline that doesn't exist yet.

**When it comes back.** When the illustration spec is written and there's a generation pipeline to call.

---

## Multi-language support beyond what already exists

**What it would be.** Adding new languages (Arabic, Hebrew) to the dashboard UI itself. The brief and Agent 1 are English-only in the pilot.

**Why it's out of scope, partially.** The routing already supports a `:lang` parameter — the dashboard URLs are `/:lang/specialist/stories`. The infrastructure is there. What's not there is the actual translation work for the dashboard's UI strings, the right-to-left layout testing, the locale-specific date formatting, etc.

**When it comes back.** When the team is ready to localize the dashboard. Likely close to when the parent surface launches in non-English locales.

---

## Voice / text-to-speech

**What it would be.** Reading the generated story aloud in the editor; voice cloning for personalization.

**Why it's out of scope.** This is a downstream feature for parents (Brief spec mentions it as a future feature). Specialists don't need text-to-speech for editing — they read the story themselves.

**When it comes back.** When the parent surface needs it.

---

## Specialist account settings page

**What it would be.** A page where specialists manage their profile, password, notification preferences, etc.

**Why it's out of scope.** Specialist accounts are managed by Anthropic/Firebase/whatever auth system the platform uses. The dashboard is a workspace, not an account management surface. There's no notification preferences to manage because there are no notifications (see above).

**When it comes back.** When there's actually settings to manage.

---

## Help, onboarding, in-app documentation

**What it would be.** A help center, guided onboarding flow, tooltips explaining every field, video tutorials.

**Why it's out of scope.** The pilot has one specialist who already understands the platform. Building help content for nobody is a waste of time. When more specialists join, they can be onboarded in person initially, and help content can be derived from the questions they actually ask.

**When it comes back.** When the platform is onboarding specialists at a rate where in-person onboarding doesn't scale.

---

## Audit logs beyond the per-Story History tab

**What it would be.** A platform-wide audit log of every action by every user — admin-visible, queryable, exportable.

**Why it's out of scope.** The per-Story History tab is sufficient for the pilot's accountability needs. Platform-wide audit infrastructure is a compliance feature for a later stage of the platform's life.

**When it comes back.** When there's a compliance requirement (clinical regulation, contractual obligation) that requires it.

---

## A/B testing, feature flags

**What it would be.** Showing different variants of features to different specialists to compare outcomes.

**Why it's out of scope.** Single-specialist pilot. Nothing to A/B test against.

**When it comes back.** When the platform has enough specialists for variants to produce meaningful differences.

---

## Theme switching, dark mode, layout customization

**What it would be.** Light/dark toggle, font size controls, layout density options.

**Why it's out of scope.** Standard preference features that don't pay off until the user base is large and diverse. The pilot's design system gives one good default; that's enough.

**When it comes back.** When users actually ask for it.

---

## How to use this list

When someone proposes a feature, walk this list. If their proposal is here:

1. Tell them it's intentionally out of scope.
2. Show them the rationale.
3. If they think the rationale is wrong, escalate to Jana — that's a strategic conversation, not a tactical one.

When you propose a feature yourself, walk this list before writing the proposal. If you're about to ask for something on this list, you already know the answer.

When this list itself is wrong — when the reasoning has stopped applying or a feature has become genuinely necessary — update this file in the same PR that adds the feature. Don't quietly add features without reconciling the non-goals list. The list exists to make trade-offs visible; deleting items from it without explanation defeats the purpose.

---

## What is *not* on this list

Notably absent: anything that's actually needed for the pilot. If a feature isn't on this list and isn't in the other spec files, it should be added to one of them — it doesn't get to live in limbo as an unspecified expectation.

If you find yourself uncertain whether a feature is in scope or out of scope, the answer is almost always "out of scope, default no, push back unless someone makes the case for inclusion."
