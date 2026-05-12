# Current State, Runtime, and Illustration Prompt Flow (As Implemented)

**Audience:** Developers debugging or extending Agent 1 right now.  
**Scope:** What is implemented in code today, where data is built/stored, and how generation flows end-to-end.

> **⚠ Illustration sections are stale (cleanup PR 1 of the v2 redesign).**
> The v1 illustration pipeline described below (`prompt_review → illustrating →
> illustration_review`, `toPageIllustrations`, `triggerIllustrationGeneration`,
> `generateImagePromptsForPages`, `VisualBible`, page-1 reference image, etc.)
> has been removed from the codebase. The canonical illustration design now
> lives in [`docs/illustration/spec.md`](../../../../../docs/illustration/spec.md).
> The Agent 1 sections (Steps 1–3, model files, brief flow) remain accurate.

---

## 1) High-level flow

Agent 1 generation is triggered from:

- `server/src/routes/specialist/stories.router.ts` (`POST /:storyId/generate`)

That route:

1. Normalizes incoming brief to canonical `StoryBrief`.
2. Sets/updates story status to `generating`.
3. Calls `generateStoryDraftFromBrief(brief)`.
4. Receives `Agent1Result`.
5. Persists:
   - `story.agent1Result`
   - `story.agent1Versions[]`
   - `story.currentDraft`
   - `story.pages` (if structured pages were produced)
6. Transitions story status to `awaiting_review`.

Core orchestration happens in:

- `server/src/agent1/pipeline.ts` (`executePipelineWithBrief`)

Pipeline order:

1. `runPreCheck(brief)`
2. `runStoryArchitect(...)` (Step 1)
3. `runAuthor(...)` (Step 2)
4. `runPostValidation(...)` (Step 3)
5. Assemble final `Agent1Result`

---

## 2) Models used right now

- Step 1 (Architect): `claude-sonnet-4-6`
- Step 2 (Author): `claude-sonnet-4-6`
- Step 3 (Post-validation): `claude-sonnet-4-6`

Defined in:

- `server/src/agent1/step1-architect/index.ts`
- `server/src/agent1/step2-author/index.ts`
- `server/src/agent1/step3-post-validation/index.ts`

---

## 3) Where prompts come from (and what is stored)

### Step 1 prompt

Built at runtime in:

- `server/src/agent1/step1-architect/prompt-builder.ts`

### Step 2 prompt

Built at runtime in:

- `server/src/agent1/step2-author/prompt-builder.ts`

Step 2 output format requirement (JSON with `title` + `pages[]`) is in:

- `server/src/agent1/step2-author/prompt-sections/section-j-output-format.ts`

### Step 3 prompt

Built at runtime in:

- `server/src/agent1/step3-post-validation/prompt-builder.ts`

### Prompt persistence status

Current code does **not** persist full prompt text to Firestore or API responses.  
It stores `promptHash` on step outputs and telemetry records.

---

## 4) LLM call wrapper behavior

All Anthropic calls go through:

- `server/src/agent1/shared/llm-client.ts`

`callLLM(...)` currently:

1. Sends `messages.create(...)`.
2. Extracts first text block from `response.content`.
3. Returns:
   - `text`
   - `inputTokens`
   - `outputTokens`
   - `latencyMs`
4. Retries **once** on transient HTTP status (`429`, `500`, `502`, `503`, `529`) if `attempt === 1`.
5. Appends JSONL audit line to `logs/agent1-calls.jsonl`.

---

## 5) What is logged now (agent1-calls.jsonl)

Log file path:

- `server/logs/agent1-calls.jsonl`

Implemented entry fields:

- `timestamp`
- `step`
- `model`
- `attempt`
- `inputTokens` (when available)
- `outputTokens` (when available)
- `latencyMs`
- `success`
- `errorMessage` (failures)
- `rawText` (successful calls; first text block from the model)

Important:

- `rawText` is now intentionally logged for development/debugging visibility.
- This is raw model output before parser normalization.

---

## 6) Step 2 structured pages: exact behavior

Step 2 parser is:

- `server/src/agent1/step2-author/output-parser.ts`

It tries to parse model output as JSON:

