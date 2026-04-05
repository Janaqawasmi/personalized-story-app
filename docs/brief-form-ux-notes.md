# Story Brief form — UX and UI design guidelines

This document captures **product UX and visual design** guidance for the specialist Story Brief flow (`BriefForm` and section components). It does **not** replace the canonical field spec:

- **Source of truth for fields, validation, and copy requirements:** [`dammah-story-brief-spec-v1.2.md`](./dammah-story-brief-spec-v1.2.md)

Use this doc when polishing layout, hierarchy, feedback, and accessibility without changing spec-mandated behavior.

---

## Goals

- Reduce cognitive load across five long sections while keeping every required clinical input available.
- Keep **orientation** clear: where the user is, what applies to the current step (story type, age, personalization), and what blocks submission.
- Maintain **trust**: save state, errors, and clinical gates must feel predictable and distinct from each other.

---

## Layout and hierarchy

### Page shell

- Prefer a **centered main column** (approximately 760–880px content width) on large screens so the form does not read as edge-to-edge or “stretched.”
- Use a **subtle page background** distinct from the **card/surface** (primary form container) so the brief reads as a focused document, not a flat page.

### Inside each section

- Open with a **clear section title** and, where helpful, a **one-line purpose** (spec-aligned, non-duplicative of field labels).
- Use **consistent vertical rhythm**: more space between major blocks (field groups, definitions, actions) than between related controls.
- For long instructional text, constrain **line length** for readability (e.g. max width on body/helper copy), even when the outer card is wider.

### Primary actions

- **One dominant primary** control per step (e.g. “Save & continue” / “Submit brief”).
- **Back** should be visually secondary (outlined or text).
- Keep **consistent placement**: e.g. primary right-aligned on desktop; on small screens, full-width stacked order with primary last or first per team convention, but **consistent across sections**.

---

## Navigation and progress

### Stepper (sections 1–5)

- The horizontal indicator must satisfy spec §21: **five sections**, **current** highlighted, **completion** per section.
- **Short labels** (e.g. on narrow breakpoints) should remain understandable; if a label is abbreviated (e.g. “Config”), expose the **full section name** via visible subtitle, tooltip, or `aria-label` on the step control.
- **Clickable steps**: completed or past steps may be navigable; **locked** future steps should look disabled and should not imply clickability (avoid hover states that suggest interaction).

### After navigation

- Scroll the user to a predictable anchor (e.g. top of section content).
- Prefer moving **keyboard focus** to the section heading or first focusable control in the new step, not only scrolling, for screen-reader and keyboard users.

---

## Forms, density, and long content

- Prefer **progressive disclosure** for optional or secondary material (e.g. collapsible “Definition” or “Examples”) so required fields stay visible without scrolling past long text blocks—**without** hiding required spec fields.
- **Section 3** uses **accordion groups** (therapeutic mechanism; somatic expression & coping; resolution & guardrails) to reduce fatigue; fields remain in **spec order** within each panel. See `Section3TherapeuticArchitecture.tsx`.
- Keep **control patterns consistent** for the same kind of choice (e.g. single-select therapeutic options): similar card size, selection affordance, and error placement across sections.
- **Required vs optional** should be scannable everywhere: shared pattern for required asterisk and optional badges (where the spec marks fields optional).

---

## Feedback: save, validation, and clinical gates

### Save and draft

- Show **when** the draft was last saved where it helps (e.g. header). A short **“Draft saved”** confirmation near the action or via snackbar reinforces cause and effect.

### Missing required fields

- Inline summaries (e.g. before primary actions) should **visually align** with field-level errors: same severity color language, clear **jump links** to targets, and optional copy explaining fields that are required only under certain conditions (spec §7 conditionals).
- When fields live inside **collapsed accordions**, opening the correct panel before scroll/focus (e.g. `beforeScrollToField` on `BriefValidationSummary`) keeps jump links reliable.

### Hard block vs hard warning (submit gate)

- **Hard block** and **hard warning** flows must be **visually and semantically distinct**: block = cannot proceed; warning = proceed only after explicit acknowledgment. Do not use identical modal styling for both.

---

## Sticky context bar

When implemented, the bar exists to surface **story type**, **age range** (after Section 1 is complete per product rules), and **personalization mode**, while the user scrolls long sections.

- Use an **opaque or near-opaque background** and a clear **bottom border or shadow** so scrolling content does not visually clash with the bar.
- On small viewports, a **collapsible** state saves vertical space; provide an obvious **expand** affordance and `aria-expanded`.
- Sticky `top` offset must stay aligned with **global layout** (e.g. app bar + padding). If layout heights change, update the offset so the bar never sits under the navbar.

---

## Mobile and touch

- Respect **minimum touch targets** (about 44×44 CSS px) for step circles, chips, and card selectors.
- Avoid relying only on **color** for completion (green): keep **icons or text** (“Complete”) where possible.
- Consider a **sticky footer** for Back / Continue on long mobile steps if usability testing shows users lose the actions below the fold (optional enhancement).

---

## Accessibility

- Custom interactive elements (cards used as radios, step circles with `role="button"`) need visible **`:focus-visible`** styles consistent with the rest of the app.
- Do not convey state by color alone for errors, completion, or warnings.
- Ensure **heading order** matches section structure so assistive tech can navigate the form outline.

---

## Brand and design tokens

- Prefer **semantic tokens** for the brief (e.g. muted panel tint, sticky bar background, validation accent) over one-off hex values scattered in components. Centralizing reduces drift and keeps the brief visually part of DAMMAH.
- Typography: use a **clear scale**—section title vs field label vs helper vs caption—with stable font weights and secondary text color for non-primary copy.

---

## Implementation map (reference)

| Area | Typical location in codebase |
|------|------------------------------|
| Form shell, pre-brief, steps 1–5 orchestration | `client/src/components/brief/BriefForm.tsx` |
| Stepper | `client/src/components/brief/BriefProgressIndicator.tsx` |
| Sticky context | `client/src/components/brief/BriefStickyContextBar.tsx` |
| Missing fields / jump links | `client/src/components/brief/BriefValidationSummary.tsx` |
| Submit gates | `client/src/components/brief/BriefSubmitGateModals.tsx` |
| Section 3 accordions | `client/src/components/brief/Section3TherapeuticArchitecture.tsx` |
| Global colors / theme | `client/src/theme.ts` |

---

## Suggested backlog (prioritized)

1. **Stepper clarity**: full names for abbreviated labels on small screens; locked-step affordance.
2. **Section framing**: consistent section header block and spacing inside each `Section*.tsx`.
3. **Unified validation visuals**: align summary panel with inline errors.
4. **Clinical gate differentiation**: distinct treatment for block vs warning modals.
5. **Brief-specific theme tokens**: replace ad hoc grays with named brief tokens.
6. **Focus management** after step change for keyboard and screen-reader users.

---

## Changelog

| Date | Note |
|------|------|
| 2026-04-05 | Initial guidelines from UX review and current brief UI patterns. |
| 2026-04-05 | Restored file; noted Section 3 accordions and `beforeScrollToField` behavior. |
