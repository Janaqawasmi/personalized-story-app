# Story Brief — implementation gaps and tracking

This document tracks features described in `dammah-story-brief-spec-v1.3.md` that are **not yet fully implemented** in the codebase, or that differ between client and server. Update it when closing a gap.

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

**Note:** The client runs `evaluateBriefSubmitGate` (hard block / hard warnings). A soft-warning evaluator exists (`evaluateBriefInformativeValidation`), but is not currently surfaced in the form UI. Server validation remains the trust boundary for tampered or non-browser clients.

---

## B. AI-ready payload + Agent 1 metadata integration (`buildAgentPayload`, spec §10–15)

**Goal:** Persist or hand off the enriched agent contract (spec §10–15) alongside the raw brief, including the spec §15 requirement for metadata when elements are compressed/omitted.

**Current state:** `client/src/services/agentPayloadBuilder.ts` defines `buildAgentPayload()`, but the submit path stores only the raw brief (`omitUiOnlyBriefFields`).

**TODO:**

1. On successful validation (client and/or server), call `buildAgentPayload(normalizedBrief)`.
2. Decide storage:
   - **Recommended:** Store both `brief` (raw form aggregate) and `agentPayload` (or `generationContract`) on the same Firestore document, with a `payloadFormatVersion` field.
3. Ensure any downstream Agent 1 job receives the payload that includes structural parameters, age rules, arc, approach instructions, priority rules, and obligation tiers.
4. Implement the **spec §15 output metadata requirement** in the generation pipeline (not in the brief form): when any element is compressed or omitted due to space constraints, produce metadata describing what was included, compressed (and how), and omitted (and why).

---

## C. Soft warning UI surface (spec §8 soft warnings)

**Implemented (logic only):** `client/src/validation/briefInformativeValidation.ts` exists and evaluates:

- §8 **soft** cross-field rules (messages aligned with `server/src/validation/crossFieldValidation.ts`).
- §16 **complexity budget** overload via `@dammah/story-brief-complexity` (same engine as the meter and `server` complexity validation).

**Current state (UI):** There is **no UI panel** in `BriefForm` that calls `evaluateBriefInformativeValidation` and renders §8 soft warnings as a non-blocking summary.

**Remaining differences to watch:**

- Server `StoryBrief` uses nested types (e.g. `typeSpecificField.somatic_expression`); the client uses flatter section objects (`somaticExpressions[]`). Logic is kept equivalent for Fear & Anxiety; if the server model diverges, re-run parity tests.
- Any future change to `CROSS_FIELD_VALIDATIONS` on the server should be copied or shared with the client soft-warning copy above. §16 weights live in `@dammah/story-brief-complexity`.

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

## G. Spec mismatch to track: Field 5.2 character limit

**Current state (code):** Field 5.2 (“Why not personalized?”) is limited to **400 characters** (`WHY_NOT_CHAR_LIMIT`).

**Spec status:** `dammah-story-brief-spec-v1.3.md` does **not** currently specify a char limit for Field 5.2.

**TODO (spec):** Add the 400-character constraint to the next spec revision so the spec matches the implementation.

---

*Last reviewed: implementation pass addressing token parity + validation severity and removing field nudges from §8 validation registries.*