```json
{
  "title": "...",
  "pages": [
    { "pageNumber": 1, "text": "..." }
  ]
}
```

When parse succeeds:

- Builds `StoryPage[]` with:
  - `pageNumber`
  - `text` (trimmed)
  - `wordCount` (derived)
- Builds legacy `story` by joining all page texts.
- Computes:
  - `wordCount`
  - `wordCountDrift`
  - `pageCount`
  - `targetPageRange`
  - `pageCountDrift`
- Returns these in `Step2Output`.

When parse fails:

- Falls back to legacy text-format parser (`TITLE/STORY` heuristics).
- In fallback mode, `pages` is not populated.

---

## 7) How `pages` reaches Story documents

After successful generation in route handler:

- `agent1Result.pages` is converted via:
  - `toPageIllustrations(...)` in `server/src/models/story.model.ts`
- Saved to:
  - `story.pages`

`toPageIllustrations(...)` adds illustration pipeline defaults:

- `imagePrompt: null`
- `promptStatus: "pending"`
- `illustrationUrl: null`
- `illustrationStatus: "pending"`
- etc.

If Step 2 used legacy fallback and has no `pages`, route stores:

- `pages: null`

---

## 8) When and how image prompt generation runs

Image prompt generation is part of the specialist illustration pipeline, and it starts
**after Agent 1 is already done** and the story has been reviewed/approved.

### Trigger timing

Trigger point is in:

- `server/src/routes/specialist/stories.router.ts`

When a specialist transitions a story from `approved` -> `prompt_review`, the route
fires this in background (fire-and-forget):

- `generateImagePromptsForPages(storyId, ownerUid)`

This means:

- The transition API response is not blocked waiting for Claude image-prompt generation.
- Any generation error is logged by the catch handler and does not crash the transition request.

### Service that generates prompts

Main function:

- `server/src/specialist/specialistIllustration.service.ts`
  - `generateImagePromptsForPages(storyId, specialistUid)`

It enforces:

1. Story must be in `prompt_review`.
2. Story must have non-empty `pages`.
3. Idempotency shortcut:
   - If every page already has `imagePrompt` and `visualBible` exists, it returns without a new Claude call.

Then it calls:

- `callClaudeForImagePrompts(pages, brief)` in `server/src/specialist/image-prompt-generator.ts`

That Claude call produces:

- `visualBible`
- `imagePrompts[]` (one prompt per page in order)

### Batched call shape (all pages in one request)

Image prompts are generated with **one Claude request for the full story pages**, not
one request per page.

- The prompt includes all pages as:
  - `[Page 1] ...`
  - `[Page 2] ...`
  - ...
- Claude returns one JSON object containing:
  - one shared `visualBible`
  - one `imagePrompts[]` array aligned by page order

This keeps style/environment consistent across pages because Claude sees the whole story context.

### Exact prompt template used for image prompts

Prompt builder:

- `server/src/specialist/image-prompt-generator.ts` (`buildImagePromptsPrompt`)

The prompt asks Claude to:

1. Create a Visual Bible (`protagonist`, `styleGuide`, `environmentRegistry`, `palette`)
2. Create one Seedream prompt per page
3. Return only valid JSON with exact schema and exact prompt count

The input includes:

- Story age range
- Story type
- Full list of story pages text

---

### Image prompt logging (new)

Image prompt generation now writes JSONL logs to:

- `server/logs/image-prompt-calls.jsonl`

Logged fields include:

- `timestamp`
- `model`
- `pageCount`
- `promptLength`
- `inputTokens` / `outputTokens` (when available)
- `latencyMs`
- `success`
- `errorMessage` (on failures)
- `prompt` (full prompt text sent to Claude)
- `rawText` (raw Claude text response, on success)

Use this log file to debug both:

- exact prompt sent to Claude
- exact raw response received before parsing

### What gets persisted

After a successful Claude response, service updates Firestore story doc with:

- `pages[i].imagePrompt = imagePrompts[i]`
- `pages[i].promptStatus = "pending"` (for Gate 1 review)
- `visualBible`
- `illustrationSeed` (random seed used later by Seedream)
- `promptsGeneratedAt = serverTimestamp()`
- `updatedAt = serverTimestamp()`

