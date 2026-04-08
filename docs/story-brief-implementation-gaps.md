# Story Brief — implementation gaps and tracking

This document tracks features described in `dammah-story-brief-spec-v1.2.md` that are **not yet fully implemented** in the codebase, or that differ between client and server. Update it when closing a gap.

---

## A. Server-side validation on brief POST

**Goal:** Reject invalid payloads at `POST /api/admin/damma-story-briefs` using the same rules as `server/src/validation/index.ts` (`validateStoryBrief`).

**Current state:** `createDammaStoryBrief` persists `req.body` without schema or cross-field validation.

**TODO:**

1. Map the submitted JSON (`CompleteBrief` shape from the client) to `StoryBrief` (or validate the wire format directly if you add a dedicated DTO).
2. Call `validateStoryBrief` before writing to Firestore.
3. On failure, respond with `400` and a structured body, for example:
   - `error`: short code or message
   - `details`: human-readable summary
   - `issues`: array of `{ id, severity, message, fields[] }` matching `TriggeredValidation`

**Note:** The client already runs `evaluateBriefSubmitGate` (hard block / hard warnings) and now runs `evaluateBriefInformativeValidation` (soft + complexity). Server validation remains the trust boundary for tampered or non-browser clients.

---

## B. AI-ready payload integration (`buildAgentPayload`)

**Goal:** Persist or hand off the enriched agent contract (spec §10–15) alongside the raw brief.

**Current state:** `client/src/services/agentPayloadBuilder.ts` defines `buildAgentPayload()`, but the submit path stores only the raw brief (`omitUiOnlyBriefFields`).

**TODO:**

1. On successful validation (client and/or server), call `buildAgentPayload(normalizedBrief)`.
2. Decide storage:
   - **Recommended:** Store both `brief` (raw form aggregate) and `agentPayload` (or `generationContract`) on the same Firestore document, with a `payloadFormatVersion` field.
3. Ensure any downstream Agent 1 job receives the payload that includes structural parameters, age rules, arc, approach instructions, priority rules, and obligation tiers.

---

## C. Soft warnings — client vs server

**Implemented (client):** `client/src/validation/briefInformativeValidation.ts` mirrors:

- §8 **soft** cross-field rules (messages aligned with `server/src/validation/crossFieldValidation.ts`).
- §16 **complexity budget** overload (aligned with `server/src/validation/complexityBudget.ts`).

**UI:** `BriefInformativeWarningsPanel` in `BriefForm`, shown when all five sections are complete. **Non-blocking.**

**Remaining differences to watch:**

- Server `StoryBrief` uses nested types (e.g. `typeSpecificField.somatic_expression`); the client uses flatter section objects (`somaticExpressions[]`). Logic is kept equivalent for Fear & Anxiety; if the server model diverges, re-run parity tests.
- Any future change to `CROSS_FIELD_VALIDATIONS` or `OBLIGATION_WEIGHTS` on the server should be copied or shared with the client module above.

---

## D. Dual enforcement — post-generation “must-never” validation

**Spec:** Field 3.7 — constraints are injected into the agent prompt **and** checked in a **separate validation pass** on the completed draft (flag violations for the psychologist).

**Current state:** Not implemented. Story generation and review pipelines are out of scope for the brief form alone.

**TODO (Agent / review):** Run a dedicated check of generated text against each must-never line; surface matches in specialist review UI.

---

## E. Non-pilot story types

**Spec:** Five story types in the pre-brief selector; options and fields vary by type.

**Current state:** Only **Fear & Anxiety** is enabled in the UI; other types are visible but marked “Coming soon” and cannot be selected.

**TODO:** Per roadmap — implement type-specific fields (e.g. Field 3.4 for other types), defaults (§9), approaches (§13), and intention examples (§2.3) when each type is launched.

---

## F. Spec content and process gaps (non-code)

From spec §22 and related sections:

- **Gold-standard brief–story pairs** (three pilot pairs) — clinical deliverables for Agent 1 few-shot and QA.
- **Non-pilot:** Therapeutic intention examples, approach definitions, and coping/somatic option sets for types other than Fear & Anxiety.
- **Illustration / personalization engine** — explicitly out of scope for V1 brief per spec §21.

---

*Last reviewed: implementation pass adding client soft-warning panel and spec Section 5 table fix.*