### How this connects to next stage

In `prompt_review`, specialist approves/rejects each page prompt.

- When all prompts are approved, route auto-transitions to `illustrating` and triggers:
  - `triggerIllustrationGeneration(storyId, ownerUid)`

So image prompt generation lifecycle is:

`approved` -> `prompt_review` (auto Claude prompt generation) -> specialist prompt review -> `illustrating`.

### Prompt review decisions: approve vs reject (continuous flow)

Prompt review endpoint is:

- `PATCH /:storyId/pages/:pageNumber/prompt` in `server/src/routes/specialist/stories.router.ts`

Allowed actions:

- `action: "approve"`
- `action: "reject"` (requires `rejectionNote`)

#### If specialist approves a prompt

For that page:

- `promptStatus` becomes `"approved"`
- `promptRejectionNote` is cleared (`null`)

Then router checks all pages:

- If **not all approved**: story remains `prompt_review` and specialist continues reviewing remaining pages.
- If **all approved**:
  1. Story transitions to `illustrating`
  2. `promptsApprovedAt` is set
  3. `triggerIllustrationGeneration(storyId, ownerUid)` starts in background

#### If specialist rejects a prompt

For that page:

- `promptStatus` becomes `"rejected"`
- `promptRejectionNote` is saved

Then:

- Story stays in `prompt_review`
- No auto transition to `illustrating`
- No auto image-render trigger

This means prompt review is a gate: all page prompts must be approved before illustration generation starts.

### After prompt gate passes: illustration stage flow

Once in `illustrating`, `triggerIllustrationGeneration(...)` attempts per-page image generation.
When all pages are attempted, story moves to `illustration_review`.

Illustration review endpoint is:

- `PATCH /:storyId/pages/:pageNumber/illustration`

#### If specialist approves an illustration

- Page `illustrationStatus` becomes `"done"`
- When all pages are `"done"`, story auto-transitions to `illustration_ready`

#### If specialist rejects an illustration

- Page `illustrationStatus` becomes `"pending"`
- `illustrationRejectionNote` is saved
- `triggerIllustrationGeneration(...)` is re-triggered in background (re-generation loop)

---

## 9) What is returned to clients vs internal-only

### Returned/persisted in `Agent1Result`

Includes (non-exhaustive):

- Step 1 structured fields (emotional truth, blueprint, approach instruction, etc.)
- Step 2 story fields (title, story, counts, optional pages)
- Step 3 alignment note + flags
- Telemetry summary (`llmCalls`, total latency)

### Internal-only (not on final `Agent1Result`)

- Full Step prompts (not persisted)
- Step raw responses (`rawResponse`) from Step1/Step2/Step3 parser outputs

For raw output debugging, use:

- `server/logs/agent1-calls.jsonl` -> `rawText`

---

## 10) Failure handling currently implemented

- Step 1 parse incoherence:
  - Retries once in `step1-architect/index.ts`
  - Then throws `Step1IncoherentError`
- Step 2 parse failure:
  - No hard failure; uses legacy fallback parser
- Step 3 failure:
  - Caught and downgraded to soft fallback result (`PASS`, empty flags, note)
- Route-level timeout:
  - `AGENT1_TIMEOUT` after 120 seconds in `stories.router.ts`

---

## 11) Practical debugging checklist

When a generation looks wrong:

1. Open `server/logs/agent1-calls.jsonl`.
2. Find entries by `step` + recent timestamp.
3. Read `rawText` for:
   - Step 1 format quality
   - Step 2 JSON validity (`title`, `pages[]`)
   - Step 3 validator output shape
4. Cross-check `success`, `errorMessage`, token counts, latency.
5. If `pages` missing in final story, verify Step 2 `rawText` was valid JSON.

---

## 12) Current known design tradeoff

This implementation favors debuggability and forward-compatibility:

- Keeps legacy Step 2 fallback to avoid hard pipeline failure.
- Logs raw model text for inspection during development.
- Does not persist full prompts to DB (hash-only) to avoid heavy storage and accidental data leakage.

